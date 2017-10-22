import UniformLocation from '../uniformLocation.js';

export default class Scene {
    constructor() {
        this.cameras = [];

        this.dividePlanes = [];
        this.genSpheres = [];
        this.genPlanes = [];
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
        for (let i = 0 ; i < this.genSpheres; i++) {
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
        }
        return uniLocations;
    }
}
