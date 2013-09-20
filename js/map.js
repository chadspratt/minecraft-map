// var mapWidth = 800;
// var mapHeight = 600;
// var mapX = 0;
// var mapY = 0;

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var mouse = {x: 0, y: 0}; //make an object to hold mouse position
var startCoords = {x: 0, y: 0};
var last = {x: 0, y: 0};
var isDown = false;
var scale = 2;
var mapImages = [];

function mapImage(URL, x, y, scale, num) {
    'use strict';
    this.URL = URL;
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.width = 128 * Math.pow(2, scale);
    this.height = this.width;
    this.num = num;
}

function getImageInfo() {
    // body...
}
var img = new Image();
img.src = "http://magickcanoe.com/moths/io-moth-1-large.jpg";

function render() {
    'use strict';
    var i;
    ctx.beginPath();
    for (i = 0; i < mapImages.length; i += 1) {
        ctx.drawImage(mapImages[i], );
    }
    ctx.drawImage(img, 0, 0, img.width * scale, img.height *
        scale);
    ctx.closePath();
    ctx.restore();
}
setInterval(render, 100);
// set the animation into motion

canvas.onmousemove = function (e) {
    'use strict';
    var xVal = e.pageX - this.offsetLeft,
        yVal = e.pageY - this.offsetTop;
    mouse = {x: e.pageX,
             y: e.pageY};
    if (isDown) {
        ctx.setTransform(1, 0, 0, 1,
                         xVal - startCoords.x,
                         yVal - startCoords.y);
    }
};

canvas.onmousedown = function (e) {
    'use strict';
    isDown = true;
    startCoords = {x: e.pageX - this.offsetLeft - last.x,
                   y: e.pageY - this.offsetTop - last.y};
};

canvas.onmouseup   = function (e) {
    'use strict';
    isDown = false;
    last = {x: e.pageX - this.offsetLeft - startCoords.x,
            y: e.pageY - this.offsetTop - startCoords.y};
};



