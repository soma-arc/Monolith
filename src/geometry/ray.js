import Vec3 from './vector3.js';

export default class Ray {
    /**
     *
     * @param {Vec3} o
     * @param {Vec3} d
     */
    constructor(o, d) {
        this.o = o;
        this.d = d;
    }

    /**
     *
     * @param {Number} t
     * @returns {Vec3}
     */
    point(t) {
        return new Vec3(this.o.x + this.d.x * t,
                        this.o.y + this.d.y * t,
                        this.o.z + this.d.z * t);
    }
}
