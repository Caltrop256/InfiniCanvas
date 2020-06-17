class GameLoop {
    constructor(name, loopFn, preperationFn) {
        this.name = name.toString();
        this._prep = preperationFn || (() => { });
        this._func = loopFn || (() => { });
    }
}