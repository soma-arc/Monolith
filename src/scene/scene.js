import UniformLocation from '../uniformLocation.js';
import Vec2 from '../geometry/vector2.js';
import Vec3 from '../geometry/vector3.js';
import Shape from './shape.js';
import Plane from './plane.js';
import Sphere from './sphere.js';
import IsectInfo from './isectInfo.js';

const RT_3 = Math.sqrt(3);
const RT_3_INV = 1 / RT_3;

export default class Scene {
    constructor() {
        this.cameras = [];

        this.dividePlanes = [new Plane(new Vec3(0, 0, 0),
                                       new Vec3(0, 0, 0),
                                       new Vec3(0, 0, 0),
                                       new Vec3(0, 1, 0))];
        this.genSpheres = [new Sphere(0, 0, 0.6, 0.8),
                           new Sphere(0.4, -1.0, 0, 0.6),
                           new Sphere(0, 0.0, 0, 0.5)
                          ];
        this.genPlanes = Scene.PRISM_PLANES_333;

        this.selectingObj = undefined;
        this.selectedAxisId = -1;
        this.axisCylinderR = 0.1;
        this.axisCylinderLen = 2;

        this.sceneChangedListeners = [];
    }

    addSceneChangedListener(listener) {
        this.sceneChangedListeners.push(listener);
    }

    sceneChanged() {
        for (const listener of this.sceneChangedListeners) {
            listener();
        }
    }

    addCamera(camera) {
        this.cameras.push(camera);
    }

    getShaderContext() {
        return {
            'numGenPlanes': this.genPlanes.length,
            'numGenSpheres': this.genSpheres.length,
            'numDividePlanes': this.dividePlanes.length
        }
    }

    getUniformLocations(uniLocations, gl, program) {
        uniLocations.push(new UniformLocation(
            gl, program,
            'u_selectingObj',
            (uniLoc) => {
                gl.uniform1i(uniLoc, this.selectingObj !== undefined);
            }
        ));
        uniLocations.push(new UniformLocation(
            gl, program,
            'u_axisCylinders.origin',
            (uniLoc) => {
                if (this.selectingObj !== undefined) {
                    const o = this.selectingObj.getOrigin();
                    gl.uniform3f(uniLoc,
                                 o.x,
                                 o.y,
                                 o.z);
                }
            }
        ));
        uniLocations.push(new UniformLocation(
            gl, program,
            'u_axisCylinders.cylinderR',
            (uniLoc) => {
                gl.uniform1f(uniLoc, this.axisCylinderR);
            }
        ));
        uniLocations.push(new UniformLocation(
            gl, program,
            'u_axisCylinders.cylinderLen',
            (uniLoc) => {
                gl.uniform1f(uniLoc, this.axisCylinderLen);
            }
        ));
        for (let i = 0; i < this.genSpheres.length; i++) {
            uniLocations.push(new UniformLocation(
                gl, program,
                'u_genSpheres['+ i +'].center',
                (uniLoc) => {
                    gl.uniform3f(uniLoc,
                                 this.genSpheres[i].center.x,
                                 this.genSpheres[i].center.y,
                                 this.genSpheres[i].center.z);
                }
            ));
            uniLocations.push(new UniformLocation(
                gl, program,
                'u_genSpheres['+ i +'].r',
                (uniLoc) => {
                    gl.uniform2f(uniLoc,
                                 this.genSpheres[i].r,
                                 this.genSpheres[i].rSq);
                }
            ));
        }

        for (let i = 0; i < this.genPlanes.length; i++) {
            uniLocations.push(new UniformLocation(
                gl, program,
                'u_genPlanes['+ i +'].origin',
                (uniLoc) => {
                    gl.uniform3f(uniLoc,
                                 this.genPlanes[i].p1.x,
                                 this.genPlanes[i].p1.y,
                                 this.genPlanes[i].p1.z);
                }
            ));
            uniLocations.push(new UniformLocation(
                gl, program,
                'u_genPlanes['+ i +'].normal',
                (uniLoc) => {
                    gl.uniform3f(uniLoc,
                                 this.genPlanes[i].normal.x,
                                 this.genPlanes[i].normal.y,
                                 this.genPlanes[i].normal.z);
                }
            ));
        }

        for (let i = 0; i < this.dividePlanes.length; i++) {
            uniLocations.push(new UniformLocation(
                gl, program,
                'u_dividePlanes['+ i +'].origin',
                (uniLoc) => {
                    gl.uniform3f(uniLoc,
                                 this.dividePlanes[i].p1.x,
                                 this.dividePlanes[i].p1.y,
                                 this.dividePlanes[i].p1.z);
                }
            ));
            uniLocations.push(new UniformLocation(
                gl, program,
                'u_dividePlanes['+ i +'].normal',
                (uniLoc) => {
                    gl.uniform3f(uniLoc,
                                 this.dividePlanes[i].normal.x,
                                 this.dividePlanes[i].normal.y,
                                 this.dividePlanes[i].normal.z);
                }
            ));
        }
        return uniLocations;
    }

    /**
     *
     * @param {Camera} camera
     * @param {Vec2} coord
     * @param {Transform} rasterToScreen
     * @return {IsectInfo}
     */
    castRay(camera, coord, rasterToScreen) {
        const ray = camera.generatePerspectiveRay(coord, rasterToScreen);
        const isectInfo = new IsectInfo(Number.MAX_VALUE, Number.MAX_VALUE);
        for (const s of this.genSpheres) {
            s.computeIntersection(ray, isectInfo);
        }
        return isectInfo;
    }

