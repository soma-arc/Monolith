import Vue from 'vue';
import Root from './vue/root.vue';


window.addEventListener('load', () => {
    const data = { };

    /* eslint-disable no-new */
    new Vue({
        el: '#app',
        data: data,
        render: (h) => {
            return h('root', { 'props': data })
        },
        components: { 'root': Root }
    });
});
