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

        // this.dividePlanes = [new Plane(new Vec3(1.0000000000000004,
        //                                         2.220446049250313e-15,
        //                                         -6.8833827526759706e-15),
        //                                new Vec3(-0.5000000000000016,
        //                                         0.5996460691794592,
        //                                         0.8660254037844405),
        //                                new Vec3(-0.49999999999999123,
        //                                         1.2031274226435167,
        //                                         -0.8660254037844431),
        //                                new Vec3(0.4935390911234646,
        //                                         0.8212996696957096,
        //                                         0.2861573310099587).normalize())];
        // this.genSpheres = [new Sphere(0.25951645676326907,
        //                               0,
        //                               0, 0.7404835432367309),
        //                    new Sphere(-0.31031253690463534,
        //                               0.5996460691794626,
        //                               0.5374770801444206, 0.3793749261907293),
        //                    new Sphere(-0.1289891724322335,
        //                               1.2031274226435003,
        //                               -0.2234158002788912,
        //                               0.742021655135533),
        //                   ];

        // this.genPlanes = Scene.PRISM_PLANES_333;

        this.dividePlanes = [];

        const tp1 = new Vec3(1, 0, 0);
        const tp2 = new Vec3(-0.5, 1, 1);
        const tp3 = new Vec3(-0.5, 1, -1);
        this.controlPoints = [tp1, tp1.add(tp2.sub(tp1).scale(0.5)),
                              tp2, tp2.add((tp3.sub(tp2)).scale(0.5)),
                              tp3, tp3.add((tp1.sub(tp3)).scale(0.5)),
                              new Vec3(0, 0.5, 0)];
        this.sphereVertIndexes = [[0, 1, 5, 6], [1, 2, 3, 6], [3, 4, 5, 6]];
        this.planeVertIndexes = [[0, 1, 2], [2, 3, 4], [4, 5, 0]];
        console.log('sphere')
        this.genSpheres = [];
        for (const indexes of this.sphereVertIndexes) {
            this.genSpheres.push(Sphere.fromPoints(this.controlPoints[indexes[0]],
                                                   this.controlPoints[indexes[1]],
                                                   this.controlPoints[indexes[2]],
                                                   this.controlPoints[indexes[3]]));
        }
        console.log('gened')
        this.genPlanes = [];
        for (const indexes of this.planeVertIndexes) {
            const v = this.controlPoints[indexes[2]].sub(this.controlPoints[indexes[0]]);
            const vSphere = (this.genSpheres[0].center.sub(this.controlPoints[indexes[0]]));
            let normal = new Vec3(-v.z, 0, v.x).normalize();
            if (Vec3.dot(normal, vSphere) > 0) {
                normal = normal.scale(-1);
            }
            this.genPlanes.push(new Plane(this.controlPoints[indexes[0]],
                                          this.controlPoints[indexes[1]],
                                          this.controlPoints[indexes[2]],
                                          normal));
        }
        console.log(this.genPlanes);

        this.selectingObj = undefined;
        this.selectedAxisId = -1;
        this.axisCylinderR = 0.1;
        this.axisCylinderLen = 2;

        this.sceneChangedListeners = [];
        this.parameterChanging = false;
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
            'numDividePlanes': this.dividePlanes.length,
            'numControlPoints': this.controlPoints.length
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

        for (let i = 0; i < this.controlPoints.length; i++) {
            uniLocations.push(new UniformLocation(
                gl, program,
                'u_controlPoints['+ i +']',
                (uniLoc) => {
                    gl.uniform3f(uniLoc,
                                 this.controlPoints[i].x,
                                 this.controlPoints[i].y,
                                 this.controlPoints[i].z);
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
            this.parameterChanging = true;
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
            this.parameterChanging = true;
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
            this.parameterChanging = true;
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
            this.parameterChanging = true;
            return true;
        }
        return false;
    }

    mouseUp() {
        this.parameterChanging = false;
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
