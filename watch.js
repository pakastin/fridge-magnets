
'use strict';

require('./server');

var cp = require('child_process');
var chokidar = require('chokidar');

exec('npm run build-css')();

chokidar.watch('css/**/*.styl')
  .on('change', exec('npm run build-css'));

function exec (cmd) {
  var cmd = cmd.split(' ');

  return function () {
    var child = cp.spawn(cmd[0], cmd.slice(1))

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  }
}
