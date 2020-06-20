World.prototype.Canvas = class Canvas {
    constructor(world, data) {
        this.parent = world;
        this.hasReachedEdge = false;

        this._colors = [
            new Color(0xFFFFFF),
            new Color(0x4E4E4E),
            new Color(0x888888),
            new Color(0x222222),
            new Color(0xFFA7D1),
            new Color(0xE50000),
            new Color(0xE59500),
            new Color(0xA06A42),
            new Color(0xE5D900),
            new Color(0x94E044),
            new Color(0x02BE01),
            new Color(0x00D3DD),
            new Color(0x0083C7),
            new Color(0x0000EA),
            new Color(0xCF6EE4),
            new Color(0x820080)
        ]

        this._chunkCache = data || new Map();
        this._requests = new Map();

        this.parent.socket.on('chunkData', data => {
            const newData = [];
            for (let i = 0; i < data.length; ++i) {
                const chunk = data[i];
                this._requests.delete(chunk[0]);
                const parsedData = this.parent.ChunkData.parse(chunk[1], this.parent.CHUNK_SIZE)
                this._chunkCache.set(chunk[0], parsedData);
                newData.push([chunk[0], parsedData]);
            }
            this.chunkDataReceived(newData);
        })

        this.parent.socket.on('chunkUpdate', data => {
            const dataLocStr = Vector.from(data.v).toString();
            if (this._chunkCache.get(dataLocStr)) {
                this._chunkCache.set(dataLocStr, this.parent.ChunkData.parse(data.d, this.parent.CHUNK_SIZE));
                this.chunkUpdateReceived(dataLocStr, this.parent.ChunkData.parse(data.d, this.parent.CHUNK_SIZE));
            }
        })

        setTimeout(() => this.drawAll(), 10);
    }
}