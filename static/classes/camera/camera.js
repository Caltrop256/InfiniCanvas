World.prototype.Camera = class Camera {
    constructor(world) {
        this.parent = world;
        this.coordsEl = document.getElementById('coords');
        this.__velocity = new Vector(0, 0);
        this.__keys = new Map();
        this.__validKeys = this.parent.settings.keybinds
        this.__tileManipulationValid = true;
    }

    handleKey = (e, i) => {
        if (!this.parent.hud.canvasVelocityMove) return this.__velocity = new Vector();
        const key = e.key.toLowerCase();
        if (this.__validKeys.includes(key)) {
            if (i) {
                this.__keys.set(key, !!i);
            } else if (this.__keys.has(key)) {
                this.__keys.delete(key);
            }

            const v = new Vector();
            if (this.__keys.has(this.__validKeys[0]) || this.__keys.has(this.__validKeys[4])) v.add(new WeakVector(0, -1));
            if (this.__keys.has(this.__validKeys[1]) || this.__keys.has(this.__validKeys[5])) v.add(new WeakVector(-1, 0));
            if (this.__keys.has(this.__validKeys[2]) || this.__keys.has(this.__validKeys[6])) v.add(new WeakVector(0, 1));
            if (this.__keys.has(this.__validKeys[3]) || this.__keys.has(this.__validKeys[7])) v.add(new WeakVector(1, 0));
            if (this.__keys.has(this.__validKeys[8]) || this.__keys.has(this.__validKeys[9])) {
                if (this.__tileManipulationValid && !this.screenshotMode) {
                    this.__tileManipulationValid = false;
                    if (!this.parent.colorPlacer.canvas) {
                        this.parent.colorPlacer.handleMouseDown(this.parent.colorPlacer.lastColorElement, {
                            clientX: this.lastMouseCoords.x,
                            clientY: this.lastMouseCoords.y
                        });
                        this.parent.colorPlacer.hoveringHud = this.parent.colorPlacer.pointIntersectsBoundingRect(this.lastMouseCoords.x, this.lastMouseCoords.y, this.parent.colorPlacer.rectData);
                    } else {
                        this.parent.colorPlacer._destroyCanvas();
                    }
                }
            } else {
                this.__tileManipulationValid = true;
            }
            if ((this.__keys.has(this.__validKeys[10]) || this.__keys.has(this.__validKeys[11])) && this.parent.colorPlacer.canvas) {
                this.parent.colorPlacer.selectedColor++
                this.parent.colorPlacer.selectedColor %= 16;
            }

            if ((this.__keys.has(this.__validKeys[12]) || this.__keys.has(this.__validKeys[13])) && this.parent.colorPlacer.canvas) {
                this.parent.colorPlacer.selectedColor--
                if (this.parent.colorPlacer.selectedColor < 0) this.parent.colorPlacer.selectedColor = 15;
            }

            this.parent.colorPlacer.lastColorElement = this.parent.colorPlacer.selectedColor;

            if (v.x || v.y) {
                v.length = 1;
                this.__velocity = Vector.from(v).div((this.tileSize * 1.25) * (this.parent.currentFps * 0.05));
            } else this.__velocity = new Vector();
        }
    }

    updateChunks = (w, h) => this.chunks = new WeakVector(Math.ceil(w / (this.tileSize * this.parent.CHUNK_SIZE)) + 1, Math.ceil(h / (this.tileSize * this.parent.CHUNK_SIZE)) + 1);
}