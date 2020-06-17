const ChunkData = require('./chunkdata.js'),
    { WeakVector, Vector } = require('../static/classes/vector.js'),
    Color = require('../static/classes/color.js'),
    escapeText = s => (String(s) || 'Invalid String').replace(/[&"<>]/g, (c) => escapeText.lookup[c]),
    crypto = require('crypto'),
    md = require('markdown-it')({
        html: true,
        xhtmlOut: false,
        breaks: false,
        linkify: true,
        typographer: true
    }),
    parseText = s => {
        let str = escapeText(s);
        // str = str.replace(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&/=,]*)/g, v => `<a target="_blank" rel="noopener" href="${v}">${v}</a>`);
        // str = str.replace(/(?<!\\)\/(.*?[^\\])\//g, '<i>$1</i>');
        // str = str.replace(/(?<!\\)\*(.*?[^\\])\*/g, '<b>$1</b>');
        // str = str.replace(/(?<!\\)_(.*?[^\\])_/g, '<u>$1</u>');
        // str = str.replace(/(?<!\\)\^([0-9a-zA-Z\^]+)/g, '<sup>$1</sup>');
        // str = str.replace(/(?<!\\)~(.*?[^\\])~/g, '<del>$1</del>');
        // str = str.replace(/(?<!\\)`(.*?[^\\])`/g, '<code>$1</code>');
        // str = str.replace(/\\([\\~_`*\/])/g, '$1');

        return md.renderInline(str).replace(/(?<!\\)\^([0-9a-zA-Z\^]+)/g, '<sup>$1</sup>');
    }
escapeText.lookup = {
    '&': "&amp;",
    '"': "&quot;",
    '<': "&lt;",
    '>': "&gt;"
}

function cap(n, min, max) {
    if (isNaN(n)) return n;
    return Math.max(Math.min(max * global.CHUNK_SIZE, n), min * global.CHUNK_SIZE);
}

module.exports = class EventHandler {
    disconnect = function (user, data) {
        user.log('Disconnect');
        const ip = this.ipsConnected.get(user.ipH);
        if (user.loggedIn && !this.ipsConnected.get(user.ipH) && !user.banned) this.io.emit('systemMessage', { msg: `${user.name} has left! (disconnected by user)`, user: user.id });
        if (ip) {
            this.ipsConnected.set(user.ipH, ip - 1);
        } else {
            this.ipsConnected.delete(user.ipH);
        }
        this.io.emit('userLeave', user.id);
        if (!user.hasNotifPending) this.pushSubscriptions.delete(user.id);
        this.users.delete(user.id);
        this.userPositions.delete(user.id);
    }
    posInfo = function (user, data) {
        if (!(data && data.pos && data.timestamp)) return user.socket.emit('requestRejection', 'Invalid Ping');
        user.socket.emit('latency', { sent: data.timestamp, received: Date.now() });
        user.cameraPosition = Vector.from(data.pos);
        this.userPositions.set(user.id, { x: cap(data.pos.x, -2147483648, 2147483647), y: cap(data.pos.y, -2147483648, 2147483647), verlet: data.verletTile });
    }
    sendMessage = function (user, data) {
        const str = String(data),
            usages = this.rateTable.get(user.ipH);

        if (usages.count >= this.burstMax) {
            usages.expiry *= 2;
        } else usages.count += 1;

        if (usages.expiry > this.expiryMax) {
            user.socket.emit('systemMessage', { msg: `You are being rate limited. Please slow down!`, user: null });
        } else if (str && str.length >= 1 && str.length <= 120) {
            this.io.emit('chatMessage', { id: user.id, msg: parseText(str) });
        }

        this.rateTable.set(user.ipH, usages);
    };
    requestChunkData = function (user, data) {
        if (!Array.isArray(data)) return user.socket.emit('requestRejection', 'Invalid Input structure');
        for (let i = 0; i < data.length; ++i) {
            if (!data[i].match(/^-?[0-9]+,-?[0-9]+$/g)) return user.socket.emit('requestRejection', 'Invalid Input structure: ' + data[i]);
        }

        if (user.requestedData.length) {
            user.requestedData.push(...data);
        } else {
            user.requestedData.push(...data);
            this.handleRequestedChunks(user);
        }
    }
    placeTile = function (user, data) {
        if (!(data && typeof data.v != 'undefined' && typeof data.v.x != 'undefined' && typeof data.v.y != 'undefined' && isFinite(data.v.x) && isFinite(data.v.y))) return user.socket.emit('requestRejection', 'Invalid Input structure');
        let r = this.placeRateLimit.get(user.ipH)
        if (!r || Date.now() - (r.start + r.duration) > 0) {
            const appliedRateLimit = this.globalRateLimit + user.tileRateLimit;
            this.globalRateLimit += 200;
            user.tileRateLimit += 500;
            this.placeRateLimit.set(user.ipH, { start: Date.now(), duration: appliedRateLimit });
            if (this.ipsConnected.get(user.ipH)) {
                Array.from(this.users).filter(u => u[1].ipH == user.ipH).forEach(u => {
                    u[1].socket.emit('ratelimitApplied', appliedRateLimit);
                    u[1].hasNotifPending = true;
                    setTimeout(() => {
                        this.pushNotif(u[1].id, 'Your next tile is now available');
                        u[1].hasNotifPending = false;
                        if (!this.users.has(u[1].id)) this.pushSubscriptions.delete(u[1].id);
                    }, appliedRateLimit)
                })
            } else {
                user.socket.emit('ratelimitApplied', appliedRateLimit);
                user.hasNotifPending = true;
                setTimeout(() => {
                    this.pushNotif(user.id, 'Your next tile is now available');
                    user.hasNotifPending = false;
                    if (!this.users.has(user.id)) this.pushSubscriptions.delete(user.id);
                }, appliedRateLimit)
            }

            const chunk = Vector.from(data.v).div(global.CHUNK_SIZE).realFloor(),
                chunkInfo = this.chunkCache.get(chunk.toString());

            this.changedChunks.add(chunk.toString());

            const v = Vector.from(data.v).realFloor();
            v.x %= global.CHUNK_SIZE;
            v.y %= global.CHUNK_SIZE;
            if (v.y < 0) v.y = global.CHUNK_SIZE + v.y;
            if (v.x < 0) v.x = global.CHUNK_SIZE + v.x;

            if (chunkInfo) {
                const chunkCacheData = new ChunkData(chunkInfo.data);

                chunkCacheData.data[(v.y) * global.CHUNK_SIZE + (v.x)] = (~~data.c) % global.CHUNK_SIZE;

                this.chunkCache.set(chunk.toString(), chunkCacheData);
                this.io.emit('chunkUpdate', { v: chunk.toString(), d: chunkCacheData.toString() });
            } else {
                this.getChunks([chunk.toString()]).then(chunkInfo => {
                    const chunkCacheData = new ChunkData(Array.from(chunkInfo)[0][1].data);

                    chunkCacheData.data[(v.y) * global.CHUNK_SIZE + (v.x)] = (~~data.c) % global.CHUNK_SIZE;

                    this.chunkCache.set(chunk.toString(), chunkCacheData);
                    this.io.emit('chunkUpdate', { v: chunk.toString(), d: chunkCacheData.toString() });
                })
            }
        } else {
            return user.socket.emit('requestRejection', 'Rate limit exceeded!');
        }
    }
    changeDetails = function (user, data) {
        if (!(data && typeof data.name != 'undefined' && typeof data.color == 'number' && data.name.toString)) return user.socket.emit('requestRejection', 'Invalid Details');
        const nS = data.name.toString();
        if (!nS.match(/^[a-zA-Z0-9 \-_.$@€?!#`´']{3,16}$/)) return user.socket.emit('requestRejection', 'Names must be between 3 and 16 characters long and may not include special characters!');
        if (!(data.color >= 0 && data.color <= 0xffffff)) return user.socket.emit('requestRejection', 'Invalid Color!');

        if (user.loggedIn && user.name != nS) {
            this.io.emit('systemMessage', { msg: `'${user.name}' changed name to '${nS}'!`, user: user.id });
        }

        user.color = new Color(data.color);
        user.name = nS;

        if (!user.loggedIn && !this.ipsConnected.get(user.ipH)) {
            this.io.emit('systemMessage', { msg: `${user.name} has logged in!`, user: user.id });
        }

        user.loggedIn = true;

        this.io.emit('userUpdate', user.serialise());
        const userArr = Array.from(this.users),
            resMap = new Map();
        for (let u of userArr) {
            resMap.set(u[0], u[1].serialise());
        }
        user.socket.emit('allUserData', Array.from(resMap));
    }

    requestAllUserData = function (user) {
        const userArr = Array.from(this.users),
            resMap = new Map();
        for (let u of userArr) {
            resMap.set(u[0], u[1].serialise());
        }
        user.socket.emit('allUserData', Array.from(resMap));
    }

    teleportRequest = function (user, data) {
        const target = this.users.get(data);
        if (target) {
            if (user.isMakingTeleportRequest) return user.socket.emit('requestRejection', 'You already have a teleport request pending!');
            user.isMakingTeleportRequest = true;
            user.teleportTarget = target.id;
            target.socket.emit('teleportPermissionRequest', user.serialise());
        } else {
            return user.socket.emit('requestRejection', 'User has left!');
        }
    }

    teleportationRequestReponse = function (user, data) {
        if (!(data && data.id && data.coords)) return user.socket.emit('requestRejection', 'Malformed Request Response!');
        const requester = this.users.get(data.id);
        if (requester) {
            if (requester.isMakingTeleportRequest && requester.teleportTarget == user.id) {
                requester.isMakingTeleportRequest = false;
                requester.teleportTarget = null;
                if (data.accepted) {
                    const v = Vector.from(data.coords);
                    if (isFinite(v.x) && isFinite(v.y)) {
                        requester.socket.emit('teleportationResult', { accepted: true, target: user.serialise(), coords: v })
                    } else return requester.socket.emit('teleportationResult', { accepted: false, target: user.serialise() })
                } else {
                    requester.socket.emit('teleportationResult', { accepted: false, target: user.serialise() })
                }
            } else return user.socket.emit('requestRejection', 'nice try');
        } else return user.socket.emit('requestRejection', 'User has left!');
    }

    notify = function (user, data) {
        if (!user.id || this.pushSubscriptions.get(user.id)) return;
        this.pushSubscriptions.set(user.id, data);
    }

    discordElevation = function (user, _data) {
        const code = _data.code,
            type = _data.type;

        const obtainedToken = tokenInfo => {
            this.oauth.getUser(tokenInfo.access_token).then(accountInfo => {
                user.usesDiscord = true;
                user.discordInfo = { tokenInfo, accountInfo }

                const nonce = crypto.randomBytes(32).toString('base64');
                if (type == 'refresh-login') {
                    this.refreshTokens.delete(code);
                    this.sql.query(`DELETE FROM tokens WHERE nonce = "${code}";`, (err) => { if (err) console.error(err) });
                }
                this.refreshTokens.set(nonce, tokenInfo.refresh_token);
                this.sql.query(`INSERT INTO tokens VALUES ("${nonce}", "${tokenInfo.refresh_token}");`, (err) => { if (err) console.error(err) });

                user.socket.emit('discordAuthentification', { success: true, data: accountInfo, nonce })
            })

        }
        if (type == 'first-login') {
            this.oauth.tokenRequest({
                code,
                scope: 'identify',
                grantType: 'authorization_code'
            })
                .then(obtainedToken)
                .catch(() => {
                    user.socket.emit('discordAuthentification', { success: false, data: null, nonce: null })
                });
        } else if (type == 'refresh-login') {
            const refreshToken = this.refreshTokens.get(code);
            if (refreshToken) {
                this.oauth.tokenRequest({
                    refreshToken,
                    scope: 'identify',
                    grantType: 'refresh_token'
                })
                    .then(obtainedToken)
                    .catch(() => {
                        user.socket.emit('discordAuthentification', { success: false, data: null, nonce: null })
                    })
            } else {
                user.socket.emit('discordAuthentification', { success: false, data: null, nonce: null })
            }
        }
    }

    forgetMe = function (user, nonce) {
        if (this.refreshTokens.has(nonce)) {
            this.refreshTokens.delete(nonce);
            this.sql.query(`DELETE FROM tokens WHERE nonce = "${nonce}";`, (err) => { if (err) console.error(err) });
        };
        if (this.pushSubscriptions.has(user.id)) this.pushSubscriptions.delete(user.id);
        user.socket.disconnect(true);
    }
}