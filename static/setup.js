"use strict";

var __ES5_ = false;
var __isIOS_ = (/iPad|iPhone|iPod/.test(window.navigator.userAgent) && !(MSStream in window));
(function () {

    if (__isIOS_) {
        var tag = window.document.getElementById('_viewportTag');
        var deviceWidth = 0;

        if (matchMedia in window) {
            for (deviceWidth = 100; !window.matchMedia('(max-device-width: ' + deviceWidth + 'px)').matches; i++) { };
        } else {
            deviceWidth = Math.min(window.innerWidth || Infinity, window.screen.width);
        };

        var scale = (deviceWidth / 1920).toFixed(2);
        tag.content = 'width=device-width, initial-scale=' + scale + ', maximum-scale=' + scale + ', minimum-scale=' + scale + ' user-scalable=no';
    };

    var js = window.document.createElement('script');
    if (typeof Symbol !== 'undefined') {
        js.src = './build/canvas.ES6.min.js';
        js.id = '_main';
        window.onerror = function () {
            window.document.body.removeChild(window.document.getElementById('_main'));
            js = window.document.createElement('script');
            js.id = '_main';
            js.src = './build/canvas.ES5.min.js';
            window.document.body.appendChild(js);
            window.__ES5_ = true;
        }
        js.onload = function () {
            window.setTimeout(function () {
                window.onerror = function () {
                    return null
                }
            }, 100);
        }
    } else {
        window.__ES5_ = true;
        js.src = './build/canvas.ES5.min.js';
    }
    window.document.body.appendChild(js);
})();