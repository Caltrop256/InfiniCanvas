World.prototype.HUD = class HUD {
    constructor(parent) {
        this.parent = parent;
        this.canvasVelocityMove = false;
        this.chatFocused = false;

        this.chatExtenderButtonActive = false;

        this.userCanvas = window.document.createElement('canvas');
        this.uCTX = this.userCanvas.getContext('2d');
        this.userCanvas.style = `display: block; pointer-events: none; background-color: transparent`
        this.userCanvas.width = window.innerWidth;
        this.userCanvas.height = window.innerHeight;
        window.document.body.appendChild(this.userCanvas);

        this.awaitingTeleportRequest = false;

        this.messageAmt = 0;

        this.chatPreviewMessages = 0;

        this.hideableElements = {
            fpsWrap: ['FPS-Display', 0],
            pingWrap: ['Ping-Display', 0],
            zoomWrap: ['Zoom-Slider', 0],
            color_container: ['Color Menu', 1],
            coords: ['Coordinates', 1],
            'Screenshot-Mode-Button': ['Screenshot-Mode', 1],
            'Info-Button': ['Info-Button', 1]
        }

        this.notifs = [];
        this.el = new Map();
        for (let id of ['chatWrap', 'chatToggle', 'users-online', 'tutorialTooltip', 'optionsMenu', 'Screenshot-Mode-Button', 'zoomWrap', 'pingWrap', 'fpsWrap', 'Info-Button', 'chat_preview', 'hud-settings', 'video-settings', 'audio-settings', 'keyboard-settings', 'misc-settings', 'mobileZoomSlider', 'color_container', 'blur', 'messageSend', 'coords', 'teleportButton', 'rateLimitCooldown', 'rateLimitCooldownText', 'chat', 'history', 'fps', 'ping', 'usersOnlineText', 'messageInput', 'rateLimitbar'])
            this.el.set(id, document.getElementById(id));

        const $ = k => this.el.get(k);

        for (let id of ['chatToggle', 'users-online', 'optionsMenu', 'Screenshot-Mode-Button', 'Info-Button', 'hud-settings', 'video-settings', 'audio-settings', 'keyboard-settings', 'misc-settings', 'messageSend', 'teleportButton']) {
            $(id).addEventListener('mouseenter', () => this.parent.sfx.play('snd_hover.ogg'));
            $(id).addEventListener('pointerdown', () => this.parent.sfx.play('snd_select.ogg'));
        };

        const _seenNotifs = JSON.parse(this.parent.settings.hasSeenPopup);
        if (_seenNotifs.tutorial) {
            $('tutorialTooltip').style.visibility = 'hidden';
        };

        $('users-online').onclick = e => {
            const wrapper = window.document.createElement('div'),
                users = Array.from(this.parent.users);

            let str = `
                <div style="overflow-y: auto">
            `, n = 0;

            for (let i = 0; i < users.length; ++i) {
                if (users[i][1].name != '__@@UNINITIALISED') {
                    n++;
                    str += `
                        <div class="users-online-listing" style="cursor:pointer;" id="usListBut_${users[i][0]}">
                            <div style="display: flex; justify-content: space-evenly">
                                <span style="color: ${users[i][1].color.hexString}">${users[i][1].elevated ? `<img style="width:16px;height:16px" src="${users[i][1].discordInfo.avatarURL}"></img>` : ''}${users[i][1].name}</span>
                            </div>
                            <span style="font-size: 8px">${users[i][0]}</span>
                        </div>
                    `
                    setTimeout(() => {
                        document.getElementById(`usListBut_${users[i][0]}`).onclick = e => {
                            remove(e);
                            this.showuserinfo(users[i][0], e);
                        }
                    })
                }
            }

            if (!n) return;

            n = Math.min(n, 7);

            str += '</div>';
            wrapper.innerHTML = str;
            wrapper.style = `
                position: absolute;
                display: flex;
                flex-direction: column;
                justify-content: space-evenly;
                z-Index: 10003;
                width: 200px;
                height: ${n * 36 + 16}px;
                background-color: #282934;
                border: 2px solid white;
                color: white;
                font-family: sans-serif;
                text-align: center;
                border-radius: 4px;
                top: ${e.clientY - (n * 36 + 16)}px;
                left: ${e.clientX}px;
                overflow-y: auto;
        `

            const wrapperRect = wrapper.getBoundingClientRect();
            const remove = e => {
                if (!this.parent.colorPlacer.pointIntersectsBoundingRect(e.clientX, e.clientY, wrapperRect)) {
                    wrapper.remove();
                    window.removeEventListener('mousedown', remove);
                    window.removeEventListener('touchend', removeMobile);
                    this.el.get('history').style.display = '';
                }
            }, removeMobile = e => {
                remove(this.TouchEventToMouseEvent(e))
            }

            window.document.body.appendChild(wrapper);

            let sp = e => e.stopPropagation();

            wrapper.addEventListener('mousedown', sp);
            wrapper.addEventListener('touchend', sp);

            window.addEventListener('mousedown', remove);
            window.addEventListener('touchend', removeMobile);
        };

        $('Info-Button').addEventListener('click', () => {
            const __seenNotifs = JSON.parse(this.parent.settings.hasSeenPopup);
            __seenNotifs.tutorial = true;
            this.parent.settings.set('hasSeenPopup', JSON.stringify(__seenNotifs));
            $('tutorialTooltip').style.visibility = 'hidden';

            $('blur').style.display = 'block';
            const wrapper = this.createPopUp(500, 500, ['introduction', 'unselectable']);
            wrapper.style.overflowY = 'auto';
            wrapper.style.overflowX = 'hidden';
            const k = this.parent.settings.keybinds;
            wrapper.innerHTML = `
                <h1>Welcome to InfiniCanvas!</h1>
                <div class="icons">
                    <div class="hoverable" id="twitterBut">
                        <svg height="512pt" viewBox="0 0 512 512" width="512pt" xmlns="http://www.w3.org/2000/svg"><path style="fill: #1DA1F2" d="m256 0c-141.363281 0-256 114.636719-256 256s114.636719 256 256 256 256-114.636719 256-256-114.636719-256-256-256zm116.886719 199.601562c.113281 2.519532.167969 5.050782.167969 7.59375 0 77.644532-59.101563 167.179688-167.183594 167.183594h.003906-.003906c-33.183594 0-64.0625-9.726562-90.066406-26.394531 4.597656.542969 9.277343.8125 14.015624.8125 27.53125 0 52.867188-9.390625 72.980469-25.152344-25.722656-.476562-47.410156-17.464843-54.894531-40.8125 3.582031.6875 7.265625 1.0625 11.042969 1.0625 5.363281 0 10.558593-.722656 15.496093-2.070312-26.886718-5.382813-47.140624-29.144531-47.140624-57.597657 0-.265624 0-.503906.007812-.75 7.917969 4.402344 16.972656 7.050782 26.613281 7.347657-15.777343-10.527344-26.148437-28.523438-26.148437-48.910157 0-10.765624 2.910156-20.851562 7.957031-29.535156 28.976563 35.554688 72.28125 58.9375 121.117187 61.394532-1.007812-4.304688-1.527343-8.789063-1.527343-13.398438 0-32.4375 26.316406-58.753906 58.765625-58.753906 16.902344 0 32.167968 7.144531 42.890625 18.566406 13.386719-2.640625 25.957031-7.53125 37.3125-14.261719-4.394531 13.714844-13.707031 25.222657-25.839844 32.5 11.886719-1.421875 23.214844-4.574219 33.742187-9.253906-7.863281 11.785156-17.835937 22.136719-29.308593 30.429687zm0 0"/></svg>
                        <span class="tooltip unselectable">Follow @Caltrop256 on Twitter</span>
                    </div>
                    <div class="hoverable" id="redditBut">
                        <svg height="512pt" viewBox="0 0 512 512" width="512pt" xmlns="http://www.w3.org/2000/svg"><path style="fill: #FF4500" d="m309.605469 343.347656c-11.46875 11.46875-36.042969 15.5625-53.554688 15.5625-17.5625 0-42.085937-4.09375-53.554687-15.5625-2.714844-2.714844-7.066406-2.714844-9.777344 0-2.714844 2.714844-2.714844 7.066406 0 9.777344 18.175781 18.175781 53.09375 19.609375 63.332031 19.609375s45.105469-1.433594 63.335938-19.609375c2.660156-2.714844 2.660156-7.066406 0-9.777344-2.714844-2.714844-7.066407-2.714844-9.78125 0zm0 0"/><path style="fill: #FF4500" d="m224 282.675781c0-14.695312-11.980469-26.675781-26.675781-26.675781-14.691407 0-26.675781 11.980469-26.675781 26.675781 0 14.691407 11.984374 26.675781 26.675781 26.675781 14.695312 0 26.675781-11.980468 26.675781-26.675781zm0 0"/><path style="fill: #FF4500" d="m256 0c-141.363281 0-256 114.636719-256 256s114.636719 256 256 256 256-114.636719 256-256-114.636719-256-256-256zm148.53125 290.148438c.5625 3.6875.871094 7.425781.871094 11.214843 0 57.445313-66.867188 103.988281-149.351563 103.988281s-149.351562-46.542968-149.351562-103.988281c0-3.839843.308593-7.628906.871093-11.316406-13.003906-5.835937-22.066406-18.890625-22.066406-34.046875 0-20.582031 16.691406-37.324219 37.324219-37.324219 10.035156 0 19.097656 3.941407 25.804687 10.394531 25.90625-18.6875 61.75-30.621093 101.632813-31.644531 0-.511719 18.636719-89.292969 18.636719-89.292969.359375-1.738281 1.382812-3.226562 2.867187-4.195312 1.484375-.972656 3.277344-1.28125 5.019531-.921875l62.054688 13.207031c4.351562-8.804687 13.308594-14.898437 23.804688-14.898437 14.746093 0 26.675781 11.929687 26.675781 26.675781s-11.929688 26.675781-26.675781 26.675781c-14.285157 0-25.855469-11.265625-26.519532-25.394531l-55.554687-11.828125-16.996094 80.027344c39.167969 1.378906 74.34375 13.257812 99.839844 31.691406 6.707031-6.5 15.820312-10.496094 25.90625-10.496094 20.636719 0 37.324219 16.691407 37.324219 37.324219 0 15.257812-9.164063 28.3125-22.117188 34.148438zm0 0"/><path style="fill: #FF4500" d="m314.675781 256c-14.695312 0-26.675781 11.980469-26.675781 26.675781 0 14.691407 11.980469 26.675781 26.675781 26.675781 14.691407 0 26.675781-11.984374 26.675781-26.675781 0-14.695312-11.980468-26.675781-26.675781-26.675781zm0 0"/></svg>
                        <span class="tooltip unselectable">Join the /r/InfiniCanvas Subreddit</span>
                    </div>
                 </div>
                <div class="inline">
                    <p>Place down tiles on an infinite canvas with friends online! The rate limit will be applied based on the amount of players online and how many tiles you have placed recently. Make yourself comfortable and enjoy your stay!</p>
                    <h2>Controls</h2>
                    <p>Click and drag on the canvas to move the camera! You can also click on a specific tile to center the camera on it.</p>
                    <img src="https://cdn.caltrop.dev/canvas/move.gif"></img>
                    <p>Place down tiles by dragging them from the color menu to the desired spot on the canvas!</p>
                    <img src="https://cdn.caltrop.dev/canvas/place.gif"></img>
                    <p>There are also a variety of keyboard shortcuts which you can adjust in the settings!</p>
                    <table class="keyboardShortcuts">
                        <tr>
                            <th>move up</th>
                            <th><kbd>${k[0]}</kbd></th>
                        </tr>
                        <tr>
                            <th>move left</th>
                            <th><kbd>${k[1]}</kbd></th>
                        </tr>
                        <tr>
                            <th>move down</th>
                            <th><kbd>${k[2]}</kbd></th>
                        </tr>
                        <tr>
                            <th>move right</th>
                            <th><kbd>${k[3]}</kbd></th>
                        </tr>
                        <tr>
                            <th>get last tile</th>
                            <th><kbd>${k[8]}</kbd></th>
                        </tr>
                        <tr>
                            <th>next tile</th>
                            <th><kbd>${k[10]}</kbd></th>
                        </tr>
                        <tr>
                            <th>previous tile</th>
                            <th><kbd>${k[12]}</kbd></th>
                        </tr>
                    </table>
                    <button class="close-button" id="closeIntroBut">close</button>
                </div>
            `;
            window.document.body.appendChild(wrapper);

            document.getElementById('twitterBut').onclick = () => window.open('https://twitter.com/Caltrop256', '_blank');
            document.getElementById('redditBut').onclick = () => window.open('https://www.reddit.com/r/InfiniCanvas/', '_blank');

            document.getElementById('closeIntroBut').onclick = () => {
                this.canvasVelocityMove = true;
                wrapper.remove();
                this.el.get('blur').style.display = 'none';
            };
        });

        $('chat').addEventListener('mouseenter', e => {
            this.canvasVelocityMove = false;
            this.clearPreviewMessages();

            $('history').scrollTo(0, $('history').scrollHeight);

            if (window.innerWidth <= 579) {
                $('color_container').style.display = 'none';
            }
        });

        $('chat').addEventListener('mouseleave', e => {
            if (this.chatFocused) return;
            this.canvasVelocityMove = true;
            this.clearPreviewMessages();
            $('color_container').style.display = 'flex';
        });

        $('messageInput').addEventListener('blur', () => {
            this.chatFocused = false;
            $('history').style.display = '';
            this.canvasVelocityMove = true;
            this.clearPreviewMessages();
            $('color_container').style.display = 'flex';
        })

        $('messageInput').addEventListener('focus', () => {
            this.chatFocused = true;
            $('history').style.display = 'block';
        });

        $('teleportButton').addEventListener('mousedown', this.openTelMenu);

        this.parent.socket.on('chatMessage', data => {
            const msg = window.document.createElement('ul'),
                user = this.parent.users.get(data.id),
                el = $('history'),
                scrolledToBottom = (el.scrollTop - 2) == (el.scrollHeight - el.offsetHeight),
                msgId = data.msgId,
                d = new Date(),
                hours = d.getHours().toString().padStart(2, '0'),
                minutes = d.getMinutes().toString().padStart(2, '0'),
                seconds = d.getSeconds().toString().padStart(2, '0'),
                mentions = data.mentions;

            var mentionsme = false;
            for (let i = 0; i < mentions.length; ++i) {
                for (let j = 0; j < mentions[i][1]; ++j) {
                    if (mentions[i][0] == this.parent.socket.id) mentionsme = true;
                    setTimeout(() => {
                        window.document.getElementById('chatmention_' + mentions[i][0] + '_' + msgId + '_n' + (j + 1)).addEventListener('click', e => {
                            this.showuserinfo(mentions[i][0], e);
                        });
                    });
                }
            }

            const parsedMessage = data.msg.replace(/(?:\s|^)@-?[0-9]{1,12}, ?-?[0-9]{1,12}(?=\s|$)/g, str => {
                const nums = str.match(/-?\d+/g).map(Number),
                    rand = Math.floor(Math.random() * 999).toString(16);

                setTimeout(() => {
                    document.getElementById('locationLink' + rand).onclick = () => this.parent.teleportTo(nums[0], nums[1]);
                }, 10);
                return '<span class="location-link" id="locationLink' + rand + '"> @' + nums[0] + ',' + nums[1] + ' </span>';
            });

            const messageHTML = `
                ${user.elevated ? `<img class="chat-avatar" src="${user.discordInfo.avatarURL}"></img> ` : ''}
                &lt<span class="username" id="chat_usn_but_${user.id}_${msgId}" style="color: ${user.color.hexString}">${(user.name)}</span>&gt
                <span class="message" title="sent at ${hours}:${minutes}:${seconds}" ${mentionsme ? 'style="background-color: #FFCB0811 !important"' : ''} id="${msgId}_body">${parsedMessage}</span>
            `

            msg.innerHTML = messageHTML;
            el.appendChild(msg);

            document.getElementById(`chat_usn_but_${user.id}_${msgId}`).addEventListener('click', this.showuserinfo.bind(this, user.id));

            if (scrolledToBottom) {
                el.scrollTo(0, el.scrollHeight);
            }

            if (this.canvasVelocityMove && window.innerWidth >= 580 && this.parent.settings.previewMessages) {
                this.chatPreviewMessages++;
                $('chat_preview').style.opacity = 1;
                $('chat_preview').style.display = 'block';
                const previewMessage = window.document.createElement('ul'),
                    fadeOutRemove = (e, o) => {
                        e.style.opacity = (o -= 0.1);
                        if (o <= 0) {
                            this.chatPreviewMessages--;
                            e.remove();
                            if (!this.chatPreviewMessages) {
                                $('chat_preview').style.display = 'none';
                            }
                            return;
                        }
                        window.setTimeout(fadeOutRemove, 500, e, o);
                    };
                previewMessage.innerHTML = messageHTML.replace(/class="location-link" id="locationLink[a-fA-F0-9]+">/g, 'class="location-link">');
                $('chat_preview').appendChild(previewMessage);
                $('chat_preview').scrollTo(0, $('chat_preview').scrollHeight);
                fadeOutRemove(previewMessage, 1);
            }

            if (this.messageAmt + 1 >= 100) {
                $('history').childNodes[0].remove();
            } else this.messageAmt++;
        });

        this.parent.socket.on('systemMessage', data => {
            if (!this.parent.settings.showSystemMessages) return;
            const msg = window.document.createElement('ul'),
                el = $('history'),
                scrolledToBottom = (el.scrollTop - 2) == (el.scrollHeight - el.offsetHeight),
                d = new Date(),
                hours = d.getHours().toString().padStart(2, '0'),
                minutes = d.getMinutes().toString().padStart(2, '0'),
                seconds = d.getSeconds().toString().padStart(2, '0'),
                msgId = ~~(Math.random() * 0xfffff);

            msg.innerHTML = `<span class="message" title="sent at ${hours}:${minutes}:${seconds}" style = "color: #FFFF55"> ${(data.msg)}</span>`;
            if (data.user) {
                msg.addEventListener('click', (e) => this.showuserinfo(data.user, e));
                msg.classList.add('special-system-message')
            }
            el.appendChild(msg);

            if (scrolledToBottom) {
                el.scrollTo(0, el.scrollHeight);
            }

            if (this.canvasVelocityMove && window.innerWidth >= 580) {
                this.chatPreviewMessages++;
                $('chat_preview').style.opacity = 1;
                $('chat_preview').style.display = 'block';
                const previewMessage = window.document.createElement('ul'),
                    fadeOutRemove = (e, o) => {
                        e.style.opacity = (o -= 0.1);
                        if (o <= 0) {
                            this.chatPreviewMessages--;
                            e.remove();
                            if (!this.chatPreviewMessages) {
                                $('chat_preview').style.display = 'none';
                            }
                            return;
                        }
                        window.setTimeout(fadeOutRemove, 500, e, o);
                    };
                previewMessage.innerHTML = `<span class="message" style = "color: #FFFF55"> ${(data.msg)}</span>`
                $('chat_preview').appendChild(previewMessage);
                $('chat_preview').scrollTo(0, $('chat_preview').scrollHeight);
                fadeOutRemove(previewMessage, 1);
            }

            if (this.messageAmt + 1 >= 100) {
                $('history').childNodes[0].remove();
            } else this.messageAmt++;
        })

        this.parent.socket.on('teleportPermissionRequest', user => {
            const info = this.createNotification(300, 150, 30000),
                closeFunc = info.close.bind(info);
            info.body.innerHTML = `
                <span> You have received a teleportation request from ${ user.name} !</span>
                    <button id="telAccept">Accept</button><button id="telReject">Decline</button>
            `

            info.close = function () {
                closeFunc();
                this.parent.parent.socket.emit('teleportationRequestReponse', { id: user.id, accepted: false, coords: this.parent.parent.usingWebGl ? Vector.from(this.parent.parent.camera.pos) : Vector.from(this.parent.parent.camera._offset) });
            }.bind(info);

            document.getElementById('telReject').onclick = info.close;
            document.getElementById('telAccept').onclick = () => {
                closeFunc();
                this.parent.socket.emit('teleportationRequestReponse', { id: user.id, accepted: true, coords: this.parent.usingWebGl ? Vector.from(this.parent.camera.pos) : Vector.from(this.parent.camera._offset) })
            }
        });

        this.parent.socket.on('teleportationResult', data => {
            this.awaitingTeleportRequest = false;
            const info = this.createNotification(200, 100, 7000);
            if (data.accepted) {
                this.parent.teleportTo(Vector.from(data.coords).mult(this.parent.CHUNK_SIZE));
                this.parent.canvas.drawAll();
                info.body.innerHTML = `<span> ${data.target.name} has accepted your teleport request!</span> `
            } else {
                info.body.innerHTML = `<span> ${data.target.name} has rejected your teleport request!</span> `
            }
        })

        $('messageInput').addEventListener('input', e => {
            this.canvasVelocityMove = false;
            if (e.inputType == 'insertLineBreak') {
                const txt = $('messageInput');
                if (txt.value.length > 0 && txt.value.length < 120) {
                    const str = txt.value
                        .replace(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/g, ' ')
                        .replace(/@([a-zA-Z0-9 \-_.$€?!#`´']{3,16})/g, match => {
                            const users = Array.from(this.parent.users);
                            let found = null,
                                foundname = '';
                            for (let i = 0; i < users.length; ++i) {
                                if (users[i][1].name.toLowerCase() == match.substring(1).trim().toLowerCase()) {
                                    found = users[i][0];
                                    foundname = users[i][1].name;
                                    break;
                                }
                            }
                            for (let i = 0; i < users.length; ++i) {
                                if (match.substring(1).trim().toLowerCase().includes(users[i][1].name.toLowerCase())) {
                                    found = users[i][0];
                                    foundname = users[i][1].name;
                                    break;
                                }
                            }
                            if (found) {
                                return ' <@' + found + '> ' + match.substring(foundname.length + 1);
                            } else return match;
                        })
                        .trim();
                    this.parent.socket.emit('sendMessage', str);
                }
                txt.value = '';
            }
        });

        $('messageSend').addEventListener('click', () => {
            const txt = $('messageInput');
            if (txt.value.length > 0 && txt.value.length < 120) {
                const str = txt.value
                    .replace(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/g, ' ')
                    .replace(/@([a-zA-Z0-9 \-_.$€?!#`´']{3,16})/g, match => {
                        const users = Array.from(this.parent.users);
                        let found = null;
                        for (let i = 0; i < users.length; ++i) {
                            if (users[i][1].name.toLowerCase() == match.substring(1).trim().toLowerCase()) {
                                found = users[i][0];
                                break;
                            }
                        }
                        if (found) {
                            return ' <@' + found + '> ';
                        } else return match;
                    })
                    .trim();
                this.parent.socket.emit('sendMessage', str);
            }
            txt.value = '';
        })

        $('mobileZoomSlider').addEventListener('input', () => {
            const val = ~~$('mobileZoomSlider').value;
            if (val == this.parent.camera.tileSize) return;
            if (this.parent.usingWebGl) {
                this.parent.camera.tileSize = val;
            } else {
                const winVec = new Vector(window.innerWidth, window.innerHeight).mult(0.5),
                    anchorPoint = this.parent.camera.mouseToTileSpace(winVec);
                this.parent.camera.tileSize = val;
                const lastPos = this.parent.camera.mouseToTileSpace(winVec);
                this.parent.camera._offset.sub(Vector.difference(lastPos, anchorPoint).div(this.parent.CHUNK_SIZE));
            }

            this.parent.camera.updateChunks(window.innerWidth, window.innerHeight);
            this.parent.canvas.drawAll();
            this.updateHash();
        })

        $('Screenshot-Mode-Button').onclick = this.enterScreenshotMode;

        $('misc-settings').addEventListener('click', () => {
            $('blur').style.display = 'block';
            const wrapper = this.createPopUp(400, 350, ['settings']),
                discordLogIn = `
                <div class="hoverable">
                    <svg enable-background="new 0 0 24 24" height="24px" id="discordLogIn" version="1.1" viewBox="0 0 24 24" width="24px" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="icon"><circle cx="12" cy="11.9975" fill="#8C9EFF" r="11"/><path d="M16.775,8.4375c0,0,-1.3612,-1.0652,-2.9688,-1.1875l-0.1449,0.2897c1.4535,0.3557,2.1203,0.8654,2.8167,1.4915c-1.2009,-0.613,-2.3866,-1.1875,-4.4531,-1.1875s-3.2523,0.5745,-4.4531,1.1875c0.6965,-0.6261,1.4897,-1.192,2.8167,-1.4915l-0.1449,-0.2897C8.5572,7.4094,7.275,8.4375,7.275,8.4375s-1.5203,2.2043,-1.7813,6.5313C7.0262,16.736,9.3531,16.75,9.3531,16.75l0.4866,-0.6487c-0.8259,-0.2871,-1.7587,-0.7998,-2.5647,-1.7263c0.9613,0.7273,2.4121,1.4844,4.75,1.4844s3.7887,-0.757,4.75,-1.4844c-0.806,0.9265,-1.7388,1.4393,-2.5647,1.7263l0.4866,0.6487c0,0,2.3269,-0.014,3.8594,-1.7813C18.2953,10.6418,16.775,8.4375,16.775,8.4375zM10.0953,13.7813c-0.5739,0,-1.0391,-0.5317,-1.0391,-1.1875s0.4652,-1.1875,1.0391,-1.1875c0.5739,0,1.0391,0.5317,1.0391,1.1875S10.6692,13.7813,10.0953,13.7813zM13.9547,13.7813c-0.5739,0,-1.0391,-0.5317,-1.0391,-1.1875s0.4652,-1.1875,1.0391,-1.1875c0.5739,0,1.0391,0.5317,1.0391,1.1875S14.5285,13.7813,13.9547,13.7813z" fill="#FFFFFF"/><path d="M4.2218,19.7782C6.2124,21.7688,8.9624,23,12,23c6.0751,0,11,-4.9249,11,-11c0,-3.0376,-1.2312,-5.7876,-3.2218,-7.7782L4.2218,19.7782z" fill="#231F20" opacity="0.1"/></g></svg>
                </div>
                `

            wrapper.innerHTML = `
                <h1>Account Settings</h1>
                <div style="border-bottom: 2px solid white; padding-bottom: 5px;">
                    <div class="logInWindow">
                        <div style="margin-top: 0px; !important" >
                            ${this.parent.users.get(this.parent.socket.id).elevated
                    ? `<img src="${this.parent.users.get(this.parent.socket.id).discordInfo.avatarURL}"></img>`
                    : discordLogIn}
                            <input id="loginName" type="text" value="${this.parent.settings.name}" placeholder="Type username..." minlength="3" maxlength="16" autocapitalize="false" autocomplete="false">
                            <input id="loginColor" type="color" id="nameColorInput" value="#${this.parent.settings.color.toString(16)}">
                        </div>
                    </div>
                    <button id="updateUserInfo">Update User Info</button>
                </div>
                <div class="switch" style="margin-top: 10px">
                    <input id="transPos" type="checkbox" ${this.parent.settings.transmitPosition ? 'checked' : ''} class="switch-input" />
                    <label for="transPos" id="transPos_label" class="switch-label">Switch</label>  
                </div>
                <span>Show my cursor to other people</span>
                <br>
                <button id="forgetBut">Forget me!</button><br>
                
                <button id="closeMiscSet" class="close-button">Close</button>
            `;

            window.document.body.appendChild(wrapper);

            document.getElementById('transPos_label').onclick = () => {
                this.parent.settings.set('transmitPosition', !document.getElementById('transPos').checked);
            }

            if (!this.parent.users.get(this.parent.socket.id).elevated) document.getElementById('discordLogIn').onclick = () => {
                const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
                    cObj = (window.crypto || window.msCrypto || { getRandomValues: function (a) { a.map(() => Math.random() * 255) } }),
                    arr = cObj.getRandomValues(new Uint8Array(16)).map(n => validChars.charCodeAt(n % validChars.length)),
                    state = String.fromCharCode.apply(null, arr),
                    redirect = encodeURI('https://canvas.caltrop.dev:5000');

                this.parent.settings.set('oauthState', state);
                window.location.href = `https://discord.com/api/oauth2/authorize?client_id=716247565913423922&redirect_uri=${redirect}&response_type=code&scope=identify&state=${state}`;
            }

            document.getElementById('updateUserInfo').onclick = () => {
                const name = document.getElementById('loginName'),
                    color = document.getElementById('loginColor');
                if (!name.value.trim().match(/^[a-zA-Z0-9 \-_.$€?!#`´']{3,16}$/)) return name.style.backgroundColor = 'red';
                this.parent.socket.emit('changeDetails', { name: name.value.trim(), color: parseInt(color.value.substring(1), 16) });
                this.parent.settings.set('name', name.value.trim());
                this.parent.settings.set('color', parseInt(color.value.substring(1), 16));
            }

            document.getElementById('forgetBut').onclick = () => {
                this.parent.socket.emit('forgetMe', this.parent.settings.nonce);
                this.parent.settings.clear();
                this.parent.loggedIn = false;
                wrapper.remove();
                window.location.reload(true);
            }

            document.getElementById('closeMiscSet').onclick = () => {
                this.canvasVelocityMove = true;
                wrapper.remove();
                this.el.get('blur').style.display = 'none';
            }
        });

        $('audio-settings').addEventListener('click', () => {
            $('blur').style.display = 'block';
            const wrapper = this.createPopUp(300, 200, ['settings']);

            wrapper.innerHTML = `
                <h1>Audio Settings</h1>
                <span>Mute Audio</span> <div class="switch">
                    <input id="muteCheck" type="checkbox" ${this.parent.settings.muted ? 'checked' : ''} class="switch-input" />
                    <label for="muteCheck" id="muteCheckLabel" class="switch-label"></label>
                </div>
                <br>
                <input id="audioLevel" type="range" min="0" max="1" step="0.01" value="${this.parent.settings.audioVolume}">
                <br>
                <button id="closeAudioSet" class="close-button">Close</button>
            `

            window.document.body.appendChild(wrapper);

            document.getElementById('muteCheckLabel').onclick = () => {
                const muted = !document.getElementById('muteCheck').checked;
                this.parent.settings.set('muted', muted);
                this.parent.sfx.muted = muted;
                this.parent.sfx.play('snd_select.ogg');
            }

            document.getElementById('audioLevel').onchange = () => {
                const volume = document.getElementById('audioLevel').value
                this.parent.sfx.setVolume(volume);
                this.parent.settings.set('audioVolume', volume);
                this.parent.sfx.play('snd_select.ogg');
            }

            document.getElementById('closeAudioSet').onclick = () => {
                this.canvasVelocityMove = true;
                wrapper.remove();
                this.el.get('blur').style.display = 'none';
            }
        })

        $('hud-settings').addEventListener('click', () => {
            $('blur').style.display = 'block';
            const wrapper = this.createPopUp(400, 350, ['settings']),
                els = JSON.parse(this.parent.settings.visibleElements);

            wrapper.innerHTML = `
                <h1>UI Settings</h1>
            `
            window.document.body.appendChild(wrapper);

            for (let k in this.hideableElements) {
                wrapper.innerHTML += `
                    <div class="switch">
                        <input id="${k}_checkbox" type="checkbox" ${this.hideableElements[k][1] ? 'checked' : ''} class="switch-input" />
                        <label for="${k}_checkbox" id="${k}_label" class="switch-label">Switch</label>
                    </div>
                    <span>${this.hideableElements[k][0]}</span>
                    <br>
                `

                setTimeout(() => {
                    document.getElementById(k + '_label').onclick = () => {
                        const el = document.getElementById(k + '_checkbox')
                        els[k] = !el.checked;
                        this.hideableElements[k][1] = !el.checked;
                        this.parent.settings.set('visibleElements', JSON.stringify(els));
                        this.el.get(k).style.display = !el.checked ? '' : 'none';
                    }
                }, 0);
            }
            wrapper.innerHTML += `
                <div style="border-top: 2px solid white; width: 100%"></div>
                <div class="switch">
                    <input id="prevMsg" type="checkbox" ${this.parent.settings.previewMessages ? 'checked' : ''} class="switch-input" />
                    <label for="prevMsg" id="prevMsg_label" class="switch-label">Switch</label>  
                </div>
                <span>Preview Chat messages</span>
                <br>
                <div class="switch">
                    <input id="showSysMsg" type="checkbox" ${this.parent.settings.showSystemMessages ? 'checked' : ''} class="switch-input" />
                    <label for="showSysMsg" id="showSysMsg_label" class="switch-label">Switch</label>  
                </div>
                <span>Show system messages</span>
                <br>
                <div class="switch">
                    <input id="showOtherPlayers" type="checkbox" ${this.parent.settings.showOtherPlayers ? 'checked' : ''} class="switch-input" />
                    <label for="showOtherPlayers" id="showOtherPlayers_label" class="switch-label">Switch</label>  
                </div>
                <span>Show other Players</span>
                <br>
                <button id="closeHudSet" class="close-button">Close</button>
            `;
            wrapper.style.display = 'block';

            document.getElementById('showSysMsg_label').onclick = () => {
                this.parent.settings.set('showSystemMessages', !document.getElementById('showSysMsg').checked);
            }

            document.getElementById('prevMsg_label').onclick = () => {
                this.parent.settings.set('previewMessages', !document.getElementById('prevMsg').checked);
            }

            document.getElementById('showOtherPlayers_label').onclick = () => {
                this.parent.settings.set('showOtherPlayers', (!document.getElementById('showOtherPlayers').checked && window.__Path2DSupport));
            }

            const close = document.getElementById('closeHudSet');
            close.onclick = () => {
                this.canvasVelocityMove = true;
                wrapper.remove();
                this.el.get('blur').style.display = 'none';
            };
        })

        $('video-settings').addEventListener('click', () => {
            $('blur').style.display = 'block';
            const wrapper = this.createPopUp(400, 320, ['settings']);

            wrapper.innerHTML = `
                <h1>Video Settings</h1>
                <div>
                    <h2>Render mode</h2>
                    <div>
                        <button id="changeToCPU">CPU</button>
                        <button id="changeToGPU">GPU</button>
                    </div>
                </div>
                <div>
                    <h2>FPS-Lock</h2>
                    <div>
                        <div class="switch">
                            <input id="togglefpslockcheck" type="checkbox" class="switch-input" />
                            <label for="togglefpslockcheck" class="switch-label">Switch</label>
                        </div>

                        <input id="numbInpFpsLock" type="number" min="24" max="250" step="1" value="${Math.round(1000 / this.parent._msDelay)}">
                        <input id="slidInpFpsLock" type="range" min="24" max="250" step="1" value="${Math.round(1000 / this.parent._msDelay)}">
                    </div>
                </div>
                <button id="closeVidSet" class="close-button">Close</button>
            `

            window.document.body.appendChild(wrapper);

            const numI = document.getElementById('numbInpFpsLock'),
                sliderI = document.getElementById('slidInpFpsLock'),
                checkbox = document.getElementById('togglefpslockcheck'),
                ctxBut = document.getElementById('changeToCPU'),
                glBut = document.getElementById('changeToGPU'),
                close = document.getElementById('closeVidSet');

            if (this.parent.encounteredWebGLError) {
                glBut.disabled = true;
                glBut.style.cursor = 'not-allowed';
            }

            glBut.onclick = () => {
                this.parent.changeToWebGL();
                this.parent.settings.set('preferCTX', false);
            }

            ctxBut.onclick = () => {
                this.parent.changeToCTX();
                this.parent.settings.set('preferCTX', true);
            }

            checkbox.checked = this.parent.fpsLocked;
            if (!this.parent.fpsLocked) {
                numI.disabled = true;
                numI.style.cursor = 'not-allowed';
                sliderI.disabled = true;
                sliderI.style.cursor = 'not-allowed';
            }

            checkbox.onclick = () => {
                this.parent.settings.set('fpslocked', checkbox.checked);
                if (checkbox.checked) {
                    this.parent.lockFps(~~numI.value);
                    numI.disabled = false;
                    numI.style.cursor = 'auto';
                    sliderI.disabled = false;
                    sliderI.style.cursor = 'auto';
                } else {
                    this.parent.unlockFps();
                    numI.disabled = true;
                    numI.style.cursor = 'not-allowed';
                    sliderI.disabled = true;
                    sliderI.style.cursor = 'not-allowed';
                }
            }

            sliderI.oninput = () => {
                this.parent.lockFps(~~sliderI.value);
                numI.value = sliderI.value;
                this.parent.settings.set('nDesiredFps', ~~sliderI.value);
            }

            numI.oninput = () => {
                this.parent.lockFps(~~numI.value);
                sliderI.value = numI.value;
                this.parent.settings.set('nDesiredFps', ~~numI.value);
            }

            close.onclick = () => {
                this.canvasVelocityMove = true;
                wrapper.remove();
                this.el.get('blur').style.display = 'none';
            };
        });

        this.el.get('chatToggle').onclick = this.showChat;

        $('keyboard-settings').addEventListener('click', () => {
            $('blur').style.display = 'block';
            const wrapper = this.createPopUp(400, 340, ['settings', 'keyboard-settings']);

            wrapper.innerHTML = `
                <h1>Key Bindings</h1>
                <div>
                    <span>move Up</span><input id="key0"><input id="key4">
                </div>
                <div>
                    <span>move Left</span><input id="key1"><input id="key5">
                </div>
                <div>
                    <span>move Down</span><input id="key2"><input id="key6">
                </div>
                <div>
                    <span>move right</span><input id="key3"><input id="key7">
                </div>
                <div>
                    <span>get last tile</span><input id="key8"><input id="key9">
                </div>
                <div>
                    <span>next tile</span><input id="key10"><input id="key11">
                </div>
                <div>
                    <span>previous tile</span><input id="key12"><input id="key13">
                </div>
                <button id="closeBindSet" class="close-button">Close</button>
            `

            window.document.body.appendChild(wrapper);

            const currentBindings = this.parent.settings.keybinds;

            for (let i = 0; i < 14; ++i) {
                const el = document.getElementById('key' + i);
                el.type = 'text';
                el.value = currentBindings[i];
                const self = this;
                el.onkeydown = function (e) {
                    e.preventDefault();
                    this.value = e.key.toLowerCase();
                    const bindings = self.parent.settings.keybinds;
                    bindings[i] = e.key.toLowerCase();
                    self.parent.settings.set('keybinds', bindings);
                }
            }

            const close = document.getElementById('closeBindSet');

            close.onclick = () => {
                this.canvasVelocityMove = true;
                wrapper.remove();
                this.el.get('blur').style.display = 'none';
            };
        })

        if (!window.__isIOS_) {
            window.addEventListener('touchstart', this.pinchStartCheck);
            window.addEventListener('touchmove', this.pinch);
            window.addEventListener('touchend', this.touchStopCheck);
        }

        this.pinching = false;
        this.centerOfPinchStart = new Vector();
        this.pinchStartDist = 0;

        if (window.innerWidth <= 699) {
            this.probablyUsingMobile = true;
        }
    }

    clearPreviewMessages = () => {
        for (const el of Array.from(this.el.get('chat_preview')))
            el.remove();
        this.chatPreviewMessages = 0;
    }

    hide = () => {
        this.parent.ctxDomEl.style.zIndex = 99999999;
        this.parent.glDomEl.style.zIndex = 99999999;
    }

    unhide = () => {
        this.parent.ctxDomEl.style.zIndex = 0;
        this.parent.glDomEl.style.zIndex = 0;
    }

    enterScreenshotMode = () => {
        if (!this.parent.usingWebGl) {
            if (this.parent.encounteredWebGLError) {
                this.parent.camera.screenshotMode = true;
                this.takeScreenshot();
                this.parent.camera.screenshotMode = false;
                return;
            } else this.parent.changeToWebGL();
        }
        this.parent.camera.screenshotMode = true;
        this.parent.camera.screenshotFocusLocation = Vector.from(this.parent.camera.pos);
        this.parent.camera.updateChunks(window.innerWidth * 4, window.innerHeight * 4);

        const wrapper = window.document.createElement('div');
        wrapper.classList.add('svg-buttons');
        wrapper.style.zIndex = 100000000;
        wrapper.id = "screenshotTools";
        wrapper.innerHTML = `
            <div class="svg-button" id="saveScreenshot">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.003 3h2.997v5h-2.997v-5zm8.997 1v20h-24v-24h20l4 4zm-19 5h14v-7h-14v7zm16 4h-18v9h18v-9z"/></svg>
            </div>
            <div class="svg-button" id="exitScreenshotMode">
                <svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 612 612" style="enable-background:new 0 0 612 612;" xml:space="preserve"><path d="M439.875,286.875H237.418l78.813-78.814c7.479-7.478,7.479-19.584,0-27.043c-7.478-7.478-19.583-7.478-27.042,0l-108.19,108.19c-4.571,4.571-6.005,10.863-4.954,16.792c-1.052,5.929,0.383,12.221,4.973,16.811l108.19,108.19c7.478,7.478,19.584,7.478,27.043,0c7.478-7.478,7.478-19.584,0-27.043l-78.833-78.833h202.457c10.557,0,19.125-8.568,19.125-19.125C459,295.443,450.432,286.875,439.875,286.875z M306,0C136.992,0,0,136.992,0,306c0,168.988,136.992,306,306,306s306-137.012,306-306C612,136.992,475.008,0,306,0z M306,573.75 C158.125,573.75,38.25,453.875,38.25,306C38.25,158.125,158.125,38.25,306,38.25c147.875,0,267.75,119.875,267.75,267.75 C573.75,453.875,453.875,573.75,306,573.75z"/></svg>
            </div>
        `;
        window.document.body.appendChild(wrapper);

        document.getElementById('saveScreenshot').onclick = this.takeScreenshot;
        document.getElementById('exitScreenshotMode').onclick = this.exitScreenshotMode;
        this.hide();
    }

    takeScreenshot = () => {
        if (!this.parent.camera.screenshotMode) return;
        const filename = 'InfiniCanvas_' + ~~(Math.random() * 0xff) + '.png';
        this.parent.canvas._domEl.toBlob(blob => {
            if (window.navigator.msSaveOrOpenBlob) {
                window.navigator.msSaveBlob(blob, filename);
            } else {
                const el = window.document.createElement('a');
                el.href = window.URL.createObjectURL(blob);
                el.download = filename;
                document.body.appendChild(el);
                el.click();
                document.body.removeChild(el);
            }
        }, 'image/png', 1);
    }

    exitScreenshotMode = () => {
        this.parent.camera.screenshotMode = false;
        this.parent.camera.pos.x = this.parent.camera.screenshotFocusLocation.x;
        this.parent.camera.pos.y = this.parent.camera.screenshotFocusLocation.y;
        this.parent.camera.updateChunks(window.innerWidth, window.innerHeight);
        this.unhide();
        document.getElementById('screenshotTools').remove();
        if (this.parent.preferCTX) this.parent.changeToCTX();
        else this.parent.canvas.drawAll();
    }

    showuserinfo = (id, e) => {
        const user = this.parent.users.get(id);
        if (!user) return;
        const wrapper = window.document.createElement('div'),
            ban = this.parent.IS_MODERATOR
                ? `<div style="display: flex">
                    <input id="banTime" type="number" value="1">
                    <button id="banBut">ban</button>
                </div>`
                : '';
        if (user.elevated) {
            wrapper.innerHTML = `
                <img style="background-color: #282934; width: 64px; height: 64px; border-radius: 50%; position: absolute; top: -20px; left: -20px; border:2px solid white;" src="${user.discordInfo.avatarURL}"></img>
                <span style="font-size: 18px !important; color: ${user.color.hexString}">${user.name}</span>
                <span style="font-size: 16px !important">${user.discordInfo.username}#${user.discordInfo.discriminator}</span>
                <span style="color: grey; font-size: 12px">joined ${this.parent.time(Date.now() - user.joinedAt)} ago</span>
                <footer style="justify-self: flex-end; font-size: 8px; color: grey; width: 100%; text-align: center">ID: ${user.id}<br>Discord ID: ${user.discordInfo.id}</footer>
                ${ban}
            `
        } else {
            wrapper.innerHTML = `
            <span style="color: ${user.color.hexString}">${user.name}</span>
            <span style="font-size: 16px; color: grey">joined ${this.parent.time(Date.now() - user.joinedAt)} ago</span>
            <footer style="justify-self: flex-end; font-size: 8px; color: grey; width: 100%; text-align: center">${user.id}</footer>
            ${ban}
        `
        }

        wrapper.style = `
            position: absolute;
            display: flex;
            flex-direction: column;
            justify-content: space-evenly;
            z-Index: 10003;
            width: 200px;
            height: 120px;
            background-color: #282934;
            border: 2px solid white;
            color: white;
            font-family: sans-serif;
            text-align: center;
            border-radius: 4px;
            top: ${e.clientY - 150}px;
            left: ${e.clientX}px;
        `

        const wrapperRect = wrapper.getBoundingClientRect();
        this.el.get('history').style.display = 'block';
        const remove = e => {
            if (!this.parent.colorPlacer.pointIntersectsBoundingRect(e.clientX, e.clientY, wrapperRect)) {
                wrapper.remove();
                window.removeEventListener('mousedown', remove);
                window.removeEventListener('touchend', removeMobile);
                this.el.get('history').style.display = '';
            }
        }, removeMobile = e => {
            remove(this.TouchEventToMouseEvent(e))
        }

        window.document.body.appendChild(wrapper);

        var banEl = document.getElementById('banBut');
        if (banEl) banEl.onclick = () => {
            const time = +document.getElementById('banTime').value;
            this.parent.socket.emit('requestBan', { time, id });
        }

        let sp = e => e.stopPropagation();

        wrapper.addEventListener('mousedown', sp);
        wrapper.addEventListener('touchend', sp);

        window.addEventListener('mousedown', remove);
        window.addEventListener('touchend', removeMobile);
    }

    showChat = () => {
        this.el.get('chatWrap').style.marginLeft = '0px';
        const but = this.el.get('chatToggle');
        but.onclick = this.hideChat;
        but.innerHTML = '-';
    }

    hideChat = () => {
        this.el.get('chatWrap').style.marginLeft = '-300px';
        const but = this.el.get('chatToggle');
        but.onclick = this.showChat;
        but.innerHTML = '+';
    }

    openTelMenu = () => {
        if (this.awaitingTeleportRequest) {
            const info = this.createNotification(200, 90, 3000);
            info.body.innerHTML = `
                <span>You already have a teleportation pending!</span>
            `
            return;
        }
        this.el.get('blur').style.display = 'block';
        const wrapper = this.createPopUp(700, 200, ['teleport-menu']),
            closeWin = () => {
                this.canvasVelocityMove = true;
                wrapper.remove();
                this.el.get('blur').style.display = 'none';
            }
        wrapper.focus();

        wrapper.innerHTML = `
            <div>
                <div class="tel-by-val">
                    <h1>Teleport to coordinates</h1>
                    <div><span>X</span><input id="coordsTelX" type="number" min="${-2147483648 * this.parent.CHUNK_SIZE}" max="${2147483647 * this.parent.CHUNK_SIZE}" value="${parseInt(this.parent.camera[this.parent.usingWebGl ? 'pos' : '_offset'].x * this.parent.CHUNK_SIZE, 10)}"></div>
                    <div><span>Y</span><input id="coordsTelY" type="number" min="${-2147483648 * this.parent.CHUNK_SIZE}" max="${2147483647 * this.parent.CHUNK_SIZE}" value="${parseInt(this.parent.camera[this.parent.usingWebGl ? 'pos' : '_offset'].y * this.parent.CHUNK_SIZE, 10)}"></div>
                    <button class="tel-button" id="coordsTel">Teleport</button>
                </div>
                <div class="tel-to-user">
                    <h1>Teleport to User</h1>
                    <span id="target" name="null">Target: none</span>
                    <div class="drop-down-anchor unselectable">
                        <span>Users</span>
                        <div>
                            ${Array.from(this.parent.users).filter(u => u[0] != this.parent.socket.id && u[1].name != '__@@UNINITIALISED').map(u => `<span id="${u[0]}">${u[1].name}</span><br>`).join('')}
                        </div>
                    </div>
                    <button class="tel-button" id="userTel">Teleport</button>
                </div>
            </div>
        `
        window.document.body.appendChild(wrapper);
        document.getElementById('coordsTel').addEventListener('click', () => {
            const x = Math.min(2147483647 * this.parent.CHUNK_SIZE, Math.max(-2147483648 * this.parent.CHUNK_SIZE, +document.getElementById('coordsTelX').value)),
                y = Math.min(2147483647 * this.parent.CHUNK_SIZE, Math.max(-2147483648 * this.parent.CHUNK_SIZE, +document.getElementById('coordsTelY').value));

            this.parent.teleportTo(x, y);
            closeWin();
        });

        Array.from(this.parent.users).filter(u => u[0] != this.parent.socket.id && u[1].name != '__@@UNINITIALISED').forEach(u => {
            document.getElementById(u[0]).addEventListener('click', () => {
                const target = document.getElementById('target');
                target.innerHTML = 'Target: ' + u[1].name;
                target.name = u[0];
            })
        })

        document.getElementById('userTel').addEventListener('click', () => {
            const target = document.getElementById('target');
            if (this.parent.users.get(target.name)) {
                this.awaitingTeleportRequest = true;
                const info = this.createNotification(150, 120, 5000);
                info.body.innerHTML = `
                    <span>Successfully sent ${target.innerHTML.substring(8)} a teleport request, please wait for them to respond!
                `;
                this.parent.socket.emit('teleportRequest', target.name);
            } else {
                const info = this.createNotification(100, 50, 2000);
                info.body.innerHTML = `
                    <span>No target selected!</span>
                `
            }
            closeWin();
        })
    }

    pinch = e => {
        if (this.pinching) {
            const v0 = new Vector(e.touches[0].clientX, e.touches[0].clientY),
                v1 = new Vector(e.touches[1].clientX, e.touches[1].clientY),
                distance = v0.distance(v1),
                anchorPoint = this.parent.camera.mouseToTileSpace(this.centerOfPinchStart),
                nextTileSize = Math.max(4, Math.min(40, this.parent.camera.tileSize - (Math.sign(this.pinchStartDist - distance))));

            if (isNaN(nextTileSize)) return;
            this.parent.camera.tileSize = nextTileSize;
            this.pinchStartDist = distance;

            this.parent.camera.lastPos = this.parent.camera.mouseToTileSpace(this.centerOfPinchStart);
            this.parent.camera[this.parent.usingWebGl ? 'pos' : '_offset'].sub(Vector.difference(this.parent.camera.lastPos, anchorPoint).div(this.parent.CHUNK_SIZE));

            this.parent.camera.updateChunks(window.innerWidth, window.innerHeight);
            this.parent.canvas.drawAll();
            this.updateHash();
        }
    }

    pinchStartCheck = e => {
        if (e.touches.length == 2) {
            this.pinching = true;

            const v0 = new Vector(e.touches[0].clientX, e.touches[0].clientY),
                v1 = new Vector(e.touches[1].clientX, e.touches[1].clientY);
            this.centerOfPinchStart = Vector.sum(v0, v1).mult(0.5);
            this.pinchStartDist = v0.distance(v1);
        }
    }

    touchStopCheck = e => {
        if (e.touches.length < 2) this.pinching = false;
    }

    createPopUp = (width, height, classes = [], disallowClosing) => {
        const el = document.createElement('div');
        el.classList.add('popUpWindow', ...classes);
        el.style.width = ~~width + 'px';
        el.style.height = ~~height + 'px';
        el.style.marginTop = -(~~(height / 2)) + 'px';
        el.style.marginLeft = -(~~(width / 2)) + 'px';

        this.canvasVelocityMove = false;

        const cancel = e => {
            if (e.key == 'Escape') {
                this.canvasVelocityMove = true;
                window.removeEventListener('keydown', cancel);
                el.remove();
                this.el.get('blur').style.display = 'none';
            }
        }
        if (!disallowClosing) {
            window.addEventListener('keydown', cancel);
            setTimeout(() => {
                const closeButton = document.createElement('button');
                closeButton.style = `
                    position: absolute !important;
                    top: 50% !important;
                    left: 50% !important;
                    margin-top: ${-(~~height / 2) - 12}px !important;
                    margin-left: ${~~(width / 2) - 4}px !important;
                    background-color: black !important;
                    color: red !important;
                    border-radius: 50% !important;
                    width: 24px !important;
                    height: 24px !important;
                `;
                closeButton.innerHTML = 'X';
                closeButton.classList.add('x-close')
                closeButton.onclick = cancel.bind(this, { key: 'Escape' });
                el.appendChild(closeButton);
            }, 0);
        };

        return el;
    }

    createNotification = (width, height, time, classes = []) => {
        const wrapper = document.createElement('div'),
            body = document.createElement('div'),
            timer = document.createElement('div'),
            pos = this.notifs.length;

        wrapper.classList.add('notification');
        wrapper.style.width = ~~width + 'px';
        wrapper.style.height = ~~height + 'px';
        wrapper.style.marginTop = -(~~(height / 2) - pos * 10) + 'px';
        wrapper.style.marginLeft = '0px';
        body.classList.add(...classes);
        body.style.height = 'calc(100% - 10px)';
        body.style.width = '100%';
        timer.classList.add('notification-timer')
        wrapper.appendChild(body);
        wrapper.appendChild(timer);

        window.document.body.appendChild(wrapper);
        setTimeout(() => { wrapper.style.marginLeft = -(~~(width) + 20) + 'px'; }, 10)
        return this.notifs[pos] = {
            wrapper, body, timer, time, width, height, start: Date.now(), parent: this, close: function () {
                this.parent.notifs.splice(this.parent.notifs.indexOf(this), 1);
                this.wrapper.style.marginLeft = '0px';
                window.setTimeout(() => this.wrapper.remove(), 200);
            }
        };
    }

    TouchEventToMouseEvent = e => {
        this.parent.isMobile = true;
        const touch = e.touches[e.touches.length - 1] || e.changedTouches[e.changedTouches.length - 1];
        // if (touch.radiusX) {
        //     this.parent.fingerSize = Math.max(touch.radiusX, touch.radiusY);
        // }
        touch.button = (touch.buttons = true);
        return touch;
    }

    updateHash = () => {
        const res = this.parent.getCenteredCoords().floor();

        window.history.pushState({ page: window.history.length }, 'InfiniCanvas', '/@' + res);

        this.parent.settings.set('_pos', res);
        this.changingHash = true;
    }

    update = () => {
        var _coords;
        if (!this.parent.colorPlacer.active || !this.parent.colorPlacer.canvas) {
            _coords = this.parent.camera.mouseToTileSpace(this.parent.camera.lastMouseCoords);
        } else {
            _coords = this.parent.camera.mouseToTileSpace(this.parent.colorPlacer.lastMousePos);
        }
        if (!this.parent.camera.dragging) this.parent.mousePosition = Vector.from(_coords);
        this.el.get('coords').innerHTML = _coords.realFloor().toString();
        this.el.get('fps').innerHTML = (~~this.parent.currentFps).toString().padStart(3, '0') + ' fps';
        this.el.get('ping').innerHTML = ~~this.parent.ping + 'ms';

        const now = Date.now();

        for (let i = this.notifs.length - 1; i >= 0; --i) {
            const n = this.notifs[i];
            n.timer.style.width = ((now - n.start) / n.time) * (n.width - 20) + 'px';

            if (n.start + n.time < now) {
                n.close();
            }
        }

    };

    updateOtherUserPos = () => {
        this.uCTX.clearRect(0, 0, window.innerWidth, window.innerHeight);
        if (window.__Path2DSupport && this.parent.settings.showOtherPlayers && (this.parent.userCoords.length >= 2 || (!this.parent.settings.transmitPosition && this.parent.userCoords.length >= 1))) {
            const ts = this.parent.camera.tileSize,
                topleft = this.parent.usingWebGl
                    ? Vector.from(this.parent.camera.pos).sub(new Vector(window.innerWidth, window.innerHeight).mult(0.5).div(ts).div(this.parent.CHUNK_SIZE)).add(new Vector(0.5, 0.5)).mult(this.parent.CHUNK_SIZE)
                    : Vector.from(this.parent.camera._offset).mult(this.parent.CHUNK_SIZE),
                pos = Vector.from(this.parent.mousePosition).sub(topleft).mult(ts);

            this.uCTX.font = (ts * 1) + 'px monospace';
            this.uCTX.textAlign = 'center';
            this.uCTX.textBaseline = 'middle';

            for (let i = 0; i < this.parent.userCoords.length; ++i) {
                const id = this.parent.userCoords[i][0];
                if (id == this.parent.socket.id || (!this.parent.userCoords[i][1].x && !this.parent.userCoords[i][1].y)) continue;

                const abs = Vector.from(this.parent.userCoords[i][1]),
                    rel = Vector.difference(abs, topleft),
                    px = rel.mult(ts);

                if (px.x <= window.innerWidth + ts && px.x >= -ts && px.y <= window.innerHeight + ts && px.y >= -ts) {
                    this.uCTX.globalAlpha = 1;
                    const user = this.parent.users.get(id);
                    if (user) {

                        let verlet = this.parent.verlets.get(id);

                        if (this.parent.userCoords[i][1].verlet.active) {
                            if (!verlet) {
                                verlet = new this.parent.colorPlacer.VerletTile(this.parent.colorPlacer, Vector.from(px));
                                this.parent.verlets.set(id, verlet);
                            }
                            verlet.update(this.uCTX, Vector.from(px), this.parent.userCoords[i][1].verlet.color);
                        } else if (verlet) {
                            this.parent.verlets.delete(id);
                        }

                        this.uCTX.fillStyle = user.color.hexString;
                        const m = ts / (this.parent.userCoords[i][1].mobile ? 6 : 16),
                            name = this.parent.userCoords[i][1].mobile ? '📱' + user.name : user.name,
                            textWidth = this.uCTX.measureText(name).width,
                            path = this.parent.userCoords[i][1].mobile
                                ? new Path2D(`M${px.x},${px.y}a${m * 4},${m * 4},0,1,0,0,${m * 8}a${m * 4},${m * 4},0,1,0,0,-${m * 8}zm0,${m * 2}a${m * 2},${m * 2},0,1,1,0,${m * 4}a${m * 2},${m * 2},0,1,1,0,-${m * 4}z`)
                                : new Path2D(`M${px.x},${px.y}a${m},${m},0,0,0,-${m},${m}l0,${m * 17}a${m},${m},0,0,0,${m},${m}a${m},${m},0,0,0,${m * 0.797},${m * -0.398}l${m * 3.123},${m * -3.483}l${m * 3.463},${m * 7.998}c${m * 0.319},${m * 0.738},${m * 1.184},${m * 1.071},${m * 1.916},${m * 0.738}c${m * 0.722},${m * -0.328},${m * 1.042},${m * -1.177},${m * 0.715},${m * -1.9}l${-3.575},${m * -7.916}l${m * 5.561},${m * -0.039}a${m},${m},0,0,0,${m},-${m}a${m},${m},0,0,0,${m * -0.371},${m * -0.777}l${m * -11.846},${m * -11.844}a${m},${m},0,0,0,${m * -0.783},${m * -0.379}z`);

                        if (!(pos.x < px.x || pos.x > px.x + ts * 3 + textWidth || pos.y < px.y - ts * 2 || pos.y > (px.y - 5) + ts * 3)) {
                            this.uCTX.globalAlpha = 0.25;
                        }
                        this.uCTX.fill(path);

                        this.uCTX.beginPath();
                        this.uCTX.arc(px.x + ts * 2, px.y - ts, ts, Math.PI * 0.5, -Math.PI * 0.5);
                        this.uCTX.lineTo(px.x + ts * 2 + textWidth, px.y - ts * 2);
                        this.uCTX.arc(px.x + ts * 2 + textWidth, px.y - ts, ts, -Math.PI * 0.5, Math.PI * 0.5);
                        this.uCTX.closePath();
                        this.uCTX.fill();

                        const clr = user.color,
                            luma = 0.2126 * clr.r + 0.7152 * clr.g + 0.0722 * clr.b;
                        this.uCTX.fillStyle = luma >= 127.5 ? '#000000' : '#ffffff';
                        this.uCTX.fillText(name, px.x + ts * 2 + textWidth * 0.5, px.y - ts * 0.95);
                    }
                } else if (this.parent.verlets.has(id)) {
                    this.parent.verlets.delete(id);
                }
            }
        }
    }
}