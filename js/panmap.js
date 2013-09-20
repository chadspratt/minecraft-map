var canvas = document.getElementById('mapCanvas');
var ctx = canvas.getContext('2d');
var startCoords = {x: 0, y: 0};
var last = {x: 0, y: 0};
var isDown = false;
var scale = 2;

var img = new Image();
img.src = "http://dogtato.net/minecraft/images/e/eb/Map_11.png";

// function render() {
//     'use strict';
//     ctx.beginPath();
//     ctx.save();
//     ctx.setTransform(1, 0, 0, 1, 0, 0);
//     ctx.fillStyle = "#FFFFFF";
//     ctx.fillRect(0, 0, canvas.width, canvas.height);
//     ctx.restore();
//     ctx.drawImage(img, 0, 0,
//                   img.width * scale, img.height * scale);
//     ctx.closePath();
// }
// setInterval(render, 100);// set the animation into motion

canvas.onmousemove = function (e) {
    'use strict';
    var xVal = e.pageX - this.offsetLeft - startCoords.x,
        yVal = e.pageY - this.offsetTop - startCoords.y;
    if (isDown) {
        ctx.setTransform(0.5, 0, 0, 0.5,
                         xVal, yVal);
        viewCenter = {x: xVal + canvas.width / 2,
                      y: yVal + canvas.height / 2};
    }
};

canvas.onmousedown = function (e) {
    'use strict';
    isDown = true;
    startCoords = {x: e.pageX - this.offsetLeft - viewCenter.x - canvas.width / 2,
                   y: e.pageY - this.offsetTop - viewCenter.y - canvas.height / 2};
};

canvas.onmouseup   = function () {
    'use strict';
    isDown = false;
};