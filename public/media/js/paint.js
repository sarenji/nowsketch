var canvas, context, dom;
var drawing = false;
var started = false;
var users   = [];

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
              + TLDs.join("|") + ")(?:/[()%/\\w_.~]*)?)(?![0-9A-Za-z])", "i");

function afterServerConnect() {
    $(document).keyup(function(e) {
        if (e.ctrlKey && e.keyCode == 72) {
            // Ctrl + [H] toggles UI and focuses on chat textarea
            dom.ui.toggle();
            dom.inputMsg.focus();
        } else if (e.ctrlKey && e.keyCode == 67) {
            // Ctrl + [M] just focuses on chat textarea
            dom.inputMsg.focus();
        } else if (e.ctrlKey && e.keyCode == 67) {
            // Ctrl + [C] opens color window.
            //dom.inputMsg.focus();
        }
    });
    // set up sending chat
    // todo: only send messages once you've gotten a nickname
    dom.msgform.submit(function(e) {
        e.preventDefault();
        // TODO: Limit messages server/client side.
        var msg = dom.inputMsg.val();
        
        // attempt to execute commands if message starts with /
        // otherwise, execute normally
        if (msg[0] == "/" && run_command(msg)) {
        } else {
            socket.emit("send chat", msg);
            appendMessage("<p><strong class='me'>" + nickname + "</strong>: " + msg + "</p>");
        }
        dom.inputMsg.val('').focus();
    });
    
    // [Enter] sends; [Shift] + [Enter] inserts newline
    dom.inputMsg.keydown(function(e) {
        if (!e.shiftKey && e.keyCode == 13) {
            // [ENTER] sends form; Shift + [ENTER] doesn't
            e.preventDefault();
            dom.msgform.submit();
        }
    });
    
    // collapse message pane if top bar is clicked.
    dom.chatHeader.mousedown(function(e) {
        dom.chatBody.toggle();
        dom.displayMsg[0].scrollTop = dom.displayMsg[0].scrollHeight;
    });
    
    // clicking displayMsg without making a selection will focus the textarea.
    dom.displayMsg.click(function(e) {
        if (!hasSelected()) {
            dom.inputMsg.focus();
        }
    });
    
    // set up brushes
    context.lineWidth = 2;
    
    // set up drawing
    var oldX = 0;
    var oldY = 0;
    var x = 0;
    var y = 0;
    
    dom.canvasWrap.mouseup(function() {
        drawing = false;
    }).mousedown(function(e) {
        e.preventDefault();
        drawing = true;
    }).mousemove(function(e) {
        oldX = x;
        oldY = y;
        x = e.clientX - canvas.offsetLeft;
        y = e.clientY - canvas.offsetTop;
        
        // socket.emit("move user cursor", x, y);
        
        if (drawing) {
          var color = dom.colorText.attr("value");
          socket.emit("draw user brush", oldX, oldY, x, y, color);
          drawBrush(oldX, oldY, x, y, color);
        }
    });
    
    // color pickers
    $(".pickerunder").bind('mousedownoutside', function(e) {
        var self = $(this);
        if (self.is(":hidden")) {
            if ($(e.target).attr('class') == 'colorbox') {
                self.show();
            }
        } else {
            self.hide();
        }
    });
    
    // as you drag stuff around, change box color and the color's text color.
    $("#nav .colorpicker").farbtastic(function(color) {
        dom.colorText.attr("value", color).css({
            backgroundColor : color,
            color : this.hsl[2] > 0.5 ? '#000' : '#fff'
        });
        $("#nav .colorbox").css("background", color);
    });
}

/** Chat stuff */
var socket = io.connect();
// socket.room = window.location.pathname.toString().substring(1);

socket.on("connect", function() {
  printServerMessage("You joined #" + "derp");
  afterServerConnect();
  appendToUserList("derp");
  socket.emit("join room", window.location.pathname.toString().substring(1));
});

socket.on("disconnect", function() {
  printServerMessage("You disconnected. Reconnecting...");
});

socket.on("user disconnect", function(userName) {
  printServerMessage(userName + " left #" + "derp");
});

var nickname;
socket.on("set name", function(newName) {
  nickname = newName;
});

socket.on("user changed name", function(oldName, newName) {
  printServerMessage(oldName + " changed names to " + newName);
});

