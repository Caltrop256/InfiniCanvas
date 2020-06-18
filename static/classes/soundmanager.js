World.prototype.SoundManager = class SoundManager {
    constructor(world) {
        this.parent = world;

        this.volume = +this.parent.settings.audioVolume;
        this.isAllowedToPlayAudio = false;
        this.muted = this.parent.settings.muted;

        this.audioContainers = new Map();
        for (let a of ['snd_hover.ogg', 'snd_select.ogg', 'snd_place.ogg']) {
            this.audioContainers.set(a, new Audio('https://cdn.caltrop.dev/canvas/' + a));
        }

        for (let e of ['mousedown', 'click', 'touch', 'touchstart', 'wheel']) {
            window.addEventListener(e, () => this.isAllowedToPlayAudio = true);
        }
    }

    setVolume = n => {
        this.volume = +n;
        this.loopAll(audio => {
            audio.volume = this.volume;
        });
    }

    play = str => {
        if (!this.isAllowedToPlayAudio || this.muted) return;

        const audio = this.audioContainers.get(str);
        if (audio) {
            if (audio.currentTime || !audio.playing) {
                audio.currentTime = 0;
            }
            const promise = audio.play();
            if (promise) {
                promise.catch(() => { });
            }
        } else throw Error('Unknown Audio Source');
    }

    loopAll = callback => {
        const arr = Array.from(this.audioContainers);
        for (let i = 0; i < arr.length; ++i) {
            callback(arr[i][1], arr[i][0], i);
        }
    }
}