
var fs = require('fs');
var path = require('path');
var process = require('process');
var child_process = require('child_process');

var minimist = require('minimist');

var SERVER_DIR = path.join(__dirname, '../server');

function mergeSettings(base, merge) {
    Object.keys(merge).forEach(function(k) {
        if (merge[k] === undefined) return;
        base[k] = merge[k];
    });
    return base;
}

function main() {
    var args = minimist(process.argv.slice(2));
    if (args.help) {
        console.log('USAGE: run.js [--help] [--host HOST] [--port PORT] ' +
            '[--world-count INT] [--world-capacity INT] ' +
            '[--log-level LEVEL] [CONFIG_FILE]');
        return;
    }
    if (args._.length) {
        var configData = JSON.parse(fs.readFileSync(args._[0]));
        args = mergeSettings(configData, args);
    }
    var settings = {
        host: args.host,
        port: args.port,
        nb_worlds: args['world-count'],
        nb_players_per_world: args['world-capacity'],
        debug_level: args['log-level']
    };
    var defaults = JSON.parse(fs.readFileSync(path.join(SERVER_DIR,
                                                        'config.json')));
    settings = mergeSettings(defaults, settings);
    fs.writeFileSync(path.join(SERVER_DIR, 'config_local.json'),
                     JSON.stringify(settings, null, 4) + '\n');
    child_process.spawnSync('node', [path.join(SERVER_DIR, 'js/main.js')],
        {cwd: path.join(SERVER_DIR, '..'), stdio: 'inherit'});
}

main();
