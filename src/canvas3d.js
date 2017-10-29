import Canvas from './canvas.js';
import Vec2 from './geometry/vector2.js';
import Vec3 from './geometry/vector3.js';
import Scene from './scene/scene.js';
import { GetWebGL2Context, CreateSquareVbo, AttachShader,
         LinkProgram, CreateRGBATextures } from './glUtils';
import UniformLocation from './uniformLocation.js';
import Camera from './scene/camera.js';

const RENDER_VERTEX = require('./shaders/render.vert');
const RENDER_FRAGMENT = require('./shaders/render.frag');
const RENDER_FLIPPED_VERTEX = require('./shaders/renderFlipped.vert');

const RENDER_TEST_FRAG = require('./shaders/render-test.frag');

export default class Canvas3D extends Canvas {
    /**
     *
     * @param {String} canvasId
     * @param {Scene} scene
     * @param {} shaderTemplate
     */
    constructor(canvasId, scene, shaderTemplate) {
        super(canvasId);
        this.scene = scene;
        this.shaderTemplate = shaderTemplate;
        this.camera = new Camera(new Vec3(8, 0, 0),
                                 new Vec3(0, 0, 0),
                                 new Vec3(1, 1, 0),
                                 60);
        // this.pixelRatio = 1.0; //window.devicePixelRatio;

        this.mouseState = {
            isPressing: false,
            prevPosition: new Vec2(0, 0),
            button: -1
        };

        this.fudgeFactor = 0.2;
        this.marchingThreshold = 0.00001;
        this.maxIterations = 50;
        this.isRendering = false;

        this.isKeepingSampling = false;
        this.isRenderingLowRes = false;
        this.renderTimer = undefined;

        this.aoEps = 0.0968;
        this.aoIntensity = 2.0;

        this.accTexture = null;
        this.renderWidth = 0;
        this.renderHeight = 0;
    }

    init() {
        this.canvas = document.getElementById(this.canvasId);
        this.gl = GetWebGL2Context(this.canvas);
        this.vertexBuffer = CreateSquareVbo(this.gl);

        this.addEventListeners();

        this.initRenderCanvasPrograms();
        this.initRenderTextureProgram();

        this.texturesFrameBuffer = this.gl.createFramebuffer();
        this.initRenderTextures();
    }

    initRenderTextureProgram() {
        this.numSamples = 0;
        this.renderTextureProgram = this.gl.createProgram();
        AttachShader(this.gl, RENDER_VERTEX, this.renderTextureProgram, this.gl.VERTEX_SHADER);
        AttachShader(this.gl,
                     this.shaderTemplate.render(this.scene.getShaderContext()),
                     this.renderTextureProgram, this.gl.FRAGMENT_SHADER);
        LinkProgram(this.gl, this.renderTextureProgram);
        this.getRenderUniformLocations(this.renderTextureProgram);
    }

    /**
     * Create programs to render textures to canvas.
     */
    initRenderCanvasPrograms() {
        this.renderCanvasProgram = this.gl.createProgram();
        AttachShader(this.gl, RENDER_VERTEX,
                     this.renderCanvasProgram, this.gl.VERTEX_SHADER);
        AttachShader(this.gl, RENDER_FRAGMENT,
                     this.renderCanvasProgram, this.gl.FRAGMENT_SHADER);
        LinkProgram(this.gl, this.renderCanvasProgram);
        this.renderCanvasVAttrib = this.gl.getAttribLocation(this.renderCanvasProgram,
                                                             'a_vertex');

        // To save rendered image, we have to flip y-coordinate
        this.productRenderProgram = this.gl.createProgram();
        AttachShader(this.gl, RENDER_FLIPPED_VERTEX,
                     this.productRenderProgram, this.gl.VERTEX_SHADER);
        AttachShader(this.gl, RENDER_FRAGMENT,
                     this.productRenderProgram, this.gl.FRAGMENT_SHADER);
        LinkProgram(this.gl, this.productRenderProgram);
    }

    initRenderTextures() {
        this.renderTextures = CreateRGBATextures(this.gl, this.canvas.width,
                                                 this.canvas.height, 2);
        this.lowResTextures = CreateRGBATextures(this.gl,
                                                 this.canvas.width * this.lowResRatio,
                                                 this.canvas.height * this.lowResRatio, 2);
    }

    /**
     * Calculate screen coordinates from mouse position
     * [0, 0]x[width, height]
     * @param {number} mx
     * @param {number} my
     * @returns {Vec2}
     */
    calcCanvasCoord(mx, my) {
        const rect = this.canvas.getBoundingClientRect();
        return new Vec2((mx - rect.left) * this.pixelRatio,
                        (my - rect.top) * this.pixelRatio);
    }

