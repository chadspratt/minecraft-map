var httpRequest,
    mapData,
    canvas = document.getElementById("mapCanvas"),
    ctx = canvas.getContext("2d"),
    startCoords = {x: 0, y: 0},
    last = {x: 0, y: 0},
    viewCenter = {x: 0, y: 0},
    isDown = false,
    scale = 1;

function drawMap() {
    'use strict';
    var x,
        y,
        height = 128 * 8,
        width = 128 * 8,
        img,
        map,
        mapName;
    // resize the canvas to fit the window
    // ctx.canvas.width = window.innerWidth;
    // ctx.canvas.height = window.innerHeight;
    // draw white background
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    // draw maps
    for (mapName in mapData.results) {
        if (mapData.results.hasOwnProperty(mapName)) {
            map = mapData.results[mapName].printouts;
            x = map['X coord'];
            // n/s is measured as z in minecraft
            y = map['Z coord'];
            img = document.createElement("img");
            img.src = map['Image location'];
            // window.alert(img.src);
            ctx.drawImage(img, x, y, width, height);
        }
    }
}

canvas.onmousemove = function (e) {
    'use strict';
    var xVal = e.pageX - this.offsetLeft - startCoords.x,
        yVal = e.pageY - this.offsetTop - startCoords.y;
    if (isDown) {
        ctx.setTransform(scale, 0, 0, scale, xVal, yVal);
    }
};

canvas.onmousedown = function (e) {
    'use strict';
    isDown = true;
    startCoords = {x: e.pageX - this.offsetLeft - last.x,
                   y: e.pageY - this.offsetTop - last.y};
};

canvas.onmouseup = function (e) {
    'use strict';
    isDown = false;
    last = {x: e.pageX - this.offsetLeft - startCoords.x,
            y: e.pageY - this.offsetTop - startCoords.y};
};

function mapDataReceived() {
    'use strict';
    var curX,
        curY,
        maxX = -Infinity,
        maxY = -Infinity,
        minX = Infinity,
        minY = Infinity,
        mapName,
        map;
    if (httpRequest.readyState === 4) {
        if (httpRequest.status === 200) {
            // testing
            // var testarea = document.getElementById('debugarea');
            // testarea.innerHTML = httpRequest.responseText;
            // process json object
            mapData = JSON.parse(httpRequest.responseText);
            // determine the center of 
            for (mapName in mapData.results) {
                if (mapData.results.hasOwnProperty(mapName)) {
                    map = mapData.results[mapName].printouts;
                    curX = map['X coord'][0];
                    curY = map['Z coord'][0];
                    if (curX > maxX) {
                        maxX = curX;
                    }
                    if (curX < minX) {
                        minX = curX;
                    }
                    if (curY > maxY) {
                        maxY = curY;
                    }
                    if (curY < minY) {
                        minY = curY;
                    }
                }
            }
            viewCenter.x = (minX + maxX) / 2;
            viewCenter.y = (minY + maxY) / 2;
            ctx.setTransform(scale, 0, viewCenter.x, scale, 0, viewCenter.y);
            setInterval(drawMap, 100); // set the animation into motion
        }
    }
}

// Special:Ask uses dashes instead of percent signs to encode special chars
function encodeQuery(rawQuery) {
    'use strict';
    var encodedQuery = rawQuery;
    // replace '[' with '-5B'
    encodedQuery = encodedQuery.replace(/\[/g, '-5B');
    // replace ']' with '-5D'
    encodedQuery = encodedQuery.replace(/\]/g, '-5D');
    // replace '?' with '-3F'
    encodedQuery = encodedQuery.replace(/\?/g, '-3F');
    // replace spaces with '-20'
    encodedQuery = encodedQuery.replace(/ /g, '-20');
    // replace '=' with '-3D'
    encodedQuery = encodedQuery.replace(/\=/g, '-3D');
    // replace newlines with '/'
    encodedQuery = encodedQuery.replace(/\n/g, '/');
    return encodedQuery;
}

document.getElementById("getmapdata").onclick = function () {
    'use strict';
    // define the query to send to semantic mediawiki
    var fetchdataurl = 'http://dogtato.net/minecraft/index.php',
        fetchdatafunc = 'title=Special:Ask/',
        query = [
            '[[Category:Maps]]',
            '?x coord',
            '?z coord',
            '?image location',
            'format=json',
            'searchlabel=JSON output',
            'prettyprint=yes',
            'offset=0',
            'sort=x coord',
            'order=DESC'
        ].join('\n'),
        reqData = fetchdatafunc + encodeQuery(query);

    // create the httpRequest
    if (window.XMLHttpRequest) { // Mozilla, Safari, ...
        httpRequest = new XMLHttpRequest();
    } else if (window.ActiveXObject) { // IE
        try {
            httpRequest = new window.ActiveXObject('Msxml2.XMLHTTP');
        } catch (e) {
            try {
                httpRequest = new window.ActiveXObject('Microsoft.XMLHTTP');
            } catch (e2) {
                window.alert('Giving up :( Cannot create an XMLHTTP instance');
                return false;
            }
        }
    }
    // configure and send the request
    httpRequest.onreadystatechange = mapDataReceived;
    httpRequest.open('POST', fetchdataurl);
    httpRequest.setRequestHeader('Content-Type',
        'application/x-www-form-urlencoded');
    httpRequest.send(reqData);
};
