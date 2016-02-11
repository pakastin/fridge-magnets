
var http = require('http');

var express = require('express');
var socketio = require('socket.io');
var compression = require('compression');

var app = express();
var server = http.Server(app);
var io = socketio(server);

app.use(compression());
app.use(express.static(__dirname + '/../public'));
app.use('/css', express.static(__dirname + '/../node_modules/font-awesome/css'));
app.use('/fonts', express.static(__dirname + '/../node_modules/font-awesome/fonts'));

server.listen(8080);

var SIZE = 400;

var history = [];

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
