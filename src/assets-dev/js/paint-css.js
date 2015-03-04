(function($, window, document, undefined) {
    'use strict';

    var defaults = {
            pixelSize: 10,
            canvasWidth: 50,
            canvasHeight: 50,
            canvasBackground: '#fff',
            canvasBorderColor: '#000',
            canvasBorderWidth: 1,
            canvasBorderStyle: 'solid'
        };

    function PaintCSS(element, options) {
        options = $.extend({}, defaults, options);
        this.$canvas = $(element);
        this.$painting = this.$canvas.children(':first');
        this.init(options);
    }

    $.extend(PaintCSS.prototype, {

        settings: {},
        shadowStack: [],
        color: '#f00',

        init: function(options) {
            this.$canvas.css({
                position: 'relative',
                cursor: 'crosshair',
                overflow: 'hidden',
                boxSizing: 'content-box'
            });
            this.$painting.css({
                position: 'absolute',
                lineHeight: '1',
                top: '-1em',
                left: '-1em',
                width: '1em',
                height: '1em',
            });
            this.setPixelSize(options.pixelSize);
            this.setCanvasSize(options.canvasWidth, options.canvasHeight);
            this.setCanvasBackground(options.canvasBackground);
            this.setCanvasBorderColor(options.canvasBorderColor);
            this.setCanvasBorderWidth(options.canvasBorderWidth);
            this.setCanvasBorderStyle(options.canvasBorderStyle);
            this.setMouseEvents();
        },

        setPixelSize: function(pixelSize) {
            this.settings.pixelSize = pixelSize;
            this.$canvas.css('font-size', pixelSize);
        },

        setCanvasSize: function(width, height) {
            this.settings.canvasWidth = width;
            this.settings.canvasHeight = height;
            this.$canvas.css('width', width + 'em');
            this.$canvas.css('height', height + 'em');
            this.initShadowStack();
        },

        setCanvasBackground: function(background) {
            this.settings.canvasBackground = background;
            this.$canvas.css('background', background);
        },

        setCanvasBorderColor: function(color) {
            this.settings.canvasBorderColor = color;
            this.$canvas.css('border-color', color);
        },

        setCanvasBorderWidth: function(width) {
            this.settings.canvasBorderWidth = width;
            this.$canvas.css('border-width', width + 'px');
        },

        setCanvasBorderStyle: function(style) {
            this.settings.canvasBorderStyle = style;
            this.$canvas.css('border-style', style);
        },

        getCanvasOffset: function() {
            var offset = this.$canvas.offset();
            offset.top = offset.top + this.settings.canvasBorderWidth;
            offset.left = offset.left + this.settings.canvasBorderWidth;
            this.canvasOffset = offset;
        },

        setMouseEvents: function() {
            this.getCanvasOffset();
            this.mouseDown = false;
            $(window).off('mouseup.paint').on({
                'mouseup.paint': function(ev) {
                    this.mouseDown = false;
                }.bind(this)
            });
            this.$canvas.off('mousedown.paint').on({
                'mousedown.paint': function(ev) {
                    this.mouseDown = true;
                    this.$canvas.trigger('mousemove.paint',[ev.pageX, ev.pageY]);
                }.bind(this)
            });
            this.$canvas.off('mousemove.paint').on({
                'mousemove.paint': function(ev, mouseDownX, mouseDownY) {
                    if (this.mouseDown) {
                        if (mouseDownX && mouseDownY) {
                            ev.pageX = mouseDownX;
                            ev.pageY = mouseDownY;
                        }
                        var x = Math.floor((ev.pageX - this.canvasOffset.left) / this.settings.pixelSize),
                            y = Math.floor((ev.pageY - this.canvasOffset.top) / this.settings.pixelSize);
                        if (x >= 0 && x < this.settings.canvasWidth && y >= 0 && y <= this.settings.canvasHeight) {
                            this.shadowStack[x][y] = this.color;
                            this.paint();
                        }
                    }
                }.bind(this)
            });
        },

        initShadowStack: function() {
            this.shadowStack = [];
            for (var x = 0; x < this.settings.canvasWidth; x++) {
                this.shadowStack[x] = [];
                for (var y = 0; y < this.settings.canvasHeight; y++) {
                    this.shadowStack[x][y] = null;
                }
            }
        },

        paint: function() {
            var shadows = [];
            this.shadowStack.forEach(function(row, x) {
                row.forEach(function(color, y) {
                    if (color!==null) {
                        shadows.push((x + 1) + 'em ' + (y + 1) + 'em ' + color);
                    }
                }.bind(this));
            }.bind(this));
            shadows = shadows.length > 0 ? shadows.join(',') : '';
            this.$painting.css('box-shadow', shadows);
        }

    });

    $.fn.paintCSS = function(options) {
        return this.each(function() {
            if (!$.data(this, 'paintCSS')) {
                $.data(this, 'paintCSS', new PaintCSS(this, options));
            }
        });
    };

})(jQuery, window, document);
