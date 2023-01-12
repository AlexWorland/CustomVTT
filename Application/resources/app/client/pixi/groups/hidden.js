/**
 * A specialized canvas group for rendering hidden containers before all others (like masks).
 * @extends {PIXI.Container}
 */
class HiddenCanvasGroup extends BaseCanvasMixin(PIXI.Container) {
  constructor() {
    super();
    this.interactive = this.interactiveChildren = false;
    this.#createMasks();
  }

  /**
   * The container which hold masks.
   * @type {PIXI.Container}
   */
  masks = new PIXI.Container();

  /** @override */
  static groupName = "hidden";

  /* -------------------------------------------- */

  /**
   * Add a mask to this group.
   * @param {string} name                           Name of the mask.
   * @param {PIXI.DisplayObject} displayObject      Display object to add.
   * @param {number|undefined} [position=undefined] Position of the mask.
   */
  addMask(name, displayObject, position) {
    if ( !((typeof name === "string") && (name.length > 0)) ) {
      throw new Error(`Adding mask failed. Name ${name} is invalid.`);
    }
    if ( !displayObject.clear ) {
      throw new Error("A mask container must implement a clear method.");
    }
    // Add the mask to the dedicated `masks` container
    this.masks[name] = position
      ? this.masks.addChildAt(displayObject, position)
      : this.masks.addChild(displayObject);
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async draw() {
    this.addChild(this.masks);
    await this.#drawMasks();
    await super.draw();
  }

  /* -------------------------------------------- */

  /**
   * Perform necessary draw operations.
   */
  async #drawMasks() {
    await this.masks.vision.draw();
  }

  /* -------------------------------------------- */

  /**
   * Attach masks container to this canvas layer and create tile occlusion, vision masks and depth mask.
   */
  #createMasks() {
    // The canvas scissor mask is the first thing to render
    const canvas = new PIXI.LegacyGraphics();
    this.addMask("canvas", canvas);

    // Then we need to render vision mask
    const vision = new CanvasVisionMask();
    this.addMask("vision", vision);

    // Then we need to render occlusion mask
    const occlusion = new CanvasOcclusionMask();
    this.addMask("occlusion", occlusion);

    // Then the depth mask, which need occlusion
    const depth = new CanvasDepthMask();
    this.addMask("depth", depth);
  }

  /* -------------------------------------------- */
  /*  Tear-Down                                   */
  /* -------------------------------------------- */

  /** @override */
  async tearDown() {
    this.removeChild(this.masks);

    // Clear all masks (children of masks)
    this.masks.children.forEach(c => c.clear());

    // Then proceed normally
    await super.tearDown();
  }
}
