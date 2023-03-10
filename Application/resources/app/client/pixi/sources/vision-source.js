/**
 * @typedef {Object}                      VisionSourceData
 * @property {number} x                   The x-coordinate of the source location
 * @property {number} y                   The y-coordinate of the source location
 * @property {number} z                   An optional z-index sorting for the source
 * @property {number} rotation            The angle of rotation for this point source
 * @property {number} angle               The angle of emission for this point source
 * @property {number} bright              The allowed radius of bright vision or illumination
 * @property {number} radius              The allowed radius of vision
 * @property {number} externalRadius      A secondary radius used for limited angles
 * @property {boolean} isPreview          Is this vision source a temporary preview?
 */

/**
 * A specialized subclass of the PointSource abstraction which is used to control the rendering of vision sources.
 * @extends {PointSource}
 * @param {Token} object                  The Token object that generates this vision source
 */
class VisionSource extends PointSource {
  constructor(object) {
    super(object);

    /**
     * The current background mesh for this source
     * @type {PIXI.Mesh|null}
     */
    this.background = null;

    /**
     * The current vision illumination mesh for this source
     * @type {PIXI.Mesh|null}
     */
    this.illumination = null;

    /**
     * The current vision coloration mesh for this source
     * @type {PIXI.Mesh|null}
     */
    this.coloration = null;

    /**
     * The vision mode linked to this VisionSource
     * @type {VisionMode|null}
     */
    this.visionMode = null;
  }

  /** @inheritdoc */
  static sourceType = "sight";

  /**
   * Keys in the VisionSourceData structure which, when modified, change the appearance of the source
   * @type {string[]}
   * @private
   */
  static _appearanceKeys = ["radius", "color", "attenuation", "brightness", "contrast", "saturation", "visionMode"];

  /** @inheritdoc */
  static EDGE_OFFSET = -2;

  /* -------------------------------------------- */
  /*  Vision Source Attributes                    */
  /* -------------------------------------------- */

  /**
   * The object of data which configures how the source is rendered
   * @type {VisionSourceData}
   */
  data = {};

  /**
   * The constrained LOS polygon that is generated by the origin and radius of this source.
   * @type {PointSourcePolygon}
   */
  fov;

  /**
   * Track which uniforms need to be reset
   * @type {{background: boolean, illumination: boolean, coloration: boolean}}
   * @private
   */
  _resetUniforms = {
    background: true,
    illumination: true,
    coloration: true
  };

  /**
   * To track if a source is temporarily shutdown to avoid glitches
   * @type {{background: boolean, illumination: boolean, coloration: boolean}}
   * @private
   */
  _shutdown = {
    background: false,
    illumination: false,
    coloration: false
  };

  /**
   * Is this VisionSource a temporary preview which should not produce fog exploration?
   * @returns {boolean}
   */
  get isPreview() {
    return this.object.isPreview || !!this.object._preview;
  }

  /* -------------------------------------------- */
  /*  Vision Source Initialization                */
  /* -------------------------------------------- */

  /**
   * Initialize the source with provided object data.
   * @param {object} data             Initial data provided to the point source.
   * @returns {VisionSource}          A reference to the initialized source.
   */
  initialize(data={}) {

    // Initialize new input data
    const changes = this._initializeData(data);

    // Determine the active VisionMode
    this._initializeVisionMode();
    if ( !(this.visionMode instanceof VisionMode) ) {
      throw new Error("The VisionSource was not provided a valid VisionMode identifier");
    }

    // Configure animation, if any
    this.animation = {
      animation: this.visionMode.animate,
      seed: this.animation.seed ?? data.seed ?? Math.floor(Math.random() * 100000)
    };

    // Compute derived data attributes
    this.colorRGB = Color.from(this.data.color)?.rgb;

    // Compute the unrestricted line-of-sight polygon
    this.los = this._createPolygon();

    // Compute the constrained vision polygon
    this.fov = this._createRestrictedPolygon();

    // Render soft edges according to performances mode
    // TODO: this is a temporary workaround to know if we have a complete circle, to handle fast triangulation
    const isCompleteCircle = (this.fov.points.length === PIXI.Circle.approximateVertexDensity(this.radius) * 2);
    this._flags.renderSoftEdges = canvas.performance.lightSoftEdges && (!isCompleteCircle || (this.data.angle < 360));

    // Initialize or update meshes with the constrained los points array
    this._initializeMeshes(this.fov);
    const updateShaders = ["visionMode", "blinded"].some(k => k in changes);
    if ( updateShaders ) this._initializeShaders();
    else if ( this.constructor._appearanceKeys.some(k => k in changes) ) {
      for ( let k of Object.keys(this._resetUniforms) ) {
        this._resetUniforms[k] = true;
      }
    }

    // Set the correct blend mode
    this._initializeBlending();
    return this;
  }

  /* -------------------------------------------- */

