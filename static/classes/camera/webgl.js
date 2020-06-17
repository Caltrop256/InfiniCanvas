World.prototype.WebGlCamera = class WebGlCamera extends World.prototype.Camera {
    constructor(parent) {
        super(parent);

        this.fov = window.innerHeight / window.screen.height;
        this.near = 0;
        this.far = 1000;
        this.pos = new Vector3(0, 0, 10);
        this.size = new Vector(window.innerWidth, window.innerHeight);

        this._tileSize = 16;
        this.tileSize = 16;

        this.chunks = new WeakVector();
        this.updateChunks(window.innerWidth, window.innerHeight);

        this.lastMouseCoords = new Vector();
        this.clickStartMouseCoords = new Vector(0, 0);

        this.screenshotMode = false;
        this.screenshotFocusLocation = new Vector();
    }

    onmousedown = e => {
        this.isValid = true;
        this.clickStartMouseCoords = new Vector(e.clientX, e.clientY);
        this.anchorPoint = this.mouseToTileSpace(this.clickStartMouseCoords);
    }

    onmousemove = e => {
        this.lastMouseCoords = new Vector(e.clientX, e.clientY);
        this.lastPos = this.mouseToTileSpace(this.lastMouseCoords);
        if (e.buttons && this.isValid) {
            this.dragging = true;
            this.parent.canvas._domEl.style.cursor = 'all-scroll';
        } else this.parent.canvas._domEl.style.cursor = 'default';
    }

    onmouseup = e => {
        this.isValid = false;
        this.disablePossibleInvalidInputCheck = true;
        if (!this.possibleInvalidInput && Math.abs(this.clickStartMouseCoords.distanceSQ(this.lastMouseCoords)) < 3) {
            this.centerCamera = true;
            this.centerAnimationTimer = 0;
            this.centerMovementVector = Vector.difference(this.mouseToTileSpace(this.lastMouseCoords), this.mouseToTileSpace(new WeakVector(window.innerWidth / 2, window.innerHeight / 2))).div(this.parent.CHUNK_SIZE_SQ);
        }
        this.parent.hud.updateHash();
    }

    onwheel = e => {
        if (!((e.deltaY > 0 && this.tileSize > 1) || (e.deltaY < 0 && this.tileSize < 89))) return;
        const anchorPoint = this.mouseToTileSpace(this.lastMouseCoords);
        this.tileSize = this.tileSize + (e.deltaY < 0 ? 1 : -1);
        this.lastPos = this.mouseToTileSpace(this.lastMouseCoords);
        this.pos.sub(Vector.difference(this.lastPos, anchorPoint).div(this.parent.CHUNK_SIZE));
        if (!this.screenshotMode) this.updateChunks(window.innerWidth, window.innerHeight);
        else this.updateChunks(window.innerWidth * 4, window.innerHeight * 4);
        this.parent.canvas.drawAll();
        this.parent.hud.updateHash();
    }

    update = () => {
        if (this.dragging) {
            this.centerCamera = false;
            this.pos.sub((Vector.from(this.lastPos).sub(this.anchorPoint)).div(this.parent.CHUNK_SIZE));
            this.dragging = false;
            this.parent.canvas.drawAll();
        } else if (this.centerCamera) {
            this.pos.add(this.centerMovementVector);
            this.centerAnimationTimer++;
            if (this.centerAnimationTimer > 16) {
                this.parent.hud.updateHash();
                this.centerCamera = false;
            }
            this.parent.canvas.drawAll();
        } else if (this.__velocity.x || this.__velocity.y) {
            this.pos.add(this.__velocity);
            this.parent.canvas.drawAll();
        }
    }

    get tileSize() { return this._tileSize };
    set tileSize(v) {
        v = ~~v;
        if (this.parent.hud) {
            this.parent.hud.el.get('mobileZoomSlider').value = (this._tileSize = v);
        } else this._tileSize = v;
        this.pos.z = -16.37825 * (1 / v);
        return this._tileSize;
    }

    projectionMatrix() {
        const matrix = mat4.create();
        mat4.perspective(
            matrix,
            this.fov,
            this.size.x / this.size.y,
            this.near,
            this.far);
        return matrix;
    }
    cameraMatrix() {
        const matrix = mat4.create(),
            origin = vec3.fromValues(this.pos.x, this.pos.y, this.pos.z),
            pos2D = !this.screenshotMode ? vec3.fromValues(this.pos.x, this.pos.y, 0) : vec3.fromValues(this.screenshotFocusLocation.x, this.screenshotFocusLocation.y, 0),
            up = vec3.fromValues(0, -1, 0);
        mat4.lookAt(
            matrix,
            origin,
            pos2D,
            up);
        return matrix;
    }

    mouseToTileSpace = v => {
        const ts = ((Math.atan2(-this.pos.z, -1) - Math.PI * 0.5) / this.fov) * window.innerHeight / this.parent.CHUNK_SIZE,
            pos = Vector.difference(this.pos, new WeakVector(-0.5, -0.5)).mult(ts * -this.parent.CHUNK_SIZE),
            offset = Vector.sum(pos, new Vector(window.innerWidth / 2, window.innerHeight / 2));

        return Vector.from(v).sub(offset).div(ts);
    }
}