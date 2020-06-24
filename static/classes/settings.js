World.prototype.Settings = class Settings {
    constructor(reset, callback) {
        try {
            this.name = (localStorage.name || '').trim();
            this.color = Math.max(0, Math.min(~~localStorage.color, 0xffffff)) || 0;
            this.preferCTX = typeof localStorage.preferCTX != 'undefined' ? JSON.parse(localStorage.preferCTX) : true;
            this._pos = Vector.from(localStorage._pos).floor().toString();
            this.fpslocked = typeof localStorage.fpslocked != 'undefined' ? JSON.parse(localStorage.fpslocked) : false;
            this.nDesiredFps = ~~localStorage.nDesiredFps || 60;
            this.keybinds = localStorage.keybinds.split(',');
            this.notifyMe = typeof localStorage.notifyMe != 'undefined' ? JSON.parse(localStorage.notifyMe) : true;
            this.visibleElements = (localStorage.visibleElements);
            this.previewMessages = typeof localStorage.previewMessages != 'undefined' ? JSON.parse(localStorage.previewMessages) : true;
            this.showSystemMessages = typeof localStorage.showSystemMessages != 'undefined' ? JSON.parse(localStorage.showSystemMessages) : true;
            this.usesDiscord = typeof localStorage.usesDiscord != 'undefined' ? JSON.parse(localStorage.usesDiscord) : false;
            this.showGrid = typeof localStorage.showGrid != 'undefined' ? JSON.parse(localStorage.showGrid) : false;
            this.autoTile = typeof localStorage.autoTile != 'undefined' ? JSON.parse(localStorage.autoTile) : false;
            this.nonce = (localStorage.nonce || '').trim();
            this.oauthState = (localStorage.oauthState || '').trim();
            this.muted = typeof localStorage.muted != 'undefined' ? JSON.parse(localStorage.muted) : false;
            this.audioVolume = typeof localStorage.audioVolume == 'number' ? localStorage.audioVolume : 0.7;
            this.transmitPosition = typeof localStorage.transmitPosition != 'undefined' ? JSON.parse(localStorage.transmitPosition) : true;
            this.showOtherPlayers = typeof localStorage.showOtherPlayers != 'undefined' ? JSON.parse(localStorage.showOtherPlayers) : window.__Path2DSupport;
            this.hasSeenPopup = JSON.parse(localStorage.hasSeenPopup) ? localStorage.hasSeenPopup : null;
        } catch (e) {
            this.__setDefVals();
        } finally {
            setTimeout(callback, 0);
        }

        this.accountInitialised = (/^[a-zA-z0-9 \-_.$€?!#`´']{3,16}$/).test(this.name);
    }

    __setDefVals = () => {
        console.warn('Settings resetted!');
        this.set('name', '');
        this.set('color', 0);
        this.set('preferCTX', true);
        this.set('_pos', '0,0');
        this.set('fpslocked', false);
        this.set('nDesiredFps', 60);
        this.set('keybinds', ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright', 'e', 'q', 'shift', '', 'control', '', 'g', '', '+', '8', '-', '2']);
        this.set('notifyMe', true);
        this.set('autoTile', false);
        this.set('previewMessages', true);
        this.set('showSystemMessages', true);
        this.set('usesDiscord', false);
        this.set('nonce', '');
        this.set('oauthState', '');
        this.set('muted', false);
        this.set('audioVolume', 0.7);
        this.set('transmitPosition', true);
        this.set('showGrid', false);
        this.set('showOtherPlayers', window.__Path2DSupport);
        this.set('visibleElements', JSON.stringify({
            fpsWrap: false,
            pingWrap: false,
            zoomWrap: window.__isIOS_,
            color_container: true,
            coords: true,
            'Screenshot-Mode-Button': true,
            'Info-Button': true
        }));
        this.set('hasSeenPopup', JSON.stringify({
            tutorial: false,
            edgeOfWorld: false,
            floatingPointInaccuracies: false,
            outdatedBrowser: false,
            multipleTabs: false,
            clickAndDrag: false
        }));
    }

    set(k, v) {
        localStorage[k] = v;
        this[k] = v;
    };

    clear = () => {
        localStorage.clear();
        this.__setDefVals();
    }
}