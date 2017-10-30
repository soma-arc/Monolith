import UniformLocation from '../uniformLocation.js';
import Vec3 from '../geometry/vector3.js';
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
        this.genSpheres = [new Sphere(0, 0, 0.6, 1),
                           new Sphere(0.4, -1.0, 0, 1.3)];
        this.genPlanes = Scene.PRISM_PLANES_333;
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

    castRay(camera, coord, rasterToScreen) {
        const ray = camera.generatePerspectiveRay(coord, rasterToScreen);
        console.log(ray);
        const isectInfo = new IsectInfo(Number.MAX_VALUE, Number.MAX_VALUE);
        for (const s of this.genSpheres) {
            s.computeIntersection(ray, isectInfo);
        }
        console.log(isectInfo.hitObject);
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
