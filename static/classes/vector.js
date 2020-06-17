class WeakVector {
    constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }
    toString = () => `${this.x},${this.y}`;
}

class Vector extends WeakVector {
    constructor() {
        if (Array.from(arguments).length > 2) return new Vector3(...arguments);
        super(...arguments)
    }
    sq = n => n * n;
    add = v => {
        this.x += v.x;
        this.y += v.y;
        return this;
    }
    sub = v => {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }
    mult = n => {
        this.x *= n;
        this.y *= n;
        return this;
    }
    div = n => {
        this.x /= n;
        this.y /= n;
        return this;
    }
    distanceSQ = v => this.sq(this.x - v.x) + this.sq(this.y - v.y);
    distance = v => Math.sqrt(this.distanceSQ(v));
    floor = () => {
        return this.realFloor();
        // this.x = ~~this.x;
        // this.y = ~~this.y;
        // return this;
    }
    realFloor = () => {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        return this;
    }
    ceil = () => {
        this.x = Math.ceil(this.x);
        this.y = Math.ceil(this.y);
        return this;
    }

    cap = (min, max) => {
        this.x = Math.max(min, Math.min(max, this.x));
        this.y = Math.max(min, Math.min(max, this.y));
        return this;
    }

    inBounds = (minX, maxX, minY, maxY) => !(this.x < minX || this.x > maxX || this.y < minY || this.y > maxY);

    get lengthSQ() {
        return this.x * this.x + this.y * this.y;
    };
    get length() {
        return Math.sqrt(this.lengthSq);
    };
    set length(n) {
        var angle = this.angle;
        this.x = Math.cos(angle) * n;
        this.y = Math.sin(angle) * n;
        return this;
    }
    get angle() {
        return Math.atan2(this.y, this.x);
    };
    set angle(n) {
        var length = this.length;
        this.x = Math.cos(n) * length;
        this.y = Math.sin(n) * length;
        return this;
    }
}
Vector.from = o => typeof o.x != 'undefined' ? new Vector(o.x, o.y) : new Vector(+o.split(',')[0], +o.split(',')[1]);
Vector.sum = (v0, v1) => Vector.from(v0).add(v1);
Vector.difference = (v0, v1) => Vector.from(v0).sub(v1);

class Vector3 {
    constructor(x, y, z) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }

    add = v => {
        this.x += v.x || 0;
        this.y += v.y || 0;
        this.z += v.z || 0;
        return this;
    }

    sub = v => {
        this.x -= v.x || 0;
        this.y -= v.y || 0;
        this.z -= v.z || 0;
        return this;
    }
}

if (typeof module != 'undefined') module.exports = {
    WeakVector,
    Vector
}