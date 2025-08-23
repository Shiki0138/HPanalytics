/**
 * HP改善分析システム - トラッキングタグ（互換性強化版）
 * IE11+ 及び全モダンブラウザ対応
 */

(function() {
    'use strict';

    // IE11対応: constをvarに変更、ES6機能を回避
    var HP_ANALYTICS_CONFIG = {
        apiEndpoint: 'http://localhost:8000/api/track',
        siteId: 'YOUR_SITE_ID',
        debug: true
    };

    // IE11対応: Fetch APIのポリフィル
    function sendData(data, callback) {
        if (typeof fetch !== 'undefined') {
            // モダンブラウザ: Fetch API使用
            fetch(HP_ANALYTICS_CONFIG.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            }).then(function(response) {
                if (callback) callback(response);
            }).catch(function(err) {
                console.error('HP Analytics: Failed to send data', err);
            });
        } else {
            // IE11: XMLHttpRequest使用
            var xhr = new XMLHttpRequest();
            xhr.open('POST', HP_ANALYTICS_CONFIG.apiEndpoint, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4 && callback) {
                    callback(xhr);
                }
            };
            xhr.send(JSON.stringify(data));
        }
    }

    // トラッキングデータの初期化
    var trackingData = {
        sessionId: generateSessionId(),
        siteId: HP_ANALYTICS_CONFIG.siteId,
        pageViews: [],
        events: [],
        errors: [],
        performance: {},
        device: getDeviceInfo(),
        startTime: Date.now ? Date.now() : new Date().getTime()
    };

    // セッションID生成（IE11対応）
    function generateSessionId() {
        var timestamp = Date.now ? Date.now() : new Date().getTime();
        var random = Math.floor(Math.random() * 1000000000);
        return 'hp_' + timestamp + '_' + random.toString();
    }

    // デバイス情報取得（IE11対応）
    function getDeviceInfo() {
        var info = {
            userAgent: navigator.userAgent || '',
            screenWidth: screen.width || 0,
            screenHeight: screen.height || 0,
            viewportWidth: window.innerWidth || document.documentElement.clientWidth || 0,
            viewportHeight: window.innerHeight || document.documentElement.clientHeight || 0,
            isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || ''),
            language: navigator.language || navigator.userLanguage || ''
        };
        
        // タッチデバイス検出
        info.isTouch = 'ontouchstart' in window || 
                      (window.DocumentTouch && document instanceof window.DocumentTouch) ||
                      navigator.maxTouchPoints > 0 || 
                      navigator.msMaxTouchPoints > 0;
        
        return info;
    }

    // ページビュートラッキング
    function trackPageView() {
        var pageView = {
            url: window.location.href,
            title: document.title || '',
            referrer: document.referrer || '',
            timestamp: Date.now ? Date.now() : new Date().getTime(),
            timeOnPage: 0,
            scrollDepth: 0,
            exitPoint: null
        };

        trackingData.pageViews.push(pageView);
        
        if (HP_ANALYTICS_CONFIG.debug) {
            console.log('HP Analytics: Page view tracked', pageView);
        }

        trackScrollDepth(pageView);
        trackTimeOnPage(pageView);
    }

    // スクロール深度トラッキング（互換性改善）
    function trackScrollDepth(pageView) {
        var maxScrollDepth = 0;
        
        // IE11対応のscrollイベント
        function handleScroll() {
            var scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
            var docHeight = Math.max(
                document.body.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.clientHeight,
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
            ) - (window.innerHeight || document.documentElement.clientHeight);
            
            var scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
            
            if (scrollPercent > maxScrollDepth) {
                maxScrollDepth = scrollPercent;
                pageView.scrollDepth = maxScrollDepth;
            }
        }

        var throttledScroll = throttle(handleScroll, 500);
        
        if (window.addEventListener) {
            window.addEventListener('scroll', throttledScroll, false);
        } else if (window.attachEvent) {
            // IE8以下対応
            window.attachEvent('onscroll', throttledScroll);
        }
    }

    // ページ滞在時間トラッキング（IE11対応）
    function trackTimeOnPage(pageView) {
        var startTime = Date.now ? Date.now() : new Date().getTime();
        
        function handleUnload() {
            pageView.timeOnPage = (Date.now ? Date.now() : new Date().getTime()) - startTime;
            pageView.exitPoint = identifyExitPoint();
            sendDataSync();
        }

        if (window.addEventListener) {
            window.addEventListener('beforeunload', handleUnload, false);
            window.addEventListener('unload', handleUnload, false);
        } else if (window.attachEvent) {
            window.attachEvent('onbeforeunload', handleUnload);
            window.attachEvent('onunload', handleUnload);
        }
    }

    // フォームトラッキング（タッチデバイス対応）
    function trackForms() {
        var forms = document.querySelectorAll ? document.querySelectorAll('form') : 
                   document.getElementsByTagName('form');
        
        for (var i = 0; i < forms.length; i++) {
            var form = forms[i];
            var formId = form.id || ('form_' + i);
            var formStartTime = null;
            var fieldInteractions = {};
            
            // フォーカスイベント（IE11 + タッチデバイス対応）
            function addFocusListener(form, formId, fieldInteractions) {
                var focusHandler = function(e) {
                    var target = e.target || e.srcElement;
                    if (!formStartTime) {
                        formStartTime = Date.now ? Date.now() : new Date().getTime();
                        trackEvent('form_start', {
                            formId: formId,
                            formName: form.name || 'unnamed',
                            fieldCount: form.elements ? form.elements.length : 0
                        });
                    }
                    
                    if (target.name) {
                        fieldInteractions[target.name] = {
                            focused: true,
                            startTime: Date.now ? Date.now() : new Date().getTime()
                        };
                    }
                };

                // 複数イベントでフォーカスを検出（タッチデバイス対応）
                if (form.addEventListener) {
                    form.addEventListener('focusin', focusHandler, false);
                    form.addEventListener('touchstart', focusHandler, false);
                } else if (form.attachEvent) {
                    form.attachEvent('onfocusin', focusHandler);
                }
            }

            addFocusListener(form, formId, fieldInteractions);

            // 送信イベント
            var submitHandler = function(e) {
                var duration = formStartTime ? 
                    (Date.now ? Date.now() : new Date().getTime()) - formStartTime : 0;
                
                trackEvent('form_submit', {
                    formId: formId,
                    duration: duration,
                    completedFields: Object.keys ? Object.keys(fieldInteractions).length : 0,
                    success: true
                });
            };

            if (form.addEventListener) {
                form.addEventListener('submit', submitHandler, false);
            } else if (form.attachEvent) {
                form.attachEvent('onsubmit', submitHandler);
            }
        }
    }

    // クリックトラッキング（タッチデバイス対応）
    function trackClicks() {
        function handleInteraction(e) {
            var target = e.target || e.srcElement;
            var tagName = target.tagName ? target.tagName.toLowerCase() : '';
            
            // 重要な要素のクリック/タップを追跡
            if (tagName === 'a' || tagName === 'button' || 
                (target.className && target.className.indexOf('cta') !== -1)) {
                
                var text = target.textContent || target.innerText || '';
                trackEvent('click', {
                    element: tagName,
                    text: text.substring(0, 50),
                    href: target.href || null,
                    classes: target.className || '',
                    id: target.id || '',
                    position: {
                        x: e.clientX || (e.touches ? e.touches[0].clientX : 0),
                        y: e.clientY || (e.touches ? e.touches[0].clientY : 0)
                    },
                    eventType: e.type
                });
            }
        }

        if (document.addEventListener) {
            document.addEventListener('click', handleInteraction, false);
            document.addEventListener('touchend', handleInteraction, false);
        } else if (document.attachEvent) {
            document.attachEvent('onclick', handleInteraction);
        }
    }

    // エラートラッキング（IE11対応）
    function trackErrors() {
        function errorHandler(e) {
            var error = {
                message: e.message || 'Unknown error',
                source: e.filename || e.source || '',
                line: e.lineno || e.line || 0,
                column: e.colno || e.column || 0,
                timestamp: Date.now ? Date.now() : new Date().getTime(),
                userAgent: navigator.userAgent || ''
            };

            trackingData.errors.push(error);
            
            if (HP_ANALYTICS_CONFIG.debug) {
                console.error('HP Analytics: Error tracked', error);
            }
        }

        if (window.addEventListener) {
            window.addEventListener('error', errorHandler, false);
        } else if (window.attachEvent) {
            window.attachEvent('onerror', function(msg, url, line, col, error) {
                errorHandler({
                    message: msg,
                    filename: url,
                    lineno: line,
                    colno: col
                });
            });
        }
    }

    // パフォーマンストラッキング（互換性改善）
    function trackPerformance() {
        function loadHandler() {
            setTimeout(function() {
                var perfData = {};
                
                if (window.performance && window.performance.timing) {
                    var timing = window.performance.timing;
                    perfData.loadTime = timing.loadEventEnd - timing.navigationStart;
                    perfData.domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
                    
                    // First Paint（対応ブラウザのみ）
                    if (window.performance.getEntriesByType) {
                        var paintEntries = window.performance.getEntriesByType('paint');
                        if (paintEntries && paintEntries.length > 0) {
                            perfData.firstPaint = paintEntries[0].startTime;
                        }
                    }
                    
                    // リソース数（対応ブラウザのみ）
                    if (window.performance.getEntriesByType) {
                        var resources = window.performance.getEntriesByType('resource');
                        perfData.resources = resources ? resources.length : 0;
                    }
                } else {
                    // performance API非対応の場合の fallback
                    perfData.loadTime = -1;
                    perfData.domReady = -1;
                    perfData.firstPaint = -1;
                    perfData.resources = -1;
                }
                
                trackingData.performance = perfData;
                
                if (HP_ANALYTICS_CONFIG.debug) {
                    console.log('HP Analytics: Performance tracked', perfData);
                }
            }, 0);
        }

        if (window.addEventListener) {
            window.addEventListener('load', loadHandler, false);
        } else if (window.attachEvent) {
            window.attachEvent('onload', loadHandler);
        }
    }

    // イベントトラッキング
    function trackEvent(eventName, eventData) {
        var event = {
            name: eventName,
            data: eventData || {},
            timestamp: Date.now ? Date.now() : new Date().getTime(),
            url: window.location.href
        };
        
        trackingData.events.push(event);
        
        if (HP_ANALYTICS_CONFIG.debug) {
            console.log('HP Analytics: Event tracked', event);
        }
        
        // 重要なイベントは即座に送信
        var criticalEvents = ['form_abandon', 'error', 'cart_abandon'];
        for (var i = 0; i < criticalEvents.length; i++) {
            if (eventName === criticalEvents[i]) {
                sendDataAsync();
                break;
            }
        }
    }

    // 離脱ポイントの特定
    function identifyExitPoint() {
        var lastInteraction = trackingData.events[trackingData.events.length - 1];
        return {
            element: lastInteraction && lastInteraction.data ? lastInteraction.data.element || 'unknown' : 'unknown',
            action: lastInteraction ? lastInteraction.name || 'none' : 'none',
            timestamp: Date.now ? Date.now() : new Date().getTime()
        };
    }

    // データ送信（非同期）
    function sendDataAsync() {
        if (HP_ANALYTICS_CONFIG.debug) {
            console.log('HP Analytics: Sending data', trackingData);
            
            // localStorage対応確認
            try {
                if (window.localStorage) {
                    var existingData = localStorage.getItem('hp_analytics_data');
                    var dataArray = existingData ? JSON.parse(existingData) : [];
                    dataArray.push({
                        data: trackingData,
                        sentAt: new Date().toISOString()
                    });
                    localStorage.setItem('hp_analytics_data', JSON.stringify(dataArray));
                    console.log('HP Analytics: Data saved to localStorage');
                }
            } catch (e) {
                console.warn('HP Analytics: localStorage not available', e);
            }
        }
        
        if (!HP_ANALYTICS_CONFIG.debug && HP_ANALYTICS_CONFIG.apiEndpoint) {
            sendData(trackingData);
        }
    }

    // データ送信（同期 - ページ離脱時用）
    function sendDataSync() {
        if (!HP_ANALYTICS_CONFIG.debug && HP_ANALYTICS_CONFIG.apiEndpoint) {
            // sendBeacon API対応確認（モダンブラウザ）
            if (navigator.sendBeacon) {
                navigator.sendBeacon(
                    HP_ANALYTICS_CONFIG.apiEndpoint,
                    JSON.stringify(trackingData)
                );
            } else {
                // fallback: 同期XHR（非推奨だが離脱時には必要）
                try {
                    var xhr = new XMLHttpRequest();
                    xhr.open('POST', HP_ANALYTICS_CONFIG.apiEndpoint, false);
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.send(JSON.stringify(trackingData));
                } catch (e) {
                    console.warn('HP Analytics: Failed to send data on unload', e);
                }
            }
        }
    }

    // ユーティリティ: スロットリング（IE11対応）
    function throttle(func, wait) {
        var timeout;
        var lastArgs;
        
        return function() {
            lastArgs = arguments;
            
            if (timeout) {
                return;
            }
            
            timeout = setTimeout(function() {
                timeout = null;
                func.apply(this, lastArgs);
            }, wait);
        };
    }

    // Object.keys polyfill for IE8
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

    // 初期化
    function init() {
        console.log('HP Analytics: Initializing tracking (Compatible Mode)...');
        
        trackPageView();
        trackForms();
        trackClicks();
        trackErrors();
        trackPerformance();
        
        // 定期的なデータ送信（30秒ごと）
        setInterval(sendDataAsync, 30000);
        
        console.log('HP Analytics: Tracking initialized successfully!');
    }

    // DOM ready対応（IE11対応）
    function domReady(callback) {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(callback, 0);
        } else if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', callback, false);
        } else if (document.attachEvent) {
            document.attachEvent('onreadystatechange', function() {
                if (document.readyState === 'complete') {
                    callback();
                }
            });
        }
    }

    domReady(init);

    // グローバルAPIの公開
    window.HPAnalytics = {
        trackEvent: trackEvent,
        getTrackingData: function() { return trackingData; },
        sendData: sendDataAsync,
        config: HP_ANALYTICS_CONFIG
    };

})();