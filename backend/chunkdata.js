class ChunkData {
    constructor(data) {
        this.data = Uint8ClampedArray.from(data).map(n => n % 16);
        this.timestamp = Date.now();
    }

    toString = (size = global.CHUNK_SIZE) => {
        let str = '',
            n = 0;
        for (let i = 0; i < size * size; ++i) {
            if (i) {
                if (this.data[i] == this.data[i - 1]) {
                    n++
                    if (i == (size * size) - 1) str += (n.toString(16) + ':' + this.data[i - 1].toString(16) + ',');
                } else {
                    if (n > 1) str += (n.toString(16) + ':' + this.data[i - 1].toString(16) + ',');
                    else str += (this.data[i - 1].toString(16) + ',');
                    n = 1;
                }
            } else n++;
        }
        return str.substring(0, str.length - 1);
    }
}
ChunkData.parse = s => {
    let a = new Uint8ClampedArray(global.CHUNK_SIZE_SQ),
        index = 0,
        sA = s.split(',');
    for (let i = 0; i < sA.length; ++i) {
        let c = sA[i].split(':'),
            amt = parseInt(c[0], 16),
            num = parseInt(c[1], 16);
        if (c.length > 1)
            for (let j = 0; j < amt; ++j)
                a[index++] = num;
        else a[index++] = parseInt(c[0], 16);
    }
    return new ChunkData(a);
}

module.exports = ChunkData;