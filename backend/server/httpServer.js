const BaseServer = require('./baseServer.js'),
    http = require('http');

module.exports = class HttpServer extends BaseServer {
    constructor(port, compile) {
        super(port, http, compile);
        this.start(null);
    }
}