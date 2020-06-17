World.prototype.ChunkData = class ChunkData {
    constructor(data, timestamp) {
        this.timestamp = timestamp || Date.now();
        this.data = Uint8ClampedArray.from(data);
    }
}
World.prototype.ChunkData.parse = s => {
    let a = new Uint8ClampedArray(world.CHUNK_SIZE_SQ),
        index = 0,
        sA = s.split(',');
    for (let i = 0; i < sA.length; ++i) {
        let c = sA[i].split(':'),
            amt = parseInt(c[0], 16),
            num = parseInt(c[1], 16);
        if (c.length > 1) for (let j = 0; j < amt; ++j) a[index++] = num;
        else a[index++] = parseInt(c[0], 16);
    }
    return new World.prototype.ChunkData(a);
}