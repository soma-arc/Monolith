import Scene from './scene/scene.js';
import Canvas3D from './canvas3d.js';

export default class CanvasHandler {
    /**
     *
     * @param {Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.prismCanvas = undefined;
        this.limitSetCanvas = undefined;
    }

    /**
     * Create canvas instances.
     * Canvases should be initialized after creation of Vue instance
     */
    initCanvases() {
        this.prismCanvas = new Canvas3D('prismCanvas', this.scene);
        this.limitSetCanvas = new Canvas3D('limitSetCanvas', this.scene);
    }

    renderLoop() {
    }
}
