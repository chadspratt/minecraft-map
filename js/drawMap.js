/*global $ */
var canvas = document.getElementById('mapCanvas'),
    coordDisplay = document.getElementById('coorddisplay'),
    ctx = canvas.getContext('2d'),
    mapArray = [],
    categoryHierarchy = {},
    categoryFeatures = {},
    categoryIcons = {},
    // stores the names of the categories that are toggled on
    visibleCategories = {},
    visibleFeatures = {},
    startTranslation = {x: 0, y: 0},
    lastTranslation = {x: 0, y: 0},
    viewCenter = {x: 0, y: 0},
    isDown = false,
    scale = 1,
    needUpdate = false,
    visibleBoundary = null,
    clickedFeature = null;

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

function drawMaps() {
    'use strict';
    var x,
        y,
        img,
        mapBoundary,
        i;
    for (i = 0; i < mapArray.length; i += 1) {
        mapBoundary = mapArray[i];
        x = mapBoundary.left;
        y = mapBoundary.top;
        // check that map will be visible
        if (visibleBoundary.contains(mapBoundary)) {
            img = document.createElement('img');
            img.src = mapBoundary.image;
            ctx.drawImage(img, x, y, mapBoundary.width, mapBoundary.height);
        }
    }
}

function drawFeatures() {
    'use strict';
    var categoryName,
        featureBoundaries,
        featureName,
        featureBoundary,
        x,
        y,
        img;
    // store all features that get drawn
    visibleFeatures = {};
    // go through each category that's turned on
    for (categoryName in visibleCategories) {
        if (visibleCategories.hasOwnProperty(categoryName)) {
            // go through the category's features
            featureBoundaries = categoryFeatures[categoryName];
            for (featureName in featureBoundaries) {
                if (featureBoundaries.hasOwnProperty(featureName)) {
                    featureBoundary = featureBoundaries[featureName];
                    // if the feature is in the field of view
                    if (visibleBoundary.contains(featureBoundary)) {
                        // draw the feature
                        img = document.createElement('img');
                        img.src = featureBoundary.image;
                        x = featureBoundary.left;
                        y = featureBoundary.top;
                        ctx.drawImage(img, x, y,
                                      // divide by scale to keep size constant
                                      featureBoundary.width / scale,
                                      featureBoundary.height / scale);
                        // and store it for checking mouseover
                        visibleFeatures[featureName] = featureBoundary;
                    }
                }
            }
        }
    }
}

function Boundary(centerX, centerY, width, height, image) {
    'use strict';
    this.centerX = centerX;
    this.centerY = centerY;
    this.width = width;
    this.height = height;
    this.left = centerX - width / 2;
    this.right = this.left + width;
    this.top = centerY - height / 2;
    this.bottom = this.top + height;
    this.image = image;
    this.contains = function contains(boundary) {
        return (boundary.left < this.right &&
                boundary.right > this.left &&
                boundary.top < this.bottom &&
                boundary.bottom > this.top);
    };
    // for checking mouseover
    this.containsPoint = function containsPoint(coords) {
        return (coords.x < this.right &&
                coords.x > this.left &&
                coords.y < this.bottom &&
                coords.y > this.top);
    };
    this.squareDistFromCenter = function squareDistFromCenter(x, y) {
        var dx = this.centerX - x,
            dy = this.centerY - y;
        return dx * dx + dy * dy;
    };
}

function drawMap() {
    'use strict';
    // only redraw when needed (transformation changed, features added)
    if (needUpdate) {
        visibleBoundary = new Boundary(viewCenter.x, viewCenter.y,
                                       visibleBoundary.width,
                                       visibleBoundary.height,
                                       null);
        clearMap();
        drawMaps();
        drawFeatures();
        needUpdate = false;
    }
}

function getFeatureNear(coords) {
    'use strict';
    var nearestFeature = null,
        // check for features within 20 pixels (squared for efficiency)
        // divide by scale to get map distance
        nearestDist = 20 * 20 / scale,
        featureName,
        featureBoundary,
        featureDist;
    for (featureName in visibleFeatures) {
        if (visibleFeatures.hasOwnProperty(featureName)) {
            featureBoundary = visibleFeatures[featureName];
            featureDist = featureBoundary.squareDistFromCenter(coords.x,
                                                               coords.y);
            if (featureDist < nearestDist) {
                nearestDist = featureDist;
                // assign return value
                nearestFeature = featureName;
            }
        }
    }
    return nearestFeature;
}

