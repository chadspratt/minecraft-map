/*global $ */
var mainApp,
    // used for a popup for adding/editing wiki data
    editWindow = null,
    wikiPath = 'http://dogtato.net/minecraft/index.php',
    mapPath = 'http://dogtato.net/mcmap';

function Boundary(centerX, centerY, width, height) {
    'use strict';
    this.centerX = centerX;
    this.centerY = centerY;
    this.width = width;
    this.height = height;
    this.left = centerX - width / 2;
    this.right = this.left + width;
    this.top = centerY - height / 2;
    this.bottom = this.top + height;
}

function MapImagery(centerX, centerY, zoomLevel, imageURL) {
    'use strict';
    var self = this,
        mapSize = 128 * Math.pow(2, zoomLevel);
    this.ready = false;
    this.boundary = new Boundary(centerX, centerY, mapSize, mapSize);
    this.zoomLevel = zoomLevel;
    this.image = document.createElement('img');
    this.image.src = imageURL;
}

function Feature(x, y, imageURL) {
    'use strict';
    var self = this;
    this.ready = false;
    this.image = document.createElement('img');
    this.image.onload = function () {
        self.boundary = new Boundary(x, y, this.width, this.height);
        self.ready = true;
        mainApp.mapSVG.needUpdate = true;
    };
    this.image.src = imageURL;
}