    /**
     *
     * @param {Vec2} coord
     * @param {Camera} camera
     * @param {Transform} rasterToScreen
     * @return {Boolean}
     */
    selectObj(coord, camera, rasterToScreen) {
        if (this.selectingObj !== undefined) {
            const ray = camera.generatePerspectiveRay(coord, rasterToScreen);
            const isectInfo = new IsectInfo(Number.MAX_VALUE, Number.MAX_VALUE);
            this.selectingObj.computeIntersectionToAxis(ray, isectInfo,
                                                        this.selectingObj.center,
                                                        this.axisCylinderR,
                                                        this.axisCylinderLen);
            if (isectInfo.hitObject !== undefined) {
                this.prevOrigin = this.selectingObj.getOrigin();
                this.selectedAxisId = isectInfo.isectComponentId;
                return true;
            }
        }
        const isectInfo = this.castRay(camera, coord, rasterToScreen);
        const isUpdated = this.selectingObj !== isectInfo.hitObject;
        this.selectingObj = isectInfo.hitObject;

        return isUpdated;
    }

    /**
     *
     * @param {Vec2} mouse
     * @return {Boolean}
     */
    mouseLeftDown(mouse) {
        return false;
    }

    /**
     * @param {Vec2} mouse
     * @return {Boolean}
     */
    mouseRightDown(mouse, camera, rasterToScreen) {
        if (this.operateScale) {
            this.prevOrigin = this.selectingObj.getOrigin();
            this.prevScale = this.selectingObj.getScale();
            return false;
        }
        const isUpdated = this.selectObj(mouse, camera, rasterToScreen);
        return isUpdated;
    }

    /**
     *
     * @param {Vec2} mouse
     * @param {Vec2} prevMouse
     * @returns {Boolean}
     */
    mouseRightMove(mouse, prevMouse, camera, rasterToScreen) {
        if (this.selectingObj === undefined) return false;
        if (this.operateScale) {
            const centerOnCanvas = camera.coordOnCanvas(this.prevOrigin, rasterToScreen);
            const d1 = Vec2.distance(centerOnCanvas, prevMouse);
            const d2 = Vec2.distance(centerOnCanvas, mouse);
            this.selectingObj.setScale(this.prevScale + (d2 - d1));
            this.sceneChanged();
        } else if (this.selectedAxisId === Shape.X_AXIS) {
            const diffV = mouse.sub(prevMouse);
            const centerOnCanvas = camera.coordOnCanvas(this.prevOrigin, rasterToScreen);
            const xAxis = camera.axisXDirOnCanvas();
            const d = Vec2.dot(diffV, xAxis);
            const np = centerOnCanvas.add(xAxis.scale(d));
            const isectInfo = new IsectInfo(Number.MAX_VALUE, Number.MAX_VALUE);
            const ray = camera.generatePerspectiveRay(np, rasterToScreen);
            this.selectingObj.intersectXCylinder(ray, isectInfo,
                                                 this.prevOrigin, this.axisCylinderR);
            this.selectingObj.setOrigin(camera.pos.add(ray.d.scale(isectInfo.tmin + this.axisCylinderR)));
            this.sceneChanged();
            return true;
        } else if (this.selectedAxisId === Shape.Y_AXIS) {
            const diffV = mouse.sub(prevMouse);
            const centerOnCanvas = camera.coordOnCanvas(this.prevOrigin, rasterToScreen);
            const yAxis = camera.axisYDirOnCanvas();
            const d = Vec2.dot(diffV, yAxis);
            const np = centerOnCanvas.add(yAxis.scale(d));
            const isectInfo = new IsectInfo(Number.MAX_VALUE, Number.MAX_VALUE);
            const ray = camera.generatePerspectiveRay(np, rasterToScreen);
            const r = this.axisCylinderR * 2;
            this.selectingObj.intersectYCylinder(ray, isectInfo,
                                                 this.prevOrigin, r);
            this.selectingObj.setOrigin(camera.pos.add(ray.d.scale(isectInfo.tmin + r)));
            this.sceneChanged();
            return true;
        } else if (this.selectedAxisId === Shape.Z_AXIS) {
            const diffV = mouse.sub(prevMouse);
            const centerOnCanvas = camera.coordOnCanvas(this.prevOrigin, rasterToScreen);
            const zAxis = camera.axisZDirOnCanvas();
            const d = Vec2.dot(diffV, zAxis);
            const np = centerOnCanvas.add(zAxis.scale(d));
            const isectInfo = new IsectInfo(Number.MAX_VALUE, Number.MAX_VALUE);
            const ray = camera.generatePerspectiveRay(np, rasterToScreen);
            this.selectingObj.intersectZCylinder(ray, isectInfo,
                                                 this.prevOrigin, this.axisCylinderR);
            this.selectingObj.setOrigin(camera.pos.add(ray.d.scale(isectInfo.tmin + this.axisCylinderR)));
            this.sceneChanged();
            return true;
        }
        return false;
    }

    mouseUp() {
        this.selectedAxisId = -1;
    }

    keydown(key) {
        if (key === 's' && this.selectingObj !== undefined) {
            this.operateScale = true;
        }
    }

    keyup() {
        this.operateScale = false;
    }

    static get PRISM_PLANES_333 () {
        // AB - CA - BC
        return [new Plane(new Vec3(0, 5, RT_3_INV),
                          new Vec3(1, 1, 0),
                          new Vec3(2, 2, -RT_3_INV),
                          new Vec3(RT_3 * 0.5, 0, 1.5).normalize()),
                new Plane(new Vec3(0, 3, -RT_3_INV),
                          new Vec3(1, 3, 0),
                          new Vec3(2, 2, RT_3_INV),
                          new Vec3(RT_3 * 0.5, 0, -1.5).normalize()),
                new Plane(new Vec3(-0.5, 0, 1),
                          new Vec3(-0.5, 1, 0),
                          new Vec3(-0.5, 2, 1),
                          new Vec3(-1, 0, 0))];
    }
}
