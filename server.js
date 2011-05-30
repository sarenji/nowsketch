var fs      = require('fs');
var express = require('express');
var nowjs   = require('now');
var app     = express.createServer();

var animalNames = fs.readFileSync("animal_list", "UTF-8").split("\n");
var nickValidatorRegex = /^[a-zA-Z0-9]{1,13}$/;
// domain name list
var TLDs = [ "aero", "asia", "biz", "cat", "com", "coop", "edu", "gov", "info", "int", "jobs",
             "mil", "mobi", "museum", "name", "net", "org", "pro", "tel", "travel", "xxx",
             "ac", "ad", "ae", "af", "ag", "ai", "al", "am", "an", "ao", "aq", "ar", "as", "at",
             "au", "aw", "ax", "az", "ba", "bb", "bd", "be", "bf", "bg", "bh", "bi", "bj", "bm",
             "bn", "bo", "br", "bs", "bt", "bv", "bw", "by", "bz", "ca", "cc", "cd", "cf", "cg",
             "ch", "ci", "ck", "cl", "cm", "cn", "co", "cr", "cs", "cu", "cv", "cx", "cy", "cz",
             "de", "dj", "dk", "dm", "do", "dz", "ec", "ee", "eg", "er", "es", "et", "eu", "fi",
             "fj", "fk", "fm", "fo", "fr", "ga", "gb", "gd", "ge", "gf", "gg", "gh", "gi", "gl",
             "gm", "gn", "gp", "gq", "gr", "gs", "gt", "gu", "gw", "gy", "hk", "hm", "hn", "hr",
             "ht", "hu", "id", "ie", "il", "im", "in", "io", "iq", "ir", "is", "it", "je", "jm",
             "jo", "jp", "ke", "kg", "kh", "ki", "km", "kn", "kp", "kr", "kw", "ky", "kz", "la",
             "lb", "lc", "li", "lk", "lr", "ls", "lt", "lu", "lv", "ly", "ma", "mc", "md", "me",
             "mg", "mh", "mk", "ml", "mm", "mn", "mo", "mp", "mq", "mr", "ms", "mt", "mu", "mv",
             "mw", "mx", "my", "mz", "na", "nc", "ne", "nf", "ng", "ni", "nl", "no", "np", "nr",
             "nu", "nz", "om", "pa", "pe", "pf", "pg", "ph", "pk", "pl", "pm", "pn", "pr", "ps",
             "pt", "pw", "py", "qa", "re", "ro", "rs", "ru", "rw", "sa", "sb", "sc", "sd", "se",
             "sg", "sh", "si", "sj", "sk", "sl", "sm", "sn", "so", "sr", "st", "su", "sv", "sy",
             "sz", "tc", "td", "tf", "tg", "th", "tj", "tk", "tl", "tm", "tn", "to", "tp", "tr",
             "tt", "tv", "tw", "tz", "ua", "ug", "uk", "us", "uy", "uz", "va", "vc", "ve", "vg",
             "vi", "vn", "vu", "wf", "ws", "ye", "yt", "za", "zm", "zw" ];

var replaceURLRegex = new RegExp("(https?:\\/\\/)?([-a-zA-Z.]{1,64}\\.(?:"
              + TLDs.join("|") + ")(?:/[()%/\\w_.~]*)?)(?!\\S)", "i");

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
    return String(Math.floor(Math.random()*100));
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
                  .replace(/\n/g, "<br/>")
                  .replace(replaceURLRegex, function() {
                      var url = RegExp.$1 || "http://";
                      url    += RegExp.$2;
                      return '<a href="' + url + '">' + RegExp.$2 + '</a>';
                  });
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
