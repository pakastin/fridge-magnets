
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
var DATA = path.join(__dirname, '..', 'data');
var MAGNETS = path.join(DATA, 'magnets.json');
var HISTORY = path.join(DATA, 'history.json');

if (!fs.existsSync(DATA)) {
  fs.mkdirSync(DATA);
}

app.use(compression());
app.use(express.static(STATIC));
app.use('/css', express.static(FA_CSS));
app.use('/fonts', express.static(FA_FONTS));

var SIZE = 400;

var magnets = [];
var magnetLookup = {};
var history = [];

var fileaccess = {
  writing: {},
  needWrite: {}
}

if (!fs.existsSync(MAGNETS)) {
  // init magnets
  magnets = "hello world ! this is fridge magnets you can write with these words whatever you want it's still beta . have fun ! be nice , or else ... 😬".split(' ').map(function (word, i) {
    return {
      _id: i + 1,
      text: word,
      x: Math.random() * SIZE - SIZE / 2,
      y: Math.random() * SIZE - SIZE / 2
    }
  });
  magnetLookup = createLookup(magnets);
  writeMagnets();
  console.log('magnets.json not found, creating...');
} else {
  console.log('magnets.json found, loading...');
  magnets = JSON.parse(fs.readFileSync(MAGNETS, {encoding: 'utf8'}));
  magnetLookup = createLookup(magnets);
  console.log('done.');
}

if (!fs.existsSync(HISTORY)) {
  console.log('history.json not found, will create after first move.');
} else {
  console.log('history.json found, loading...');
  history = JSON.parse(fs.readFileSync(HISTORY, {encoding: 'utf8'}));
  console.log('done.');
};

server.listen(8080, function (err) {
  if (err) {
    throw err;
  }
  console.log('Listening on port 8080');
});

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
