var mapArray = [],
    categoryHierarchy = {},
    categoryFeatures = {},
    categoryIcons = {},
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
    featureSize = 10,
    featureAdjust = featureSize / 2,
    needUpdate = false,
    mapWidth = canvas.width / scale,
    mapHeight = canvas.height / scale;

function clearMap() {
    'use strict';
    // clear canvas with a white background
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // reapply scale and translation
    ctx.restore();
}

function drawMaps(boundary) {
    'use strict';
    var x,
        y,
        img,
        map,
        i;
    for (i = 0; i < mapArray.length; i += 1) {
        map = mapArray[i];
        // coords are map centers, subtract to get top left corners
        x = map['X coord'] - mapAdjust;
        // n/s is measured as z in minecraft
        y = map['Z coord'] - mapAdjust;
        // check that map will be visible
        if (boundary.contains(x, y, mapSize)) {
            img = document.createElement('img');
            img.src = map['Image location'];
            ctx.drawImage(img, x, y, mapSize, mapSize);
        }
    }
}

function drawFeatures(boundary) {
    'use strict';
    var categoryName,
        features,
        featureName,
        feature,
        x,
        y,
        img,
        drawSize = featureSize / scale;
    for (categoryName in categoryFeatures) {
        if (categoryFeatures.hasOwnProperty(categoryName)) {
            img = document.createElement('img');
            img.src = categoryIcons[categoryName];
            features = categoryFeatures[categoryName];
            for (featureName in features) {
                if (features.hasOwnProperty(featureName)) {
                    feature = features[featureName];
                    x = feature['X coord'] - featureAdjust;
                    y = feature['Z coord'] - featureAdjust;
                    if (boundary.contains(x, y, drawSize)) {
                        ctx.drawImage(img, x, y, drawSize, drawSize);
                    }
                }
            }
        }
    }
}

function Boundary(left, right, top, bottom) {
    'use strict';
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
    this.contains = function contains(x, y, objectSize) {
        return (x < this.right &&
                x > this.left - objectSize &&
                y < this.bottom &&
                y > this.top - objectSize);
    };
}

function drawMap() {
    'use strict';
    var left,
        right,
        top,
        bottom,
        boundary;
    // visible bounds
    left = viewCenter.x - mapWidth / 2;
    right = left + mapWidth;
    top = viewCenter.y - mapHeight / 2;
    bottom = top + mapHeight;

    boundary = new Boundary(left, right, top, bottom);
    // only redraw when needed (transformation changed, features added)
    if (needUpdate) {
        clearMap();
        drawMaps(boundary);
        drawFeatures(boundary);
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

// orders maps from SE to NW, so that NW will be drawn on top of SE
// this is to cover "map_x" text in the top left corner of each map
function sortMaps(a, b) {
    'use strict';
    var comparator = 0;
    // compare based on the coordinates with a bigger difference
    if (Math.abs(a['X coord'] - b['X coord']) >
            Math.abs(a['Z coord'] - b['Z coord'])) {
        // sort descending
        comparator =  b['X coord'] - a['X coord'];
    } else {
        comparator = b['Z coord'] - a['Z coord'];
    }
    return comparator;
}

function processMapData(mapData) {
    'use strict';
    var curX,
        curY,
        maxX = -Infinity,
        maxY = -Infinity,
        minX = Infinity,
        minY = Infinity,
        mapName,
        map;
    // determine the center of all maps
    for (mapName in mapData) {
        if (mapData.hasOwnProperty(mapName)) {
            map = mapData[mapName];
            // store them in an array for ordered drawing later
            mapArray.push(map);
            curX = map['X coord'];
            curY = map['Z coord'];
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
    mapArray.sort(sortMaps);
    // coordinates were for map center, adjust for edge
    maxX += mapAdjust;
    maxY += mapAdjust;
    minX -= mapAdjust;
    minY -= mapAdjust;
    viewCenter.x = (minX + maxX) / 2;
    viewCenter.y = (minY + maxY) / 2;
    // scale so the whole map fits
    scale = Math.min(canvas.width / (maxX - minX),
                     canvas.height / (maxY - minY));
    // scale = Math.max(canvas.width, canvas.height) /
    //         Math.max(maxX - minX, maxY - minY);
    // update the width in map coordinates
    mapWidth = canvas.width / scale;
    mapHeight = canvas.height / scale;
    lastTranslation = {x: canvas.width / 2 - viewCenter.x * scale,
            y: canvas.height / 2 - viewCenter.y * scale};
    ctx.setTransform(scale, 0, 0, scale, lastTranslation.x, lastTranslation.y);
}

function hierarchyMember() {
    'use strict';
    return {'parentCat': null,
            'children': []};
}

function processCategory(categoryName, category, parentIcon) {
    'use strict';
    var subcategory;
    // set category icon
    if (category.icon === null) {
        categoryIcons[categoryName] = parentIcon;
    } else {
        categoryIcons[categoryName] = category.icon;
    }
    // set category features
    categoryFeatures[categoryName] = category.features;
    // create hierarchy entry for the root category
    if (!categoryHierarchy.hasOwnProperty(categoryName)) {
        categoryHierarchy[categoryName] = hierarchyMember();
    }
    for (subcategory in category.children) {
        if (category.children.hasOwnProperty(subcategory)) {
            // add each subcategory as a child of the current category
            categoryHierarchy[categoryName].children.push(subcategory);
            // create hierarchy entries for subcategories
            if (!categoryHierarchy.hasOwnProperty(subcategory)) {
                categoryHierarchy[subcategory] = hierarchyMember();
            }
            // add the current category as a parent of each subcategory
            categoryHierarchy[subcategory].parentCat = categoryName;
            // recurse
            processCategory(subcategory,
                            category.children[subcategory],
                            categoryIcons[categoryName]);
        }
    }
}

function processData(dataRequest) {
    'use strict';
    var debugArea = document.getElementById('debugarea'),
        data = JSON.parse(dataRequest.responseText);
    processMapData(data.maps);
    processCategory('Features', data.features, data.features.icon);
    needUpdate = true;
    setInterval(drawMap, 100); // set the animation into motion
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
    var fetchdataurl = 'http://dogtato.net/mcmap/php/mapData.php',
        reqData = 'action=get',
        mapRequest;

    // create the httpRequest
    mapRequest = createHttpRequest();
    if (mapRequest) {
        // configure and send the request
        mapRequest.onreadystatechange = function mapDataReceived() {
            if (mapRequest.readyState === 4) {
                if (mapRequest.status === 200) {
                    processData(mapRequest);
                }
            }
        };
        mapRequest.open('POST', fetchdataurl);
        mapRequest.setRequestHeader('Content-Type',
            'application/x-www-form-urlencoded');
        mapRequest.send(reqData);
    }
};
