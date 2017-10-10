export default class UniformLocation {
    constructor(gl, program, uniformName, setValueFunc) {
        this.uniLoc = gl.getUniformLocation(program,
                                            uniformName);
        this.setValueFunc = setValueFunc;
    }

    setValue() {
        this.setValueFunc(this.uniLoc);
    }
}