socket.on("receive chat", function(name, message) {
  var klass = "";
  if (message.toLowerCase().indexOf(name.toLowerCase()) != -1) {
      // your name was highlighted!
      $.flashTitle(name + " highlighted your name!");
      klass = ' class="highlight"';
      
      // trigger one-time mouse move event to reset title.
      $(document).one('mousemove', function(e) {
          $.flashTitle(false);
      });
  }
  appendMessage("<p" + klass + "><strong>" + name + "</strong>: " + message + "</p>");
});

socket.on("join room", function(user) {
  dom.userList.append("<li>" + user + "</li>");
  printServerMessage(user + " joined #" + "derp");
  appendToUserList(user);
});

socket.on("receive server message", printServerMessage);

socket.on("receive error message", function(message) {
  appendMessage('<p class="error">! ' + message + "</p>");
});

function printServerMessage(message) {
  appendMessage('<p class="server">* ' + message + "</p>");
}

function appendToUserList(userName) {
  users.push(userName);
  users.sort();
  updateUserList();
}

function updateUserList() {
  var $userList = $("#userlist");
  $userList.empty();
  for (var i = 0; i < users.length; i++) {
    $userList.append("<li>" + users[i] + "</li>");
  }
}

function appendMessage(message) {
    var isAtBottom = (dom.displayMsg.attr('scrollTop') == 
        (dom.displayMsg.attr('scrollHeight') - dom.displayMsg.attr('clientHeight')));
    // turn URLs into real clickable URLs
    message = message.replace(replaceURLRegex, function() {
        var url = RegExp.$1 || "http://";
        url    += RegExp.$2;
        return '<a href="' + url + '">' + RegExp.$2 + '</a>';
    });
    // append to the chat window
    dom.displayMsg.append(message);
    if (isAtBottom) {
        dom.displayMsg.attr('scrollTop', dom.displayMsg.attr('scrollHeight'));
    }
}

function run_command(message) {
    var params = message.split(/  */);
    
    switch (params[0]) {
        case "/nick":
            socket.emit("change name", params[1]);
            return true;
        default:
            return false;
    }
    return false;
}

// based off http://snipplr.com/view/775/getselection/
function hasSelected() {
	return (!!document.getSelection) ? !!String(document.getSelection()):
	       (!!window.getSelection)   ? !window.getSelection().isCollapsed :
	       !!document.selection.createRange().text;
}

/**
 * jQuery plugin to flash the title
 * Call by $.flashTitle(newMessage[, interval]);
 * Stop flashing by passing "false" instead of newMessage.
 */
(function($) {
    var DEFAULT_INTERVAL = 1000;
    var original  = document.title;
    var timeoutId = undefined;
    $.flashTitle = function(newMsg, interval) {
        if (newMsg == false) {
            // stop flashing and reset title
            clearTimeout(timeoutId);
            document.title = original;
        } else {
            // loop flashing
            interval = interval || DEFAULT_INTERVAL;
            timeoutId = setTimeout(function() {
                clearTimeout(timeoutId);
                document.title = (document.title == original) ? newMsg : original;
                timeoutId = setTimeout(arguments.callee, interval);
            }, interval);
        }
    };
})(jQuery);

/** Nowdraw stuff */
socket.on("draw user brush", drawBrush);

function drawBrush(oldX, oldY, newX, newY, color) {
  var dx = newX - oldX;
  var dy = newY - oldY;
  color  = color || "black";
  
  context.strokeStyle = color;
  context.beginPath();
  context.moveTo(oldX, oldY);
  context.lineTo(newX, newY);
  context.closePath();
  context.stroke();
}

/** Init */
$(function() {
    // set up dom elements
    dom = {
        ui         : $("#ui"),
        msgform    : $("#msgform"),
        inputMsg   : $("#message").focus(),
        displayMsg : $("#messages"),
        userList   : $("#userlist"),
        canvasWrap : $("#canv"),
        canvas     : $("#paint"),
        chat       : $("#chat"),
        chatBody   : $("table#chat tbody"),
        chatHeader : $("table#chat thead th"),
        colorText  : $("#nav .colorinput")
    };
    
    dom.chatHeader.text("Chatting in #" + "derp");
    
    canvas = dom.canvas[0];
    canvas.width  = 800;
    canvas.height = 600;
    context = canvas.getContext('2d');
});
