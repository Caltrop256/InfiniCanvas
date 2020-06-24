World.prototype.ColorPlacer = class ColorPlacer {
    constructor(world, colors, div) {
        this.parent = world;
        this.colors = colors;
        this.domEl = div;

        this.active = true;
        this.ratelimit = 0;
        this.ratelimitStart = 0;

        this.canvas = undefined;
        this.lastMousePos = new Vector();

        this.selected = false;
        this.selectedColor = 0;
        this.hoveringHud = true;

        this.lastColorElement = 0;
        this.forced = false;

        this.verletEntity = undefined;
        this.placeAnimationTimer = 0;

        this.rects = new Map();
        this.hideableEls = ['zoomWrap', 'chat', 'fpsWrap', 'pingWrap', 'teleportButton', 'Screenshot-Mode-Button', 'Info-Button', 'optionsMenu']

        window.addEventListener('resize', this._resize);
        this._resize();

        for (let i = 0; i < colors.length; ++i) {
            const el = window.document.createElement('div');
            el.classList.add('colorButton');

            el.addEventListener('mousedown', e => {
                this._lock(e);
                this.lastColorElement = i;
                this.handleMouseDown(i, e);
            });
            el.addEventListener('touchstart', e => {
                this.handleMouseDown(i, this.parent.hud.TouchEventToMouseEvent(e));
            })
            el.addEventListener('mousemove', this._lock);
            el.addEventListener('mouseup', this._lock);
            el.addEventListener('mouseenter', () => this.parent.sfx.play('snd_hover.ogg'))

            el.style.top = (~~(i / 8) * 32) + 'px';
            el.style.left = ((i % 8) * 32) + 'px';
            el.style.backgroundColor = colors[i].hexString;

            this.domEl.appendChild(el);
        }

        this.parent.socket.on('ratelimitApplied', ratelimit => {
            this.deactivate();
            this.ratelimit = ratelimit;
            this.ratelimitStart = Date.now();
        })
    }

    update = () => {
        if (!this.active) {
            const remaining = (this.ratelimitStart + this.ratelimit) - Date.now(),
                minutes = Math.round(remaining / 60000),
                seconds = Math.round(remaining / 1000) % 60;
            this.parent.hud.el.get('rateLimitbar').style.width = ((this.ratelimit - remaining) / this.ratelimit * 90) + 'px';
            this.parent.hud.el.get('rateLimitCooldownText').innerHTML = (minutes.toString().length < 2 ? '0' + minutes : minutes) + ' : ' + (seconds.toString().length < 2 ? '0' + seconds : seconds);
            if (remaining < 0) this.activate();
            if (!this.forced) return;
        }

        if (!this.canvas && !this.forced) return;
        for (let i = 0; i < this.hideableEls.length; ++i) {
            const info = this.rects.get(this.hideableEls[i]);
            if (this.pointIntersectsBoundingRect(this.lastMousePos.x, this.lastMousePos.y, info.rect)) {
                if (!info.hidden) {
                    this.parent.hud.el.get(this.hideableEls[i]).classList.add('fadeMeOut');
                    info.hidden = true;
                    this.rects.set(this.hideableEls[i], info);
                }
            } else if (info.hidden) {
                this.parent.hud.el.get(this.hideableEls[i]).classList.remove('fadeMeOut');
                info.hidden = false;
                this.rects.set(this.hideableEls[i], info);
            }
        }
        if (!this.canvas) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.placeAnimationTimer) {
            this.placeAnimationTimer--;

            this.placeAnimationRectangle.move(this.placeAnimationDistance);
            this.placeAnimationRectangle.rotate(this.placeAnimationAngle);
            this.placeAnimationRectangle.render(this.ctx);

            if (!this.placeAnimationTimer) {
                this.parent.sfx.play('snd_place.ogg');
                this.parent.socket.emit('placeTile', { v: this.finalPlacement, c: this.selectedColor });
                if (this.parent.settings.autoTile) {
                    this.canvas.remove();
                    this.canvas = undefined;
                    window.removeEventListener('touchend', this.upFunc);
                    window.removeEventListener('touchcancel', this.cancelTile);
                    window.removeEventListener('touchmove', this.touchMove);
                    setTimeout(() => {
                        this.handleMouseDown(this.selectedColor, {
                            clientX: this.lastMousePos.x,
                            clientY: this.lastMousePos.y
                        }, true);
                        this.forced = true;
                        this.hoveringHud = this.pointIntersectsBoundingRect(this.lastMousePos.x, this.lastMousePos.y, this.rectData);
                    })
                } else {
                    this._destroyCanvas();
                }
            }
        } else {
            if (!this.hoveringHud) {
                const tilePos = this.parent.camera.mouseToTileSpace(this.parent._isMobile ? Vector.from(this.lastMousePos).add(new Vector(-this.parent.fingerSize, -this.parent.fingerSize)) : this.lastMousePos).realFloor(),
                    ts = this.parent.camera.tileSize,
                    ox = (this.parent.camera._offset.x * this.parent.CHUNK_SIZE * ts),
                    oy = (this.parent.camera._offset.y * this.parent.CHUNK_SIZE * ts),
                    px = ~~(tilePos.x * ts - ox) + 1,
                    py = ~~(tilePos.y * ts - oy) + 1,
                    size = ts - 1;
                this.ctx.strokeStyle = '#000000';
                this.ctx.beginPath();
                this.ctx.moveTo(px, py);
                this.ctx.lineTo(px + size, py);
                this.ctx.lineTo(px + size, py + size);
                this.ctx.lineTo(px, py + size);
                this.ctx.closePath();
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
            if (this.parent._isMobile) {
                this.verletEntity.update(this.ctx, Vector.from(this.lastMousePos).add(new Vector(-this.parent.fingerSize, -this.parent.fingerSize)));
            } else this.verletEntity.update(this.ctx);
        }
    }

    activate = () => {
        this.active = true;
        this.domEl.style.filter = 'grayscale(0%)';
        this.parent.hud.el.get('rateLimitCooldown').style.top = '-40px';
    }

    deactivate = () => {
        if (!this.active) return;
        if (this.canvas && !this.forced) this._destroyCanvas();
        this.active = false;
        this.domEl.style.filter = 'grayscale(100%)';
        this.parent.hud.el.get('rateLimitCooldown').style.top = '40px';
    }

    _lock = e => {
        e.stopPropagation();
        e.preventDefault();
    }

    _resize = () => {
        this.rectData = this.domEl.getBoundingClientRect();

        for (let i = 0; i < this.hideableEls.length; this.rects.set(this.hideableEls[i], { rect: document.getElementById(this.hideableEls[i++]).getBoundingClientRect(), hidden: false }));

        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    _destroyCanvas = () => {
        if (this.placeAnimationTimer) return;
        this.canvas.remove();
        this.canvas = undefined;
        window.removeEventListener('touchend', this.upFunc);
        window.removeEventListener('touchcancel', this.cancelTile);
        window.removeEventListener('touchmove', this.touchMove);
        this.parent.camera.lastMouseCoords = Vector.from(this.lastMousePos);
        setTimeout(() => {
            for (let i = 0; i < this.hideableEls.length; ++i) {
                const info = this.rects.get(this.hideableEls[i]);
                if (info.hidden) {
                    this.parent.hud.el.get(this.hideableEls[i]).classList.remove('fadeMeOut');
                    info.hidden = false;
                    this.rects.set(this.hideableEls[i], info);
                };
            }
        }, 250)
        if (!this.parent.preferCTX && !this.parent.encounteredWebGLError) this.parent.changeToWebGL();
    }

    pointIntersectsBoundingRect = (x, y, rect) => !(x < rect.left || x > (rect.left + rect.width) || y < rect.top || y > (rect.top + rect.height));

    handleMouseDown = (i, e, force) => {
        if ((this.placeAnimationTimer || !this.active) && !force) return;
        this.parent.sfx.play('snd_select.ogg');
        this.parent.changeToCTX();
        this.lastMousePos = new Vector(e.clientX, e.clientY);
        this.selected = true;
        this.hoveringHud = true;
        this.selectedColor = i;
        this.canvas = window.document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style = 'z-Index: 3001; background-color: transparent; cursor: grabbing';

        this._resize();

        window.document.body.appendChild(this.canvas);

        this.canvas.addEventListener('mouseup', this.upFunc);
        window.addEventListener('touchend', this.upFunc);
        this.canvas.addEventListener('mouseout', this.cancelTile);
        window.addEventListener('touchcancel', this.cancelTile);
        window.addEventListener('touchmove', this.touchMove);
        this.canvas.addEventListener('mousemove', e => {
            this._lock(e);
            this.lastMousePos = new Vector(e.clientX, e.clientY);
            this.hoveringHud = this.pointIntersectsBoundingRect(this.lastMousePos.x, this.lastMousePos.y, this.rectData);
        })

        this.verletEntity = new this.VerletTile(this);
    }

    touchMove = e => {
        const me = this.parent.hud.TouchEventToMouseEvent(e);
        this.lastMousePos = new Vector(me.clientX, me.clientY);
        this.hoveringHud = this.pointIntersectsBoundingRect(this.lastMousePos.x, this.lastMousePos.y, this.rectData);
    }
    cancelTile = () => {
        this.parent.camera.possibleInvalidInput = true;
        this._destroyCanvas();
    }
    upFunc = (e) => {
        this._lock(e);
        if (this.placeAnimationTimer || !this.active) return;

        window.removeEventListener('touchend', this.upFunc);
        window.removeEventListener('touchcancel', this.cancelTile);
        window.removeEventListener('touchmove', this.touchMove);

        if (e.type == 'touchend') e = this.parent.hud.TouchEventToMouseEvent(e);
        const pos = this.parent.camera.mouseToTileSpace(this.parent._isMobile
            ? new Vector(e.clientX, e.clientY).add(new Vector(-this.parent.fingerSize, -this.parent.fingerSize))
            : new Vector(e.clientX, e.clientY)),
            chunk = Vector.from(pos).div(this.parent.CHUNK_SIZE).realFloor();
        if (this.hoveringHud || !this.parent.canvas._chunkCache.get(chunk.toString())) return this._destroyCanvas();

        this.placeAnimationTimer = 16;

        const ts = this.verletEntity.size,
            hts = ~~(ts * 0.5),
            tilePos = pos.realFloor(),
            ox = (this.parent.camera._offset.x * this.parent.CHUNK_SIZE * ts),
            oy = (this.parent.camera._offset.y * this.parent.CHUNK_SIZE * ts),
            px = ~~(tilePos.x * ts - ox),
            py = ~~(tilePos.y * ts - oy),
            angleVec = Vector.difference(this.verletEntity.dots[0].pos, this.verletEntity.dots[1].pos),
            centerDestination = new Vector(px + hts, py + hts),
            centerPos = new Vector();
        this.finalPlacement = Vector.from(tilePos);
        for (let i = 0; i < this.verletEntity.dots.length; ++i) {
            centerPos.add(this.verletEntity.dots[i].pos);
        }
        centerPos.div(this.verletEntity.dots.length);

        this.placeAnimationAngle = (Math.atan2(angleVec.y, angleVec.x) + Math.PI / 2) / this.placeAnimationTimer;
        this.placeAnimationDistance = Vector.difference(centerPos, centerDestination).div(this.placeAnimationTimer);
        this.placeAnimationRectangle = new this.Rectangle(this, this.verletEntity.dots, this.verletEntity.size);
    }
}

World.prototype.ColorPlacer.prototype.Rectangle = class Rectangle {
    constructor(parent, dots, size) {
        this.parent = parent;
        this.size = size * 0.75;
        this.dots = dots.map(d => d.pos);
        this.center = new Vector();
        this.move(new WeakVector());
    }

    render = (ctx) => {
        ctx.beginPath();
        for (let i = 0; i < this.dots.length; ++i) {
            ctx[i ? 'lineTo' : 'moveTo'](this.dots[i].x, this.dots[i].y);
        }
        ctx.fillStyle = this.parent.colors[this.parent.selectedColor].hexString;
        ctx.closePath();
        ctx.fill();
    }

    move = v => {
        this.center = new Vector();
        for (let i = 0; i < this.dots.length; ++i) {
            this.dots[i].sub(v);
            this.center.add(this.dots[i]);
        }
        this.center.div(this.dots.length);
    }

    rotate = theta => {
        for (let i = 0; i < this.dots.length; ++i) {
            const diff = Vector.difference(this.center, this.dots[i]),
                angle = Math.atan2(diff.y, diff.x);
            this.dots[i] = new Vector(Math.cos(angle - theta) * this.size + this.center.x, Math.sin(angle - theta) * this.size + this.center.y);
        }
    };
}

World.prototype.ColorPlacer.prototype.Dot = class Dot {
    constructor(x, y, fixed) {
        this.pos = new Vector(x, y);
        this.oldpos = new Vector(x, y);
        this.gravity = new Vector(0, 0.1);
        this.friction = 0.92;
        this.pinned = !!fixed;
        this.radius = 2;
        this.mass = 0.1;
    }
    update = () => {
        let vel = Vector.from(this.pos).sub(this.oldpos);
        vel.mult(this.friction).add(this.gravity);
        this.oldpos = Vector.from(this.pos);
        this.pos.add(vel);
    }
}

World.prototype.ColorPlacer.prototype.Bone = class Bone {
    constructor(p1, p2) {
        this.startPoint = p1;
        this.endPoint = p2;
        this.stiffness = 1;
        this.length = this.startPoint.pos.distance(this.endPoint.pos);
    }

    update = () => {
        let d = Vector.from(this.endPoint.pos).sub(this.startPoint.pos),
            dist = this.endPoint.pos.distance(this.startPoint.pos),
            diff = (this.length - dist) / dist * this.stiffness,
            offset = d.mult(diff * 0.5),
            m1 = this.startPoint.mass + this.endPoint.mass,
            m2 = this.startPoint.mass / m1;
        m1 = this.endPoint.mass / m1;

        if (!this.startPoint.pinned) {
            this.startPoint.pos.x -= offset.x * m1;
            this.startPoint.pos.y -= offset.y * m1;
        }
        if (!this.endPoint.pinned) {
            this.endPoint.pos.x += offset.x * m2;
            this.endPoint.pos.y += offset.y * m2;
        }

    }

    render = ctx => {
        ctx.beginPath();
        ctx.moveTo(this.startPoint.pos.x, this.startPoint.pos.y);
        ctx.lineTo(this.endPoint.pos.x, this.endPoint.pos.y);
        ctx.stroke();
        ctx.closePath();
    }
}

World.prototype.ColorPlacer.prototype.VerletTile = class VerletTile {
    constructor(parent, pos) {
        if (!pos) pos = Vector.from(parent.lastMousePos);
        this.parent = parent;
        this.dots = [];
        this.bones = [];

        const m = Vector.from(pos),
            ts = this.parent.parent.camera.tileSize;

        this.size = ts;

        this.dots.push(new parent.Dot(m.x, m.y));
        this.dots.push(new parent.Dot(m.x + ts, m.y));
        this.dots.push(new parent.Dot(m.x + ts, m.y + ts));
        this.dots.push(new parent.Dot(m.x, m.y + ts));

        for (let i = 0; i < this.dots.length; ++i) {
            for (let j = 0; j < this.dots.length; ++j) {
                if (j != i) this.bones.push(new parent.Bone(this.dots[i], this.dots[j]));
            }
        }
    }

    update = (ctx, pos, color) => {
        if (!pos) pos = this.parent.lastMousePos;
        if (typeof color == 'undefined') color = this.parent.selectedColor;
        if (this.size != this.parent.parent.camera.tileSize) {
            this.size = this.parent.parent.camera.tileSize;
            const m = Vector.from(pos),
                ts = this.size;

            this.dots = [];
            this.bones = [];

            this.dots.push(new this.parent.Dot(m.x, m.y));
            this.dots.push(new this.parent.Dot(m.x + ts, m.y));
            this.dots.push(new this.parent.Dot(m.x + ts, m.y + ts));
            this.dots.push(new this.parent.Dot(m.x, m.y + ts));

            for (let i = 0; i < this.dots.length; ++i) {
                for (let j = 0; j < this.dots.length; ++j) {
                    if (j != i) this.bones.push(new this.parent.Bone(this.dots[i], this.dots[j]));
                }
            }
        }
        for (let d of this.dots) {
            d.update();
        }
        this.dots[0].pos = Vector.from(pos);

        for (let b of this.bones) {
            b.update();
        }

        ctx.beginPath();
        for (let i = 0; i < this.dots.length; ++i) {
            ctx[i ? 'lineTo' : 'moveTo'](this.dots[i].pos.x, this.dots[i].pos.y);
        }
        ctx.fillStyle = this.parent.colors[color].hexString;
        ctx.closePath();
        ctx.fill();
    }
}