
var fs = require('fs');
var path = require('path');
var process = require('process');
var child_process = require('child_process');

var SRC_FILE = 'tmx/map.tmx';
var TEMP_FILE = 'tmx/map.tmx.json';

function runCommand(cmdline) {
    var result = child_process.spawnSync(cmdline[0], cmdline.slice(1),
        {cwd: __dirname, stdio: 'inherit'});
    if (result.status !== 0) process.exit(1);
}

var mode = process.argv[2] || 'client';
var DEST_FILE = (mode === 'client') ?
    '../../client/maps/world_client' :
    '../../server/maps/world_server.json';

runCommand(['node', 'tmx2json.js', SRC_FILE, TEMP_FILE]);

runCommand(['node', 'exportmap.js', TEMP_FILE, DEST_FILE, mode]);

fs.unlinkSync(TEMP_FILE);

console.log('Done.');
