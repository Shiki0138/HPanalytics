/**
 * ブラウザ互換性ポリフィル集
 * IE11+, 古いモバイルブラウザ対応
 */

(function() {
    'use strict';

    // === Object.assign ポリフィル (IE11用) ===
    if (typeof Object.assign !== 'function') {
        Object.defineProperty(Object, "assign", {
            value: function assign(target, varArgs) {
                'use strict';
                if (target === null || target === undefined) {
                    throw new TypeError('Cannot convert undefined or null to object');
                }

                var to = Object(target);

                for (var index = 1; index < arguments.length; index++) {
                    var nextSource = arguments[index];

                    if (nextSource !== null && nextSource !== undefined) { 
                        for (var nextKey in nextSource) {
                            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                                to[nextKey] = nextSource[nextKey];
                            }
                        }
                    }
                }
                return to;
            },
            writable: true,
            configurable: true
        });
    }

    // === Array.from ポリフィル ===
    if (!Array.from) {
        Array.from = function(arrayLike, mapFn, thisArg) {
            var C = this;
            var items = Object(arrayLike);
            if (arrayLike == null) {
                throw new TypeError('Array.from requires an array-like object - not null or undefined');
            }
            var mapFunction = arguments.length > 1 ? mapFn : void undefined;
            var T;
            if (typeof mapFunction !== 'undefined') {
                if (typeof mapFunction !== 'function') {
                    throw new TypeError('Array.from: when provided, the second argument must be a function');
                }
                if (arguments.length > 2) {
                    T = thisArg;
                }
            }
            var len = parseInt(items.length);
            var A = typeof C === 'function' ? Object(new C(len)) : new Array(len);
            var k = 0;
            var kValue;
            while (k < len) {
                kValue = items[k];
                if (mapFunction) {
                    A[k] = typeof T === 'undefined' ? mapFunction(kValue, k) : mapFunction.call(T, kValue, k);
                } else {
                    A[k] = kValue;
                }
                k += 1;
            }
            A.length = len;
            return A;
        };
    }

    // === Array.includes ポリフィル ===
    if (!Array.prototype.includes) {
        Array.prototype.includes = function(searchElement /*, fromIndex*/) {
            'use strict';
            var O = Object(this);
            var len = parseInt(O.length) || 0;
            if (len === 0) {
                return false;
            }
            var n = parseInt(arguments[1]) || 0;
            var k;
            if (n >= 0) {
                k = n;
            } else {
                k = len + n;
                if (k < 0) {k = 0;}
            }
            var currentElement;
            while (k < len) {
                currentElement = O[k];
                if (searchElement === currentElement ||
                   (searchElement !== searchElement && currentElement !== currentElement)) {
                    return true;
                }
                k++;
            }
            return false;
        };
    }

    // === String.includes ポリフィル ===
    if (!String.prototype.includes) {
        String.prototype.includes = function(search, start) {
            'use strict';
            if (typeof start !== 'number') {
                start = 0;
            }
            
            if (start + search.length > this.length) {
                return false;
            } else {
                return this.indexOf(search, start) !== -1;
            }
        };
    }

    // === String.startsWith ポリフィル ===
    if (!String.prototype.startsWith) {
        String.prototype.startsWith = function(searchString, position) {
            position = position || 0;
            return this.substr(position, searchString.length) === searchString;
        };
    }

    // === String.endsWith ポリフィル ===
    if (!String.prototype.endsWith) {
        String.prototype.endsWith = function(searchString, length) {
            if (length === undefined || length > this.length) {
                length = this.length;
            }
            return this.substring(length - searchString.length, length) === searchString;
        };
    }

    // === Promise ポリフィル（簡易版） ===
    if (typeof Promise === 'undefined') {
        window.Promise = function(executor) {
            var self = this;
            this.state = 'pending';
            this.value = undefined;
            this.onFulfilledCallbacks = [];
            this.onRejectedCallbacks = [];

            function resolve(value) {
                if (self.state === 'pending') {
                    self.state = 'fulfilled';
                    self.value = value;
                    self.onFulfilledCallbacks.forEach(function(callback) {
                        callback(value);
                    });
                }
            }

            function reject(reason) {
                if (self.state === 'pending') {
                    self.state = 'rejected';
                    self.value = reason;
                    self.onRejectedCallbacks.forEach(function(callback) {
                        callback(reason);
                    });
                }
            }

            try {
                executor(resolve, reject);
            } catch (error) {
                reject(error);
            }
        };

        Promise.prototype.then = function(onFulfilled, onRejected) {
            var promise2 = new Promise(function(resolve, reject) {
                if (this.state === 'fulfilled') {
                    setTimeout(function() {
                        try {
                            var x = onFulfilled(this.value);
                            resolve(x);
                        } catch (error) {
                            reject(error);
                        }
                    }.bind(this), 0);
                } else if (this.state === 'rejected') {
                    setTimeout(function() {
                        try {
                            var x = onRejected(this.value);
                            resolve(x);
                        } catch (error) {
                            reject(error);
                        }
                    }.bind(this), 0);
                } else if (this.state === 'pending') {
                    this.onFulfilledCallbacks.push(function(value) {
                        try {
                            var x = onFulfilled(value);
                            resolve(x);
                        } catch (error) {
                            reject(error);
                        }
                    });
                    this.onRejectedCallbacks.push(function(value) {
                        try {
                            var x = onRejected(value);
                            resolve(x);
                        } catch (error) {
                            reject(error);
                        }
                    });
                }
            }.bind(this));
            return promise2;
        };

        Promise.prototype.catch = function(onRejected) {
            return this.then(null, onRejected);
        };
    }

    // === Fetch API ポリフィル（簡易版） ===
    if (!window.fetch) {
        window.fetch = function(url, options) {
            return new Promise(function(resolve, reject) {
                var xhr = new XMLHttpRequest();
                var method = options && options.method ? options.method : 'GET';
                var headers = options && options.headers ? options.headers : {};
                var body = options && options.body ? options.body : null;

                xhr.open(method, url, true);

                // ヘッダーの設定
                for (var header in headers) {
                    if (headers.hasOwnProperty(header)) {
                        xhr.setRequestHeader(header, headers[header]);
                    }
                }

                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        var response = {
                            ok: xhr.status >= 200 && xhr.status < 300,
                            status: xhr.status,
                            statusText: xhr.statusText,
                            text: function() {
                                return Promise.resolve(xhr.responseText);
                            },
                            json: function() {
                                return Promise.resolve(JSON.parse(xhr.responseText));
                            }
                        };

                        if (response.ok) {
                            resolve(response);
                        } else {
                            reject(new Error('Network response was not ok'));
                        }
                    }
                };

                xhr.onerror = function() {
                    reject(new Error('Network error'));
                };

                xhr.send(body);
            });
        };
    }

    // === CustomEvent ポリフィル ===
    if (typeof window.CustomEvent !== 'function') {
        function CustomEvent(event, params) {
            params = params || { bubbles: false, cancelable: false, detail: undefined };
            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        }

        CustomEvent.prototype = window.Event.prototype;
        window.CustomEvent = CustomEvent;
    }

    // === Element.closest ポリフィル ===
    if (!Element.prototype.closest) {
        Element.prototype.closest = function(selector) {
            var element = this;
            
            while (element && element.nodeType === 1) {
                if (element.matches && element.matches(selector)) {
                    return element;
                }
                element = element.parentNode;
            }
            return null;
        };
    }

    // === Element.matches ポリフィル ===
    if (!Element.prototype.matches) {
        Element.prototype.matches = 
            Element.prototype.matchesSelector || 
            Element.prototype.mozMatchesSelector ||
            Element.prototype.msMatchesSelector || 
            Element.prototype.oMatchesSelector || 
            Element.prototype.webkitMatchesSelector ||
            function(s) {
                var matches = (this.document || this.ownerDocument).querySelectorAll(s);
                var i = matches.length;
                while (--i >= 0 && matches.item(i) !== this) {}
                return i > -1;
            };
    }

    // === classList ポリフィル（IE9用） ===
    if (!("classList" in document.documentElement)) {
        Object.defineProperty(HTMLElement.prototype, 'classList', {
            get: function() {
                var self = this;
                function update(fn) {
                    return function(value) {
                        var classes = self.className.split(/\s+/g);
                        var index = classes.indexOf(value);

                        fn(classes, index, value);
                        self.className = classes.join(" ");
                    };
                }

                return {
                    add: update(function(classes, index, value) {
                        if (!~index) classes.push(value);
                    }),

                    remove: update(function(classes, index) {
                        if (~index) classes.splice(index, 1);
                    }),

                    toggle: update(function(classes, index, value) {
                        if (~index)
                            classes.splice(index, 1);
                        else
                            classes.push(value);
                    }),

                    contains: function(value) {
                        return !!~self.className.split(/\s+/g).indexOf(value);
                    },

                    item: function(i) {
                        return self.className.split(/\s+/g)[i] || null;
                    }
                };
            }
        });
    }

    // === requestAnimationFrame ポリフィル ===
    (function() {
        var lastTime = 0;
        var vendors = ['ms', 'moz', 'webkit', 'o'];
        for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                       || window[vendors[x]+'CancelRequestAnimationFrame'];
        }
    
        if (!window.requestAnimationFrame)
            window.requestAnimationFrame = function(callback, element) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
                  timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };
    
        if (!window.cancelAnimationFrame)
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
    }());

    // === IntersectionObserver ポリフィル（簡易版） ===
    if (!('IntersectionObserver' in window)) {
        window.IntersectionObserver = function(callback, options) {
            this.callback = callback;
            this.options = options || {};
            this.observed = [];
        };

        IntersectionObserver.prototype.observe = function(element) {
            this.observed.push(element);
            // 簡易的な実装（実際は要素の可視性をチェック）
            var self = this;
            function check() {
                var rect = element.getBoundingClientRect();
                var isVisible = rect.top >= 0 && 
                               rect.left >= 0 && 
                               rect.bottom <= window.innerHeight && 
                               rect.right <= window.innerWidth;
                
                if (isVisible) {
                    self.callback([{
                        target: element,
                        isIntersecting: true,
                        intersectionRatio: 1
                    }]);
                }
            }
            
            // スクロール時とリサイズ時にチェック
            window.addEventListener('scroll', check);
            window.addEventListener('resize', check);
            
            // 初回チェック
            check();
        };

        IntersectionObserver.prototype.unobserve = function(element) {
            var index = this.observed.indexOf(element);
            if (index > -1) {
                this.observed.splice(index, 1);
            }
        };

        IntersectionObserver.prototype.disconnect = function() {
            this.observed = [];
        };
    }

    // === タッチイベントの正規化 ===
    if ('ontouchstart' in window || navigator.msMaxTouchPoints) {
        // タッチイベントをマウスイベントに統一
        function addUnifiedEventListener(element, eventType, handler) {
            if (eventType === 'click') {
                element.addEventListener('touchend', function(e) {
                    e.preventDefault();
                    handler(e);
                }, false);
                element.addEventListener('click', handler, false);
            }
        }

        // グローバルに公開
        window.addUnifiedEventListener = addUnifiedEventListener;
    }

    // === IE11でのObject.keys修正 ===
    if (!Object.keys) {
        Object.keys = function(obj) {
            var keys = [];
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    keys.push(key);
                }
            }
            return keys;
        };
    }

    // === console.log のIE対応 ===
    if (!window.console) {
        window.console = {
            log: function() {},
            error: function() {},
            warn: function() {},
            info: function() {}
        };
    }

    // === Date.now ポリフィル ===
    if (!Date.now) {
        Date.now = function now() {
            return new Date().getTime();
        };
    }

    // === 初期化完了ログ ===
    console.log('Browser compatibility polyfills loaded successfully');

})();