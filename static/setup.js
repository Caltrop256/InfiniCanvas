"use strict";

var __ES5_ = false;
var __isIOS_;
if ((/iPad|iPhone|iPod/.test(window.navigator.userAgent)) && !(window.MSStream)) {
    window.__isIOS_ = true;
} else {
    window.__isIOS_ = false;
};
(function () {
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