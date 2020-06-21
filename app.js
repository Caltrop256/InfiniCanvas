console.clear();
const CP = require('child_process'),
    fs = require('fs'),
    createFolder = dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    };

['./backups', './store', './store/certs'].forEach(createFolder);

if (!fs.existsSync('./backend/creds.json')) {
    process.stdout.write('creds.json missing - please setup your config. \n See https://github.com/CaltropUwU/InfiniCanvas#Building for help!');
    process.exit();
}

if (['h', '-h', '--h', '--help', '-help', 'help'].includes((process.argv.splice(2)[0] || '').toLowerCase())) {
    process.stdout.write('\nInfiniCanvas!\n\n\'node --harmony app.js\'\n\nOptions:\n--https\t\t\tenable ssl (default off)\n--port\t\t\tchange port (default 5000)\n--compile\t\tminify and cache client files (default off)\n--size\t\t\tchanges chunk size (default 64)\n');
    process.exit();
} else {
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
}