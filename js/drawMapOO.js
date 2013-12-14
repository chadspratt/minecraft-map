/*global $ */
var featureIconSize = 10,
    featureInfo = {},
    isDown = false,
    scale = 1,
    needUpdate = false,
    visibleBoundary = null,
    clickedFeature = null;

function Category(categoryName) {
    'use strict';
    this.name = categoryName;
    this.image = null;
    this.parent = null;
    this.children = [];
    this.features = {};
    this.visible = true;
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
    if (image !== null) {
        this.image = document.createElement('img');
        this.image.src = image;
        this.image.onload = function imageLoaded() {
            needUpdate = true;
        };
    } else {
        this.image = null;
    }
    this.contains = function contains(boundary) {
        return (boundary.left < this.right &&
                boundary.right > this.left &&
                boundary.top < this.bottom &&
                boundary.bottom > this.top);
    };
    // for checking mouseover
    this.containsPoint = function containsPoint(x, y) {
        return (x < this.right &&
                x > this.left &&
                y < this.bottom &&
                y > this.top);
    };
    this.squareDistanceFromCenter = function squareDistanceFromCenter(x, y) {
        var dx = this.centerX - x,
            dy = this.centerY - y;
        return dx * dx + dy * dy;
    };
}

function Transformation() {
    'use strict';
    this.startTranslation = {x: 0, y: 0};
    this.currentTranslation = {x: 0, y: 0};
    this.lastTranslation = {x: 0, y: 0};
    this.scale = 1;
}

