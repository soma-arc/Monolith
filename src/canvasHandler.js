import Scene from './scene/scene.js';
import Canvas3D from './canvas3d.js';

const RENDER_SPHAIRAHEDRAL_PRISM_TMPL = require('./shaders/renderSphairahedralPrism.njk.frag');
const RENDER_LIMIT_SET_TMPL = require('./shaders/renderLimitSet.njk.frag');

export default class CanvasHandler {
    /**
     *
     * @param {Scene} scene
     */
    constructor(scene) {
        this.scene = scene;

        this.prismCanvas = new Canvas3D('prismCanvas', this.scene,
                                        RENDER_SPHAIRAHEDRAL_PRISM_TMPL);
        this.limitSetCanvas = new Canvas3D('limitSetCanvas', this.scene,
                                           RENDER_LIMIT_SET_TMPL);
    }

    /**
     * Create canvas instances.
     * Canvases should be initialized after creation of Vue instance
     */
    initCanvases() {
        this.prismCanvas.init();
        this.limitSetCanvas.init();

        this.prismCanvas.render();
        this.limitSetCanvas.render();
        this.limitSetCanvas.keepSampling = true;
        this.limitSetCanvas.isRenderingLowRes = true;
    }

    renderLoop() {
        if (this.scene.parameterChanging) {
            this.prismCanvas.callRender();
            this.limitSetCanvas.numSamples = 0;
            this.limitSetCanvas.callRender();
        } else if (this.prismCanvas.isRendering) {
            this.prismCanvas.callRender();
        } else if (this.limitSetCanvas.isRendering) {
            this.limitSetCanvas.numSamples = 0;
            this.limitSetCanvas.callRender();
        } else if (this.limitSetCanvas.keepSampling) {
            this.limitSetCanvas.render();
        }
    }
}
