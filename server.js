var fs      = require('fs');
var express = require('express');
var io      = require('socket.io');
var hat     = require('hat');

var app     = express.createServer();
var PORT    = process.env.PORT || 10013;
var rack    = hat.rack(128, 16, 128);

io = io.listen(app);

var animalNames = fs.readFileSync("animal_list", "UTF-8").split("\n");
var nickValidatorRegex = /^[a-zA-Z0-9]{1,13}$/;

app.configure(function() {
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

/** Main page redirects to a random room */
app.get("/", function(req, res) {
    res.redirect("/" + rack());
});

/** Render the room */
app.get("/:room", function(req, res) {
    res.render('room.ejs', {
        room : req.params.room,
        layout: false
    });
});

app.listen(PORT);

function makeRandomGuestID() {
    var animal = animalNames[Math.floor(Math.random()*animalNames.length)];
    return animal + String(Math.floor(Math.random()*1000));
}

io.sockets.on("connection", function(socket) {
  var userName = makeRandomGuestID();
  
  // todo: auth
  socket.emit("set name", userName);
  
  socket.on("disconnect", function() {
    socket.broadcast.emit("user disconnect", userName);
  });
  
  /** room wrapper */
  socket.on("join room", function(room) {
    socket.room = room;
    socket.join(room);
    
    socket.on("disconnect", function() {
      socket.leave("room");
    });
    
    /** chat */
    socket
      .broadcast
      .to(socket.room)
      .emit("join room", userName);
    
    socket.on("send chat", function(message) {
      socket
        .broadcast
        .to(socket.room)
        .emit("receive chat", userName, sanitize(message));
    });

    /** draw */
    socket.on("move user cursor", function(x, y) {
      // TODO: Move user graphic
    });

    socket.on("draw user brush", function(oldX, oldY, x, y, color) {
      socket
        .broadcast
        .to(socket.room)
        .emit("draw user brush", oldX, oldY, x, y, color);
    });
  });
});

/** 
 * Prepares a message for HTML display. It fixes carets, 
 * multiple spaces, and newlines.
 */
function sanitize(message) {
    return message.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/  /g, " &nbsp;")
                  .replace(/\n/g, "<br/>");
}

function User(id, name) {
  this.id   = id;
  this.name = name || makeRandomGuestId();
}

function Channel(id) {
  this.id    = id;
  this.users = {};
}
/*
everyone.now.changeName = function(newNick) {
    if (newNick && nickValidatorRegex.test(newNick)) {
        // change to just-validated nick
        var room = nowjs.getGroup(this.now.room);
        room.now.receiveServerMessage(this.now.name + " is now known as " + newNick);
        this.now.name = newNick;
    } else {
        // send back error message
        this.now.receiveErrorMessage("Keep nicknames to 1-13 alphanumeric characters in length.");
    }
}
*/