function MapCanvas() {
    'use strict';
    this.canvas = $('#mapCanvas');
    this.canvasContext = this.canvas.getContext('2d');
    var canvasOffset = $('#mapCanvas').offset();
    // this is off by about 5 pixels, 
    this.x = canvasOffset.left + 5;
    this.y = canvasOffset.top + 5;
    this.startTranslation = {x: 0, y: 0};
    this.lastTranslation = {x: 0, y: 0};
    this.viewCenter = {x: 0, y: 0};
    this.scale = 1;
    this.transformation = new Transformation();
    this.boundary = null;
    this.maps = [];
    this.categories = {};
    this.visibleFeatures = {};
    this.needUpdate = false;

    this._clear = function _clear() {
        // clear canvas with a white background
        this.canvasContext.save();
        this.canvasContext.setTransform(1, 0, 0, 1, 0, 0);
        this.canvasContext.fillStyle = '#FFFFFF';
        this.canvasContext.fillRect(0, 0,
                                    this.canvas.width, this.canvas.height);
        // reapply scale and translation
        this.canvasContext.restore();
    };

    this._drawMaps = function _drawMaps() {
        // var mapBoundary,
        //     i;
        this.maps.forEach(function drawMap(mapBoundary) {
            if (this.boundary.contains(mapBoundary)) {
                this.canvasContext.drawImage(mapBoundary.image,
                                        mapBoundary.left, mapBoundary.top,
                                        mapBoundary.width, mapBoundary.height);
            }
        });
        // for (i = 0; i < this.maps.length; i += 1) {
        //     mapBoundary = this.maps[i];
        //     // check that map will be visible
        //     if (this.boundary.contains(mapBoundary)) {
        //         this.canvasContext.drawImage(mapBoundary.image,
        //                                 mapBoundary.left, mapBoundary.top,
        //                                 mapBoundary.width, mapBoundary.height);
        //     }
        // }
    };

    this._drawFeatures = function _drawFeatures() {
        // store all features that get drawn
        this.visibleFeatures = {};
        // go through each category that's turned on
        $.each(this.categories, function (categoryName, category) {
            if (this.categories.hasOwnProperty(categoryName) &&
                    category.visible) {
                $.each(category.features, function (featureName, feature) {
                    if (category.features.hasOwnProperty(featureName) &&
                            this.boundary.contains(feature)) {
                        // draw the feature
                        this.canvasContext.drawImage(feature.image,
                                                feature.left,
                                                feature.top,
                                                // divide by scale to keep size constant
                                                feature.width / scale,
                                                feature.height / scale);
                        // and store it for checking mouseover
                        this.visibleFeatures[featureName] = feature;
                    }
                });
            }
        });
    };

    this.draw = function draw() {
        // only redraw when needed (transformation changed, features added)
        if (this.needUpdate) {
            this.boundary = new Boundary(this.viewCenter.x, this.viewCenter.y,
                                         this.canvas.width / scale,
                                         this.canvas.height / scale,
                                         null);
            this._clear();
            this._drawMaps();
            this._drawFeatures();
            this.needUpdate = false;
        }
    };

    this.getFeatureNear = function getFeatureNear(x, y) {
        var nearbyFeature = null,
            // check for features within 20 pixels (squared for efficiency)
            // divide by scale to get map distance
            nearestDistance = 20 * 20 / scale,
            featureDistance;
        if (this.boundary !== null &&
                this.boundary.containsPoint(x, y)) {
            $.each(this.visibleFeatures, function (featureName, feature) {
                if (this.visibleFeatures.hasOwnProperty(featureName)) {
                    featureDistance = feature.squareDistanceFromCenter(x, y);
                    if (featureDistance < nearestDistance) {
                        nearestDistance = featureDistance;
                        nearbyFeature = featureName;
                    }
                }
            });
        }
        return nearbyFeature;
    };

    this.startPan = function startPan(pageX, pageY) {
        this.startTranslation = {
            x: pageX - this.x - this.lastTranslation.x,
            y: pageY - this.y - this.lastTranslation.y
        };
    };

    this.continuePan = function continuePan(pageX, pageY) {
        var newTranslation = {x: pageX - this.x - this.startTranslation.x,
                              y: pageY - this.y - this.startTranslation.y};
        this.canvasContext.setTransform(scale, 0, 0, scale,
                                        newTranslation.x, newTranslation.y);
        this.viewCenter = {x: (this.canvas.width / 2 - newTranslation.x) / this.scale,
                      y: (this.canvas.height / 2 - newTranslation.y) / this.scale};
        this.needUpdate = true;
    };

    this.endPan = function endPan(pageX, pageY) {
        this.lastTranslation = {
            x: pageX - this.x - this.startTranslation.x,
            y: pageY - this.y - this.startTranslation.y
        };
    };

    this.getMapPosition = function getMapPosition(pageX, pageY) {
        return {
            x: Math.round((pageX - this.x - this.lastTranslation.x) / this.scale),
            y: Math.round((pageY - this.y - this.lastTranslation.y) / this.scale)
        };
    };
}