document.body.onmousemove = function mouseMoved(e) {
    'use strict';
    var newTranslation = {x: 0, y: 0},
        mousePos = {x: 0, y: 0},
        nearbyFeature = null;
    // pan the map
    if (isDown) {
        newTranslation = {x: e.pageX - canvas.offsetLeft - startTranslation.x,
                          y: e.pageY - canvas.offsetTop - startTranslation.y};
        ctx.setTransform(scale, 0, 0, scale,
                         newTranslation.x, newTranslation.y);
        viewCenter = {x: (canvas.width / 2 - newTranslation.x) / scale,
                      y: (canvas.height / 2 - newTranslation.y) / scale};
        needUpdate = true;
    // update cursor coordinates and check against features
    } else {
        mousePos = {
            x: Math.round((e.pageX - canvas.offsetLeft - lastTranslation.x) / scale),
            y: Math.round((e.pageY - canvas.offsetTop - lastTranslation.y) / scale)
        };
        // check if mouse is inside canvas
        if (visibleBoundary !== null && visibleBoundary.containsPoint(mousePos)) {
            // and near a feature
            nearbyFeature = getFeatureNear(mousePos);
        }
        if (nearbyFeature !== null) {
            coordDisplay.innerHTML = nearbyFeature;
        } else {
            coordDisplay.innerHTML = 'x: ' + mousePos.x + ' z: ' + mousePos.y;
        }
    }
    // clear so that click and drags won't cause a feature selection
    clickedFeature = null;
};

canvas.onmousedown = function mouseButtonPressed(e) {
    'use strict';
    var mousePos;
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
    mousePos = {
        x: Math.round((e.pageX - canvas.offsetLeft - lastTranslation.x) / scale),
        y: Math.round((e.pageY - canvas.offsetTop - lastTranslation.y) / scale)
    };
    clickedFeature = getFeatureNear(mousePos);
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
        if (clickedFeature !== null) {
            window.alert(clickedFeature);
        }
    }
};

// orders maps from SE to NW, so that NW will be drawn on top of SE
// this is to cover "map_x" text in the top left corner of each map
function sortMaps(a, b) {
    'use strict';
    var comparator = 0;
    // compare based on the coordinates with a bigger difference
    if (Math.abs(a.left - b.left) >
            Math.abs(a.top - b.top)) {
        // sort descending (east to west)
        comparator =  b.left - a.left;
    } else {
        // sort descending (south to north)
        comparator = b.top - a.top;
    }
    return comparator;
}

function processMapData(mapData) {
    'use strict';
    var maxX = -Infinity,
        maxY = -Infinity,
        minX = Infinity,
        minY = Infinity,
        mapSize = 128 * 8,
        mapName,
        map,
        mapBoundary;
    // determine the center of all maps
    for (mapName in mapData) {
        if (mapData.hasOwnProperty(mapName)) {
            map = mapData[mapName];
            mapBoundary = new Boundary(map['X coord'],
                                       map['Z coord'],
                                       mapSize, mapSize,
                                       map['Image location']);
            // store them in an array for ordered drawing later
            mapArray.push(mapBoundary);
            if (mapBoundary.right > maxX) {
                maxX = mapBoundary.right;
            }
            if (mapBoundary.left < minX) {
                minX = mapBoundary.left;
            }
            if (mapBoundary.bottom > maxY) {
                maxY = mapBoundary.bottom;
            }
            if (mapBoundary.top < minY) {
                minY = mapBoundary.top;
            }
        }
    }
    mapArray.sort(sortMaps);
    // map coordinates of the center of the visible map
    viewCenter.x = (minX + maxX) / 2;
    viewCenter.y = (minY + maxY) / 2;
    // scale so the whole map fits
    scale = Math.min(canvas.width / (maxX - minX),
                     canvas.height / (maxY - minY));
    // update the width in map coordinates
    visibleBoundary = new Boundary(viewCenter.x, viewCenter.y,
                                   canvas.width / scale,
                                   canvas.height / scale,
                                   null);
    // set initial transformation
    lastTranslation = {x: canvas.width / 2 - viewCenter.x * scale,
                       y: canvas.height / 2 - viewCenter.y * scale};
    ctx.setTransform(scale, 0, 0, scale, lastTranslation.x, lastTranslation.y);
}