  /**
   * Responsible for assigning the Vision Mode and handling exceptions based on vision special status.
   * @protected
   */
  _initializeVisionMode() {
    // Handle the blinded special status
    if ( this.data.blinded ) {
      this.visionMode = CONFIG.Canvas.visionModes.blindness;
      this.data.radius = this.data.externalRadius;
      return;
    }
    // Assign the required vision mode
    const visionMode = this.data.visionMode in CONFIG.Canvas.visionModes ? this.data.visionMode : "basic";
    this.visionMode = CONFIG.Canvas.visionModes[visionMode];
  }

  /* -------------------------------------------- */

  /**
   * If this vision source background is rendered into the lighting container.
   * @returns {number}
   */
  get preferred() {
    return this.visionMode.vision.preferred;
  }

  /* -------------------------------------------- */

  /** @override */
  _getPolygonConfiguration() {
    return {
      source: this,
      type: "sight",
      angle: this.data.angle,
      rotation: this.data.rotation,
      externalRadius: this.data.externalRadius
    };
  }

  /* -------------------------------------------- */

  /**
   * Create a restricted FOV polygon by limiting the radius of the unrestricted LOS polygon.
   * @returns {PointSourcePolygon}
   * @protected
   */
  _createRestrictedPolygon() {
    const origin = {x: this.data.x, y: this.data.y};
    this.radius = this.data.radius;
    const density = PIXI.Circle.approximateVertexDensity(this.radius);
    const fovCircle = new PIXI.Circle(origin.x, origin.y, this.radius);
    return this.los.applyConstraint(fovCircle, {density, scalingFactor: 100});
  }

  /* -------------------------------------------- */

  /**
   * Initialize the shaders used for this source, swapping to a different shader if the vision effect has changed.
   * @private
   */
  _initializeShaders() {

    // Create each shader
    const createShader = (cls, container) => {
      const current = container.shader;
      if ( current?.constructor.name === cls.name ) return;
      const shader = cls.create({
        primaryTexture: canvas.primary.renderTexture
      });
      shader.container = container;
      container.shader = shader;
      if ( current ) current.destroy();
    };

    // Initialize shaders
    createShader(this.visionMode.vision.background.shader ?? BackgroundVisionShader, this.background);
    createShader(this.visionMode.vision.illumination.shader ?? IlluminationVisionShader, this.illumination);
    createShader(this.visionMode.vision.coloration.shader ?? ColorationVisionShader, this.coloration);

    // Initialize uniforms
    this._updateUniforms();

    /**
     * A hook event that fires after VisionSource shaders have initialized.
     * @function initializeVisionSourceShaders
     * @memberof hookEvents
     * @param {PointSource} source   The VisionSource being initialized
     */
    Hooks.callAll("initializeVisionSourceShaders", this);
  }

  /* -------------------------------------------- */

  /**
   * Initialize the blend mode and vertical sorting of this source relative to others in the container.
   * @private
   */
  _initializeBlending() {
    const BM = PIXI.BLEND_MODES;

    // Background
    this.background.blendMode = BM.MAX_COLOR;
    this.background.zIndex = 0;

    // Illumination
    this.illumination.blendMode = BM.MAX_COLOR;
    this.illumination.zIndex = 0;

    // Coloration
    this.coloration.blendMode = BM.SCREEN;
    this.coloration.zIndex = 0;
  }

  /* -------------------------------------------- */

  /**
   * Process new input data provided to the LightSource.
   * @param {object} data             Initial data provided to the vision source
   * @returns {object}                The changes compared to the prior data
   * @private
   */
  _initializeData(data) {
    // Get the default values from the AmbientLightData schema
    const initial = AmbientLightDocument.cleanData();
    Object.assign(initial, initial.config);
    ["_id", "flags", "config"].forEach(k => delete initial[k]);

    // Merge data onto defaults
    data = foundry.utils.mergeObject(initial, data);
    if ( Number.isNaN(data.color) ) data.color = null;

    // Identify changes compared to the current object
    const changes = foundry.utils.flattenObject(foundry.utils.diffObject(this.data, data));
    this.data = data;
    return changes;
  }

  /* -------------------------------------------- */
  /*  Vision Source Rendering                     */
  /* -------------------------------------------- */