function MainApp() {
    'use strict';
    this.mapCanvas = new MapCanvas();
    this.coordDisplay = $('#coorddisplay');
    this.viewCenter = {x: 0, y: 0};
    this.mouseIsDown = false;
    this.clickedFeature = null;

    this._setMouseoverBox = function setMouseoverBox(featureName, x, y) {
        var $mouseoverBox = $('#mouseoverbox');
        if (featureName === null) {
            $mouseoverBox.css('left', -1000);
            $mouseoverBox.css('top', -1000);
        } else {
            $mouseoverBox.html(featureName);
            $mouseoverBox.css('left', x);
            $mouseoverBox.css('top', y - 30);
        }
    };

    this.setFeatureInfo = function setFeatureInfo(featureName) {
        var self = this;
        $.post('http://dogtato.net/minecraft/index.php',
               {title: featureName, action: 'render'})
               // {title: featureName, printable: 'yes'})
            .done(function fillFeatureInfoBox(data) {
                var header = '<h3>' + featureName + '</h3><br />';
                $('#featureinfo').html(header + data);
                // for all links in the new text
                $('#featureinfo a').click(function followLink(clickEvent) {
                    // don't follow the link
                    clickEvent.preventDefault();
                    // call the grandparent function with the link text
                    self.setFeatureInfo(this.text());
                });
            });
    };

    this.setCoordDisplay = function setCoordDisplay(x, z) {
        this.coordDisplay.html('x: ' + x + ' z: ' + z);
    };

    // may need to define another function to call inside the handler in order
    // for 'this' to point to the MainApp instance
    $(document.body).on({
        'mouseover': function moveMouse(event) {
            var mousePos = {x: 0, y: 0},
                nearbyFeature = null;
            // pan the map
            if (this.mouseIsDown) {
                this.mapCanvas.continuePan(event.pageX, event.pageY);
            // update cursor coordinates and check against features
            } else {
                mousePos = this.mapCanvas.getMapPosition(event.pageX,
                                                         event.pageY);
                this.setCoordDisplay(mousePos.x, mousePos.y);
                nearbyFeature = this.mapCanvas.getFeatureNear(mousePos.x,
                                                              mousePos.y);
            }
            // show feature name in mouse tooltip, or remove tooltip if 
            // nearbyFeature is null
            this._setMouseoverBox(nearbyFeature, event.pageX, event.pageY);
            // clear so that click and drags won't cause a feature selection
            this.clickedFeature = null;
        },
        'mouseup': function mouseButtonReleased(event) {
            // check that the click started on the canvas
            if (this.mouseIsDown) {
                this.mouseIsDown = false;
                this.mapCanvas.endPan(event.pageX, event.pageY);
                this.mapCanvas.needUpdate = true;
                if (this.clickedFeature !== null) {
                    this.setFeatureInfo(this.clickedFeature);
                }
            }
        }
    });

    // may need to define another function to call inside the handler in order
    // for 'this' to point to the MainApp instance
    this.mapCanvas.canvas.on('mousedown', function mouseButtonPressed(event) {
        var mousePos;
        // check this in case the cursor was released outside the document
        // in which case the event would have been missed
        if (this.mouseIsDown) {
            this.mapCanvas.endPan(event.pageX, event.pageY);
        }
        this.mouseIsDown = true;
        this.mapCanvas.startPan(event.pageX, event.pageY);
        mousePos = this.mapCanvas.getMapPosition(event.pageX, event.pageY);
        this.clickedFeature = this.mapCanvas.getFeatureNear(mousePos.x,
                                                            mousePos.y);
    });
}

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
    canvasContext.setTransform(scale, 0, 0, scale, lastTranslation.x, lastTranslation.y);
}

function processFeatures(features, categoryIcon) {
    'use strict';
    var featureName,
        feature,
        featureBoundary,
        featureBoundaries = {},
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
                                               featureIconSize, featureIconSize,
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

// set the handlers for when a category is toggled
function setCheckboxHandlers() {
    'use strict';
    $('.categoryToggle').on('click', function updateCategories() {
        // clear global variable that stores active categories
        visibleCategories = {};
        // for each checkbox
        $('.categoryToggle').each(function addIfChecked(index, element) {
            if (element.checked) {
                visibleCategories[element.id] = null;
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

function getMapData() {
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
}

$('#getmapdata').click(getMapData);

$('#zoom_out').click(function zoomOut() {
    'use strict';
    scale = scale / 1.1;
    canvasContext.setTransform(scale, 0, 0, scale,
                               lastTranslation.x, lastTranslation.y);
    viewCenter = {x: (canvas.width / 2 - lastTranslation.x) / scale,
                  y: (canvas.height / 2 - lastTranslation.y) / scale};
    needUpdate = true;
});

$('#zoom_in').click(function zoomIn() {
    'use strict';
    scale = scale * 1.1;
    canvasContext.setTransform(scale, 0, 0, scale,
                     lastTranslation.x, lastTranslation.y);
    needUpdate = true;
});

$(document).ready(function initialSetup() {
    'use strict';
    var mainApp = new MainApp();
    var canvasOffset = $('#mapCanvas').offset();
    // this is off by about 5 pixels, 
    canvasPosition = {x: canvasOffset.left + 5, y: canvasOffset.top + 5};
    getMapData();
});
