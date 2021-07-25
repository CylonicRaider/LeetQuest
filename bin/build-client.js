
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');

var BUILD_DIR = path.join(__dirname, '../client-build');
var PROJECT_DIR = path.join(__dirname, '../client/js');

function adjustPath(filepath, definition) {
  if (typeof definition == 'string') {
    if (definition == 'remove') {
      fs.rmSync(filepath, {recursive: true});
    }
  } else if (typeof definition == 'object') {
    if (!fs.lstatSync(filepath).isDirectory())
      throw new Error('Expected directory at ' + filepath);
    if (Array.isArray(definition)) {
      var defObject = {'': 'remove'};
      definition.forEach(function(name) {
        defObject[name] = 'keep';
      });
      definition = defObject;
    }
    fs.readdirSync(filepath).forEach(function(name) {
      var action = definition[name] || definition[''] || 'keep';
      adjustPath(path.join(filepath, name), action);
    });
  } else {
    throw new Error('Invalid path adjustment definition: ' + definition);
  }
}

console.log('Cleaning up build directory...');
fs.rmSync(BUILD_DIR, {force: true, recursive: true});

console.log('Building client...');
child_process.spawnSync('node', ['../../bin/r.js', '-o', 'build.js'],
                        {cwd: PROJECT_DIR});

console.log('Removing unnecessary files...');
adjustPath(BUILD_DIR, {
  'js': ['game.js', 'home.js', 'log.js', 'require-jquery.js', 'modernizr.js',
         'css3-mediaqueries.js', 'mapworker.js', 'detect.js',
         'underscore.min.js', 'text.js'],
  'sprites': 'remove',
  'config': 'remove'
});

console.log('Done.');
