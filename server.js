var fs      = require('fs');
var express = require('express');
var nowjs   = require('now');
var app     = express.createServer();

var animalNames = fs.readFileSync("animal_list", "UTF-8").split("\n");

app.configure(function() {
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

/** Main page redirects to a random room */
app.get("/", function(req, res) {
    var animal = animalNames[Math.floor(Math.random()*animalNames.length)];
    res.redirect("/" + animal);
});

/** Render the room */
app.get("/:room", function(req, res) {
    res.render('room.ejs', {
        room : req.params.room,
        layout: false
    });
});

app.listen(10013);

function makeRandomID() {
    return String(Math.floor(Math.random()*10000));
}

var everyone = nowjs.initialize(app);
everyone.on('connect', function(clientId) {
    var room = nowjs.getGroup(this.now.room);
    
    // TODO: Auth auth

    room.addUser(clientId);

    // TODO: If not authed, return new name (Guest###)
    // Also do other stuff
    this.now.name       = "Guest" + makeRandomID();
    this.now.registered = false;

    // Announce join
    //serverMessage(this.now.room, this.now.name + " joined #" + this.now.room);
    room.now.newUser(this.now.name);
});

everyone.on('disconnect', function(clientId) {
    var room = nowjs.getGroup(this.now.room);
    room.removeUser(clientId);

    serverMessage(this.now.room, this.now.name + " left #" + this.now.room);
});

/** Nowchat stuff */
function sanitize(message) {
    return message.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/  /g, " &nbsp;")
                  .replace(/\n/g, "<br/>");
}

function serverMessage(room, message) {
    var room = nowjs.getGroup(room);
    room.now.receiveServerMessage(sanitize(message));
}

everyone.now.broadcast = function(room, message) {
    if (message) {
        var room = nowjs.getGroup(this.now.room);
        
        // TODO: Check if client sending broadcast is actually in the room!
        room.now.receiveBroadcast(this.now.name, sanitize(message));
    }
};

var nickValidatorRegex = /^[a-zA-Z0-9]{1,13}$/;
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

/** Nowdraw stuff */
everyone.now.moveUser = function(x, y) {
    // TODO: Move user graphic
};

everyone.now.drawUser = function(oldX, oldY, x, y, color) {
    var room = nowjs.getGroup(this.now.room);
    // check if actually in room?
    room.now.draw(oldX, oldY, x, y, color);
};