function processFeatures(features, categoryIcon) {
    'use strict';
    var featureName,
        feature,
        featureBoundary,
        featureBoundaries = {},
        featureSize = 10,
        x,
        y;
    for (featureName in features) {
        if (features.hasOwnProperty(featureName)) {
            feature = features[featureName];
            x = feature['X coord'];
            // minecraft stores N/S as z
            y = feature['Z coord'];
            // ignore features without coordinates
            if (x !== null && y !== null) {
                if (feature.Icon === null) {
                    feature.Icon = categoryIcon;
                }
                featureBoundary = new Boundary(feature['X coord'],
                                               feature['Z coord'],
                                               featureSize, featureSize,
                                               feature.Icon);
                featureBoundaries[featureName] = featureBoundary;
            }
        }
    }
    return featureBoundaries;
}

function HierarchyMember() {
    'use strict';
    this.parentCat = null;
    this.children = [];
}

function processCategory(categoryName, category, parentIcon) {
    'use strict';
    var subcategory;
    // set category icon
    if (category.Icon === null) {
        categoryIcons[categoryName] = parentIcon;
    } else {
        categoryIcons[categoryName] = category.Icon;
    }
    // set category features
    categoryFeatures[categoryName] = processFeatures(category.features,
                                                     categoryIcons[categoryName]);
    // create hierarchy entry for the root category
    if (!categoryHierarchy.hasOwnProperty(categoryName)) {
        categoryHierarchy[categoryName] = new HierarchyMember();
    }
    for (subcategory in category.children) {
        if (category.children.hasOwnProperty(subcategory)) {
            // add each subcategory as a child of the current category
            categoryHierarchy[categoryName].children.push(subcategory);
            // create hierarchy entries for subcategories
            if (!categoryHierarchy.hasOwnProperty(subcategory)) {
                categoryHierarchy[subcategory] = new HierarchyMember();
            }
            // add the current category as a parent of each subcategory
            categoryHierarchy[subcategory].parentCat = categoryName;
            // recurse
            processCategory(subcategory,
                            category.children[subcategory],
                            categoryIcons[categoryName]);
        }
    }
    // set category visible by default
    visibleCategories[categoryName] = null;
}

function createCheckBox(checkBoxName) {
    'use strict';
    var checkbox = ['<input',
                    'type="checkbox"',
                    'class="categoryToggle"',
                    'id="' + checkBoxName + '"',
                    'checked="checked"',
                    '/>'].join(' ');
    return '<li><label>' + checkbox + checkBoxName + '</label></li>\n';
}

function createCheckboxes(categoryName) {
    'use strict';
    var category,
        subcategory,
        checkBoxHtml = '<ul>\n',
        i;
    category = categoryHierarchy[categoryName];
    checkBoxHtml += createCheckBox(categoryName);
    for (i = 0; i < category.children.length; i += 1) {
        subcategory = category.children[i];
        checkBoxHtml += createCheckboxes(subcategory);
    }
    checkBoxHtml += '</ul>\n';
    return checkBoxHtml;
}

function setCheckboxHandlers() {
    'use strict';
    $('.categoryToggle').on('click', function updateCategories() {
        // clear global variable
        visibleCategories = {};
        // for each checkbox
        $('.categoryToggle').each(function addIfChecked(index, element) {
            if (this.checked) {
                visibleCategories[this.id] = null;
            }
        });
        needUpdate = true;
    });
}

function processData(dataRequest) {
    'use strict';
    var categoryArea = document.getElementById('categories'),
        data = JSON.parse(dataRequest.responseText),
        checkBoxHtml;
    // clear the data structures for storing all the data
    categoryIcons = {};
    categoryFeatures = {};
    categoryHierarchy = {};
    processMapData(data.maps);
    processCategory('Features', data.features, data.features.Icon);
    checkBoxHtml = createCheckboxes('Features');
    categoryArea.innerHTML = checkBoxHtml;
    setCheckboxHandlers();
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

$('#getmapdata').click(function getMapData() {
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
});

$('#zoom_out').click(function zoomOut() {
    'use strict';
    scale = scale * 0.9;
    ctx.setTransform(scale, 0, 0, scale,
                     lastTranslation.x, lastTranslation.y);
    needUpdate = true;
});

$('#zoom_in').click(function zoomOut() {
    'use strict';
    scale = scale * 1.1;
    ctx.setTransform(scale, 0, 0, scale,
                     lastTranslation.x, lastTranslation.y);
    needUpdate = true;
});
