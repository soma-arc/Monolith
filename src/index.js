import Vue from 'vue';
import Root from './vue/root.vue';
import Scene from './scene/scene.js';
import CanvasHandler from './canvasHandler.js';

window.addEventListener('load', () => {
    const scene = new Scene();
    const canvasHandler = new CanvasHandler(scene);

    const data = { 'scene': scene,
                   'canvasHandler': canvasHandler };

    /* eslint-disable no-new */
    new Vue({
        el: '#app',
        data: data,
        render: (h) => {
            return h('root', { 'props': data })
        },
        components: { 'root': Root }
    });

    canvasHandler.initCanvases();

    function renderLoop() {
        canvasHandler.renderLoop();
        requestAnimationFrame(renderLoop);
    }

    renderLoop();
});
