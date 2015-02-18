'use strict';

// Apply unsharp mask to src
function mask(src, srcW, srcH, amount, radius, threshold) {
    var hsl = bulkRgbToHsl(src, srcW, srcH);

    bulkHslToRgb(hsl.hs, sharp(hsl.l, blur(hsl.l, srcW, srcH, radius), amount, threshold), src, srcW, srcH);
}

function sharp(l, blur, amount, threshold) {
    for (var i = 0; i < l.length; i++) {
        var diff = l[i] - blur[i];
        if (Math.abs(diff) > threshold) {
            l[i] = Math.min(l[i] + diff * amount, 1.0);
        }
    }
    return l;
}

function blur(l, w, h, radius) {
    return axis_blur(axis_blur(l, w, h, radius), h, w, radius);
}

function axis_blur(l, w, h, radius) {
    var r = new Float64Array(w * h);
    var vl = new Uint16Array(w);
    var vr = new Uint16Array(w);
    var wm = w - 1;
    var div = 1/(radius + radius + 1);
    var yw = 0, yi = 0;

    for (var y = 0; y < h; y++) {
        var sum = 0;

        for (var i = -radius; i <= radius; i++) {
            sum += l[yi + Math.min(wm, Math.max(i, 0))];
        }

        for (var x = 0; x < w; x++) {
            r[(yi % w) * h + (yi / w | 0)] = div * sum;

            if (y === 0){
                vl[x] = Math.max(x - radius, 0);
                vr[x] = Math.min(x + radius + 1, wm);
            }

            sum += l[yw + vr[x]] - l[yw + vl[x]];
            yi++;
        }
        yw += w;
    }

    return r;
}

function bulkRgbToHsl(rgb, rgbW, rgbH) {
    var hs = new Float32Array(rgbW * rgbH * 2);
    var la = new Float64Array(rgbW * rgbH);
    var ptr_rgb = 0;
    var ptr_hs = 0;
    var ptr_l = 0;
    var callback = function(h, s, l) {
        hs[ptr_hs++] = h;
        hs[ptr_hs++] = s;
        la[ptr_l++] = l;
    };

    for (var y = 0; y < rgbH; y++) {
        for (var x = 0; x < rgbW; x++) {
            rgbToHsl(rgb[ptr_rgb++], rgb[ptr_rgb++], rgb[ptr_rgb++], callback);
            ptr_rgb++;
        }
    }

    return {hs: hs, l: la};
}

function bulkHslToRgb(hs, l, rgb, rgbW, rgbH) {
    var ptr_rgb = 0;
    var ptr_hs = 0;
    var ptr_l = 0;
    var callback = function(r, g, b) {
        rgb[ptr_rgb++] = r;
        rgb[ptr_rgb++] = g;
        rgb[ptr_rgb++] = b;
        ptr_rgb++;
    };

    for (var y = 0; y < rgbH; y++) {
        for (var x = 0; x < rgbW; x++) {
            hslToRgb(hs[ptr_hs++], hs[ptr_hs++], l[ptr_l++], callback);
        }
    }

    return rgb;
}

var EPSILON = 1e-8;
var DIV255 = 1/255;
var DIV3 = 1/3;
var DIV6 = 1/6;
var DIV23 = 2/3;

/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSL representation
 */
function rgbToHsl(r, g, b, callback) {
    r *= DIV255;
    g *= DIV255;
    b *= DIV255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max == min){
        h = s = 0; // achromatic
    }
    else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    callback(h, s, l);
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l, callback){
    var r, g, b;

    if (s < EPSILON) {
        r = g = b = l; // achromatic
    }
    else {
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < DIV6) return p + (q - p) * 6 * t;
            if(t < 0.5) return q;
            if(t < DIV23) return p + (q - p) * (DIV23 - t) * 6;
            return p;
        };

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + DIV3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - DIV3);
    }

    callback(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}

module.exports = mask;
