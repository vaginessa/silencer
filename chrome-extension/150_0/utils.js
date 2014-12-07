'use strict';

window.utils = { };

utils.TAB = 9;
utils.ENTER = 13;
utils.ESC = 27;
utils.UP_ARROW = 38;
utils.DOWN_ARROW = 40;

utils.until = function(test, poll, done) {
    until(test, poll, done, 5000, 5000);
};

utils.untilWithBackoff = function(test, poll, done) {
    until(test, poll, done, 5000, 10 * 60 * 1000);
};

var until = function(test, poll, done, interval, maxBackoff) {
    var run = function(timeout) {
        if (test()) {
            done();
        } else {
            poll(function() {
                if (test()) {
                    done();
                } else {
                    setTimeout(function() {
                        run(Math.min(timeout * 2, maxBackoff));
                    }, timeout);
                }
            });
        }
    };

    run(interval);
};

utils.wrap = function(func) {
    try {
        func();
    } catch(e) {
        pb.track({
            'name': 'chrome_error',
            'stack': e.stack,
            'message': e.message
        });
        throw e;
    }
};

utils.getParams = function(search) {
    var parse = function(params, pairs) {
        var pair = pairs[0];
        var parts = pair.split('=');
        var key = decodeURIComponent(parts[0]);
        var value = decodeURIComponent(parts.slice(1).join('='));

        // Handle multiple parameters of the same name
        if (typeof params[key] === 'undefined') {
            params[key] = value;
        } else {
            params[key] = [].concat(params[key], value);
        }

        return pairs.length == 1 ? params : parse(params, pairs.slice(1));
    };

    // Get rid of leading ?
    return search.length == 0 ? {} : parse({}, search.substr(1).split('&'));
};

if (!String.format) {
    String.format = function(format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/{(\d+)}/g, function(match, number) { 
            return typeof args[number - 1] != 'undefined' ? args[number - 1] : match;
        });
    };
}
