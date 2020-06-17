const BaseServer = require('./baseServer.js'),
    Https = require('https'),
    CloudCleaner = require('../CloudCleaner.js'),
    Greenlock = require('greenlock');

module.exports = class HttpsServer extends BaseServer {
    constructor(port, compile) {
        super(port, Https, compile)

        this.lastCert;
        this.lastPrivKey;
        this.lastChain;

        this.cloudCleaner = new CloudCleaner(this.config.cloudflareToken);

        this.greenlock = Greenlock.create.bind(this)({
            packageRoot: globalThis.rootDir + '/',
            configDir: globalThis.rootDir + '/store',
            maintainerEmail: 'caltropuwu@gmail.com',

            notify: (event, details) => {
                if (event == 'warning') console.warn(event, '(you can probably ignore this)', details);
                else console.log(event, details);
            },
            renew: (results) => {
                this.cloudCleaner.clearTxtRecords('caltrop.dev').then(() => {
                    if (results[0].error) {
                        console.error(results[0].error);
                        process.exit(1);
                    }
                    let { pems } = results[0];
                    if ((this.lastCert == pems.cert) || (this.lastPrivKey == pems.privkey) || (this.lastChain == pems.chain)) return;
                    if (!this.lastCert && !this.lastPrivKey && !this.lastChain) this.start({ cert: pems.cert, key: pems.privkey, ca: pems.chain });
                    else updateServer({ cert: pems.cert, key: pems.privkey, ca: pems.chain });

                    this.lastCert = pems.cert;
                    this.lastPrivKey = pems.privkey;
                    this.lastChain = pems.chain;
                });
            },
        });
        this.greenlock.manager.defaults.bind(this)({
            agreeToTerms: true,
            subscriberEmail: "caltropuwu@gmail.com",
            store: {
                module: "greenlock-store-fs",
                basePath: globalThis.rootDir + "./store/certs"
            },
            challenges: {
                "dns-01": this.cloudCleaner
            }
        });
        this.greenlock.add.bind(this)({
            subject: "canvas.caltrop.dev",
            altnames: ["canvas.caltrop.dev"]
        }).catch(console.error);
    }

    updateServer = (opts) => {
        this.server.setSecureContext(opts);
        console.log('Updated certificate!');
    }
}