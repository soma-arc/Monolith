import Vec2 from '../geometry/vector2.js';
import Vec3 from '../geometry/vector3.js';
import Transform from '../geometry/transform.js';
import UniformLocation from '../uniformLocation.js';
import Ray from '../geometry/ray.js';

export default class Camera {
    constructor(pos, target, up, fov) {
        this.pos = pos;
        this.target = target;
        this.up = up;
        this.fov = fov;
        this.distToTarget = Vec3.distance(pos, target);

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

    /**
     *
     * @param {Vec2} mouse
     */
    mouseLeftDown(mouse) {
        this.prevPosition = this.pos;
        this.prevUp = this.up;
        this.prevMouse = mouse;
    }

    /**
     *
     * @param {Vec2} mouse
     */
    mouseRightDown(mouse) {}

    /**
     *
     * @param {Vec2} mouse
     * @param {Vec2} prevMouse
     */
    mouseLeftMove(mouse, prevMouse) {
        const t = Transform.translate(this.target.x, this.target.y, this.target.z);
        const dir = this.target.sub(this.prevPosition).normalize();

        const rotAxis = Vec3.cross(dir, this.prevUp);
        const rY = Transform.rotate(-(mouse.y - prevMouse.y), rotAxis);

        const rX = Transform.rotate((mouse.x - prevMouse.x),
                                    new Vec3(0, 1, 0));

        const m = t.mult(rX.mult(rY)).mult(t.inverse());

        this.pos = m.applyToPoint(this.prevPosition);
        this.up = rX.mult(rY).applyToVec(this.prevUp);
        this.viewM = Transform.lookAt(this.pos, this.target, this.up);

        this.prevMouse = mouse;
    }

    /**
     *
     * @param {Vec2} mouse
     * @param {Vec2} prevMouse
     */
    mouseRightMove(mouse, prevMouse) {}

    /**
     *
     * @param {Number} deltaY
     */
    mouseWheel(deltaY) {
        this.distScale = 1.2;
        let nd;
        if (deltaY < 0) {
            nd = this.distToTarget / this.distScale;
        } else {
            nd = this.distToTarget * this.distScale;
        }
        this.changeDistToTarget(nd);
    }

    changeDistToTarget(newDist) {
        this.distToTarget = newDist;
        const dir = this.pos.sub(this.target).normalize();
        this.pos = this.target.add(dir.scale(this.distToTarget));
        this.viewM = Transform.lookAt(this.pos, this.target, this.up);
    }

    update() {
        this.viewM = Transform.lookAt(this.pos, this.target, this.up);
        this.projectM = Transform.perspective(this.fov, 0.01, 1000);
    }

    /**
     *
     * @param {Vec2} coord
     * @param {Transform} rasterToScreen
     */
    generatePerspectiveRay(coord, rasterToScreen) {
        const rasterToCamera = this.projectM.inverse().mult(rasterToScreen);
        const pCamera = rasterToCamera.applyToPoint(new Vec3(coord.x, coord.y, 0));
        return new Ray(this.pos,
                       this.viewM.inverse().applyToVec(pCamera.normalize()));
    }

    /**
     * Transform world coordinate to canvas coordinate
     * @param {Vec3} coordOnWorld
     * @param {Transform} rasterToScreen
     * @returns {Vec2}
     */
    coordOnCanvas(coordOnWorld, rasterToScreen) {
        const vpM = this.projectM.mult(this.viewM);
        const p = vpM.applyToPoint(coordOnWorld);
        const np = rasterToScreen.inverse().applyToPoint(p);
        return new Vec2(np.x, np.y);
    }

    /**
     * Transform world vector to canvas coordinate
     * @param {Vec3} v
     */
    dirOnCanvas(v) {
        const vpM = this.projectM.mult(this.viewM);
        const nv = vpM.applyToVec(v.normalize()).normalize();
        return new Vec2(nv.x, -nv.y);
    }

    /**
     *
     * @returns {Vec2}
     */
    axisXDirOnCanvas() {
        return this.dirOnCanvas(new Vec3(1, 0, 0));
    }

    /**
     *
     * @returns {Vec2}
     */
    axisYDirOnCanvas() {
        return this.dirOnCanvas(new Vec3(0, 1, 0));
    }

    /**
     *
     * @returns {Vec2}
     */
    axisZDirOnCanvas() {
        return this.dirOnCanvas(new Vec3(0, 0, 1));
    }
}
