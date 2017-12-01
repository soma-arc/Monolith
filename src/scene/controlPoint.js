import Vec3 from '../geometry/vector3.js';
import Shape from './shape.js';

export default class ControlPoint extends Shape {
    constructor(x, y, z) {
        super();
        this.center = new Vec3(x, y, z);
        this.radius = 10;
    }
}
