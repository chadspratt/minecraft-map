/*global $ */
var mainApp;

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
        // maybe move this up to processMapData
        this.image.onload = function imageLoaded() {
            // not the best solution
            mainApp.mapCanvas.needUpdate = true;
        };
    } else {
        this.image = null;
    }
    this.contains = function (boundary) {
        return (boundary.left < this.right &&
                boundary.right > this.left &&
                boundary.top < this.bottom &&
                boundary.bottom > this.top);
    };
    this.containsCenterOf = function (boundary) {
        return (boundary.centerX < this.right &&
                boundary.centerX > this.left &&
                boundary.centerY < this.bottom &&
                boundary.centerY > this.top);
    };
    // for checking mouseover
    this.containsPoint = function (x, y) {
        return (x < this.right &&
                x > this.left &&
                y < this.bottom &&
                y > this.top);
    };
    this.squareDistanceFromCenter = function (x, y) {
        var dx = this.centerX - x,
            dy = this.centerY - y;
        return dx * dx + dy * dy;
    };
}

function Category(categoryName) {
    'use strict';
    this.name = categoryName;
    this.image = null;
    this.parent = null;
    this.children = [];
    this.features = {};
    this.visible = true;
}
function HierarchyMember() {
    'use strict';
    this.parentCat = null;
    this.children = [];
}

function MapData() {
    'use strict';
    var self = this;
    this.maps = [];
    this.categories = {};
    this.mapSize = 128 * 8;
    this.boundary = null;

    // orders maps from SE to NW, so that NW will be drawn on top of SE
    // this is to cover "map_x" text in the top left corner of each map
    this.sortMaps = function (a, b) {
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
    };
    this.processMapData = function (mapData) {
        var maxX = -Infinity,
            maxY = -Infinity,
            minX = Infinity,
            minY = Infinity,
            mapBoundary,
            centerX,
            centerY;
        $.each(mapData, function (mapName, map) {
            if (mapData.hasOwnProperty(mapName)) {
                // create and store in an array for ordered drawing later
                mapBoundary = new Boundary(map['X coord'],
                                           map['Z coord'],
                                           self.mapSize, self.mapSize,
                                           map['Image location']);
                self.maps.push(mapBoundary);
                // determine the center of all maps
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
        });
        this.maps.sort(this.sortMaps);
        // map coordinates of the center of the visible map
        centerX = (minX + maxX) / 2;
        centerY = (minY + maxY) / 2;
        // the bounds of all map images
        this.boundary = new Boundary(centerX, centerY,
                                            (maxX - minX),
                                            (maxY - minY),
                                            null);
    };
    // doesn't reference 'this'
    this.processFeatures = function (features, categoryIcon) {
        var featureName,
            feature,
            featureBoundary,
            // return value
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
                    // store as point (0 height and width)
                    featureBoundary = new Boundary(x, y, 0, 0, feature.Icon);
                    featureBoundaries[featureName] = featureBoundary;
                }
            }
        }
        return featureBoundaries;
    };
    this.processCategory = function (categoryName, categoryData, parentIcon) {
        var category = new Category(categoryName);
        // set category icon
        if (categoryData.Icon === null) {
            category.image = parentIcon;
        } else {
            category.image = categoryData.Icon;
        }
        // set category features
        category.features = this.processFeatures(categoryData.features,
                                                 category.image);
        $.each(categoryData.children, function (subcategoryName, subcategory) {
            if (categoryData.children.hasOwnProperty(subcategoryName)) {
                // add each subcategory as a child of the current category
                category.children.push(subcategoryName);
                // recurse, which creates self.categories[subcategoryName]
                self.processCategory(subcategoryName,
                                     subcategory,
                                     category.image);
                // add the current category as a parent of each subcategory
                self.categories[subcategoryName].parent = categoryName;
            }
        });
        this.categories[categoryName] = category;
    };
    this.processData = function (dataJson) {
        var data = JSON.parse(dataJson);
        // clear the data structures for storing all the data
        this.categories = {};
        this.processMapData(data.maps);
        this.processCategory('Features', data.features, data.features.Icon);
        $(this).trigger('dataLoaded');
    };
    this.load = function () {
        // load json from sql database through php
        $.post('http://dogtato.net/mcmap/php/mapData.php',
               {action: 'get'})
            .done(function mapDataReceived(data) {
                self.processData(data);
            });
    };
}

