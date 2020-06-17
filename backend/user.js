const Color = require('../static/classes/color.js'),
    { WeakVector, Vector } = require('../static/classes/vector.js'),
    escapeText = s => (String(s) || 'Invalid String').replace(/[&"<>]/g, (c) => escapeText.lookup[c]);

escapeText.lookup = {
    '&': "&amp;",
    '"': "&quot;",
    '<': "&lt;",
    '>': "&gt;"
}

module.exports = class User {
    constructor(Manager, socket, hashedIP) {
        this.ipH = hashedIP;
        this.loggedIn = false;
        this.name = '__@@UNINITIALISED';
        this.color = new Color(0);
        this.manager = Manager;
        this.joinTimestamp = Date.now();
        this.id = socket.id;
        this.cameraPosition = new Vector();
        this.requestedData = [];
        this.tileRateLimit = 0;
        this.isMakingTeleportRequest = false;
        this.teleportTarget = null;
        this.hasNotifPending = false;
        this.usesDiscord = false;
        this.discordInfo = null;
        this.banned = false;

        if (!this.manager.rateTable.has(this.ipH)) this.manager.rateTable.set(this.ipH, { count: 0, expiry: 1 })

        this.log = console.log.bind(null, `${this.id} :`);
        this.log('connected');

        for (let k in this.manager.EventHandler) {
            this.socket.on(k, this.handleIncomingEvent.bind(this, k));
        }

        const ip = this.manager.ipsConnected.get(this.ipH);
        this.manager.ipsConnected.set(this.ipH, ip + 1 ? ip + 1 : 0);
    }

    handleIncomingEvent = (e, data) => {
        if (!this.loggedIn && !(e == 'notify' || e == 'latRequest' || e == 'disconnect' || e == 'changeDetails' || e == 'discordElevation')) return this.socket.emit('requestRejection', 'You have to be logged in to make requests!');

        try {
            this.manager.EventHandler[e].bind(this.manager)(this, data);
        } catch (e) {
            this.log('Caused Error:\n', e);
        }
    }

    serialise = () => {
        const defAv = [
            'https://discordapp.com/assets/322c936a8c8be1b803cd94861bdfa868.png',
            'https://discordapp.com/assets/dd4dbc0016779df1378e7812eabaa04d.png',
            'https://discordapp.com/assets/6debd47ed13483642cf09e832ed0bc1b.png',
            'https://discordapp.com/assets/0e291f67c9274a1abdddeb3fd919cbaa.png',
            'https://discordapp.com/assets/1cbd08c76f8af6dddce02c5138971129.png'
        ]
        return {
            name: escapeText(this.name),
            color: this.color,
            id: escapeText(this.id),
            joinedAt: this.joinTimestamp,
            elevated: this.usesDiscord,
            discordInfo: this.usesDiscord ? {
                avatarURL: this.discordInfo.accountInfo.avatar
                    ? `https://cdn.discordapp.com/avatars/${this.discordInfo.accountInfo.id}/${this.discordInfo.accountInfo.avatar}.${this.discordInfo.accountInfo.avatar.startsWith('a_') ? 'gif' : 'png'}`
                    : defAv[~~(Math.random() * defAv.length)],
                discriminator: this.discordInfo.accountInfo.discriminator,
                id: this.discordInfo.accountInfo.id,
                nitro: this.discordInfo.accountInfo.premium_type,
                username: escapeText(this.discordInfo.accountInfo.username)
            } : null
        }
    };

    get socket() { return this.manager.io.sockets.connected[this.id] || { emit: () => { } } };
}