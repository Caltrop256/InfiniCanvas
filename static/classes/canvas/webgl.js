World.prototype.WebGlCanvas = class WebGlCanvas extends World.prototype.Canvas {
    get _domEl() {
        return this.parent.glDomEl;
    }
    constructor(parent, data) {
        super(parent, data);

        this.gl = this.parent.gl;
        this.parent.glDomEl.style.display = 'block';
        this.parent.ctxDomEl.style.display = 'none';

        this._domEl.width = Math.ceil(window.innerWidth);
        this._domEl.height = Math.ceil(window.innerHeight);

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

        this.vertices = new Float32Array([
            // positions        // texture coords
            0.5, 0.5, 0.0, 1.0, 1.0,
            0.5, -0.5, 0.0, 1.0, 0.0,
            -0.5, -0.5, 0.0, 0.0, 0.0,
            -0.5, 0.5, 0.0, 0.0, 1.0 // top left 
        ]);
        this.indices = new Uint32Array([
            0, 1, 3,
            1, 2, 3 // second triangle  
        ]);
        this.VAO = this.gl.createVertexArray();
        this.VBO = this.gl.createBuffer();
        this.EBO = this.gl.createBuffer();
        this.gl.bindVertexArray(this.VAO);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.VBO);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertices, this.gl.STATIC_DRAW);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.EBO);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.indices, this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 20, 0);
        this.gl.enableVertexAttribArray(0);
        this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, 20, 3 * 4);
        this.gl.enableVertexAttribArray(1);
        this.gl.bindVertexArray(this.VAO);

        this.shader = new class Shader {
            constructor(parent) {
                this.gl = parent.gl;
                this.self = this;
                this._shaderTypeArr = ['shaders', 'vertex shader', 'fragment shader'];
                const vertShaderSrc = `#version 100
                attribute highp vec3 aPos;
                attribute highp vec2 aTexCoord;
                varying highp vec2 TexCoord;
                uniform highp mat4 projection;
                uniform highp mat4 camera;
                uniform highp mat4 transform;
                void main() {
                    gl_Position = projection * camera * transform * vec4(aPos.xyz,1);
                    TexCoord = aTexCoord;
                }`,
                    fragShaderSrc = `#version 100
                    varying highp vec2 TexCoord;
                    uniform sampler2D texture1;
                    uniform bool isSingleColor;
                    uniform highp vec4 color;
                    void main() {
                        if(isSingleColor) gl_FragColor = color;
                        else gl_FragColor = texture2D(texture1, TexCoord);
                    }`,
                    vertShader = this.gl.createShader(this.gl.VERTEX_SHADER),
                    fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
                this.gl.shaderSource(vertShader, vertShaderSrc);
                this.gl.compileShader(vertShader);
                this.checkShaderErrors(vertShader, 1);
                this.gl.shaderSource(fragShader, fragShaderSrc);
                this.gl.compileShader(fragShader);
                this.checkShaderErrors(fragShader, 2);

                this.shaderProgram = this.gl.createProgram();
                this.gl.attachShader(this.shaderProgram, vertShader);
                this.gl.attachShader(this.shaderProgram, fragShader);
                this.gl.linkProgram(this.shaderProgram);

                this.checkShaderErrors(this.shaderProgram, 0);

                this.gl.deleteShader(vertShader);
                this.gl.deleteShader(fragShader);
            }
            setBool = function (name, value) { this.gl.uniform1i(this.gl.getUniformLocation(this.self.shaderProgram, name), +!!value) };
            setVec4 = function (name, value) { this.gl.uniform4fv(this.gl.getUniformLocation(this.self.shaderProgram, name), value) };
            setMat4 = function (name, value) { this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.self.shaderProgram, name), false, value) };
            checkShaderErrors = function (shader, shaderType) {
                const shaderResult = shaderType
                    ? this.self.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)
                    : this.self.gl.getProgramParameter(shader, this.gl.LINK_STATUS);
                if (!shaderResult) {
                    const info = shaderType
                        ? this.self.gl.getShaderInfoLog(shader)
                        : this.self.gl.getProgramInfoLog(shader);
                    throw new Error(`Could not ${shaderType ? 'compile' : 'link'} WebGL ${this.self._shaderTypeArr[shaderType]}. \n\n${info}`);
                }
            }
        }(this);

        this.gl.clearColor(0, 0, 0, 0.0);
        this.sprites = new Map();

        if (data) {
            data = Array.from(data);
            for (let i = 0; i < data.length; ++i) {
                const cv = Vector.from(data[i][0]);
                this.sprites.set(data[i][0], new this.Sprite(cv.x, cv.y, data[i][1].data, this));
            }
        }
    }

    update = () => {
        const err = this.gl.getError();
        if (err && err != 1282) {
            console.error(err);
            this.parent.encounteredWebGLError = true;
            const { body } = this.parent.hud.createNotification(200, 200, 10000);
            body.innerHTML = `<span>An Error has occurred in the rendering process, switching to CPU rendering!</span>`;
            return this.parent.changeToCTX();
        }
        const wWidth = Math.ceil(window.innerWidth),
            wHeight = Math.ceil(window.innerHeight);
        if (this._domEl.width != wWidth || this._domEl.height != wHeight) {
            this._domEl.width = wWidth;
            this._domEl.height = wHeight;
            if (this.parent.hud) {
                this.parent.hud.userCanvas.width = wWidth;
                this.parent.hud.userCanvas.height = wHeight;
            }
            this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
            this.parent.camera.size = new Vector3(this._domEl.clientWidth, this._domEl.clientHeight, 0);
            this.parent.camera.fov = wHeight / window.screen.height;
            this.parent.camera._offset = this.parent.camera.__offset;
            this.parent.camera.updateChunks(wWidth, wHeight);
            this.drawAll();
        }
    }

    drawAll = () => {
        if (!this.parent.loggedIn || !this.parent.camera.pos) return;
        const requestArr = [],
            hCh = Vector.from(this.parent.camera.chunks).mult(0.5).ceil().add(new Vector(1, 1)),
            pos = !this.parent.camera.screenshotMode ? Vector.from(this.parent.camera.pos).floor() : Vector.from(this.parent.camera.screenshotFocusLocation).floor();

        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        for (let x = -hCh.x; x <= hCh.x + 1; ++x)
            for (let y = -hCh.y; y <= hCh.y + 1; ++y) {
                const sprPos = Vector.sum(pos, new WeakVector(x, y)),
                    sprPosString = sprPos.toString(),
                    spr = this.sprites.get(sprPosString);

                if (!sprPos.inBounds(-2147483648, 2147483647, -2147483648, 2147483647)) {
                    if (!this.hasReachedEdge) {
                        this.hasReachedEdge = true;
                        const notifsSeen = JSON.parse(this.parent.settings.hasSeenPopup);
                        if (!notifsSeen.edgeOfWorld) {
                            notifsSeen.edgeOfWorld = true;
                            this.parent.settings.set('hasSeenPopup', JSON.stringify(notifsSeen));
                            const info = this.parent.hud.createNotification(200, 100, 12000);
                            info.body.innerHTML = `<span>You have reached the edge of the world! Make yourself comfortable.</span>`
                        }
                    }
                    continue;
                }
                if (spr) {
                    spr.render();
                } else if (!this._requests.get(sprPosString)) {
                    requestArr.push(sprPosString);
                    this._requests.set(sprPosString, true);
                }
            }

        if (requestArr.length) {
            this.parent.socket.emit('requestChunkData', requestArr);
        }
        this.parent.hud.updateOtherUserPos();
    }

    chunkDataReceived = data => {
        for (let i = 0; i < data.length; ++i) {
            const cv = Vector.from(data[i][0]);
            this.sprites.set(data[i][0], new this.Sprite(cv.x, cv.y, data[i][1].data, this));
        }
        this.drawAll();
    }

    chunkUpdateReceived = (pos, data) => {
        if (this.sprites.get(pos)) this.sprites.get(pos).destroy();
        const cv = Vector.from(pos);
        this.sprites.set(pos, new this.Sprite(cv.x, cv.y, data.data, this));
        this.drawAll();
    }
}

