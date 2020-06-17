console.clear();
const CP = require('child_process');

(f = () => {
    const child = CP.fork('./backend/main.js', process.argv.splice(2));
    child.on('exit', (code, sig) => {
        if (code) {
            console.log('RESTARTING!');
            setTimeout(f, 100);
        } else {
            process.exit(0);
        }
    })
})();