    getRenderUniformLocations(program) {
        this.uniLocations = [];
        this.uniLocations.push(new UniformLocation(
            this.gl, program,
            'u_accTexture',
            (uniLoc) => {
                this.gl.activeTexture(this.gl.TEXTURE0);
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.accTexture);
                this.gl.uniform1i(uniLoc, 0);
            }));
        this.uniLocations.push(new UniformLocation(
            this.gl, program,
            'u_textureWeight',
            (uniLoc) => {
                this.gl.uniform1f(uniLoc, this.numSamples / (this.numSamples + 1));
            }));
        this.uniLocations.push(new UniformLocation(
            this.gl, program,
            'u_numSamples',
            (uniLoc) => {
                this.gl.uniform1f(uniLoc, this.numSamples);
            }));
        this.uniLocations.push(new UniformLocation(
            this.gl, program,
            'u_resolution',
            (uniLoc) => {
                this.gl.uniform2f(uniLoc,
                                  this.renderWidth,
                                  this.renderHeight);
            }));
        this.uniLocations.push(new UniformLocation(
            this.gl, program,
            'u_maxIISIterations',
            (uniLoc) => {
                this.gl.uniform1i(uniLoc,
                                  50);
            }));
        this.uniLocations.push(new UniformLocation(
            this.gl, program,
            'u_fudgeFactor',
            (uniLoc) => {
                this.gl.uniform1f(uniLoc,
                                  0.2);
            }));
        this.camera.getUniformLocations(this.uniLocations, this.gl, program);
        this.scene.getUniformLocations(this.uniLocations, this.gl, program);
    }

    setRenderUniformValues(width, height, texture) {
        this.renderWidth = width;
        this.renderHeight = height;
        this.accTexture = texture;

        for (const u of this.uniLocations) {
            u.setValue();
        }
    }

    renderToTexture(textures, width, height) {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.texturesFrameBuffer);
        this.gl.viewport(0, 0, width, height);
        this.gl.useProgram(this.renderTextureProgram);
        this.setRenderUniformValues(width, height, textures[0]);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0,
                                     this.gl.TEXTURE_2D, textures[1], 0);
        this.gl.enableVertexAttribArray(this.renderCanvasVAttrib);
        this.gl.vertexAttribPointer(this.renderCanvasVAttrib, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        textures.reverse();
    }

    renderTexturesToCanvas(textures) {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.useProgram(this.renderCanvasProgram);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, textures[0]);
        const tex = this.gl.getUniformLocation(this.renderCanvasProgram, 'u_texture');
        this.gl.uniform1i(tex, textures[0]);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.renderCanvasVAttrib, 2,
                                    this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.flush();
    }

    callRender() {
        if (this.isRenderingLowRes) {
            this.renderLowRes();
        } else {
            this.render();
        }
    }

    render() {
        if (this.numSamples >= this.maxSamples) return;

        this.renderToTexture(this.renderTextures,
                             this.canvas.width, this.canvas.height);
        this.renderTexturesToCanvas(this.renderTextures);
        if (this.isKeepingSampling) {
            this.numSamples++;
        }
    }

    mouseWheelListener(event) {
        event.preventDefault();
        this.numSamples = 0;
        this.camera.mouseWheel(event.deltaY);
        this.callRender();
    }

    mouseDownListener(event) {
        event.preventDefault();
        this.canvas.focus();
        this.mouseState.isPressing = true;
        const mouse = this.calcCanvasCoord(event.clientX, event.clientY);
        this.mouseState.prevPosition = mouse
        this.mouseState.button = event.button;
        if (event.button === Canvas.MOUSE_BUTTON_LEFT) {
            this.camera.mouseLeftDown(mouse);
        } else if (event.button === Canvas.MOUSE_BUTTON_RIGHT) {
        }
    }

    mouseDblClickListener(event) {
    }

    mouseUpListener(event) {
        this.mouseState.isPressing = false;
        this.isRendering = false;
    }

    mouseMoveListener(event) {
        event.preventDefault();
        if (!this.mouseState.isPressing) return;
        const mouse = this.calcCanvasCoord(event.clientX, event.clientY);
        if (this.mouseState.button === Canvas.MOUSE_BUTTON_LEFT) {
            this.camera.mouseLeftMove(mouse, this.mouseState.prevPosition);
            this.isRendering = true;
            this.callRender();
        } else if (this.mouseState.button === Canvas.MOUSE_BUTTON_RIGHT) {
            this.isRendering = true;
        }
    }

    renderLowRes() {
        if (this.renderTimer !== undefined) window.clearTimeout(this.renderTimer);
        this.renderToTexture(this.lowResTextures,
                             this.canvas.width * this.lowResRatio,
                             this.canvas.height * this.lowResRatio);
        this.renderTexturesToCanvas(this.lowResTextures);
        if (this.isKeepingSampling === false) {
            this.renderTimer = window.setTimeout(this.render.bind(this), 200);
        }
    }

    keydownListener(event) {
    }

    keyupListener(event) {
        this.isRendering = false;
    }

    renderFlippedTex(textures) {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.useProgram(this.productRenderProgram);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, textures[0]);
        const tex = this.gl.getUniformLocation(this.productRenderProgram, 'u_texture');
        this.gl.uniform1i(tex, textures[0]);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.renderCanvasVAttrib, 2,
                                    this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.flush();
    }

    saveCanvas(filename) {
        this.renderFlippedTex(this.renderTextures);
        this.saveImage(this.gl,
                       this.canvas.width,
                       this.canvas.height,
                       filename);
        this.renderTexturesToCanvas(this.renderTextures);
    }

    static get CAMERA_MODE_SPHERE() {
        return 0;
    }

    static get CAMERA_MODE_FLY() {
        return 1;
    }
}
