/**
 * A PlaceablesLayer designed for rendering the visual Scene for a specific vertical cross-section.
 * @category - Canvas
 */
class TilesLayer extends PlaceablesLayer {

  /** @inheritdoc */
  static documentName = "Tile";

  /* -------------------------------------------- */
  /*  Layer Attributes                            */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, {
      name: "tiles",
      zIndex: 0,
      controllableObjects: true,
      rotatableObjects: true,
      elevationSorting: true
    });
  }

  /* -------------------------------------------- */

  /**
   * A mapping of url to texture data
   * @type {Map<string,object>}
   */
  textureDataMap = new Map();

  /* -------------------------------------------- */

  /** @inheritdoc */
  get hookName() {
    return TilesLayer.name;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get hud() {
    return canvas.hud.tile;
  }

  /* -------------------------------------------- */

  /**
   * An array of Tile objects which are rendered within the objects container
   * @type {Tile[]}
   */
  get tiles() {
    return this.objects?.children || [];
  }

  /* -------------------------------------------- */

  /**
   * Get an array of overhead Tile objects which are roofs
   * @returns {Tile[]}
   */
  get roofs() {
    return this.placeables.filter(t => t.isRoof);
  }

  /* -------------------------------------------- */

  /**
   * Determine whether to display roofs
   * @type {boolean}
   */
  get displayRoofs() {
    const restrictVision = !game.user.isGM
      || (canvas.tokens.controlled.length > 0) || (canvas.effects.visionSources.size > 0);
    return (this.active && ui.controls.control.foreground) || restrictVision;
  }

  /* -------------------------------------------- */

  /**
   * A convenience reference to the tile occlusion mask on the primary canvas group.
   * @type {CachedContainer}
   */
  get depthMask() {
    return canvas.masks.depth;
  }

  /* -------------------------------------------- */
  /*  Layer Methods                               */
  /* -------------------------------------------- */

  /** @inheritdoc */
  _activate() {
    super._activate();
    this._activateSubLayer(!!ui.controls.control.foreground);
    canvas.perception.update({refreshLighting: true, refreshTiles: true}, true);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _deactivate() {
    super._deactivate();
    this.objects.visible = true;
    canvas.perception.update({refreshLighting: true, refreshTiles: true}, true);
  }

  /* -------------------------------------------- */

  /**
   * Activate a sublayer of the tiles layer, which controls interactivity of placeables and release controlled objects.
   * @param {boolean} [foreground=false]  Which sublayer need to be activated? Foreground or background?
   * @internal
   */
  _activateSubLayer(foreground=false) {
    for ( const tile of this.tiles ) {
      tile.interactive = tile.document.overhead === foreground;
      if ( tile.controlled ) tile.release();
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _tearDown(options) {
    for ( let tile of this.tiles ) {
      if ( tile.isVideo ) {
        game.video.stop(tile.sourceElement);
      }
    }
    this.textureDataMap.clear();
    return super._tearDown(options);
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onDragLeftStart(event) {
    await super._onDragLeftStart(event);
    const tile = this.constructor.placeableClass.createPreview(event.data.origin);
    event.data.preview = this.preview.addChild(tile);
    this.preview._creating = false;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onDragLeftMove(event) {
    const { destination, createState, preview, origin, originalEvent } = event.data;
    if ( createState === 0 ) return;

    // Determine the drag distance
    const dx = destination.x - origin.x;
    const dy = destination.y - origin.y;
    const dist = Math.min(Math.abs(dx), Math.abs(dy));

    // Update the preview object
    preview.document.width = (originalEvent.altKey ? dist * Math.sign(dx) : dx);
    preview.document.height = (originalEvent.altKey ? dist * Math.sign(dy) : dy);
    if ( !originalEvent.shiftKey ) {
      const half = canvas.dimensions.size / 2;
      preview.document.width = preview.document.width.toNearest(half);
      preview.document.height = preview.document.height.toNearest(half);
    }
    preview.refresh();

    // Confirm the creation state
    event.data.createState = 2;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onDragLeftDrop(event) {
    const { createState, preview } = event.data;
    if ( createState !== 2 ) return;
    const doc = preview.document;

    // Re-normalize the dropped shape
    const r = new PIXI.Rectangle(doc.x, doc.y, doc.width, doc.height).normalize();
    preview.document.updateSource(r);

    // Require a minimum created size
    if ( Math.hypot(r.width, r.height) < (canvas.dimensions.size / 2) ) return;

    // Render the preview sheet for confirmation
    preview.sheet.render(true, {preview: true});
    this.preview._creating = true;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onDragLeftCancel(event) {
    if ( this.preview._creating ) return;
    return super._onDragLeftCancel(event);
  }

  /* -------------------------------------------- */

  /**
   * Handle drop events for Tile data on the Tiles Layer
   * @param {DragEvent} event     The concluding drag event
   * @param {object} data         The extracted Tile data
   * @private
   */
  async _onDropData(event, data) {
    if ( !data.texture?.src ) return;
    if ( !this.active ) this.activate();

    // Get the data for the tile to create
    const createData = await this._getDropData(event, data);

    // Validate that the drop position is in-bounds and snap to grid
    if ( !canvas.dimensions.rect.contains(createData.x, createData.y) ) return false;

    // Create the Tile Document
    const cls = getDocumentClass(this.constructor.documentName);
    return cls.create(createData, {parent: canvas.scene});
  }

  /* -------------------------------------------- */

  /**
   * Prepare the data object when a new Tile is dropped onto the canvas
   * @param {DragEvent} event     The concluding drag event
   * @param {object} data         The extracted Tile data
   * @returns {object}            The prepared data to create
   */
  async _getDropData(event, data) {

    // Determine the tile size
    const tex = await loadTexture(data.texture.src);
    const ratio = canvas.dimensions.size / (data.tileSize || canvas.dimensions.size);
    data.width = tex.baseTexture.width * ratio;
    data.height = tex.baseTexture.height * ratio;
    data.overhead = ui.controls.controls.find(c => c.layer === "tiles").foreground ?? false;

    // Determine the final position and snap to grid unless SHIFT is pressed
    data.x = data.x - (data.width / 2);
    data.y = data.y - (data.height / 2);
    if ( !event.shiftKey ) {
      const {x, y} = canvas.grid.getSnappedPosition(data.x, data.y);
      data.x = x;
      data.y = y;
    }

    // Create the tile as hidden if the ALT key is pressed
    if ( event.altKey ) data.hidden = true;
    return data;
  }
}