World.prototype.WebGlCanvas.prototype.Sprite = class Sprite {
    constructor(x, y, paletteData, parent) {
        this.parent = parent;
        this.gl = parent.gl;
        this._colors = [
            [0xFF, 0xFF, 0xFF],
            [0x4E, 0x4E, 0x4E],
            [0x88, 0x88, 0x88],
            [0x22, 0x22, 0x22],
            [0xFF, 0xA7, 0xD1],
            [0xE5, 0x00, 0x00],
            [0xE5, 0x95, 0x00],
            [0xA0, 0x6A, 0x42],
            [0xE5, 0xD9, 0x00],
            [0x94, 0xE0, 0x44],
            [0x02, 0xBE, 0x01],
            [0x00, 0xD3, 0xDD],
            [0x00, 0x83, 0xC7],
            [0x00, 0x00, 0xEA],
            [0xCF, 0x6E, 0xE4],
            [0x82, 0x00, 0x80]
        ];
        this.pos = new Vector3(x, y, 0);
        this.data = new Uint8Array(this.parent.parent.CHUNK_SIZE_SQ * 3);

        const firstColor = paletteData[0];
        let blankSprite = true;
        for (let i = 0; i < paletteData.length; i++) {
            if (firstColor != paletteData[i]) {
                blankSprite = false;
                break;
            }
        }
        this.palletteColor = blankSprite ? firstColor : -1;
        if (!blankSprite) {
            let index = 0;
            for (let i = 0; i < this.parent.parent.CHUNK_SIZE_SQ; i++) {
                let colorTemp = this._colors[paletteData[i]];
                this.data[index++] = colorTemp[0];
                this.data[index++] = colorTemp[1];
                this.data[index++] = colorTemp[2];
            }
        }
        this.texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST_MIPMAP_NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.updateTexture();
    }
    setPixel(x, y, paletteIndex) {
        if (paletteIndex == this.palletteColor) return;
        if (this.palletteColor != -1) {
            let index = 0;
            for (let i = 0; i < this.parent.parent.CHUNK_SIZE_SQ; i++) {
                let colorTemp = _colors[this.palletteColor];
                this.data[index++] = colorTemp[0];
                this.data[index++] = colorTemp[1];
                this.data[index++] = colorTemp[2];
            }
        }
        this.palletteColor = -1;
        let colorTemp = this._colors[paletteIndex];
        let position = ((y * this.parent.parent.CHUNK_SIZE) + x) * 4;
        this.data[position++] = colorTemp[0];
        this.data[position++] = colorTemp[1];
        this.data[position] = colorTemp[2];
        this.updateTexture();
    }
    updateTexture() {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.parent.parent.CHUNK_SIZE, this.parent.parent.CHUNK_SIZE, 0, this.gl.RGB, this.gl.UNSIGNED_BYTE, this.data);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
    }
    render() {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.useProgram(this.parent.shader.shaderProgram);
        let trans = mat4.create();
        mat4.translate(trans, trans, vec3.fromValues(this.pos.x, this.pos.y, 0));
        let isSingleColor = this.palletteColor != -1;
        if (isSingleColor) {
            let colors = this._colors[this.palletteColor];
            this.parent.shader.setVec4('color', vec4.fromValues(colors[0] / 255, colors[1] / 255, colors[2] / 255, 1));
        }
        else this.parent.shader.setVec4('color', vec4.create());
        this.parent.shader.setBool('isSingleColor', isSingleColor);
        this.parent.shader.setMat4('camera', this.parent.parent.camera.cameraMatrix());
        this.parent.shader.setMat4('projection', this.parent.parent.camera.projectionMatrix());
        this.parent.shader.setMat4('transform', trans);
        this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
        this.gl.useProgram(null);
    }
    destroy = () => this.gl.deleteTexture(this.texture);
}