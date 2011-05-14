var canvas, context;
var drawing = false;
var started = false;
function ev_mousemove (ev) {
    var x, y;

    // Get the mouse position relative to the canvas element.
    if (ev.layerX || ev.layerX == 0) { // Firefox
        x = ev.layerX;
        y = ev.layerY;
    } else if (ev.offsetX || ev.offsetX == 0) { // Opera
        x = ev.offsetX;
        y = ev.offsetY;
    }

    // The event handler works like a drawing pencil which tracks the mouse 
    // movements. We start drawing a path made up of lines.
    if (!started) {
        context.beginPath();
        context.moveTo(x, y);
        started = true;
    } else {
        context.lineTo(x, y);
        context.stroke();
    }
}

/** Nowchat stuff */
var inputMsg, displayMsg;
now.room = window.location.pathname.toString().substring(1);
now.receiveBroadcast = function(name, message) {
    appendMessage("<p><strong>" + name + "</strong>: " + message + "</p>");
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
    context = canvas[0].getContext('2d');
    
    now.ready(function() {
        $("#msgform").submit(function(e) {
            e.preventDefault();
            var msg = inputMsg.val();
            now.broadcast(now.room, msg);
            inputMsg.val('').focus();
        });
        
        // set up drawing
        var oldX = 0;
        var oldY = 0;
        var x = 0;
        var y = 0;
        canvas[0].width =  canvas.parent().width();
        canvas[0].height =  canvas.parent().height();
        canvas.mouseup(function() {
            drawing = false;
            // now
        }).mousedown(function(e) {
            drawing = true;
            x = e.clientX - this.offsetLeft;
            y = e.clientY - this.offsetTop;
            // now
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
    });
});