  /** @inheritdoc */
  _createMeshes() {
    this.background = this._createMesh(BackgroundVisionShader);
    this.illumination = this._createMesh(IlluminationVisionShader);
    this.coloration = this._createMesh(ColorationVisionShader);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  destroy() {
    this.background?.destroy();
    this.illumination?.destroy();
    this.coloration?.destroy();
    super.destroy();
  }

  /* -------------------------------------------- */

  /** @override */
  refreshSource() {
    if ( !this._meshesInit ) return;

    // Update all uniforms for every layer
    this._updateUniforms();
  }

  /* -------------------------------------------- */

  /**
   * Render the containers used to represent this light source within the LightingLayer.
   * @returns {Object<PIXI.Mesh>}
   */
  drawMeshes() {
    const background = this.drawBackground();
    const vision = this.drawVision();
    const color = this.drawColor();
    return {background, vision, color};
  }

  /* -------------------------------------------- */

  /**
   * Draw the background mesh which provide special vision.
   * @returns {PIXI.Mesh|null}         The rendered light container.
   */
  drawBackground() {
    // Protect against cases where no background is present
    const shader = this.background.shader;
    if ( !shader ) return null;

    // Update background uniforms
    if ( this._resetUniforms.background ) {
      this._updateBackgroundUniforms();
      this._resetUniforms.background = false;
      this.background.visible = shader.isRequired;
    }

    // Draw the container
    return this._updateMesh(this.background);
  }

  /* -------------------------------------------- */

  /**
   * Draw the illumination mesh which provide vision.
   * @returns {PIXI.Mesh|null}         The rendered light container.
   */
  drawVision() {
    // Protect against cases where the canvas is being deactivated
    const shader = this.illumination.shader;
    if ( !shader ) return null;

    // Update illumination uniforms
    const ic = this.illumination;
    if ( this._resetUniforms.illumination ) {
      this._updateIlluminationUniforms();
      if ( this._shutdown.illumination ) this._shutdown.illumination = !(ic.renderable = true);
    }
    if ( this._resetUniforms.illumination ) {
      this._resetUniforms.illumination = false;
    }

    // Draw the container
    return this._updateMesh(ic);
  }

  /* -------------------------------------------- */

  /**
   * Draw and return a container used to depict the visible color tint of the light source on the LightingLayer
   * @returns {PIXI.Mesh|null}          An updated color container for the source
   */
  drawColor() {

    // Protect against cases where no coloration is present
    const shader = this.coloration.shader;
    if ( !shader ) return null;

    // Update coloration uniforms
    if ( this._resetUniforms.coloration ) {
      this._updateColorationUniforms();
      this._resetUniforms.coloration = false;
      this.coloration.visible = shader.isRequired;
    }

    // Draw the container
    return this._updateMesh(this.coloration);
  }

  /* -------------------------------------------- */
  /*  Shader Management                           */
  /* -------------------------------------------- */

  /**
   * Update all layer uniforms.
   * @protected
   */
  _updateUniforms() {
    this._updateBackgroundUniforms();
    this._updateIlluminationUniforms();
    this._updateColorationUniforms();
  }

  /* -------------------------------------------- */

  /**
   * Update shader uniforms by providing data from this PointSource
   * @private
   */
  _updateColorationUniforms() {
    const shader = this.coloration.shader;
    const u = shader.uniforms;
    const d = shader._defaults;
    u.colorEffect = this.data.color ? this.colorRGB : d.colorEffect;
    u.useSampler = true;
    this._updateCommonUniforms(shader);
  }

  /* -------------------------------------------- */

  /**
   * Update shader uniforms by providing data from this PointSource
   * @private
   */
  _updateIlluminationUniforms() {
    const shader = this.illumination.shader;
    const u = shader.uniforms;
    const colorBright = canvas.colors.bright.maximize(canvas.colors.background);
    const colorDim = canvas.colors.dim;
    const colorBackground = canvas.colors.background;

    // Modify and assign vision color according to brightness.
    // (brightness 0.5 = dim color, brightness 1.0 = bright color)
    if ( this.data.brightness <= 0 ) u.colorVision = colorBackground.mix(colorDim, this.data.brightness + 1).rgb;
    else u.colorVision = colorDim.mix(colorBright, this.data.brightness).rgb;

    u.useSampler = false; // We don't need to use the background sampler into vision illumination
    this._updateCommonUniforms(shader);
  }

  /* -------------------------------------------- */

  /**
   * Update shader uniforms by providing data from this PointSource
   * @private
   */
  _updateBackgroundUniforms() {
    const shader = this.background.shader;
    const u = shader.uniforms;
    u.technique = 0;
    u.contrast = this.data.contrast;
    u.useSampler = true;
    this._updateCommonUniforms(shader);
  }

  /* -------------------------------------------- */

  /**
   * Update shader uniforms shared by all shader types
   * @param {AdaptiveVisionShader} shader        The shader being updated
   * @private
   */
  _updateCommonUniforms(shader) {
    const u = shader.uniforms;
    const d = shader._defaults;
    u.attenuation = Math.max(this.data.attenuation, 0.0125);
    u.saturation = this.data.saturation;
    u.screenDimensions = canvas.screenDimensions;
    u.colorTint = this.data.color ? this.colorRGB : d.colorTint;
    u.colorBackground = canvas.colors.background.rgb;
    u.brightness = (this.data.brightness + 1) / 2;
    u.darknessLevel = canvas.colorManager.darknessLevel;
    u.linkedToDarknessLevel = this.visionMode.vision.darkness.adaptive;
    u.depthElevation = canvas.primary.mapElevationAlpha(this.elevation);
    if ( !u.depthTexture ) u.depthTexture = canvas.masks.depth.renderTexture;
    if ( !u.primaryTexture ) u.primaryTexture = canvas.primary.renderTexture;
  }

  /* -------------------------------------------- */
  /*  Animation Functions                         */
  /* -------------------------------------------- */

  /**
   * Generic time animation with Vision Sources.
   * @param {number} dt            Delta time.
   */
  animateTime(dt) {
    const t = (canvas.app.ticker.lastTime / 1000) + this.animation.seed;
    this.background.uniforms.time = this.coloration.uniforms.time = this.illumination.uniforms.time = t;
  }
}
