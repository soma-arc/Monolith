import Vec3 from '../geometry/vector3.js';
import Transform from '../geometry/transform.js';
import UniformLocation from '../uniformLocation.js';

export default class Camera {
    constructor(pos, target, up, fov) {
        this.pos = pos;
        this.target = target;
        this.up = up;
        this.fov = fov;

        this.viewM = Transform.lookAt(pos, target, up);
        this.projectM = Transform.perspective(fov, 0.01, 1000);
    }

    getUniformLocations(uniLocations, gl, program) {
        uniLocations.push(new UniformLocation(
            gl, program,
            'u_projectMatrix',
            (uniLoc) => {
                gl.uniformMatrix4fv(uniLoc, false, this.projectM.mInv.elem);
            }));
        uniLocations.push(new UniformLocation(
            gl, program,
            'u_cameraToWorld',
            (uniLoc) => {
                gl.uniformMatrix4fv(uniLoc, false, this.viewM.mInv.elem);
            }));
        return uniLocations;
    }
}
