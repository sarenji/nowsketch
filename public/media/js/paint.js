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
        // otherwise, execute normally
        if (msg[0] == "/" && run_command(msg)) {
        } else {
            now.broadcast(now.room, msg);
        }
        inputMsg.val('').focus();
    });
    
    // [Enter] sends; [Shift] + [Enter] inserts newline
    inputMsg.keydown(function(e) {
        if (!e.shiftKey && e.keyCode == 13) { // Shift + [ENTER]
            e.preventDefault();
            $("#msgform").submit();
        }
    });
    
    // collapse message pane if top bar is clicked.
    $("table#chat thead th").mousedown(function(e) {
        $("table#chat tbody").toggle();
        displayMsg[0].scrollTop = displayMsg[0].scrollHeight;
    });
    
    // clicking displayMsg without making a selection will focus the textarea.
    displayMsg.click(function(e) {
        if (!hasSelected()) {
            inputMsg.focus();
        }
    });
    
    $(document).mousemove(function(e) {
        $.flashTitle(false);
    });
    
    // set up brushes
    context.lineWidth = 2;
    
    // set up drawing
    var oldX = 0;
    var oldY = 0;
    var x = 0;
    var y = 0;
    $("#canv").mouseup(function() {
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
    var strongKlass = "";
    if (name === now.name) {
        strongKlass = ' class="me"';
    } else if (message.toLowerCase().indexOf(this.now.name.toLowerCase()) != -1) {
        // your name was highlighted!
        $.flashTitle(name + " highlighted your name!");
        klass = ' class="highlight"';
    }
    appendMessage("<p" + klass + "><strong" + strongKlass + ">" + name + "</strong>: " + message + "</p>");
};

now.newUser = function(user) {
    $("#userlist").append("<li>" + user + "</li>");
    now.receiveServerMessage(user + " joined #" + now.room);
};

now.receiveServerMessage = function(message) {
    appendMessage('<p class="server">* ' + message + "</p>");
};

now.receiveErrorMessage = function(message) {
    appendMessage('<p class="error">! ' + message + "</p>");
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
    $("table#chat thead th").text("#" + now.room);
    
    canvas  = $("#paint");
    canvas[0].width  = 800;
    canvas[0].height = 600;
    context = canvas[0].getContext('2d');
    
    now.ready(initNow);
});
