World.prototype.RenderingContext2dCanvas = class RenderingContext2dCanvas extends World.prototype.Canvas {
    get _domEl() {
        return this.parent.ctxDomEl;
    }
    constructor(parent, data) {
        super(parent, data);

        this._ctx = this.parent.ctx;
        this.parent.glDomEl.style.display = 'none';
        this.parent.ctxDomEl.style.display = 'block';

        this._textureCanvas = window.document.createElement('canvas');
        this._textureCanvas.width = (this._textureCanvas.height = this.parent.CHUNK_SIZE);
        this._tctx = this._textureCanvas.getContext('2d');

        this.sprites = new Map();
        this.spriteCache = new Map();
    }

    chunkUpdateReceived = (pos, data) => {
        const cv = Vector.from(pos);
        const oldSpr = this.sprites.get(pos);
        if (oldSpr) this.spriteCache.set(pos, oldSpr.texture);
        this.sprites.set(pos, new this.Sprite(data.data, cv.x, cv.y, this));
        this.drawAll();
    }
    chunkDataReceived = (data) => {
        for (let i = 0; i < data.length; ++i) {
            const v = Vector.from(data[i][0]);
            this.sprites.set(data[i][0], new this.Sprite(data[i][1].data, v.x, v.y, this));
        }
        this.drawAll();
    }

    adjustScaling = () => {
        this._width = Math.ceil(window.innerWidth);
        this._height = Math.ceil(window.innerHeight);
        this._domEl.width = this._width;
        this._domEl.height = this._height;
        if (this.parent.hud) {
            this.parent.hud.userCanvas.width = this._width;
            this.parent.hud.userCanvas.height = this._height;
        }
        this._imageData = new ImageData(this._width, this._height);
        if (!this.parent.camera) return;
        this.parent.camera.updateChunks(this._width, this._height);
        this._ctx.imageSmoothingEnabled = false;
        this.drawAll();
    }

    drawAll = () => {
        this.clear();
        if (!this.parent.loggedIn || !this.parent.camera._offset) return;
        const requestArr = [],
            renderInfo = {
                ts: this.parent.camera.tileSize,
                ox: (this.parent.camera._offset.x * this.parent.CHUNK_SIZE * this.parent.camera.tileSize),
                oy: (this.parent.camera._offset.y * this.parent.CHUNK_SIZE * this.parent.camera.tileSize)
            }
        for (let x = -0; x < this.parent.camera.chunks.x; ++x) {
            for (let y = -0; y < this.parent.camera.chunks.y; ++y) {
                const v = new Vector(x, y).add(this.parent.camera._offset).floor(),
                    vS = v.toString();

                if (!v.inBounds(-2147483648, 2147483647, -2147483648, 2147483647)) {
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
                if (!this.drawChunk(v, renderInfo) && !this._requests.get(vS)) {
                    this._requests.set(vS, true);
                    requestArr.push(vS);
                };
            }
        }
        if (requestArr.length) {
            this.parent.socket.emit('requestChunkData', requestArr);
        }
        this.parent.hud.updateOtherUserPos();
    }


    drawChunk = (v, r) => {
        const sprite = this.sprites.get(v.toString());
        if (!sprite) {
            const chunkInfo = this._chunkCache.get(v.toString());
            if (!chunkInfo) return false;
            else this.sprites.set(v.toString(), new this.Sprite(chunkInfo.data, v.x, v.y, this));
            this.drawChunk(v, r);
        } else if (!sprite.loaded) {
            sprite.texture.onload = () => {
                sprite.loaded = true;
                this.spriteCache.delete(sprite.pos.toString());
                this.drawChunk(v, r);
            }

            const oldSpr = this.spriteCache.get(sprite.pos.toString());
            if (oldSpr) {
                this._ctx.drawImage(oldSpr, 0, 0, this.parent.CHUNK_SIZE, this.parent.CHUNK_SIZE, v.x * r.ts * this.parent.CHUNK_SIZE - r.ox, v.y * r.ts * this.parent.CHUNK_SIZE - r.oy, this.parent.CHUNK_SIZE * r.ts, this.parent.CHUNK_SIZE * r.ts);
            }
        } else {
            this._ctx.drawImage(sprite.texture, 0, 0, this.parent.CHUNK_SIZE, this.parent.CHUNK_SIZE, v.x * r.ts * this.parent.CHUNK_SIZE - r.ox, v.y * r.ts * this.parent.CHUNK_SIZE - r.oy, this.parent.CHUNK_SIZE * r.ts, this.parent.CHUNK_SIZE * r.ts);
        }
        return true;
    }

    clear = () => this._ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

World.prototype.RenderingContext2dCanvas.prototype.Sprite = class Sprite {
    constructor(data, x, y, parent) {
        this.parent = parent;
        this.pos = new Vector(x, y);
        this.texture = new Image();
        this.loaded = false;

        const im = new ImageData(this.parent.parent.CHUNK_SIZE, this.parent.parent.CHUNK_SIZE);
        let i = im.data.length - 1,
            len = data.length;
        while (len--) {
            let clr = this.parent._colors[data[len]];
            im.data[i--] = 0xff;
            im.data[i--] = clr.b;
            im.data[i--] = clr.g;
            im.data[i--] = clr.r;
        }
        this.parent._tctx.putImageData(im, 0, 0);
        this.texture.src = this.parent._textureCanvas.toDataURL();
        this.texture.onload = () => {
            this.parent.spriteCache.delete(this.pos.toString());
            this.loaded = true;
        }
    }
}