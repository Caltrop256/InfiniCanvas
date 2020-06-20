const socketIO = require('socket.io'),
    crypto = require('crypto'),
    ChunkData = require('./chunkdata.js'),
    credentials = require('./creds.json'),
    sql = require('mysql'),
    DiscordOauth2 = require("discord-oauth2"),
    { createCanvas } = require('canvas'),
    Color = require('../static/classes/color.js'),
    fs = require('fs'),
    { WeakVector, Vector } = require('../static/classes/vector.js');
const { fstat } = require('fs');

module.exports = class Manager {
    constructor(server) {

        this.config = credentials;

        this.oauth = new DiscordOauth2(this.config.discord);
        this.refreshTokens = new Map();

        this.webpush = require('web-push');
        this.webpush.setVapidDetails('mailto:caltropuwu@gmail.com', this.config.vapid.public, this.config.vapid.private);

        this.EventHandler = new (require('./eventhandler.js'))();
        this.User = (require('./user.js'));

        this.users = new Map();
        this.pushSubscriptions = new Map();
        this.ipsConnected = new Map();
        this.chunkCache = new Map();
        this.thumbnailCache = new Map();
        this.changedChunks = new Set();

        this.moderators = this.config.mods;

        this.nextBackupTimestamp = Infinity;
        this.backUpDelay = 8.64e+7;
        this.maxFiles = 5;

        fs.readdir('./backups', (err, files) => {
            if (err) throw err;
            if (!files.length) {
                this.nextBackupTimestamp = Date.now();
            } else {
                const data = files.map(f => Number(f.split('.json')[0])).sort((a, b) => b - a);
                this.nextBackupTimestamp = data[0] + this.backUpDelay;
            }
        })

        this.rateTable = new Map();
        this.burstMax = 2;
        this.expiryMax = 128;

        this.sql = sql.createConnection(this.config.mySQL);
        new Promise((resolve, reject) => {
            this.sql.query('select * from options', (err, rows) => {
                if (err) return reject(err);
                return resolve(rows);
            })
        }).then(set => {
            this.settings = {
                chunkSize: set[0].chunkSize
            };
            if (global.CHUNK_SIZE && this.settings.chunkSize != global.CHUNK_SIZE) {
                let n = global.CHUNK_SIZE;
                global.CHUNK_SIZE = this.settings.chunkSize;
                global.Chunk_SIZE_SQ = global.CHUNK_SIZE * global.CHUNK_SIZE;
                this.changeChunkSize(n)
                    .then(console.log(`changed chunk size to ${n}!`))
                    .catch(console.error);
            } else {
                global.CHUNK_SIZE = this.settings.chunkSize;
                global.Chunk_SIZE_SQ = global.CHUNK_SIZE * global.CHUNK_SIZE;
            }
        }).catch(console.error);

        this.sql.query('select * from tokens', (err, rows) => {
            if (err) throw err;
            for (let i = 0; i < rows.length; ++i) {
                this.refreshTokens.set(rows[i].nonce, rows[i].token);
            }
        })

        this.bannedUsers = new Map();
        this.sql.query('select * from bans', (err, rows) => {
            if (err) return console.error(err);
            for (let i = 0; i < rows.length; ++i) {
                if (~~rows[i].duration > Date.now()) this.bannedUsers.set(rows[i].ipH, rows[i].duration);
            }
        });

        this.placeRateLimit = new Map();
        this.globalRateLimit = 0;

        this.nTilesPlacedLately = 0;
        this.userPositions = new Map();

        this.colors = [
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

        this.io = socketIO(server, {
            allowUpgrades: true,
            transports: ['websocket', 'polling'],
            origins: globalThis.useHttps ? 'canvas.caltrop.dev:*' : '*:*'
        });

        this.io.on('connection', socket => {
            const ip = crypto.createHash('sha256').update(socket.conn.remoteAddress).digest('base64');
            if (!this.bannedUsers.has(ip)) {
                this.users.set(socket.id, new this.User(this, socket, ip));
                if (~~this.ipsConnected.get(ip) > 10) this.banUser(socket.id, 3600000);
                socket.emit('requestUserData');
            } else {
                socket.emit('banned', 0);
                socket.disconnect(true);
            }
        });

        (this.updateUserPositions = () => {
            setTimeout(this.updateUserPositions, 1000 / 30);
            this.io.emit('userPositions', Array.from(this.userPositions));
        })();

        (this.loop = i => {
            for (let ip of this.ipsConnected) {
                this.rateTable.set(ip[0], { count: 0, expiry: Math.max(1, this.rateTable.get(ip[0]).expiry *= 0.9) })
            }
            this.globalRateLimit = Math.max(this.users.size * 100, this.globalRateLimit - 200);
            for (let u of this.users) {
                u[1].tileRateLimit = Math.max(0, u[1].tileRateLimit - 500);
            }
            if (i >= 180) {
                i = 0;
                if (this.chunkCache.size) {
                    this.storeChangedChunks()
                        .then(() => {
                            const chunks = Array.from(this.chunkCache),
                                users = Array.from(this.users),
                                chunksB4Purge = chunks.length;
                            for (let d of chunks) {
                                const key = d[0],
                                    cv = Vector.from(key);

                                let minDist = Infinity;
                                for (let u of users) {
                                    const user = u[1],
                                        dist = Vector.from(user.cameraPosition).distance(cv);
                                    if (dist < minDist) minDist = dist;
                                }

                                if (minDist > 25) {
                                    this.chunkCache.delete(key);
                                }
                            }

                            console.log(`Deleted ${chunksB4Purge - this.chunkCache.size} chunks from the cache!`);
                        })
                }

                if (Date.now() >= this.nextBackupTimestamp) this.createBackUp();
            }
            setTimeout(this.loop, 1000, ++i);
        })(0);


        for (let sig of ['SIGTERM', 'SIGINT']) {
            process.on(sig, this.__handleShutdown);
        }
    };

    pushNotif = (id, str) => {
        const subscription = this.pushSubscriptions.get(id);
        if (!subscription) return;
        try {
            this.webpush.sendNotification(subscription, str);
        } catch (e) { console.error(e) };
    }

    banUser = (id, duration) => {
        const user = this.users.get(id),
            ip = user.ipH;
        this.bannedUsers.set(ip, Date.now() + duration);
        if (this.ipsConnected.get(ip)) {
            Array.from(this.users).filter(u => u[1].ipH == ip).forEach(u => {
                u[1].banned = true;
                u[1].socket.emit('banned', 0);
                if (user.loggedIn && !this.ipsConnected.get(user.ipH)) this.io.emit('systemMessage', { msg: `${user.name} has left! (banned)`, user: user.id });
                u[1].socket.disconnect(true);
            })
        } else {
            user.banned = true;
            user.socket.emit('banned', 0);
            if (user.loggedIn && !this.ipsConnected.get(user.ipH)) this.io.emit('systemMessage', { msg: `${user.name} has left! (banned)`, user: user.id });
            user.socket.disconnect(true);
        }

        this.sql.query(`INSERT INTO bans (ipH, duration) VALUES ("${user.ipH}", "${(Date.now() + duration).toString()}")`, err => {
            if (err) console.error(err);
        })
    }

    handleRequestedChunks = (user) => {
        const data = user.requestedData.splice(Math.max(user.requestedData.length - 200, 0), 200),
            s = new Map(),
            sqlArr = [];
        for (let i = 0; i < data.length; ++i) {
            let c = this.chunkCache.get(data[i]);
            if (c) s.set(data[i], c);
            else sqlArr.push(data[i]);
        }

        if (s.size) {
            const _info = Array.from(s);
            for (let i = 0; i < _info.length; ++i) {
                _info[i][1] = _info[i][1].toString();
            }
            user.socket.emit('chunkData', _info);
        }

        if (sqlArr.length) {
            this.getChunks(sqlArr).then(d => {
                const _info = Array.from(d);
                for (let i = 0; i < _info.length; ++i) {
                    _info[i][1] = _info[i][1].toString();
                }
                user.socket.emit('chunkData', _info);
            })
        }

        if (user.requestedData.length) setTimeout(this.handleRequestedChunks, 1000, user);
    }

    storeChangedChunks = () => {
        return new Promise((resolve, reject) => {
            const updateMap = new Map();
            for (let k of this.changedChunks) {
                const c = this.chunkCache.get(k);
                if (c) updateMap.set(k, c);
            }
            if (updateMap.size) {
                this.storeChunks(updateMap)
                    .then(resolve)
                    .catch(reject);
                this.changedChunks = new Set();
            } else {
                resolve(0);
            }
        })
    }

    __handleShutdown = e => {
        this.storeChangedChunks()
            .then(process.exit)
            .catch(e => {
                console.error(e);
                process.exit(1);
            });
    }

    storeChunks = s => {
        return new Promise((resolve, reject) => {
            let query = '',
                data = Array.from(s);
            for (let i = 0; i < data.length; ++i) {
                const c = data[i],
                    xy = c[0].split(','),
                    x = xy[0],
                    y = xy[1],
                    nums = new ChunkData(c[1].data),
                    serialised = nums.toString();
                query += `INSERT INTO chunks (x, y, data) VALUES (${x}, ${y}, '${serialised}') ON DUPLICATE KEY UPDATE data='${serialised}';`;
            }
            this.sql.query(query, (error, rows) => {
                if (error) reject(error);
                resolve(0);
            })
        });
    };

    getChunks = a => {
        const now = Date.now();
        return new Promise((resolve, reject) => {
            this.sql.query(`SELECT * FROM chunks WHERE CONCAT(x, ',', y) IN ('${a.join("','")}');`, (err, rows) => {
                if (err) return reject(console.error(err));
                const result = new Map();
                for (let i = 0; i < a.length; ++i) {
                    const d = a[i].split(','),
                        sx = d[0],
                        sy = d[1],
                        inCache = this.chunkCache.get(a[i]);

                    if (sx >= 2147483647 || sx <= -2147483648 || sy <= -2147483648 || sy >= 2147483647) {
                        continue;
                    }

                    if (inCache && inCache.timestamp > now) {
                        result.set(a[i], inCache);
                        continue;
                    }
                    let found = false;
                    for (let j = 0; j < rows.length; ++j) {
                        if (sx == rows[j].x && sy == rows[j].y) {
                            result.set(a[i], ChunkData.parse(rows[j].data));
                            rows.splice(j, 1);
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        result.set(a[i], new ChunkData(new Uint8ClampedArray(global.CHUNK_SIZE_SQ)));
                    }
                }
                this.chunkCache = new Map([...this.chunkCache, ...result]);
                resolve(result);
            })
        });
    }

    changeChunkSize = n => {
        return new Promise((resolve, reject) => {
            this.storeChangedChunks().then(() => {
                if (isNaN(n) || n < 1 || n > 91) return reject('invalid size');
                this.sql.query('SELECT * FROM chunks', (err, rows) => {
                    if (err) return reject(err);
                    const absolutePos = new Map(),
                        newChunks = new Map();
                    for (let i = 0; i < rows.length; ++i) {
                        const parsed = ChunkData.parse(rows[i].data),
                            ax = BigInt(rows[i].x),
                            ay = BigInt(rows[i].y),
                            cs = BigInt(global.CHUNK_SIZE)
                        for (let j = 0; j < parsed.data.length; ++j) {
                            if (!parsed.data[j]) continue;
                            const rx = BigInt(j % global.CHUNK_SIZE),
                                ry = BigInt(~~(j / global.CHUNK_SIZE)),
                                posx = ax * cs + rx,
                                posy = ay * cs + ry;
                            absolutePos.set(posx.toString() + ',' + posy.toString(), parsed.data[j]);
                        }
                    }

                    const absolutes = Array.from(absolutePos);
                    for (let i = 0; i < absolutes.length; ++i) {
                        const v = Vector.from(absolutes[i][0]),
                            color = absolutes[i][1],
                            chunk = Vector.from(v).div(n).realFloor();

                        let chunkInfo = newChunks.get(chunk.toString());

                        v.x %= n;
                        v.y %= n;
                        if (v.y < 0) v.y += n;
                        if (v.x < 0) v.x += n;

                        if (!chunkInfo) {
                            chunkInfo = new Uint8ClampedArray(n * n);
                        }
                        chunkInfo[(v.y) * n + (v.x)] = (~~color) % 16;
                        newChunks.set(chunk.toString(), chunkInfo);
                    }

                    this.sql.query('DELETE FROM `chunks`; ALTER TABLE `chunks` MODIFY `data` VARCHAR(' + (n * n * 2) + ');', (err) => {
                        if (err) return reject(err);

                        let query = '';
                        const data = Array.from(newChunks);

                        for (let i = 0; i < data.length; ++i) {
                            const xy = data[i][0].split(','),
                                x = xy[0],
                                y = xy[1],
                                cData = new ChunkData(data[i][1]).toString(n);

                            query += `INSERT INTO chunks (x, y, data) VALUES (${x}, ${y}, '${cData}') ON DUPLICATE KEY UPDATE data='${cData}';`;
                        }
                        this.sql.query(query + 'DELETE FROM `options`; INSERT INTO `options` (`chunkSize`) VALUES (' + n + ')', (err) => {
                            if (err) return reject(err);
                            this.chunkCache = new Map();
                            global.CHUNK_SIZE = n;
                            global.CHUNK_SIZE_SQ = n * n;
                            this.settings.chunkSize = n;
                            resolve();
                        })
                    })
                })
            }).catch(reject);
        });
    }

    generateThumbnail = (strx, stry) => {
        return new Promise((resolve, reject) => {
            this.storeChangedChunks().then(() => {
                const w = 256,
                    h = 192,
                    ts = 2,
                    ox = Number(strx) - (w * 0.5 / ts),
                    oy = Number(stry) - (h * 0.5 / ts),
                    v = new Vector(ox, oy),
                    cacheItem = this.thumbnailCache.get(v.toString());

                if (cacheItem) return resolve(cacheItem);

                const canvas = createCanvas(w, h),
                    ctx = canvas.getContext('2d'),
                    chunksToDraw = new Vector(Math.ceil(w / (ts * global.CHUNK_SIZE)) + 1, Math.ceil(h / (ts * global.CHUNK_SIZE)) + 1),
                    chunkRequestArr = [];

                for (let i = 0; i <= chunksToDraw.x; ++i) {
                    for (let j = 0; j <= chunksToDraw.y; ++j) {
                        chunkRequestArr.push(new Vector(i, j).add(Vector.from(v).div(CHUNK_SIZE).floor()).toString());
                    }
                }

                this.getChunks(chunkRequestArr)
                    .then(chunks => {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, w, h);
                        for (let c of chunkRequestArr) {
                            const data = new ChunkData(chunks.get(c).data),
                                chunkPos = Vector.from(c);
                            for (let x = 0; x < global.CHUNK_SIZE; ++x) {
                                for (let y = 0; y < global.CHUNK_SIZE; ++y) {
                                    const i = y * global.CHUNK_SIZE + x,
                                        cx = (chunkPos.x * global.CHUNK_SIZE * ts + x * ts) - (ox * ts),
                                        cy = (chunkPos.y * global.CHUNK_SIZE * ts + y * ts) - (oy * ts);

                                    ctx.fillStyle = this.colors[data.data[i]].hexString;
                                    ctx.fillRect(cx, cy, ts, ts);
                                }
                            }
                        }
                        const thumbnailData = canvas.toDataURL().toString().substring(22);
                        this.thumbnailCache.set(v.toString(), thumbnailData);
                        return resolve(thumbnailData);
                    })
                    .catch(reject);
            })
        })
    }

    createBackUp = () => {
        this.storeChangedChunks().then(() => {
            this.sql.query('select * from chunks', (err, rows) => {
                if (err) return console.error(err);
                const data = JSON.stringify({
                    meta: {
                        chunkSize: global.CHUNK_SIZE,
                        compressionType: 'Run-length Encoding Radix16',
                        colors: 16,
                        timestamp: this.nextBackupTimestamp
                    },
                    chunkData: rows.map(r => [r.x, r.y, r.data])
                });

                fs.writeFile(`./backups/${this.nextBackupTimestamp}.json`, data, (err) => {
                    if (err) throw err;
                    this.nextBackupTimestamp += this.backUpDelay;
                    fs.readdir('./backups', (err, files) => {
                        if (err) throw err;
                        if (files.length > this.maxFiles) {
                            const data = files.map(f => Number(f.split('.json')[0])).sort((a, b) => b - a);
                            fs.unlink(`./backups/${data[data.length - 1]}.json`, (err) => {
                                if (err) throw err;
                            })
                        }
                    })
                })
            })
        });
    }
}