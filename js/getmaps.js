var mapArray = [],
    features = {},
    canvas = document.getElementById('mapCanvas'),
    coordDisplay = document.getElementById('coorddisplay'),
    ctx = canvas.getContext('2d'),
    startTranslation = {x: 0, y: 0},
    lastTranslation = {x: 0, y: 0},
    viewCenter = {x: 0, y: 0},
    isDown = false,
    scale = 1,
    mapSize = 128 * 8,
    mapAdjust = mapSize / 2,
    needUpdate = false,
    mapWidth = canvas.width / scale,
    mapHeight = canvas.height / scale;

function drawMap() {
    'use strict';
    var x,
        y,
        img,
        map,
        i,
        // bounds of visible area
        left,
        right,
        top,
        bottom;
    // only redraw when needed (transformation changed, features added)
    if (needUpdate) {
        left = viewCenter.x - mapWidth / 2;
        right = left + mapWidth;
        top = viewCenter.y - mapHeight / 2;
        bottom = top + mapHeight;
        // clear canvas with a white background
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // reapply scale and translation
        ctx.restore();
        // draw maps
        for (i = 0; i < mapArray.length; i += 1) {
            map = mapArray[i];
            // coords are map centers, need top left corners
            x = map['X coord'] - mapAdjust;
            // n/s is measured as z in minecraft
            y = map['Z coord'] - mapAdjust;
            // check that map will be visible
            if (x < right && x > left - mapSize
                    && y < bottom && y > top - mapSize) {
                img = document.createElement('img');
                img.src = map['Image location'];
                ctx.drawImage(img, x, y, mapSize, mapSize);
            }
        }
        needUpdate = false;
    }
}

document.body.onmousemove = function mouseMoved(e) {
    'use strict';
    var newTranslation = {x: 0, y: 0},
        mousePos = {x: 0, y: 0};
    if (isDown) {
        newTranslation = {x: e.pageX - canvas.offsetLeft - startTranslation.x,
                          y: e.pageY - canvas.offsetTop - startTranslation.y};
        ctx.setTransform(scale, 0, 0, scale,
                         newTranslation.x, newTranslation.y);
        viewCenter = {x: (canvas.width / 2 - newTranslation.x) / scale,
                      y: (canvas.height / 2 - newTranslation.y) / scale};
        needUpdate = true;
    // update cursor coordinates when not panning (stay the same while panning)
    } else {
        mousePos = {
            x: Math.round((e.pageX - canvas.offsetLeft - lastTranslation.x) / scale),
            y: Math.round((e.pageY - canvas.offsetTop - lastTranslation.y) / scale)
        };
        coordDisplay.innerHTML = 'x: ' + mousePos.x + ' z: ' + mousePos.y;
    }
};

canvas.onmousedown = function mouseButtonPressed(e) {
    'use strict';
    // check this in case the cursor was released outside the document
    // in which case the event would have been missed
    if (isDown) {
        lastTranslation = {
            x: e.pageX - canvas.offsetLeft - startTranslation.x,
            y: e.pageY - canvas.offsetTop - startTranslation.y
        };
    }
    isDown = true;
    startTranslation = {
        x: e.pageX - canvas.offsetLeft - lastTranslation.x,
        y: e.pageY - canvas.offsetTop - lastTranslation.y
    };
};

document.body.onmouseup = function mouseButtonReleased(e) {
    'use strict';
    // check that the click started on the canvas
    if (isDown) {
        isDown = false;
        lastTranslation = {
            x: e.pageX - canvas.offsetLeft - startTranslation.x,
            y: e.pageY - canvas.offsetTop - startTranslation.y
        };
        needUpdate = true;
    }
};

function sortMaps(a, b) {
    'use strict';
    if (Math.abs(a['X coord'] - b['X coord']) >
            Math.abs(a['Z coord'] - b['Z coord'])) {
        return b['X coord'] - a['X coord'];
    }
    // else
    return b['Z coord'] - a['Z coord'];
}

function mapDataReceived(mapRequest) {
    'use strict';
    var curX,
        curY,
        maxX = -Infinity,
        maxY = -Infinity,
        minX = Infinity,
        minY = Infinity,
        mapData,
        mapName,
        map;
        // mapRequest = httpRequests.maps;
    // process json object
    mapData = JSON.parse(mapRequest.responseText);
    // determine the center of all maps
    for (mapName in mapData.results) {
        if (mapData.results.hasOwnProperty(mapName)) {
            map = mapData.results[mapName].printouts;
            // store them in a convenient array for drawing later
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
    // update the width in map coordinates
    mapWidth = canvas.width / scale;
    mapHeight = canvas.height / scale;
    lastTranslation = {x: canvas.width / 2 - viewCenter.x * scale,
            y: canvas.height / 2 - viewCenter.y * scale};
    ctx.setTransform(scale, 0, 0, scale, lastTranslation.x, lastTranslation.y);
    // sort maps by their distance from the view center
    mapArray.sort(sortMaps);
    needUpdate = true;
    setInterval(drawMap, 100); // set the animation into motion
}

function structureDataRecieved(structureRequest) {
    'use strict';
    var debugArea = document.getElementById('debugarea');
    features.structures = JSON.parse(structureRequest.responseText);
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

function createHttpRequest() {
    'use strict';
    var httpRequest;
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
    return httpRequest;
}

document.getElementById('getmapdata').onclick = function getMapData() {
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
            'offset=0'
        ].join('\n'),
        reqData = fetchdatafunc + encodeQuery(query),
        mapRequest;

    // create the httpRequest
    mapRequest = createHttpRequest();
    if (mapRequest) {
        // configure and send the request
        mapRequest.onreadystatechange = function processMapData() {
            if (mapRequest.readyState === 4) {
                if (mapRequest.status === 200) {
                    mapDataReceived(mapRequest);
                }
            }
        };
        mapRequest.open('POST', fetchdataurl);
        mapRequest.setRequestHeader('Content-Type',
            'application/x-www-form-urlencoded');
        mapRequest.send(reqData);
    }
};

document.getElementById('structureToggle').onclick = function getStructureData(checkbox) {
    'use strict';
    // define the query to send to semantic mediawiki
    var fetchdataurl = 'http://dogtato.net/minecraft/index.php',
        fetchdatafunc = 'title=Special:Ask/',
        query = [
            '[[Subcategory of::Features]]',
            '?icon',
            // '?x coord',
            // '?z coord',
            'format=json',
            'searchlabel=JSON output',
            'prettyprint=yes',
            'offset=0'
        ].join('\n'),
        reqData = fetchdatafunc + encodeQuery(query),
        structureRequest;
    if (checkbox.checked) {
        structureRequest = createHttpRequest();
        if (structureRequest) {
            // configure and send the request
            structureRequest.onreadystatechange = function processStructureData() {
                if (structureRequest.readyState === 4) {
                    if (structureRequest.status === 200) {
                        structureDataRecieved(structureRequest);
                    }
                }
            };
            structureRequest.open('POST', fetchdataurl);
            structureRequest.setRequestHeader('Content-Type',
                'application/x-www-form-urlencoded');
            structureRequest.send(reqData);
        }
    }
};
