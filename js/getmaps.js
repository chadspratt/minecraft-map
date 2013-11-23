var httpRequest,
    mapData,
    mapArray = [],
    canvas = document.getElementById("mapCanvas"),
    ctx = canvas.getContext("2d"),
    startCoords = {x: 0, y: 0},
    last = {x: 0, y: 0},
    viewCenter = {x: 0, y: 0},
    isDown = false,
    scale = 1,
    mapSize = 128 * 8,
    mapAdjust = mapSize / 2;

function drawMap() {
    'use strict';
    var x,
        y,
        img,
        map,
        // mapName,
        i;
    // clear canvas with a white background
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // reapply scale and translation
    ctx.restore();
    // draw maps
    for (i = 0; i < mapArray.length; i += 1) {
        map = mapArray[i];
        x = map['X coord'];
        // n/s is measured as z in minecraft
        y = map['Z coord'];
        img = document.createElement("img");
        img.src = map['Image location'];
        // coords are map centers, need top left corners
        ctx.drawImage(img, x - mapAdjust, y - mapAdjust, mapSize, mapSize);
    }
}

document.body.onmousemove = function (e) {
    'use strict';
    var xVal = e.pageX - canvas.offsetLeft - startCoords.x,
        yVal = e.pageY - canvas.offsetTop - startCoords.y;
    if (isDown) {
        ctx.setTransform(scale, 0, 0, scale, xVal, yVal);
    }
};

canvas.onmousedown = function (e) {
    'use strict';
    // check this in case the cursor was released outside the document
    // in which case the event would have been missed
    if (isDown) {
        last = {x: e.pageX - canvas.offsetLeft - startCoords.x,
                y: e.pageY - canvas.offsetTop - startCoords.y};
    }
    isDown = true;
    startCoords = {x: e.pageX - canvas.offsetLeft - last.x,
                   y: e.pageY - canvas.offsetTop - last.y};
};

function sortmaps(a, b) {
    'use strict';
    var x0 = a['X coord'],
        x1 = b['X coord'],
        y0 = a['Z coord'],
        y1 = b['Z coord'],
        x0Diff = x0 - viewCenter.x,
        y0Diff = y0 - viewCenter.y,
        x1Diff = x1 - viewCenter.x,
        y1Diff = y1 - viewCenter.y,
        dist0 = Math.sqrt(x0Diff * x0Diff + y0Diff * y0Diff),
        dist1 = Math.sqrt(x1Diff * x1Diff + y1Diff * y1Diff);
    // put things below a x = -y diagonal first
    if (x0Diff > -y0Diff) {
        dist0 = -dist0;
    }
    if (x1Diff > -y1Diff) {
        dist1 = -dist1;
    }
    return dist0 - dist1;
}

document.body.onmouseup = function (e) {
    'use strict';
    // check that the click started on the canvas
    if (isDown) {
        isDown = false;
        last = {x: e.pageX - canvas.offsetLeft - startCoords.x,
                y: e.pageY - canvas.offsetTop - startCoords.y};
        viewCenter = {x: (canvas.width / 2 - last.x) / scale,
                      y: (canvas.height / 2 - last.y) / scale};
        // sort maps by their distance from the view center
        mapArray.sort(sortmaps);
    }
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
            // process json object
            mapData = JSON.parse(httpRequest.responseText);
            // determine the center of 
            for (mapName in mapData.results) {
                if (mapData.results.hasOwnProperty(mapName)) {
                    map = mapData.results[mapName].printouts;
                    mapArray.push(map);
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
            // coordinates were based on map center, adjust for edge
            maxX += mapAdjust;
            maxY += mapAdjust;
            minX -= mapAdjust;
            minY -= mapAdjust;
            viewCenter.x = (minX + maxX) / 2;
            viewCenter.y = (minY + maxY) / 2;
            // scale so the whole map fits
            scale = Math.max(canvas.width, canvas.height) /
                    Math.max(maxX - minX, maxY - minY);
            last = {x: canvas.width / 2 - viewCenter.x * scale,
                    y: canvas.height / 2 - viewCenter.y * scale};
            ctx.setTransform(scale, 0, 0, scale, last.x, last.y);
            // sort maps by their distance from the view center
            mapArray.sort(sortmaps);
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
