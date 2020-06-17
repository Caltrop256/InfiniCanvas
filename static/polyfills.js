// https://stackoverflow.com/a/47487073/11539618
if (!HTMLCanvasElement.prototype.toBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
        value: function (callback, type, quality) {
            var dataURL = this.toDataURL(type, quality).split(',')[1];
            setTimeout(function () {
                var binStr = atob(dataURL),
                    len = binStr.length,
                    arr = new Uint8Array(len);

                for (var i = 0; i < len; i++) {
                    arr[i] = binStr.charCodeAt(i);
                }
                callback(new Blob([arr], { type: type || 'image/png' }));
            });
        }
    });
};

if (!HTMLElement.prototype.scrollTo) {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
        value: function (_, height) {
            this.scrollTop = height;
            return this;
        }
    })
};

window.__Path2DSupport = (function () {
    if (typeof Path2D !== 'function') return false;
    var x = document.createElement('canvas').getContext('2d');
    x.stroke(new Path2D('M0,0H1'));
    return !!x.getImageData(0, 0, 1, 1).data[3];
})();