
(function () {
  'use strict';

  var socket = io.connect();

  var history = [];
  var localHistory = [];
  var magnets = [];
  var magnetViews = [];

  var SIZE = 400;

  get('/magnets', function (err, magnets) {
    if (err) {
      return console.error(err);
    }
    magnets = JSON.parse(magnets);
    for (var i = 0; i < magnets.length; i++) {
      addMagnet(magnets[i]);
    }
  });

  var fridge = document.createElement('div');
  fridge.className = 'fridge';
  fridge.style.width = 2 * SIZE + 'px';
  fridge.style.height = 2 * SIZE + 'px';

  var edit = document.createElement('button');
  edit.id = 'edit';
  edit.textContent = 'Edit';

  var timeline = document.createElement('input');
  timeline.id = 'timeline';
  timeline.type = 'range';
  timeline.value = 100;
  timeline.addEventListener('input', function () {
    var change = [];

    for (var i = 0; i < magnets.length; i++) {
      var magnet = magnets[i];
      change[i] = {
        x: magnet.x,
        y: magnet.y
      }
    }
    for (var i = 0; i < history.length; i++) {
      var action = history[i];
      if (i < history.length - timeline.value) {
        if (action.action === 'move') {
          change[action.id - 1] = {
            x: action.x,
            y: action.y
          }
        }
      }
    }
    for (var i = 0; i < change.length; i++) {
      var magnetView = magnetViews[i];
      var pos = change[i];

      magnetView.style.left = SIZE + pos.x + 'px';
      magnetView.style.top = SIZE + pos.y + 'px';
    }
  });

  document.body.appendChild(fridge);
  document.body.appendChild(timeline);
  //document.body.appendChild(edit);

  jsonstream('/history', function (err, results) {
    history = JSON.parse(results);
    parseHistory(history);
  }, function (results) {
    results = JSON.parse(results);
    parseHistory(results);
    Array.prototype.push.apply(history, results);
  });

  function parseHistory (history) {
    timeline.min = 0;
    timeline.max = history.length - 1;
    timeline.value = history.length - 1;
  }

  socket.on('move', function (move) {
    magnetViews[move.id - 1].style.left = SIZE + move.x + 'px';
    magnetViews[move.id - 1].style.top = SIZE + move.y + 'px';
    addHistory(move);
  });

  function addMagnet (magnet) {
    magnets.push(magnet);

    var magnetView = document.createElement('div');
    magnetViews.push(magnetView);

    magnetView.className = 'magnet';
    magnetView.style.left = SIZE + magnet.x + 'px';
    magnetView.style.top = SIZE + magnet.y + 'px';
    magnetView.textContent = magnet.text;
    magnetView['data-id'] = magnet._id;

    magnetView.addEventListener('mousedown', moveMagnet);
    magnetView.addEventListener('touchstart', moveMagnet);

    fridge.appendChild(magnetView);
  }

  function moveMagnet (e) {
    e.preventDefault();

    var target = e.target;
    var id = target['data-id'];
    var magnetStart = {
      x: parseInt(target.style.left, 10) - SIZE,
      y: parseInt(target.style.top, 10) - SIZE
    }
    var size = target.getBoundingClientRect();
    var touch = e.type === 'touchstart';
    var mouseStart = {
      x: touch ? e.touches[0].pageX : e.pageX,
      y: touch ? e.touches[0].pageY : e.pageY
    }
    if (touch) {
      window.addEventListener('touchmove', onMousemove);
      window.addEventListener('touchend', onMouseup);
    } else {
      window.addEventListener('mousemove', onMousemove);
      window.addEventListener('mouseup', onMouseup);
    }

    function onMousemove (e) {
      e.preventDefault();

      var mouseDelta = {
        x: (touch ? e.touches[0].pageX : e.pageX) - mouseStart.x,
        y: (touch ? e.touches[0].pageY : e.pageY) - mouseStart.y
      }

      var targetPos = {
        x: magnetStart.x + mouseDelta.x,
        y: magnetStart.y + mouseDelta.y
      }

      if (targetPos.x > SIZE - size.width / 2) {
        targetPos.x = SIZE - size.width / 2;
      } else if (targetPos.x < -SIZE + size.width / 2) {
        targetPos.x = -SIZE + size.width / 2;
      }
      if (targetPos.y > SIZE - size.height / 2) {
        targetPos.y = SIZE - size.height / 2;
      } else if (targetPos.y < -SIZE + size.height / 2) {
        targetPos.y = -SIZE + size.height / 2;
      }

      target.style.left = SIZE + targetPos.x + 'px';
      target.style.top = SIZE + targetPos.y + 'px';

      socket.emit('move', {
        id: id,
        x: targetPos.x,
        y: targetPos.y
      });
      addHistory({id: id, x: targetPos.x, y: targetPos.y});
    }

    function onMouseup (e) {
      e.preventDefault();

      if (touch) {
        window.removeEventListener('touchmove', onMousemove);
        window.removeEventListener('touchend', onMouseup);
      } else {
        window.removeEventListener('mousemove', onMousemove);
        window.removeEventListener('mouseup', onMouseup);
      }
      var mouseDelta = {
        x: touch ? e.touches[0].pageX : e.pageX - mouseStart.x,
        y: touch ? e.touches[0].pageY : e.pageY - mouseStart.y
      }

      var targetPos = {
        x: magnetStart.x + mouseDelta.x,
        y: magnetStart.y + mouseDelta.y
      }

      if (targetPos.x > SIZE - size.width / 2) {
        targetPos.x = SIZE - size.width / 2;
      } else if (targetPos.x < -SIZE + size.width / 2) {
        targetPos.x = -SIZE + size.width / 2;
      }
      if (targetPos.y > SIZE - size.height / 2) {
        targetPos.y = SIZE - size.height / 2;
      } else if (targetPos.y < -SIZE + size.height / 2) {
        targetPos.y = -SIZE + size.height / 2;
      }

      target.style.left = SIZE + targetPos.x + 'px';
      target.style.top = SIZE + targetPos.y + 'px';

      socket.emit('move', {
        _id: id,
        x: targetPos.x,
        y: targetPos.y
      });
      addHistory({id: id, x: targetPos.x, y: targetPos.y});
    }
  }

  function addHistory (data) {
    var now = Date.now();
    history.unshift({
      id: data.id,
      time: now,
      action: 'move',
      x: data.x,
      y: data.y
    });
    timeline.max = history.length;
    timeline.value = history.length;
    magnets[data.id - 1].x = data.x;
    magnets[data.id - 1].y = data.y;
  }

  function get (url, cb) {
    var request = new XMLHttpRequest();

    request.open('GET', url, true);

    request.onload = function () {
      if (request.status >= 200 && request.status < 400) {
        cb(null, request.responseText);
      } else {
        cb(request.statusText);
      }
    }

    request.onerror = function (err) {
      cb(err);
    };

    request.send();
  }

  function jsonstream (url, cb, pcb) {
    var buffered = 0;
    var request = new XMLHttpRequest();
    var results = [];

    request.open('GET', url, true);

    request.onload = function () {
      if (request.status >= 200 && request.status < 400) {
        buffer(request.responseText, true);
        cb(null, '[' + results.join(',') + ']');
      } else {
        cb(request.statusText);
      }
    };

    request.onprogress = function (e) {
      buffer(request.responseText, false);
    }

    request.onerror = function (err) {
      cb(err);
    };

    request.send();

    function buffer (data, last) {
      var parts = data.slice(1).split('\u2028');
      var len = last ? parts.length : parts.length - 1;

      while (buffered < len) {
        var part = parts[buffered].slice(0, -1);
        results.push(part);
        pcb('[' + part + ']');
        buffered++;
      }
    }
  }
})();
