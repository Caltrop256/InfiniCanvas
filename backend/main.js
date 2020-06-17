const arguments = process.argv.splice(1),
    useHttps = !!(arguments.indexOf('--https') + 1),
    port = ~~(arguments[arguments.indexOf('--port') + 1]) || 5000,
    compile = !!(arguments.indexOf('--compile') + 1),
    desiredChunkSize = ~~(arguments[arguments.indexOf('--size') + 1]) || 64;

console.log(arguments);

globalThis.rootDir = Array.from(__dirname).splice(0, __dirname.length - 8).join('');
globalThis.port = port;
globalThis.useHttps = useHttps;

globalThis.CHUNK_SIZE = desiredChunkSize;
globalThis.CHUNK_SIZE_SQ = globalThis.CHUNK_SIZE * globalThis.CHUNK_SIZE

const HttpServer = require('./server/httpServer.js'),
    HttpsServer = require('./server/httpsServer.js'),
    stdin = process.openStdin(),
    server = useHttps
        ? new HttpsServer(port, compile)
        : new HttpServer(port, compile);

let input = '';
stdin.addListener('data', s => {
    input += s
    if (s.toString().endsWith('\n')) {
        let evaled = '';
        try {
            evaled = eval(input);
        } catch (e) {
            evaled = e;
        }
        console.log(evaled);
        input = '';
    }
});