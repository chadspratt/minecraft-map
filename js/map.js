var canvas = document.getElementById('mapCanvas');
var ctx = canvas.getContext('2d');
var mouse = {x: 0, y: 0};
var scale = 2;

canvas.onmousemove = function (e) {
    'use strict';
    mouse = {x: e.pageX - this.offsetLeft,
             y: e.pageY - this.offsetTop};
};

var img = new Image();

img.src = 'http://dogtato.net/minecraft/images/8/84/Map_6.png';

function render() {
    'use strict';
    ctx.beginPath();
    ctx.save();
    ctx.setTransform(1, 0, 0,
                     1, 0, 0);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.save();
    ctx.arc(mouse.x, mouse.y, 250, 0, 6, 28, false);
    ctx.clip();
    ctx.drawImage(img, 0, 0, img.width * img.height * scale);
    ctx.closePath();
    ctx.restore();
}

setInterval(render, 100);