function Category(categoryName) {
    'use strict';
    this.name = categoryName;
    this.image = null;
    this.parent = null;
    this.children = [];
    this.features = {};
    this.isVisible = true;
}
function HierarchyMember() {
    'use strict';
    this.parentCat = null;
    this.children = [];
}
function AddOrEditForm() {
    'use strict';
    var self = this;
    this.formArea = $('#editPrompt');
}
function FeatureInfo(selector) {
    'use strict';
    var self = this;
    this.infoWindow = d3.select(selector);
    this.infoArea = $(selector);
    this.featureName = null;
    // positioning relative to the feature icon
    this.offset = {
        x: 10,
        y: -5
    };
    this.initialPosition = null;
    this.lastPosition = null;
    // set any links in the feature info to call this.load(link.title)
    this.redirectLinks = function () {
        this.infoArea.find('.featureInfoBody a').click(function followLink(clickEvent) {
            // don't follow the link
            clickEvent.preventDefault();
            // load the info in #featureinfo
            self.load(this.title);
        });
    };
    // XXX this doesn't really have anything to do with the rest of the class
    // but i'm going to redo it soon anyways
    this.loadForm = function (formName) {
        var instructions,
            initialValue = '',
            extraInput = '',
            form,
            formArea = $('#editPrompt');
        if (formName === 'Map') {
            initialValue = 'Map_';
        } else if (formName === 'Feature_Category') {
            extraInput = '<input type="hidden" value="Category" name="namespace" />';
        }
        // preliminary form to ask for the name of the data to create/edit
        form = ['<form action="' + wikiPath + '?title=Special:FormStart" method="get">',
                    '<input size="25" value="' + initialValue + '" class="formInput" name="page_name" />',
                    '<input type="hidden" value="Special:FormStart" name="title" />',
                    '<input type="hidden" value="' + formName + '" name="form" />',
                    extraInput,
                    '<input type="submit" value="Create or edit" />',
                '</form>'].join(' ');
        if (formName === 'Map') {
            instructions = 'Map number:';
        } else if (formName === 'Feature') {
            instructions = 'Feature name:';
        } else if (formName === 'Feature_Category') {
            instructions = 'Category name:';
        }
        formArea.html(instructions + form);
        formArea.slideDown(100);
        formArea.find('form').ajaxForm(function formResponse (data) {
            var pageName = data.match(/index\.php\?title\=([^"]+)/)[1],
                fullurl = wikiPath + '?title=' + pageName;
            // global editWindow
            if (editWindow === null || editWindow.closed) {
                editWindow = window.open(fullurl,
                                         'editWindow',"width=800,height=700");
            } else {
                editWindow.location.href = fullurl;
                editWindow.focus();
            }
            // could use this on the form that's loaded to show the update
            // on the map immediately
            // this.infoArea.find('form').ajaxForm(function formResponse (data) {
        });
    };
    this.load = function (featureName, pageX, pageY) {
        this.featureName = featureName;
        // save position so it can be adjusted during panning
        this.initialPosition = {
            x: pageX,
            y: pageY
        };
        this.lastPosition = {
            x: pageX,
            y: pageY
        };
        this.infoWindow
            .style('left', (pageX + this.offset.x) + 'px')
            .style('top', (pageY + this.offset.y) + 'px');
        // standardize the case for caching
        var lowercaseName = featureName.toLowerCase();
        this.infoWindow.select('.featureInfoTitle').html(featureName);
        this.infoWindow.select('.featureInfoBody').html('');
        this.infoWindow.select('.featureInfoOpen')
            .attr('href', wikiPath + '?title=' + this.featureName);
        if (mainApp.infoCache.hasOwnProperty(lowercaseName)) {
            this.infoArea.html(mainApp.infoCache[lowercaseName]);
            this.redirectLinks();
        } else {
            $.post(wikiPath,
                   {title: featureName, action: 'render'})
                   // {title: featureName, printable: 'yes'})
                .done(function featureInfoLoaded(data) {
                    self.infoWindow.select('.featureInfoBody').html(data);
                    // remove any edit links
                    self.infoArea.find('span.editsection').remove();
                    self.redirectLinks();
                    mainApp.infoCache[lowercaseName] = self.infoArea.html();
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
    this.loadEditFormForCurrentFeature = function () {
        var editURL = wikiPath + '?title=' + this.featureName + '&action=formedit';
        $.post(wikiPath,
               {title: this.featureName,
                action: 'formedit'})
            .done(function featureEditFormLoaded(data) {
                // insert just the form
                var editForm = $(data).find('#sfForm');
                editForm.attr('action', editURL);
                self.infoArea.find('.featureInfoBody').html(editForm);
                // when the form is submitted, show the result
                editForm.ajaxForm(function formResponse (data) {
                    // self.infoWindow.select('.featureInfoBody').html(data);
                    self.infoArea.find('.featureInfoBody').html($(data).find('#mw-content-text'));
                    // remove any edit links
                    self.infoArea.find('span.editsection').remove();
                    self.redirectLinks();
                    mainApp.infoCache[self.featureName.toLowerCase()] = self.infoArea.html();
                });
            });
    };
    this.pan = function (delta) {
        if (this.initialPosition !== null) {
            this.lastPosition = {
                x: this.initialPosition.x + delta.x,
                y: this.initialPosition.y + delta.y
            };
            this.infoWindow
                .style('left', (this.lastPosition.x + this.offset.x) + 'px')
                .style('top', (this.lastPosition.y + this.offset.y) + 'px');
        }
    };
    // XXX the box drifts away from the icon when zoomIng in for some reason
    this.zoom = function (pageX, pageY, zoomFactor) {
        if (this.lastPosition !== null) {
            this.lastPosition.x += (this.lastPosition.x - pageX) * (zoomFactor - 1);
            this.lastPosition.y += (this.lastPosition.y - pageY) * (zoomFactor - 1);
            this.infoWindow
                .style('left', (this.lastPosition.x + this.offset.x) + 'px')
                .style('top', (this.lastPosition.y + this.offset.y) + 'px');
        }
        this.savePosition();
    };
    this.savePosition = function () {
        if (this.lastPosition !== null) {
            this.initialPosition = {
                x: this.lastPosition.x,
                y: this.lastPosition.y
            };
        }
    };
    this.close = function () {
        this.initialPosition = null;
        this.lastPosition = null;
        this.infoWindow
            .style('left', '-1000px')
            .style('top', '-1000px');
    };
}

function MapData() {
    'use strict';
    var self = this;
    this.maps = [];
    this.categories = {};
    this.boundary = null;

    this.sortMaps = function (a, b) {
        var comparator = 0;
        // draw low zoom[out] maps above high
        if (a.zoomLevel !== b.zoomLevel) {
            comparator = b.zoomLevel - a.zoomLevel;
        // orders maps from SE to NW, so that NW will be drawn on top of SE
        // for legacy maps that have text in the upper left corner
        } else {
            // compare based on the coordinates with a bigger difference
            if (Math.abs(a.boundary.left - b.boundary.left) >
                    Math.abs(a.boundary.top - b.boundary.top)) {
                // sort descending (east to west)
                comparator =  b.boundary.left - a.boundary.left;
            } else {
                // sort descending (south to north)
                comparator = b.boundary.top - a.boundary.top;
            }
        }
        return comparator;
    };
    this.processMapData = function (mapData) {
        var maxX = -Infinity,
            maxY = -Infinity,
            minX = Infinity,
            minY = Infinity,
            mapImage,
            centerX,
            centerY;
        $.each(mapData, function (mapName, map) {
            if (mapData.hasOwnProperty(mapName)) {
                mapImage = new MapImagery(map['X coord'],
                                          map['Z coord'],
                                          map['Zoom level'],
                                          map['Image location']);
                // store in an array for ordered drawing later
                self.maps.push(mapImage);
                // determine the center of all maps
                if (mapImage.boundary.right > maxX) {
                    maxX = mapImage.boundary.right;
                }
                if (mapImage.boundary.left < minX) {
                    minX = mapImage.boundary.left;
                }
                if (mapImage.boundary.bottom > maxY) {
                    maxY = mapImage.boundary.bottom;
                }
                if (mapImage.boundary.top < minY) {
                    minY = mapImage.boundary.top;
                }
            }
        });
        this.maps.sort(this.sortMaps);
        // map coordinates of the center of the visible map
        centerX = (minX + maxX) / 2;
        centerY = (minY + maxY) / 2;
        // the bounds of all map images
        this.boundary = new Boundary(centerX, centerY,
                                     maxX - minX, maxY - minY);
    };
    // doesn't reference 'this'
    this.processFeatures = function (featureData, categoryIcon) {
        var featureName,
            feature,
            featureBoundary,
            // return value
            features = {},
            x,
            y;
        for (featureName in featureData) {
            if (featureData.hasOwnProperty(featureName)) {
                feature = featureData[featureName];
                x = feature['X coord'];
                // minecraft stores N/S as z
                y = feature['Z coord'];
                // ignore features without coordinates
                if (x !== null && y !== null) {
                    if (feature.Icon === null) {
                        feature.Icon = categoryIcon;
                    }
                    features[featureName] = new Feature(x, y,
                                                        feature.Icon);
                }
            }
        }
        return features;
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
        this.maps = [];
        this.processMapData(data.maps);
        this.processCategory('Features', data.features, data.features.Icon);
        $(this).trigger('dataLoaded');
    };
    this.load = function () {
        // load json from sql database through php
        $.post(mapPath + '/php/mapData.php',
               {action: 'get'})
            .done(function mapDataReceived(data) {
                self.processData(data);
            });
    };
    this.update = function () {
        // load json from sql database through php
        $.post(mapPath + '/php/mapData.php',
               {action: 'update'})
            .done(function mapDataReceived(data) {
                self.processData(data);
            });
    };
}

function MapSVG() {
    'use strict';
    var self = this;
    // set in init()
    this.svg = null;
    this.x = null;
    this.y = null;
    this.svgWidth = null;
    this.svgHeight = null;
    this.mapData = null;
    this.featureGroups = {};

    this.viewBox = {left: 0,
                    top: 0,
                    width: 0,
                    height: 0};

    this.scale = 0;
    this.boundary = null;
    this.featureIconSize = 15;
    this.needUpdate = false;
    this.featureClicked = false;

    this.resizeSVG = function () {
        // http://stackoverflow.com/a/16265661/225730
        var w = window,
            d = document,
            e = d.documentElement,
            g = d.getElementsByTagName('body')[0];

        self.svgWidth = (w.innerWidth || e.clientWidth || g.clientWidth) - 2;
        self.svgHeight = (w.innerHeight || e.clientHeight || g.clientHeight) - 2;

        self.svg.attr("width", self.svgWidth)
                   .attr("height", self.svgHeight);
        if (self.scale !== 0) {
            self.viewBox.left -= (self.svgWidth / self.scale - self.viewBox.width) / 2;
            self.viewBox.top -= (self.svgHeight / self.scale - self.viewBox.height) / 2;
            self.viewBox.width = self.svgWidth / self.scale;
            self.viewBox.height = self.svgHeight / self.scale;
            self.svg.attr('viewBox', function() {
                return self.viewBox.left + ' ' +
                       self.viewBox.top + ' ' +
                       self.viewBox.width + ' ' +
                       self.viewBox.height;
            });
        }
    };
    // resize feature icons so they stay the same size on the screen
    this.scaleFeatures = function () {
        var featureSize,
            featureWidth,
            featureHeight;
        if (self.scale !== 0) {
            featureSize = self.featureIconSize / self.scale;
            d3.selectAll('#featureGroup image')
                .attr('width', function (d) {
                    if (d.feature.boundary.width > d.feature.boundary.height) {
                        featureWidth = featureSize;
                    }
                    else {
                        featureWidth = featureSize * d.feature.boundary.width / d.feature.boundary.height;
                    }
                    return featureWidth;
                })
                .attr('height', function (d) {
                    if (d.feature.boundary.width > d.feature.boundary.height) {
                        featureHeight = featureSize;
                    }
                    else {
                        featureHeight = featureSize * d.feature.boundary.height / d.feature.boundary.width;
                    }
                    return featureHeight;
                })
                .attr('x', function (d) {
                    return d.feature.boundary.centerX - featureWidth / 2;
                })
                .attr('y', function (d) {
                    return d.feature.boundary.centerY - featureHeight / 2;
                });
        }
    };
    this.init = function () {
        var canvasOffset;
        this.svg = d3.select('#mapSVG');
        this.resizeSVG();
        window.onresize = this.resizeSVG;
        canvasOffset = $('#mapSVG').offset();
        this.x = canvasOffset.left;
        this.y = canvasOffset.top;
        this.mapData = new MapData();
    };
    this.loadMap = function () {
        this.mapData.load();
        $(this.mapData).on('dataLoaded', function mapDataLoaded() {
            self.scale = Math.min(self.svgHeight / self.mapData.boundary.height,
                                  self.svgWidth / self.mapData.boundary.width);
            self.viewBox = {left: self.mapData.boundary.left,
                            top: self.mapData.boundary.top,
                            width: self.mapData.boundary.width,
                            height: self.mapData.boundary.height};
            self.svg.attr('viewBox', function() {
                return self.viewBox.left + ' ' +
                       self.viewBox.top + ' ' +
                       self.viewBox.width + ' ' +
                       self.viewBox.height;
            });
            self.resizeSVG();
            self.needUpdate = true;
            $(self).trigger('canvasReady');
        });
    };
    this._drawMaps = function () {
        var mapImagery,
            i;
        d3.select('#mapImageGroup').selectAll('image')
            .data(this.mapData.maps)
          .enter().append('image')
            .attr('xlink:href', function (d) {
                return d.image.src;
            })
            .attr('x', function (d) {
                return d.boundary.left;
            })
            .attr('y', function (d) {
                return d.boundary.top;
            })
            .attr('width', function (d) {
                return d.boundary.width;
            })
            .attr('height', function (d) {
                return d.boundary.height;
            });
    };
    this._drawFeatures = function () {
        var featureSize = this.featureIconSize / this.scale,
            featureWidth,
            featureHeight,
            categories,
            features,
            mouseoverBox = d3.select("#mouseoverBox");
        categories = d3.select('#featureGroup').selectAll('g')
            .data(function convertCategoriesToArray() {
                var categoryArray = [];
                $.each(self.mapData.categories, function (categoryName, category) {
                    if (self.mapData.categories.hasOwnProperty(categoryName)) {
                        categoryArray.push({'name': categoryName,
                                            'features': category.features});
                    }
                });
                return categoryArray;
            });
        categories.enter().append('g');
        categories.each(function (d) {
                // store a reference to the element for toggling it later
                self.featureGroups[d.name] = d3.select(this);
        });
        features = categories.selectAll('image')
            .data(function (d) {
                var featureArray = [];
                $.each(d.features, function (featureName, feature) {
                    if (d.features.hasOwnProperty(featureName) &&
                            feature.ready) {
                        featureArray.push({'name': featureName,
                                           'feature': feature});
                    }
                });
                return featureArray;
            });
        features.enter().append('image')
            .attr('xlink:href', function (d) {
                return d.feature.image.src;
            })
            // scale so the largest dimension is featureSize
            .attr('width', function (d) {
                if (d.feature.boundary.width > d.feature.boundary.height) {
                    featureWidth = featureSize;
                }
                else {
                    featureWidth = featureSize * d.feature.boundary.width / d.feature.boundary.height;
                }
                return featureWidth;
            })
            .attr('height', function (d) {
                if (d.feature.boundary.width > d.feature.boundary.height) {
                    featureHeight = featureSize;
                }
                else {
                    featureHeight = featureSize * d.feature.boundary.height / d.feature.boundary.width;
                }
                return featureHeight;
            })
            .attr('x', function (d) {
                return d.feature.boundary.centerX - featureWidth / 2;
            })
            .attr('y', function (d) {
                return d.feature.boundary.centerY - featureHeight / 2;
            });
        features.exit().remove();
        features.on('mouseenter', function (d) {
            mouseoverBox
                .text(d.name);
        });
        features.on('mousemove', function () {
            mouseoverBox
                .style('left', d3.event.pageX + 'px')
                .style('top', (d3.event.pageY - 30) + 'px');
        });
        features.on('mouseleave', function () {
            mouseoverBox
                .style('left', '-1000px')
                .style('top', '-1000px');
        });
        features.on('mousedown', function () {
            self.featureClicked = true;
        });
        features.on('mouseup', function (d) {
            if (self.featureClicked) {
                self.featureClicked = false;
                mainApp.boundFeatureInfo.load(d.name,
                                              d3.event.pageX,
                                              d3.event.pageY);
            }
        });
    };
    this.draw = function () {
        if (self.needUpdate) {
            self.needUpdate = false;
            self._drawMaps();
            self._drawFeatures();
            d3.selectAll('image').on('dragstart', function () {
                d3.event.preventDefault();
            });
        }
    };
    this.toggleFeatureGroup = function (name) {
        self.featureGroups[name].classed('hiddenFeatureGroup', function (d) {
            return !d3.select(this).classed('hiddenFeatureGroup');
        });
    };
    this.startPan = function (pageX, pageY) {
        this.startTranslation = {
            x: pageX,
            y: pageY
        };
        this.viewBoxStart = {
            left: this.viewBox.left,
            top: this.viewBox.top
        };
    };
    this.continuePan = function (pageX, pageY) {
        var mouseDelta = {
            x: pageX - this.startTranslation.x,
            y: pageY - this.startTranslation.y};
        this.viewBox.left = this.viewBoxStart.left - mouseDelta.x / this.scale;
        this.viewBox.top = this.viewBoxStart.top - mouseDelta.y / this.scale;
        self.svg.attr('viewBox', function() {
            return self.viewBox.left + ' ' +
                   self.viewBox.top + ' ' +
                   self.viewBox.width + ' ' +
                   self.viewBox.height;
        });
        mainApp.boundFeatureInfo.pan(mouseDelta);
        // distinguish pans from clicks
            self.featureClicked = false;
    };
    this.endPan = function (pageX, pageY) {
        this.lastTranslation = {
            x: pageX - this.x - this.startTranslation.x,
            y: pageY - this.y - this.startTranslation.y
        };
        mainApp.boundFeatureInfo.savePosition();
    };
    this.zoomIn = function (pageX, pageY) {
        var zoomFactor = 1.1;
        this.scale *= zoomFactor;
        this.viewBox.left += (pageX - this.x) / this.scale * (zoomFactor - 1);
        this.viewBox.top += (pageY - this.y) / this.scale * (zoomFactor - 1);
        this.viewBox.width = this.viewBox.width / zoomFactor;
        this.viewBox.height = this.viewBox.height / zoomFactor;
        this.svg.attr('viewBox', function() {
            return self.viewBox.left + ' ' +
                   self.viewBox.top + ' ' +
                   self.viewBox.width + ' ' +
                   self.viewBox.height;
        });
        self.scaleFeatures();
        mainApp.boundFeatureInfo.zoom(pageX, pageY, zoomFactor);
    };
    this.zoomOut = function (pageX, pageY) {
        var zoomFactor = 1 / 1.1;
        this.scale *= zoomFactor;
        this.viewBox.left = this.viewBox.left + (pageX - this.x) / this.scale * (zoomFactor - 1);
        this.viewBox.top = this.viewBox.top + (pageY - this.y) / this.scale * (zoomFactor - 1);
        this.viewBox.width = this.viewBox.width / zoomFactor;
        this.viewBox.height = this.viewBox.height / zoomFactor;
        this.svg.attr('viewBox', function() {
            return self.viewBox.left + ' ' +
                   self.viewBox.top + ' ' +
                   self.viewBox.width + ' ' +
                   self.viewBox.height;
        });
        self.scaleFeatures();
        mainApp.boundFeatureInfo.zoom(pageX, pageY, zoomFactor);
    };
    this.getMapPosition = function (pageX, pageY) {
        return {
            x: Math.round(this.viewBox.left + pageX / this.scale),
            y: Math.round(this.viewBox.top + pageY / this.scale)
        };
    };
}

function MainApp() {
    'use strict';
    var self = this;
    this.mapSVG = null;
    this.coordDisplay = null;
    this.boundFeatureInfo = null;

    // cache data when feature is clicked
    this.infoCache = {};
    // set the handlers for when a category is toggled
    this.setCheckboxHandlers = function () {
        $('.categoryToggle').on('click', function updateCategories() {
            self.mapSVG.toggleFeatureGroup(this.id);
        });
    };
    this.createCheckboxList = function (featureCategoryLists) {
        var item = featureCategoryLists.append('li');
        var checkbox = item.append('input')
            .attr('type', 'checkbox')
            .classed('categoryToggle', true)
            .attr('id', function (d) { return d; })
            .attr('checked', 'checked');
        var image = item.append('img')
            .attr('src', function (d) {
                return self.mapSVG.mapData.categories[d].image;
            })
            .attr('height', '10px')
            .attr('width', '10px');
        var label = item.append('label')
            .attr('for', function (d) { return d; })
            .text(function (d) { return d; });
        var children = featureCategoryLists.selectAll('ul')
            .data(function (d) {
                return self.mapSVG.mapData.categories[d].children;
            })
          .enter().append('ul');
        if (!children.empty()) {
            this.createCheckboxList(children);
        }
    };
    this.createCheckboxes = function () {
        var rootFeature = d3.select('#layerList').selectAll('ul').data(['Features'])
            .enter().append('ul');
        this.createCheckboxList(rootFeature);
        this.setCheckboxHandlers();
    };
    this.init = function () {
        this.mapSVG = new MapSVG();
        this.mapSVG.init();
        this.boundFeatureInfo = new FeatureInfo('#boundFeatureInfo');
        this.coordDisplay = $('#coordDisplay');
        this.mapSVG.loadMap();
        $(this.mapSVG).on('canvasReady', function mapSVGReady() {
            self.createCheckboxes();
            self.mapSVG.draw();
            setInterval(self.mapSVG.draw, 100); // start drawing
        });
    };
    this.setCoordDisplay = function (x, z) {
        this.coordDisplay.html('x: ' + x + ' z: ' + z);
    };
    this.startMouse = function (pageX, pageY) {
        var mousePos;
        // check this in case the cursor was released outside the document
        // in which case the event would have been missed
        if (this.mouseIsDown) {
            this.mapSVG.endPan(pageX, pageY);
        }
        this.mouseIsDown = true;
        this.mapSVG.startPan(pageX, pageY);
    };
    this.moveMouse = function (pageX, pageY) {
        var mousePos = {x: 0, y: 0},
            nearbyFeature = null;
        // pan the map
        if (this.mouseIsDown) {
            this.mapSVG.continuePan(pageX, pageY);
        // update cursor coordinates
        } else {
            mousePos = this.mapSVG.getMapPosition(pageX,
                                                     pageY);
            this.setCoordDisplay(mousePos.x, mousePos.y);
        }
    };
    this.endMouse = function (pageX, pageY) {
        // check that the click started on the canvas
        if (this.mouseIsDown) {
            this.mouseIsDown = false;
            this.mapSVG.endPan(pageX, pageY);
        }
    };
}


$(document).ready(function initialSetup() {
    'use strict';
    mainApp = new MainApp();
    mainApp.init();

    $('#mapSVG').on({
        'mousedown': function canvasMouseButtonPressed(event) {
            mainApp.startMouse(event.pageX, event.pageY);
        },
        // provided by jquery.mousewheel.js
        'mousewheel': function canvasMouseScrolled(event) {
            if (event.deltaY > 0) {
                mainApp.mapSVG.zoomIn(event.pageX,
                                         event.pageY);
            } else {
                mainApp.mapSVG.zoomOut(event.pageX,
                                          event.pageY);
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
    // for debugging
    // $('#getmapdata').on('click', function reloadMap() {
    //     mainApp.init();
    // });
    $('#reloaddata').on('click', mainApp.mapSVG.mapData.load);
    $('#updateData').on('click', mainApp.mapSVG.mapData.update);
    $('#zoomOut').on('click', function zoomOut() {
        mainApp.mapSVG.zoomOut(mainApp.mapSVG.svgWidth / 2,
                                  mainApp.mapSVG.svgHeight / 2);
    });
    $('#zoomIn').on('click', function zoomIn() {
        mainApp.mapSVG.zoomIn(mainApp.mapSVG.svgWidth / 2,
                                  mainApp.mapSVG.svgHeight / 2);
    });
    $('#layerList').hide();
    $('#layerHeader').on('click', function showMapLayers() {
        $('#layerList').slideToggle();
    });
    $('#editList').hide();
    $('#editHeader').on('click', function toggleEditLinks() {
        $('#editPrompt').hide(0, function hideEditList() {
            $('#editList').slideToggle(100);
        });
    });
    // annoying
    // $('#editBox').on('mouseleave', function hideEditPrompt() {
    //     $('#editPrompt').slideUp(100, function hideEditList() {
    //         $('#editList').slideUp(100);
    //     });
    // });
    $('#boundFeatureInfo').on('click', '.featureInfoClose', function (event) {
        event.preventDefault();
        mainApp.boundFeatureInfo.close();
    });
    $('#boundFeatureInfo').on('click', '.featureInfoEdit', function (event) {
        event.preventDefault();
        mainApp.boundFeatureInfo.loadEditFormForCurrentFeature();
    });
    $('#addFeature').on('click', function loadAddFeatureForm() {
        mainApp.boundFeatureInfo.loadForm('Feature');
    });
    $('#addCategory').on('click', function loadAddCategoryForm() {
        mainApp.boundFeatureInfo.loadForm('Feature_Category');
    });
    $('#addMap').on('click', function loadAddMapForm() {
        mainApp.boundFeatureInfo.loadForm('Map');
    });
});
