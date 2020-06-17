const fs = require('fs'),
    encoding = {
        'js': 'text/javascript',
        'css': 'text/css',
        'html': 'text/html',
        'png': 'image/png',
        'ico': 'image/x-icon',
        'ogg' : 'audio/ogg'
    }

class Cache {
    constructor() {
        this.files = [...arguments];
        this.data = new Map();

        for (let f of this.files) {
            this.data.set(f, new this.Item(f));
        }
    }

    reloadAll = () => {
        for (let f of this.files) {
            this.data.get(f).reload();
        }
    }
}

Cache.prototype.Item = class Item {
    constructor(path) {
        this.path = path;
        this.extension = this.path.match(/.+\.(.+)$/)[1];
        this.encoding = encoding[this.extension];
        if (!fs.existsSync(rootDir + this.path)) throw TypeError('Invalid File: ' + (rootDir + this.path));
        try {
            this.data = fs.readFileSync(rootDir + this.path, {
                encoding: 'utf8'
            });
        } catch (e) {
            throw Error('Error reading file: ' + (rootDir + this.path));
        }
    }
    reload = () => {
        this.data = fs.readFileSync(rootDir + this.path, {
            encoding: 'utf8'
        });
    }
}

module.exports = Cache;