function MapCanvas() {
    'use strict';
    var self = this,
        canvasOffset;
    this.canvas = $('#mapCanvas');
    this.canvasContext = this.canvas[0].getContext('2d');
    canvasOffset = $('#mapCanvas').offset();
    this.x = canvasOffset.left;
    this.y = canvasOffset.top;
    this.mapData = new MapData();
    this.startTranslation = {x: 0, y: 0};
    this.lastTranslation = {x: 0, y: 0};
    this.viewCenter = {x: 0, y: 0};
    this.scale = 1;
    this.boundary = null;
    this.visibleFeatures = {};
    this.featureIconSize = 15;
    this.needUpdate = false;
    this.loadMap = function () {
        this.mapData.load();
        $(this.mapData).on('dataLoaded', function () {
            // set initial transformation
            self.viewCenter = {x: self.mapData.boundary.centerX,
                               y: self.mapData.boundary.centerY};
            // scale to fit all the map images in the canvas
            self.scale = Math.min(
                self.canvas.width() / self.mapData.boundary.width,
                self.canvas.height() / self.mapData.boundary.height
            );
            self.lastTranslation = {
                x: self.canvas.width() / 2 - self.viewCenter.x * self.scale,
                y: self.canvas.height() / 2 - self.viewCenter.y * self.scale
            };
            self.canvasContext.setTransform(self.scale, 0, 0, self.scale,
                                            self.lastTranslation.x,
                                            self.lastTranslation.y);
            self.needUpdate = true;
            $(self).trigger('canvasReady');
        });
    };
    this._clear = function () {
        // clear canvas with a white background
        this.canvasContext.save();
        this.canvasContext.setTransform(1, 0, 0, 1, 0, 0);
        this.canvasContext.fillStyle = '#FFFFFF';
        this.canvasContext.fillRect(0, 0,
                                    this.canvas.width(), this.canvas.height());
        // reapply scale and translation
        this.canvasContext.restore();
    };
    this._drawMaps = function () {
        var mapBoundary,
            i;
        for (i = 0; i < this.mapData.maps.length; i += 1) {
            mapBoundary = this.mapData.maps[i];
            // check that map will be visible
            if (this.boundary.contains(mapBoundary)) {
                this.canvasContext.drawImage(mapBoundary.image,
                                        mapBoundary.left, mapBoundary.top,
                                        mapBoundary.width, mapBoundary.height);
            }
        }
    };
    this._drawFeatures = function () {
        var // divide by scale to keep the icon size constant
            featureSize = self.featureIconSize / this.scale,
            edgeAdjust = featureSize / 2,
            left,
            top;
        // store all features that get drawn
        this.visibleFeatures = {};
        // go through each category that's turned on
        $.each(this.mapData.categories, function (categoryName, category) {
            if (self.mapData.categories.hasOwnProperty(categoryName) &&
                    category.visible) {
                $.each(category.features, function (featureName, feature) {
                    if (category.features.hasOwnProperty(featureName) &&
                            self.boundary.containsCenterOf(feature)) {
                        left = feature.centerX - edgeAdjust;
                        top = feature.centerY - edgeAdjust;
                        // draw the feature
                        self.canvasContext.drawImage(feature.image, left, top,
                                                     featureSize, featureSize);
                        // and store it for checking mouseover
                        self.visibleFeatures[featureName] = feature;
                    }
                });
            }
        });
    };
    // this is executed by setInterval so need to use self within
    this.draw = function () {
        // only redraw when needed (transformation changed, features toggled)
        if (self.needUpdate) {
            self.boundary = new Boundary(self.viewCenter.x, self.viewCenter.y,
                                         self.canvas.width() / self.scale,
                                         self.canvas.height() / self.scale,
                                         null);
            self._clear();
            self._drawMaps();
            self._drawFeatures();
            self.needUpdate = false;
        }
    };
    this.getFeatureNear = function (x, y) {
        var nearbyFeature = null,
            // check for features within 20 pixels (squared for efficiency)
            // divide by scale to get map distance
            nearestDistance = 20 * 20 / this.scale,
            featureDistance;
        if (this.boundary !== null &&
                this.boundary.containsPoint(x, y)) {
            $.each(this.visibleFeatures, function (featureName, feature) {
                if (self.visibleFeatures.hasOwnProperty(featureName)) {
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
    this.startPan = function (pageX, pageY) {
        this.startTranslation = {
            x: pageX - this.x - this.lastTranslation.x,
            y: pageY - this.y - this.lastTranslation.y
        };
    };
    this.continuePan = function (pageX, pageY) {
        var newTranslation = {x: pageX - this.x - this.startTranslation.x,
                              y: pageY - this.y - this.startTranslation.y};
        this.canvasContext.setTransform(this.scale, 0, 0, this.scale,
                                        newTranslation.x, newTranslation.y);
        this.viewCenter = {
            x: (this.canvas.width() / 2 - newTranslation.x) / this.scale,
            y: (this.canvas.height() / 2 - newTranslation.y) / this.scale
        };
        this.needUpdate = true;
    };
    this.endPan = function (pageX, pageY) {
        this.lastTranslation = {
            x: pageX - this.x - this.startTranslation.x,
            y: pageY - this.y - this.startTranslation.y
        };
    };
    this.zoomIn = function () {
        this.scale = this.scale * 1.1;
        this.canvasContext.setTransform(this.scale, 0, 0, this.scale,
                                        this.lastTranslation.x,
                                        this.lastTranslation.y);
        this.viewCenter = {
            x: (this.canvas.width() / 2 - this.lastTranslation.x) / this.scale,
            y: (this.canvas.height() / 2 - this.lastTranslation.y) / this.scale
        };
        this.needUpdate = true;
    };
    this.zoomOut = function () {
        this.scale = this.scale / 1.1;
        this.canvasContext.setTransform(this.scale, 0, 0, this.scale,
                                        this.lastTranslation.x,
                                        this.lastTranslation.y);
        this.viewCenter = {
            x: (this.canvas.width() / 2 - this.lastTranslation.x) / this.scale,
            y: (this.canvas.height() / 2 - this.lastTranslation.y) / this.scale
        };
        this.needUpdate = true;
    };
    this.getMapPosition = function (pageX, pageY) {
        return {
            x: Math.round(
                (pageX - this.x - this.lastTranslation.x) / this.scale
            ),
            y: Math.round(
                (pageY - this.y - this.lastTranslation.y) / this.scale
            )
        };
    };
}

function FeatureInfo() {
    'use strict';
    var self = this;
    this.infoArea = $('#featureinfo');
    // cache data when feature is clicked
    this.infoCache = {};
    // set any links in the feature info to call this.load(link.title)
    this.redirectLinks = function () {
        this.infoArea.find('a').click(function followLink(clickEvent) {
            // don't follow the link
            clickEvent.preventDefault();
            // load the info in #featureinfo
            self.load(this.title);
        });
    };
    // work in progress
    this.redirectForms = function () {
        this.infoArea.find('form').ajaxForm(function formResponse(data) {
            this.infoArea.html(data);
            this.redirectForms();
        });
    };
    this.loadFeatureForm = function (featureName) {
        var pageTitle;
        if (featureName === null) {
            pageTitle = 'AddFeature';
        } else {
            pageTitle = 'Special:FormEdit/Feature/' + featureName;
        }
        $.post('http://dogtato.net/minecraft/index.php',
               {title: pageTitle, action: 'render'})
               // {title: featureName, printable: 'yes'})
            .done(function featureFormLoaded(data) {
                self.infoArea.html(data);
                self.redirectForms();
            });
    };
    this.load = function (featureName) {
        // standardize the case for caching
        var lowercaseName = featureName.toLowerCase();
        if (this.infoCache.hasOwnProperty(lowercaseName)) {
            this.infoArea.html(this.infoCache[lowercaseName]);
            this.redirectLinks();
        } else {
            $.post('http://dogtato.net/minecraft/index.php',
                   {title: featureName, action: 'render'})
                   // {title: featureName, printable: 'yes'})
                .done(function featureInfoLoaded(data) {
                    var header = '<h3>' + featureName + '</h3><br />';
                    self.infoArea.html(header + data);
                    // remove any edit links
                    self.infoArea.find('span.editsection').remove();
                    self.redirectLinks();
                    self.infoCache[lowercaseName] = self.infoArea.html();
                })
                // if page doesn't exist, load a form to create it
                .fail(function featureInfoNotLoaded(e) {
                    var nameEnd,
                        trimmedName;
                    if (e.status === 404) {
                        nameEnd = featureName.indexOf(' (page does not exist)');
                        trimmedName = featureName.slice(0, nameEnd);
                        self.loadFeatureForm(trimmedName);
                    }
                });
        }
    };
}

function MainApp() {
    'use strict';
    var self = this;
    this.mapCanvas = new MapCanvas();
    this.featureInfo = new FeatureInfo();
    this.coordDisplay = $('#coorddisplay');
    this.viewCenter = {x: 0, y: 0};
    this.mouseIsDown = false;
    this.clickedFeature = null;
    // set the handlers for when a category is toggled
    this.setCheckboxHandlers = function () {
        $('.categoryToggle').on('click', function updateCategories() {
            self.mapCanvas.mapData.categories[this.id].visible = this.checked;
            self.mapCanvas.needUpdate = true;
        });
    };
    this.createCheckBox = function (category) {
        var checkbox = ['<input',
                        'type="checkbox"',
                        'class="categoryToggle"',
                        'id="' + category.name + '"',
                        'checked="checked"',
                        '/>'].join(' '),
            image = ['<img',
                     'src="' + category.image + '"',
                     'height=10px',
                     'width=10px',
                     '/>'].join(' '),
            checkboxWithLabel = checkbox + image + category.name;
        return '<li><label>' + checkboxWithLabel + '</label></li>\n';
    };
    this.createCheckboxes = function (categoryName) {
        var category,
            subcategory,
            checkBoxHtml = '<ul>\n',
            i;
        category = this.mapCanvas.mapData.categories[categoryName];
        checkBoxHtml += this.createCheckBox(category);
        for (i = 0; i < category.children.length; i += 1) {
            subcategory = category.children[i];
            checkBoxHtml += this.createCheckboxes(subcategory);
        }
        checkBoxHtml += '</ul>\n';
        return checkBoxHtml;
    };
    this.init = function () {
        this.mapCanvas.loadMap();
        $(this.mapCanvas).on('canvasReady', function () {
            $('#categories').html(self.createCheckboxes('Features'));
            self.setCheckboxHandlers();
            setInterval(self.mapCanvas.draw, 100); // start drawing
        });
    };
    this._setMouseoverBox = function (featureName, x, y) {
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
    this.setCoordDisplay = function (x, z) {
        this.coordDisplay.html('x: ' + x + ' z: ' + z);
    };
    this.startMouse = function (pageX, pageY) {
        var mousePos;
        // check this in case the cursor was released outside the document
        // in which case the event would have been missed
        if (this.mouseIsDown) {
            this.mapCanvas.endPan(pageX, pageY);
        }
        this.mouseIsDown = true;
        this.mapCanvas.startPan(pageX, pageY);
        mousePos = this.mapCanvas.getMapPosition(pageX, pageY);
        this.clickedFeature = this.mapCanvas.getFeatureNear(mousePos.x,
                                                            mousePos.y);
    };
    this.moveMouse = function (pageX, pageY) {
        var mousePos = {x: 0, y: 0},
            nearbyFeature = null;
        // pan the map
        if (this.mouseIsDown) {
            this.mapCanvas.continuePan(pageX, pageY);
        // update cursor coordinates and check against features
        } else {
            mousePos = this.mapCanvas.getMapPosition(pageX,
                                                     pageY);
            this.setCoordDisplay(mousePos.x, mousePos.y);
            nearbyFeature = this.mapCanvas.getFeatureNear(mousePos.x,
                                                          mousePos.y);
        }
        // show feature name in mouse tooltip, or remove tooltip if 
        // nearbyFeature is null
        this._setMouseoverBox(nearbyFeature, pageX, pageY);
        // clear so that click and drags won't cause a feature selection
        this.clickedFeature = null;
    };
    this.endMouse = function (pageX, pageY) {
        // check that the click started on the canvas
        if (this.mouseIsDown) {
            this.mouseIsDown = false;
            this.mapCanvas.endPan(pageX, pageY);
            this.mapCanvas.needUpdate = true;
            if (this.clickedFeature !== null) {
                this.featureInfo.load(this.clickedFeature);
            }
        }
    };
}


$(document).ready(function initialSetup() {
    'use strict';
    mainApp = new MainApp();
    mainApp.init();

    $('#mapCanvas').on({
        'mousedown': function canvasMouseButtonPressed(event) {
            mainApp.startMouse(event.pageX, event.pageY);
        },
        // provided by jquery.mousewheel.js
        'mousewheel': function canvasMouseScrolled(event) {
            if (event.deltaY > 0) {
                mainApp.mapCanvas.zoomIn();
            } else {
                mainApp.mapCanvas.zoomOut();
            }
        }
    });
    $(document.body).on({
        'mousemove': function bodyMouseover(event) {
            mainApp.moveMouse(event.pageX, event.pageY);
        },
        'mouseup': function bodyMouseup(event) {
            mainApp.endMouse(event.pageX, event.pageY);
        }
    });
    // reload map data from the database
    // different call for debugging
    // $('#getmapdata').on('click', function reloadMap() {
    //     mainApp.init();
    // });
    $('#getmapdata').on('click', mainApp.mapCanvas.mapData.load);
    $('#zoom_out').on('click', function zoomOut() {
        mainApp.mapCanvas.zoomOut();
    });
    $('#zoom_in').on('click', function zoomIn() {
        mainApp.mapCanvas.zoomIn();
    });
    $('#addFeature').on('click', function loadAddFeatureForm() {
        mainApp.featureInfo.loadFeatureForm(null);
    });
});
