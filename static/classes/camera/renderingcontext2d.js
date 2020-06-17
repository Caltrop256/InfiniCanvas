World.prototype.RenderingContext2dCamera = class extends World.prototype.Camera {
    constructor(parent) {
        super(parent);

        this._tileSize = 16;

        this._offset = new Vector();
        this.anchorPoint = new WeakVector();
        this.clickStartMouseCoords = new Vector();
        this.lastPos = new WeakVector();
        this.lastMouseCoords = new WeakVector();
        this.dragging = false;
        this.chunks = new WeakVector();
        this.centerCameraPoint = new Vector();
        this.centerCameraInstant = false;
        this.possibleInvalidInput = false;
        this.disablePossibleInvalidInputCheck = false;
        this.updateChunks(this.parent.canvas._width, this.parent.canvas._height);

        this.parent.canvas.adjustScaling();
        window.addEventListener('resize', this.parent.canvas.adjustScaling);

        setTimeout(this.parent.canvas.adjustScaling, 5);
    }

    get tileSize() {
        return this._tileSize
    }

    set tileSize(v) {
        return ~~(this.parent.hud.el.get('mobileZoomSlider').value = (this._tileSize = v));
    }

    onmousedown = e => {
        this.isValid = true;
        this.clickStartMouseCoords = new Vector(e.clientX, e.clientY);
        this.anchorPoint = this.mouseToTileSpace(this.clickStartMouseCoords);
    }

    onmousemove = e => {
        this.lastMouseCoords = new WeakVector(e.clientX, e.clientY);
        this.lastPos = this.mouseToTileSpace(this.lastMouseCoords);
        if (e.buttons && this.isValid) {
            this.parent.canvas._domEl.style.cursor = 'all-scroll';
            this.dragging = true;
        } else this.parent.canvas._domEl.style.cursor = 'default';
    }

    onmouseup = e => {
        this.isValid = false;
        this.disablePossibleInvalidInputCheck = true;
        if (!this.possibleInvalidInput && Math.abs(this.clickStartMouseCoords.distanceSQ(this.lastMouseCoords)) < 3) {
            this.centerCamera = true;
            this.centerAnimationTimer = 0;
            this.centerCameraPoint = Vector.from(this.lastMouseCoords);
        }
        this.parent.hud.updateHash();
    }

    onwheel = e => {
        if (!((e.deltaY > 0 && this.tileSize > 1) || (e.deltaY < 0 && this.tileSize < 80))) return;
        const anchorPoint = this.mouseToTileSpace(this.lastMouseCoords);
        this.tileSize = this.tileSize + (e.deltaY < 0 ? 1 : -1);
        this.lastPos = this.mouseToTileSpace(this.lastMouseCoords);
        this._offset.sub(Vector.difference(this.lastPos, anchorPoint).div(this.parent.CHUNK_SIZE));
        this.updateChunks(window.innerWidth, window.innerHeight);
        this.parent.canvas.drawAll();
        this.parent.hud.updateHash();
    }

    update = () => {
        if (this.dragging && !this.possibleInvalidInput) {
            this.centerCamera = false;
            this._offset.sub((Vector.from(this.lastPos).sub(this.anchorPoint)).div(this.parent.CHUNK_SIZE));
            this.parent.canvas.drawAll();
            this.dragging = false;
        } else if (this.centerCamera) {
            this._offset.add(
                Vector.difference(this.mouseToTileSpace(this.centerCameraPoint), this.mouseToTileSpace(new WeakVector(window.innerWidth / 2, window.innerHeight / 2)))
                    .div(this.parent.CHUNK_SIZE * 16)
            );
            this.parent.canvas.drawAll();
            this.centerAnimationTimer++;
            if (this.centerAnimationTimer > 16) {
                this.parent.hud.updateHash();
                this.centerCamera = false;
            }
        } else if (this.__velocity.x || this.__velocity.y) {
            this._offset.add(this.__velocity);
            this.parent.canvas.drawAll();
        }

        if (this.disablePossibleInvalidInputCheck) {
            this.disablePossibleInvalidInputCheck = false;
            this.possibleInvalidInput = false;
            this.anchorPoint = this.mouseToTileSpace(this.lastMouseCoords);
        }
    }

    mouseToTileSpace = v => Vector.from(v).div(this.tileSize).add(Vector.from(this._offset).mult(this.parent.CHUNK_SIZE));
}