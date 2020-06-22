const crypto = require('crypto'),
    Manager = require('../manager.js'),
    Cache = require('../cache.js'),
    fs = require('fs'),
    babel = require('babel-core'),
    config = require('../babelconfig.json'),
    workerFileDir = '/build/sw.js',
    credentials = require('../creds.json'),
    minify = require('minify');

module.exports = class BaseServer {
    constructor(port, protocol, compile) {
        (async () => {
            this.protocol = protocol;
            this.port = ~~port || 5000;
            this.compiled = compile;

            this.config = credentials;

            this.cache = new Cache(
                '/static/polyfills.js',
                '/node_modules/socket.io-client/dist/socket.io.js',
                '/static/classes/tabmanager.js',
                '/static/classes/world.js',
                '/static/classes/chunkdata.js',
                '/static/classes/vector.js',
                '/static/classes/color.js',
                '/static/classes/gameloop.js',
                '/static/classes/canvas/canvas.js',
                '/static/classes/canvas/renderingcontext2d.js',
                '/static/classes/canvas/webgl.js',
                '/static/classes/camera/camera.js',
                '/static/classes/camera/renderingcontext2d.js',
                '/static/classes/camera/webgl.js',
                '/static/classes/colorplacer.js',
                '/static/classes/soundmanager.js',
                '/static/classes/hud.js',
                '/static/classes/settings.js',
                '/static/lib/gl-matrix.js',
                '/static/main.js',
                '/static/style.css',
                workerFileDir,
                '/app.html',
                '/banned.html',
            )

            if (this.compiled) {
                await this.compile();
                this.cache = new Cache(
                    '/node_modules/socket.io-client/dist/socket.io.js',
                    '/build/canvas.ES5.min.js',
                    '/build/canvas.ES6.min.js',
                    '/static/lib/gl-matrix.js',
                    workerFileDir,
                    '/static/setup.js',
                    '/static/style.css',
                    '/app.html',
                    '/banned.html',
                )
                console.log('Compiled!');
            }
        })();
    }

    start = (opts) => {
        this.server = opts ? this.protocol.createServer(opts, this.handleRequest) : this.protocol.createServer(this.handleRequest);
        this.server.listen(this.port, () => {
            console.log(`Server is now online on port ${this.port}`);
            globalThis.manager = new Manager(this.server);
        })
    }

    handleRequest = (req, res) => {
        try {
            const ipH = crypto.createHash('sha256').update(req.connection.remoteAddress).digest('base64');
            if (manager) {
                const banDate = manager.bannedUsers.get(ipH);
                if (banDate) {
                    if (banDate < Date.now()) {
                        manager.bannedUsers.delete(ipH);
                        manager.sql.query('DELETE FROM bans WHERE ipH="' + ipH + '"', err => {
                            if (err) console.error(err);
                        })
                    } else {
                        res.writeHead(403, { 'Content-Type': 'text/html' });
                        res.write(this.cache.data.get('/banned.html').data.toString().replace('__USER_BAN_DURATION_', banDate));
                        res.end();
                        return;
                    }
                }
            }

            if (req.url == '/socket.io/socket.io.js') {
                res.writeHead(200, { 'Content-Type': 'text/javascript' });
                res.write(this.cache.data.get('/node_modules/socket.io-client/dist/socket.io.js').data);
                res.end();
            } else if (req.url.startsWith('/build') || req.url.startsWith('/static')) {

                /* DEBUG THING REMOVE THIS LATER */
                if (!this.compiled) this.cache.reloadAll();
                /* ---------------------- */

                const data = this.cache.data.get(req.url);
                if (data) {
                    res.writeHead(200, { 'Content-Type': data.encoding });
                    res.write(data.data);
                    res.end();
                } else {
                    res.writeHead(404);
                    res.end();
                }
            } else if (req.url.startsWith('/thumbnail@')) {
                let pos = req.url.split('@')[1];
                if (!pos) {
                    res.writeHead(404);
                    res.end();
                } else {
                    pos = pos.split(',');
                    const valid = /^-?[0-9]{1,12}$/;
                    if (valid.test(pos[0]) && valid.test(pos[1])) {
                        global.manager.generateThumbnail(pos[0], pos[1]).then(generatedImage => {
                            res.writeHead(200, { 'Content-Type': 'image/png' });
                            res.write(generatedImage, 'base64');
                            res.end();
                        }).catch(err => {
                            console.error(err);
                            res.writeHead(500);
                            res.end();
                        });
                    } else {
                        res.writeHead(404);
                        res.end();
                    }
                }
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });

                const standart = ['InfiniCanvas', 'Join and start placing pixels on an infinite Canvas!', 'caltrop.dev', '#F6C426', 'https://cdn.caltrop.dev/canvas/favicon.png']

                let pos = req.url.split('@')[1];
                if (!pos) {
                    res.write(this.generateHTML.apply(null, standart));
                } else {
                    pos = pos.split(',');
                    const valid = /^-?[0-9]{1,12}$/;
                    if (valid.test(pos[0]) && valid.test(pos[1])) {
                        res.write(this.generateHTML('InfiniCanvas', `Join InfiniCanvas and start editing at position X: ${pos[0]}, Y: ${pos[1]} !`, 'caltrop.dev', '#F6C426', `${this.compiled ? 'https://canvas.caltrop.dev:5000' : 'http://localhost:5000'}/thumbnail@${pos[0]},${pos[1]}`));
                    } else {
                        res.write(this.generateHTML.apply(null, standart));
                    }
                }
                res.end();
            }
        } catch (err) {
            console.error(err);
            res.writeHead(500)
            res.end();
        }
    };

    generateHTML = (title, description, siteName, color, image) => {
        return this.cache.data.get('/app.html').data.toString().replace('@@__HEAD_DATA_HERE__', `
        <head>
            <script src="/socket.io/socket.io.js"></script>
            <title>${title}</title>
            <link rel="icon" href="https://cdn.caltrop.dev/canvas/favicon.png" type="image/png">

            <meta name="title" content="${title}">
            <meta name="description" content="${description}">
            <meta name="theme-color" content="${color}">
            <meta name="robots" content="index, follow">
            <meta charset="UTF-8">
            <meta name="viewport" content="user-scalable=no">

            <meta property="og:type" content="website">
            <meta property="og:url" content="https://caltrop.dev/">
            <meta property="og:title" content="${title}">
            <meta property="og:description" content="${description}">
            <meta property="og:image" content="${image}">
            <meta property="pg:site_name" content="${siteName}">

            <meta property="twitter:card" content="summary_large_image">
            <meta property="twitter:url" content="https://caltrop.dev/">
            <meta property="twitter:title" content="${title}">
            <meta property="twitter:description" content="${description}">
            <meta property="twitter:image" content="${image}">

            <link rel="stylesheet" href="./static/style.css">
        </head>
                `).replace('@@__SCRIPT_DATA_HERE__', this.compiled
            ? '<script src="./static/setup.js"></script><script src="./static/lib/gl-matrix.js"></script>'
            : Array.from(this.cache.data).filter(f => f[0].startsWith('/static') && f[0].endsWith('js')).map(f => `<script src=".${f[0].trim()}"></script>`).join('\n')
        );
    }

    compile = () => {
        return new Promise((resolve) => {
            let data = '';

            for (const f of this.cache.files) {
                if (f.endsWith('.js') &&
                    ![
                        '/node_modules/socket.io-client/dist/socket.io.js',
                        '/static/lib/gl-matrix.js',
                        workerFileDir
                    ].includes(f)
                ) {
                    const _ = this.cache.data.get(f).data;
                    data += (_.endsWith(';') ? _ : _ + ';');
                }
            }

            data = data.replace('window.world = ', '');

            const out = babel.transform(data, config);

            fs.writeFileSync(globalThis.rootDir + '/build/canvas.ES6.js', data);
            fs.writeFileSync(globalThis.rootDir + '/build/canvas.ES5.js', out.code);

            minify(globalThis.rootDir + '/build/canvas.ES5.js').then(es5 => {

                fs.writeFileSync(globalThis.rootDir + '/build/canvas.ES5.min.js', es5)

                minify(globalThis.rootDir + '/build/canvas.ES6.js').then(es6 => {
                    fs.writeFileSync('./build/canvas.ES6.min.js', es6);
                    resolve();
                });
            });
        })
    }
}