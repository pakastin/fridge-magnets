
var cp = require('child_process');
var fs = require('fs');
var http = require('http');
var path = require('path');

var express = require('express');
var socketio = require('socket.io');
var compression = require('compression');

var app = express();
var server = http.Server(app);
var io = socketio(server);

var STATIC = path.join(__dirname, '..', 'public');
var FA_CSS = path.join(__dirname, '..', 'node_modules', 'font-awesome', 'css');
var FA_FONTS = path.join(__dirname, '..', 'node_modules', 'font-awesome', 'fonts');
var MAGNETS = path.join(__dirname, '..', 'data', 'magnets.json');
var HISTORY = path.join(__dirname, '..', 'data', 'history.json');

cp.exec('mkdir -p data');

app.use(compression());
app.use(express.static(STATIC));
app.use('/css', express.static(FA_CSS));
app.use('/fonts', express.static(FA_FONTS));

server.listen(8080);

var SIZE = 400;

var history = [];

fs.exists(MAGNETS, function (exists) {
  if (!exists) {
    // init magnets
    writeMagnets();
    console.log('magnets.json not found, initializing..');
    return;
  }
  fs.readFile(MAGNETS, {encoding: 'utf8'}, function (err, _magnets) {
    if (err) {
      throw err;
    }
    console.log('magnets.json found');
    magnets = JSON.parse(_magnets);
  });
});

fs.exists(HISTORY, function (exists) {
  if (!exists) {
    console.log('history.json not found, will create..');
    return;
  }
  fs.readFile(HISTORY, {encoding: 'utf8'}, function (err, _history) {
    if (err) {
      throw err;
    }
    console.log('history.json found');
    history = JSON.parse(_history);
  })
});

var fileaccess = {
  writing: {},
  needWrite: {}
}

function writeMagnets () {
  if (fileaccess.writing.magnets) {
    fileaccess.needWrite.magnets = true;
    return;
  }
  fileaccess.writing.magnets = true;
  fs.writeFile(MAGNETS, JSON.stringify(magnets), {encoding: 'utf8'}, function (err) {
    if (err) {
      throw err;
    }
    fileaccess.writing.magnets = false;
    if (fileaccess.needWrite.magnets) {
      writeMagnets();
    }
  });
}

function writeHistory () {
  if (fileaccess.writing.history) {
    fileaccess.needWrite.history = true;
    return;
  }
  fileaccess.writing.history = true;
  fs.writeFile(HISTORY, JSON.stringify(history), {encoding: 'utf8'}, function (err) {
    if (err) {
      throw err;
    }
    fileaccess.writing.history = false;
    if (fileaccess.needWrite.history) {
      writeMagnets();
    }
  });
}

var magnets = "hello world ! this is fridge magnets you can write with these words whatever you want it's still beta . have fun ! be nice , or else ... 😬".split(' ').map(function (word, i) {
  return {
    _id: i + 1,
    text: word,
    x: Math.random() * SIZE - SIZE / 2,
    y: Math.random() * SIZE - SIZE / 2
  }
});

var magnetLookup = createLookup(magnets);

app.get('/magnets', function (req, res, next) {
  // TODO: MongoDB

  res.write('[');

  for (var i = 0; i < magnets.length; i += 100) {
    if (i) {
      res.write(',\u2028');
    }
    res.write(JSON.stringify(magnets.slice(i, i + 100)).slice(1, -1));
    res.flush();
  }
  res.write(']');
  res.end();
});

app.get('/history', function (req, res, next) {
  // TODO: MongoDB

  res.write('[');

  for (var i = 0; i < history.length; i += 100) {
    if (i) {
      res.write(',\u2028');
    }
    res.write(JSON.stringify(history.slice(i, i + 100)).slice(1, -1));
    res.flush();
  }
  res.write(']');
  res.end();
});

io.on('connection', function (socket) {
  var id = socket.id;

  socket.on('move', function (data) {
    var id = data.id;
    var magnet = magnetLookup[id];

    if (!magnet) {
      return console.error('magnet not found', id);
    }

    if (data.x > SIZE) {
      data.x = SIZE;
    } else if (data.x < -SIZE) {
      data.x = -SIZE;
    }
    if (data.y > SIZE) {
      data.y = SIZE;
    } else if (data.y < -SIZE) {
      data.y = -SIZE;
    }

    var action = {
      id: id,
      time: Date.now(),
      action: 'move',
      x: magnet.x,
      y: magnet.y
    }
    magnet.x = data.x;
    magnet.y = data.y;

    // TODO: MongoDB
    history.unshift(action);

    socket.broadcast.emit('move', data);

    writeMagnets();
    writeHistory();
  });

  socket.on('disconnect', function () {
    io.emit('leave', id);
  });
});

function createLookup (data) {
  var lookup = {};

  for (var i = 0; i < data.length; i++) {
    var item = data[i];
    lookup[item._id] = item;
  }

  return lookup;
}
