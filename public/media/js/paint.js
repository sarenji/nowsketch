var canvas, context;
var inputMsg, displayMsg;
var drawing = false;
var started = false;

function initNow() {
    // set up sending chat
    $("#msgform").submit(function(e) {
        e.preventDefault();
        // TODO: Limit messages server/client side.
        var msg = inputMsg.val();
        
        // attempt to execute commands if message starts with /
        if (msg[0] == "/") {
            run_command(msg);
        } else {
            now.broadcast(now.room, msg);
        }
        inputMsg.val('').focus();
    });
    
    inputMsg.keydown(function(e) {
        if (!e.shiftKey && e.keyCode == 13) { // [ENTER]
            e.preventDefault();
            $("#msgform").submit();
        }
    });
    
    $(document).mousemove(function(e) {
        flashTitle(false);
    });
    
    // set up brushes
    context.lineWidth = 2;
    
    // set up drawing
    var oldX = 0;
    var oldY = 0;
    var x = 0;
    var y = 0;
    canvas.mouseup(function() {
        drawing = false;
    }).mousedown(function(e) {
        e.preventDefault();
        drawing = true;
    }).mousemove(function(e) {
        oldX = x;
        oldY = y;
        x = e.clientX - this.offsetLeft;
        y = e.clientY - this.offsetTop;
        
        now.moveUser(x, y);
        
        if (drawing) {
            now.drawUser(oldX, oldY, x, y);
        }
    });
}

/** Nowchat stuff */
now.room = window.location.pathname.toString().substring(1);
now.receiveBroadcast = function(name, message) {
    var klass = "";
    if (message.indexOf(this.now.name) != -1) {
        // your name was highlighted!
        flashTitle(name + " highlighted your name!");
        klass = ' class="highlight"';
    }
    appendMessage("<p" + klass + "><strong>" + name + "</strong>: " + message + "</p>");
};

now.receiveServerMessage = function(message) {
    appendMessage('<p class="server">* ' + message + "</p>");
};

function appendMessage(message) {
    var isAtBottom = (displayMsg.attr('scrollTop') == 
        (displayMsg.attr('scrollHeight') - displayMsg.attr('clientHeight')));
    displayMsg.append(message);
    if (isAtBottom) {
        displayMsg.attr('scrollTop', displayMsg.attr('scrollHeight'));
    }
}

function run_command(message) {
    var params = message.replace(/  */, " ").split(" ");
    
    switch (params[0]) {
        case "/nick":
            now.changeName(params[1]);
            break;
        default:
            now.receiveServerMessage("This command does not exist!");
    }
}

function flashTitle(newMsg) {
    if (newMsg === false) {
        clearTimeout(flashTitle.timeoutId);
        document.title = flashTitle.original;
    } else {
        flashTitle.timeoutId = setTimeout(function() {
            clearTimeout(flashTitle.timeoutId);
            document.title = (document.title == flashTitle.original) ? newMsg : flashTitle.original;
            flashTitle.timeoutId = setTimeout(arguments.callee, flashTitle.interval);
        }, flashTitle.interval);
    }
}
flashTitle.original  = document.title;
flashTitle.timeoutId = undefined;
flashTitle.interval  = 1000;

/** Nowdraw stuff */
now.draw = function(oldX, oldY, newX, newY, color) {
    var dx = newX - oldX;
    var dy = newY - oldY;
    color  = color || "black";
    
    context.strokeStyle = color;
    context.beginPath();
    context.moveTo(oldX, oldY);
    context.lineTo(newX, newY);
    context.closePath();
    context.stroke();
};

/** Init */
$(function() {
    inputMsg   = $('#message').focus();
    displayMsg = $('#messages'); // oh lord, this s thing messed me up.
    
    canvas  = $("#paint");
    canvas[0].width  = 800;
    canvas[0].height = 600;
    context = canvas[0].getContext('2d');
    
    now.ready(initNow);
});
