const { Vector } = require("./vector");

class World {
    constructor(socket) {

        this.CHUNK_SIZE = 64;
        this.CHUNK_SIZE_SQ = this.CHUNK_SIZE * this.CHUNK_SIZE;

        this.IS_MODERATOR = false;

        this._isMobile = false;
        this.fingerSize = 64;
        this.isMobile = ((a) => (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))))(navigator.userAgent || navigator.vendor || window.opera);

        const setFunc = () => {
            try {
                if (this.settings.fpslocked) {
                    this.lockFps(this.settings.nDesiredFps);
                }
                const els = JSON.parse(this.settings.visibleElements);
                for (let k in this.hud.hideableElements) {
                    if (!(this.hud.hideableElements[k][1] = els[k])) {
                        this.hud.el.get(k).style.display = 'none';
                    };
                }
            } catch (e) {
                this.settings = new this.Settings(true, setFunc);
            }
        };

        this.settings = new this.Settings(false, setFunc);
        this.sfx = new this.SoundManager(this);

        this.isFocused = true;

        this.closingTab = false;

        this.inLoginscreen = false;
        this.loggedIn = false;
        this.ping = Infinity;
        this.mousePosition = new Vector();
        this.users = new Map();
        this.userCoords = [];
        this.verlets = new Map();
        this.socket = socket;
        this.socket.on('banned', () => window.location.reload());
        this.socket.on('disconnect', () => {
            this.loggedIn = false;
            document.getElementById('blur').style.display = 'block';
            if (!this.closingTab) document.getElementById('connectionLost').style.display = 'block';
        });
        this.socket.on('connect', () => {
            if (this.socket.__isParent) {
                this.socket.id = this.socket.__socket.id;
                document.getElementById('blur').style.display = 'none';
                document.getElementById('connectionLost').style.display = 'none';
            } else window.location.reload();
        })
        this.socket.on('requestRejection', res => {
            if (res == 'You have to be logged in to make requests!') {
                this.loggedIn = false;
                this.requestUserAccountData(true);
            }
            console.error(res);
        });
        this.socket.on('latency', data => this.ping = Date.now() - data.sent);
        this.socket.on('userUpdate', data => {
            if (data.id == this.socket.id && !this.loggedIn) {
                this.loggedIn = true;
                this.canvas.drawAll();
            }
            this.users.set(data.id, data);
            this.hud.el.get('usersOnlineText').innerHTML = Array.from(this.users).filter(u => u[1].name != '__@@UNINITIALISED').length;
        });
        this.socket.on('requestUserData', this.requestUserAccountData);
        this.socket.on('userLeave', id => {
            this.users.delete(id);
            this.hud.el.get('usersOnlineText').innerHTML = Array.from(this.users).filter(u => u[1].name != '__@@UNINITIALISED').length;
        })
        this.socket.on('allUserData', data => {
            this.users = new Map(data);
            this.hud.el.get('usersOnlineText').innerHTML = data.filter(u => u[1].name != '__@@UNINITIALISED').length;
        });
        this.socket.on('userPositions', data => {
            this.userCoords = data;
            if (this.hud) {
                this.hud.updateOtherUserPos();
            }
        });
        this.socket.on('clientInfo', data => {
            if (typeof data.modStatus == 'boolean') this.IS_MODERATOR = data.modStatus;
        });

        this.ctxDomEl = document.createElement('canvas');
        this.glDomEl = document.createElement('canvas');
        this.ctx = this.ctxDomEl.getContext('2d');
        this.gl = this.glDomEl.getContext('webgl2', {
            preserveDrawingBuffer: true,
            antialias: false
        });

        this.ctxDomEl.style.display = (this.glDomEl.style.display = 'none')
        window.document.body.appendChild(this.ctxDomEl);
        window.document.body.appendChild(this.glDomEl);

        window.addEventListener('focus', () => {
            this.isFocused = true;
            this.camera.__keys = new Map();
            this.camvas.__velocity = new Vector();
            if (this.worker) {
                this.worker.getNotifications().then(notifs => {
                    if (notifs && notifs.length) {
                        for (let i = 0; i < notifs.length; ++i) {
                            notifs[i].close();
                        }
                    }
                })
            }
        });
        window.addEventListener('blur', () => this.isFocused = false);
        window.addEventListener('resize', this.resize);

        window.addEventListener('keydown', e => this.loggedIn ? this.camera.handleKey(e, 1) : 0);
        window.addEventListener('keyup', e => this.loggedIn ? this.camera.handleKey(e, 0) : 0);

        const mouseEvents = ['mousedown', 'mousemove', 'mouseup', 'wheel'],
            touchEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];

        for (let n of mouseEvents) {
            this.ctxDomEl.addEventListener(n, e => !this.usingWebGl ? this.camera['on' + n](e) : 0);
            this.glDomEl.addEventListener(n, e => this.usingWebGl ? this.camera['on' + n](e) : 0)
        }
        for (let i = 0; i < touchEvents.length; ++i) {
            this.ctxDomEl.addEventListener(touchEvents[i], e => e.touches.length == 1 && !this.usingWebGl ? this.camera['on' + mouseEvents[i == 3 ? 2 : i]](this.hud.TouchEventToMouseEvent(e)) : 0);
            this.glDomEl.addEventListener(touchEvents[i], e => e.touches.length == 1 && this.usingWebGl ? this.camera['on' + mouseEvents[i == 3 ? 2 : i]](this.hud.TouchEventToMouseEvent(e)) : 0);
        }
        this.usingWebGl = !this.preferCTX && !!this.gl;
        this.encounteredWebGLError = !this.gl;
        const renderMethod = this.usingWebGl ? 'WebGl' : 'RenderingContext2d';

        this.canvas = new this[renderMethod + 'Canvas'](this);
        this.camera = new this[renderMethod + 'Camera'](this);
        this.colorPlacer = new this.ColorPlacer(this, this.canvas._colors, window.document.getElementsByClassName('color-container')[0]);
        this.hud = new this.HUD(this);

        this.canUsePushNotifications = !!('serviceWorker' in window.navigator && 'Notification' in window);
        this._msDelay = 1000 / this.settings.nDesiredFps;
        this.fpsLocked = this.settings.fpslocked;
        this._lastUpdate = performance.now();
        this._gameLoops = {};
        for (const f of Array.from(arguments).splice(1)) {
            this._gameLoops[f.name] = {
                run: f._func.bind(this),
                prepare: f._prep.bind(this)
            }
        }
        this._selectedGameLoop = null;
        this.currentFps = 0;
        this.fixedUpdateFps = 30;
        this.fractionPassed = 0;
        this.timeElapsed = 0;
        this.secondsPassed = 0;
        this._loop();

        try {
            let v;
            if (window.location.pathname.length <= 2) {
                v = Vector.from(this.settings._pos);
            } else {
                v = Vector.from(window.location.pathname.substring(2));
            }
            if (isFinite(v.x) && isFinite(v.y)) {
                this.teleportTo(v.x, v.y, true);
            };
        } catch (e) { };

        document.getElementById('loading').remove();
        if (!this.socket.__isParent && this.socket instanceof TabManager) {
            document.getElementsByClassName('blur')[0].style.display = 'none';
            this.hud.canvasVelocityMove = true;
            this.loggedIn = true;
            this.canvas.drawAll();
            this.socket.emit('requestAllUserData');

            const seenNotifs = JSON.parse(this.settings.hasSeenPopup);
            if (!seenNotifs.multipleTabs) {
                const wrapper = this.hud.createNotification(300, 100, 12000);

                wrapper.body.innerHTML = `
                    <span>You opened InfiniCanvas in multiple tabs. This may lead to delays and slowdowns!</span>
                `

                seenNotifs.multipleTabs = true;
                this.settings.set('hasSeenPopup', JSON.stringify(seenNotifs));
            }
        }

        window.addEventListener('beforeunload', () => this.closingTab = true);
    }

    get preferCTX() {
        return this.settings.preferCTX;
    }

    set preferCTX(v) {
        return this.settings.set('preferCTX', v);
    }

    get isMobile() {
        return this._isMobile;
    }

    set isMobile(b) {
        if (this._isMobile) return true;
        this._isMobile = b;
        if (this._isMobile) {
            const func = () => {
                this.colorPlacer.domEl.style.width = '60%';
                this.resize();
            };
            if (this.colorPlacer) func();
            else setTimeout(func, 4);
        }
        return this._isMobile;
    }

    resize = () => {
        if (!this.usingWebGl) this.canvas.adjustScaling();
        if (!this.colorPlacer) return;

        if (this._isMobile) {
            const b = this.colorPlacer.domEl,
                a = this.hud.el.get('chat');

            if (a.offsetTop < b.offsetTop) {
                if (!this.hud.chatExtenderButtonActive) {
                    this.hud.chatExtenderButtonActive = true;
                    this.hud.el.get('chatToggle').style.display = 'block';
                    this.hud.hideChat();
                }
            } else if (this.hud.chatExtenderButtonActive) {
                this.hud.chatExtenderButtonActive = false;
                this.hud.el.get('chatToggle').style.display = 'none';
                this.hud.showChat();
            }
            b.style.height = b.clientWidth * 0.25 + 'px';
            b.style.transform = 'translate(-50%, -' + (b.clientHeight) + 'px)';
            var child = b.firstChild,
                i = 0,
                mult = b.clientWidth * 0.125;
            while (child) {
                child.style.top = (~~(i / 8) * mult) + 'px';
                child.style.left = ((i % 8) * mult) + 'px';
                child.style.width = (child.style.height = mult + 'px');
                i++;
                child = child.nextSibling;
            };
        }
    }

    changeToCTX = () => {
        if (!this.usingWebGl) return;
        this.usingWebGl = false;

        const pos = this.camera.pos,
            tileSize = this.camera.tileSize,
            chunkData = this.canvas._chunkCache,
            im = new Image();
        im.src = this.glDomEl.toDataURL();
        im.classList.add('fadeout-image');
        window.document.body.appendChild(im);

        const fade = (i, o) => {
            (o -= 0.1) <= 0.1 ? i.remove() : setTimeout(fade, 16, i, o)
            i.style.opacity = o;
        }
        fade(im, 1);

        for (let s of this.canvas.sprites) {
            s[1].destroy();
        }
        this.camera = null;
        this.canvas = null;

        for (let e of ['chunkData', 'chunkUpdate']) this.socket.removeListener(e);

        this.canvas = new this.RenderingContext2dCanvas(this, chunkData);
        this.camera = new this.RenderingContext2dCamera(this);
        this.camera.tileSize = tileSize;
        this.camera._offset = Vector.from(pos).sub(new Vector(window.innerWidth, window.innerHeight).mult(0.5).div(tileSize).div(this.CHUNK_SIZE)).add(new Vector(0.5, 0.5));
        this.canvas.drawAll();
        this.hud.updateHash();
    }

    changeToWebGL = () => {
        if (this.usingWebGl) return;
        this.usingWebGl = true;

        const pos = this.camera._offset,
            tileSize = this.camera.tileSize,
            chunkData = new Map(Array.from(this.canvas._chunkCache)),
            im = new Image();

        im.src = this.ctxDomEl.toDataURL();
        im.classList.add('fadeout-image');
        window.document.body.appendChild(im);
        const fade = (i, o) => {
            (o -= 0.1) <= 0.1 ? i.remove() : setTimeout(fade, 16, i, o)
            i.style.opacity = o;
        }
        fade(im, 1);

        this.camera = null;
        this.canvas = null;

        for (let e of ['chunkData', 'chunkUpdate']) this.socket.removeListener(e);

        this.canvas = new this.WebGlCanvas(this, chunkData);
        this.camera = new this.WebGlCamera(this);
        this.camera.tileSize = tileSize;
        this.camera.pos.add(Vector.from(pos).add(new Vector(window.innerWidth, window.innerHeight).mult(0.5).div(tileSize).div(this.CHUNK_SIZE)).sub(new Vector(0.5, 0.5)));
        this.camera.updateChunks(window.innerWidth, window.innerHeight);
        this.canvas.drawAll();
        this.hud.updateHash();
    }

    teleportTo = (v, n1, dontupdatehash) => {
        const destination = (typeof n1 != 'undefined' ? new Vector(Number(v), Number(n1)) : Vector.from(v))
            .cap(-2147483648 * this.CHUNK_SIZE, 2147483647 * this.CHUNK_SIZE);

        if (this.usingWebGl) {
            destination.sub(new Vector(window.innerWidth, window.innerHeight).mult(0.5).div(this.camera.tileSize)).div(this.CHUNK_SIZE);
            this.camera.pos.x = destination.x;
            this.camera.pos.y = destination.y;

            const seenNotifs = JSON.parse(this.settings.hasSeenPopup);
            if (!seenNotifs.floatingPointInaccuracies && (Math.abs(destination.x) > 95000 || Math.abs(destination.y) > 95000)) {
                const info = this.hud.createNotification(200, 200, 10000);
                info.body.innerHTML = `
                    <span>You might experience graphical issues with the GPU rendering mode when being far away from 0,0!</span>
                    <button id="switchToCPUBut">Switch to CPU Rendering</button>
                `
                document.getElementById('switchToCPUBut').onclick = () => {
                    this.preferCTX = true;
                    this.changeToCTX();
                    info.close();
                }
                seenNotifs.floatingPointInaccuracies = true;
                this.settings.set('hasSeenPopup', JSON.stringify(seenNotifs));
            }
        } else {
            this.camera._offset = destination.sub(new Vector(window.innerWidth, window.innerHeight).mult(0.5).div(this.camera.tileSize)).div(this.CHUNK_SIZE);
        }
        this.canvas.drawAll();
        if (!dontupdatehash) this.hud.updateHash();
    }

    getCenteredCoords = () => (Vector.from(this.usingWebGl ? this.camera.pos : this.camera._offset)
        .mult(this.CHUNK_SIZE)
        .add(new Vector(window.innerWidth, window.innerHeight).mult(0.5).div(this.camera.tileSize)));

    managePushNotif = () => {
        if (!this.canUsePushNotifications) return console.warn("Push Notifications Unsupported");
        Notification.requestPermission().then(perm => {
            if (perm == 'granted') {
                this.vapidkey = Uint8Array.from([4, 111, 52, 1, 4, 250, 147, 160, 86, 34, 158, 148, 187, 29, 245, 19, 112, 51, 174, 144, 251, 150, 114, 119, 249, 185, 52, 164, 12, 18, 235, 103, 195, 11, 47, 151, 88, 149, 155, 227, 125, 92, 27, 68, 216, 53, 82, 213, 54, 143, 191, 147, 63, 203, 173, 195, 133, 2, 14, 135, 195, 150, 151, 149, 222]);

                window.navigator.serviceWorker.register('/build/sw.js', { scope: '/build/' }).then(sw => {
                    this.worker = sw;

                    this.worker.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: this.vapidkey
                    }).then(subscription => {
                        this.socket.emit('notify', subscription);
                    });
                })
            }
        })
    }

    requestUserAccountData = (change) => {
        if (this.inLoginscreen) return;
        this.inLoginscreen = true;
        const classicLoginWindow = (discordInfo) => {


            document.getElementsByClassName('blur')[0].style.display = 'block';

            const wrapper = this.hud.createPopUp(500, 300, ['logInWindow'], true),
                discordLogIn = `
                <div class="hoverable">
                    <span class="tooltip unselectable">Log-in with Discord</span>
                    <svg enable-background="new 0 0 24 24" height="24px" id="discordLogIn" version="1.1" viewBox="0 0 24 24" width="24px" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="icon"><circle cx="12" cy="11.9975" fill="#8C9EFF" r="11"/><path d="M16.775,8.4375c0,0,-1.3612,-1.0652,-2.9688,-1.1875l-0.1449,0.2897c1.4535,0.3557,2.1203,0.8654,2.8167,1.4915c-1.2009,-0.613,-2.3866,-1.1875,-4.4531,-1.1875s-3.2523,0.5745,-4.4531,1.1875c0.6965,-0.6261,1.4897,-1.192,2.8167,-1.4915l-0.1449,-0.2897C8.5572,7.4094,7.275,8.4375,7.275,8.4375s-1.5203,2.2043,-1.7813,6.5313C7.0262,16.736,9.3531,16.75,9.3531,16.75l0.4866,-0.6487c-0.8259,-0.2871,-1.7587,-0.7998,-2.5647,-1.7263c0.9613,0.7273,2.4121,1.4844,4.75,1.4844s3.7887,-0.757,4.75,-1.4844c-0.806,0.9265,-1.7388,1.4393,-2.5647,1.7263l0.4866,0.6487c0,0,2.3269,-0.014,3.8594,-1.7813C18.2953,10.6418,16.775,8.4375,16.775,8.4375zM10.0953,13.7813c-0.5739,0,-1.0391,-0.5317,-1.0391,-1.1875s0.4652,-1.1875,1.0391,-1.1875c0.5739,0,1.0391,0.5317,1.0391,1.1875S10.6692,13.7813,10.0953,13.7813zM13.9547,13.7813c-0.5739,0,-1.0391,-0.5317,-1.0391,-1.1875s0.4652,-1.1875,1.0391,-1.1875c0.5739,0,1.0391,0.5317,1.0391,1.1875S14.5285,13.7813,13.9547,13.7813z" fill="#FFFFFF"/><path d="M4.2218,19.7782C6.2124,21.7688,8.9624,23,12,23c6.0751,0,11,-4.9249,11,-11c0,-3.0376,-1.2312,-5.7876,-3.2218,-7.7782L4.2218,19.7782z" fill="#231F20" opacity="0.1"/></g></svg>
                </div>
                `, defAv = [
                    'https://discordapp.com/assets/322c936a8c8be1b803cd94861bdfa868.png',
                    'https://discordapp.com/assets/dd4dbc0016779df1378e7812eabaa04d.png',
                    'https://discordapp.com/assets/6debd47ed13483642cf09e832ed0bc1b.png',
                    'https://discordapp.com/assets/0e291f67c9274a1abdddeb3fd919cbaa.png',
                    'https://discordapp.com/assets/1cbd08c76f8af6dddce02c5138971129.png'
                ];
            wrapper.innerHTML = `
                <p>Choose your ${discordInfo ? 'Nick' : 'User'}name!</p>
                <div>
                    ${discordInfo
                    ? discordInfo.avatar
                        ? `<img src="${`https://cdn.discordapp.com/avatars/${discordInfo.id}/${discordInfo.avatar}.${discordInfo.avatar.startsWith('a_') ? 'gif' : 'png'}`}"></img>`
                        : `<img src="${defAv[~~(Math.random() * defAv.length)]}"></img>`
                    : discordLogIn}
                    <input id="loginName" type="text" ${discordInfo ? `value="${discordInfo.username.toString().substring(0, 15)}"` : ''} placeholder="Type username..." minlength="3" maxlength="16" autocapitalize="false" autocomplete="false">
                    <input id="loginColor" type="color" id="nameColorInput" value="#AEAEAE">
                </div>
                ${this.canUsePushNotifications ? `<div>
                    <div class="switch">
                        <input id="allowNotifs" checked type="checkbox" class="switch-input" />
                        <label for="allowNotifs" class="switch-label">Switch</label>
                    </div><span>Notify me when I'm able to place a tile</span>
                </div>` : ''}
                <button id="loginSubmitButton">Log-In</button>
            `;
            window.document.body.appendChild(wrapper);
            window.document.getElementById('loginSubmitButton').addEventListener('click', e => {
                const name = document.getElementById('loginName'),
                    color = document.getElementById('loginColor');

                if (this.canUsePushNotifications && document.getElementById('allowNotifs').checked) {
                    this.settings.set('notifyMe', true);
                    this.managePushNotif();
                } else {
                    this.settings.set('notifyMe', false);
                }

                if (!name.value.trim().match(/^[a-zA-Z0-9 \-_.$€?!#`´']{3,16}$/)) return name.style.backgroundColor = 'red';
                this.socket.emit('changeDetails', { name: name.value.trim(), color: parseInt(color.value.substring(1), 16) });
                document.getElementsByClassName('blur')[0].style.display = 'none';
                wrapper.remove();
                this.inLoginscreen = false;

                this.settings.set('name', name.value.trim());
                this.settings.set('color', parseInt(color.value.substring(1), 16));
                this.hud.canvasVelocityMove = true;
                checkES5();
            })
        }, createChoiceWindow = () => {
            this.settings.set('name', '');
            this.settings.set('color', '');
            classicLoginWindow(false);

            document.getElementById('discordLogIn').onclick = () => {
                const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
                    cObj = (window.crypto || window.msCrypto || { getRandomValues: function (a) { a.map(() => Math.random() * 255) } }),
                    arr = cObj.getRandomValues(new Uint8Array(16)).map(n => validChars.charCodeAt(n % validChars.length)),
                    state = String.fromCharCode.apply(null, arr),
                    redirect = encodeURI('https://canvas.caltrop.dev:5000');

                this.settings.set('oauthState', state);
                window.location.href = `https://discord.com/api/oauth2/authorize?client_id=716247565913423922&redirect_uri=${redirect}&response_type=code&scope=identify&state=${state}`;
            }
        }, checkES5 = () => {
            const seenNotifs = JSON.parse(this.settings.hasSeenPopup);
            if (window.__ES5_ && !seenNotifs.outdatedBrowser) {
                const wrapper = this.hud.createNotification(300, 100, 12000);

                wrapper.body.innerHTML = `
                    <span>You are using an outdated Browser! You may encounter significant lag or undocumented behaviour.</span>
                `

                seenNotifs.outdatedBrowser = true;
                this.settings.set('hasSeenPopup', JSON.stringify(seenNotifs));
            }
        };

        if (change) {
            createChoiceWindow();
        } else if (!this.settings.accountInitialised || this.settings.oauthState) {
            const isDiscord = !!this.settings.oauthState,
                params = new URLSearchParams(window.location.search),
                urlState = params.get('state'),
                urlCode = params.get('code');

            if (!isDiscord || !urlState || this.settings.oauthState != urlState || !urlCode) {
                this.settings.set('oauthState', '');
                createChoiceWindow();
            } else {
                this.authenticateDiscord(true, urlCode)
                    .then(classicLoginWindow)
                    .catch(createChoiceWindow);
            }
        } else {
            const name = this.settings.name,
                color = this.settings.color;

            if (this.settings.usesDiscord) {
                this.authenticateDiscord(false, this.settings.nonce)
                    .then(info => {
                        document.getElementsByClassName('blur')[0].style.display = 'none';
                        this.socket.emit('changeDetails', { name, color });
                        this.hud.canvasVelocityMove = true;
                        this.inLoginscreen = false;
                        if (this.settings.notifyMe) this.managePushNotif();
                        checkES5();
                    })
                    .catch(createChoiceWindow);
            } else {
                document.getElementsByClassName('blur')[0].style.display = 'none';
                this.socket.emit('changeDetails', { name, color });
                this.hud.canvasVelocityMove = true;
                this.inLoginscreen = false;
                if (this.settings.notifyMe) this.managePushNotif();
                checkES5();
            }
        }
    }

    authenticateDiscord = (firstLogin, code) => {
        return new Promise((resolve, reject) => {
            const authFunc = data => {
                this.socket.removeListener('discordAuthentification', authFunc);
                this.settings.set('oauthState', '');

                if (data.success) {
                    this.settings.set('usesDiscord', true);
                    this.settings.set('nonce', data.nonce);
                    return resolve(data.data);
                } else {
                    this.settings.set('usesDiscord', false);
                    this.settings.set('nonce', '');
                    return reject();
                }
            }
            this.socket.on('discordAuthentification', authFunc);

            this.socket.emit('discordElevation', {
                code: code,
                type: firstLogin ? 'first-login' : 'refresh-login'
            });
        });
    }

    _loop = () => {
        const now = performance.now(),
            elapsed = now - this._lastUpdate;

        this.timeElapsed += elapsed;
        if (this._selectedGameLoop) {
            if (this.fpsLocked) {
                if (elapsed > this._msDelay) {
                    this._lastUpdate = now - (elapsed % this._msDelay);
                    this.currentFps = 1000 / elapsed;
                    this._selectedGameLoopRunFunc();
                };
            } else {
                this._lastUpdate = now;
                this.currentFps = 1000 / elapsed;
                this._selectedGameLoopRunFunc();
            }
        };

        return setTimeout(this._loop, 0);
    }

    lockFps = n => {
        this.fpsLocked = true;
        this._msDelay = 1000 / n;
    }

    unlockFps = () => !(this.fpsLocked = false);

    setState = s => {
        this._selectedGameLoop = s;
        this._gameLoops[this._selectedGameLoop].prepare();
        this._selectedGameLoopRunFunc = this._gameLoops[this._selectedGameLoop].run;
        return this;
    }

    time = ms => {
        const o = {
            day: ~~(ms / 86400000),
            hour: ~~(ms / 3600000) % 24,
            minute: ~~(ms / 60000) % 60,
            second: ~~(ms / 1000) % 60,
        }
        let str = '';
        for (const t in o)
            if (o[t]) str += `${o[t]} ${o[t] == 1 ? t : t + 's'}, `;
        return (str ? str.replace(/, ([^,]*)$/, '').replace(/, ([^,]*)$/, ` and $1`) : 'less than a second');
    }
}