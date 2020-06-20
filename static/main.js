window.addEventListener('load', () => {
    const loop = new GameLoop('main', function () {
        this.hud.update();
        this.camera.update();
        if (this.usingWebGl) this.canvas.update();
        this.colorPlacer.update();

        if (this.timeElapsed > 1000 / this.fixedUpdateFps && this.loggedIn) {
            this.fractionPassed++;

            if (this.fractionPassed >= this.fixedUpdateFps) {
                this.fractionPassed = 0;
                this.secondsPassed++;

                if (this.secondsPassed > 45) {
                    this.secondsPassed = 0;

                    const chunks = Array.from(this.canvas._chunkCache),
                        pos = this.usingWebGl
                            ? Vector.from(this.camera.pos)
                            : Vector.from(this.camera._offset).add(new Vector(window.innerWidth, window.innerHeight).mult(0.5).div(this.camera.tileSize).div(this.CHUNK_SIZE)).sub(new Vector(0.5, 0.5));

                    for (let d of chunks) {
                        const key = d[0],
                            cv = Vector.from(key);

                        if (pos.distance(cv) > 50) {
                            this.canvas._chunkCache.delete(key);
                            if (this.usingWebGl) this.canvas.sprites.get(key).destroy();
                            this.canvas.sprites.delete(key);
                        }
                    }
                    this.canvas._requests = new Map();
                }
            }

            this.timeElapsed = 0;

            this.socket.emit('posInfo', { pos: this.isFocused && this.settings.transmitPosition ? this.mousePosition : { x: null, y: null }, timestamp: Date.now(), verletTile: { active: !!this.colorPlacer.canvas, color: this.colorPlacer.selectedColor } });
        }
    })

    const tabm = new TabManager(() => {
        return new World(tabm, loop).setState('main');
    });
});