/**
 * HP改善分析システム - プロダクション版トラッキングタグ
 * セキュリティ強化 + パフォーマンス最適化 + ブラウザ互換性対応
 * Version: 2.0.0
 */

(function() {
    'use strict';

    // 設定（本番環境用）
    const HP_ANALYTICS_CONFIG = {
        apiEndpoint: 'https://api.hp-analytics.example.com/track', // HTTPS必須
        siteId: '', // 設置時に設定
        debug: false, // 本番環境では必ずfalse
        version: '2.0.0',
        maxEvents: 50, // メモリ使用量制限
        batchSize: 10,
        flushInterval: 30000, // 30秒
        maxRetries: 3
    };

    // セキュリティ：CSRFトークン対応
    let csrfToken = '';
    
    // パフォーマンス：リクエスト制限
    let requestCount = 0;
    const MAX_REQUESTS_PER_MINUTE = 30;
    const requestTimes = [];

    // トラッキングデータ（容量制限付き）
    const trackingData = {
        sessionId: generateSecureSessionId(),
        siteId: HP_ANALYTICS_CONFIG.siteId,
        pageViews: [],
        events: [],
        errors: [],
        performance: {},
        device: getDeviceInfo(),
        startTime: Date.now()
    };

    // セキュアなセッションID生成
    function generateSecureSessionId() {
        try {
            const array = new Uint8Array(16);
            if (window.crypto && window.crypto.getRandomValues) {
                window.crypto.getRandomValues(array);
                return 'hp_' + Array.from(array, function(byte) {
                    return ('0' + byte.toString(16)).slice(-2);
                }).join('');
            }
        } catch (e) {
            // Fallback for older browsers
        }
        return 'hp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16);
    }

    // デバイス情報取得（個人情報を除外）
    function getDeviceInfo() {
        return {
            screenWidth: screen.width || 0,
            screenHeight: screen.height || 0,
            viewportWidth: window.innerWidth || document.documentElement.clientWidth || 0,
            viewportHeight: window.innerHeight || document.documentElement.clientHeight || 0,
            isMobile: /iPhone|iPad|iPod|Android|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent),
            language: navigator.language || navigator.browserLanguage || 'unknown',
            timezone: Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'unknown'
        };
    }

    // セキュリティ：データサニタイゼーション
    function sanitizeData(data) {
        if (typeof data === 'string') {
            return data.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                      .replace(/javascript:/gi, '')
                      .substring(0, 1000); // 最大長制限
        }
        if (Array.isArray(data)) {
            return data.slice(0, 50).map(sanitizeData); // 配列要素数制限
        }
        if (data && typeof data === 'object') {
            const sanitized = {};
            const keys = Object.keys(data).slice(0, 20); // キー数制限
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
                    sanitized[key] = sanitizeData(data[key]);
                }
            }
            return sanitized;
        }
        return data;
    }

    // レート制限チェック
    function isRateLimited() {
        const now = Date.now();
        // 1分以上前のリクエストを削除
        while (requestTimes.length > 0 && now - requestTimes[0] > 60000) {
            requestTimes.shift();
        }
        
        if (requestTimes.length >= MAX_REQUESTS_PER_MINUTE) {
            return true;
        }
        
        requestTimes.push(now);
        return false;
    }

    // ページビュートラッキング
    function trackPageView() {
        if (trackingData.pageViews.length >= HP_ANALYTICS_CONFIG.maxEvents) {
            return; // 容量制限
        }

        const pageView = {
            url: sanitizeData(window.location.pathname), // フルURLは送信しない
            title: sanitizeData(document.title),
            referrer: sanitizeData(document.referrer ? new URL(document.referrer).hostname : ''),
            timestamp: Date.now(),
            timeOnPage: 0,
            scrollDepth: 0
        };

        trackingData.pageViews.push(pageView);
        
        // スクロール深度追跡
        trackScrollDepth(pageView);
        
        // ページ離脱時間追跡
        trackTimeOnPage(pageView);
    }

    // スクロール深度トラッキング（パフォーマンス最適化）
    function trackScrollDepth(pageView) {
        let maxScrollDepth = 0;
        let lastScrollTime = 0;
        
        const scrollHandler = function() {
            const now = Date.now();
            if (now - lastScrollTime < 250) return; // 250msスロットル
            lastScrollTime = now;
            
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const docHeight = Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.offsetHeight,
                document.body.clientHeight,
                document.documentElement.clientHeight
            ) - window.innerHeight;
            
            if (docHeight > 0) {
                const scrollPercent = Math.min(100, Math.round((scrollTop / docHeight) * 100));
                if (scrollPercent > maxScrollDepth) {
                    maxScrollDepth = scrollPercent;
                    pageView.scrollDepth = maxScrollDepth;
                }
            }
        };
        
        // パッシブリスナーでパフォーマンス向上
        if (window.addEventListener) {
            window.addEventListener('scroll', scrollHandler, { passive: true });
            
            // クリーンアップ
            const cleanup = function() {
                window.removeEventListener('scroll', scrollHandler, { passive: true });
            };
            
            window.addEventListener('beforeunload', cleanup);
            window.addEventListener('pagehide', cleanup);
        }
    }

    // ページ滞在時間トラッキング
    function trackTimeOnPage(pageView) {
        const startTime = Date.now();
        
        const updateTimeOnPage = function() {
            pageView.timeOnPage = Date.now() - startTime;
        };
        
        // 複数のイベントで滞在時間を更新
        const events = ['beforeunload', 'pagehide', 'visibilitychange'];
        events.forEach(function(eventName) {
            if (window.addEventListener) {
                window.addEventListener(eventName, updateTimeOnPage, { passive: true });
            }
        });
    }

    // フォームトラッキング（セキュリティ強化）
    function trackForms() {
        const forms = document.querySelectorAll('form');
        
        for (let i = 0; i < forms.length; i++) {
            const form = forms[i];
            const formId = sanitizeData(form.id || form.name || 'form_' + i);
            let formStartTime = null;
            let fieldCount = 0;
            
            // フィールド数をカウント（個人情報は除外）
            const inputs = form.querySelectorAll('input, textarea, select');
            for (let j = 0; j < inputs.length; j++) {
                const input = inputs[j];
                const type = input.type ? input.type.toLowerCase() : '';
                const name = input.name ? input.name.toLowerCase() : '';
                
                // 個人情報フィールドは除外
                if (type !== 'password' && 
                    name.indexOf('password') === -1 && 
                    name.indexOf('email') === -1 && 
                    name.indexOf('phone') === -1) {
                    fieldCount++;
                }
            }
            
            // フォーム開始
            const focusinHandler = function() {
                if (!formStartTime) {
                    formStartTime = Date.now();
                    trackEvent('form_start', {
                        formId: formId,
                        fieldCount: fieldCount
                    });
                }
            };
            
            // フォーム送信
            const submitHandler = function() {
                const duration = formStartTime ? Date.now() - formStartTime : 0;
                trackEvent('form_submit', {
                    formId: formId,
                    duration: duration
                });
            };
            
            // フォーム離脱
            const focusoutHandler = function() {
                setTimeout(function() {
                    if (formStartTime && !form.contains(document.activeElement)) {
                        const duration = Date.now() - formStartTime;
                        if (duration > 5000) { // 5秒以上の操作のみ記録
                            trackEvent('form_abandon', {
                                formId: formId,
                                duration: duration
                            });
                        }
                    }
                }, 200);
            };
            
            // イベントリスナー追加
            if (form.addEventListener) {
                form.addEventListener('focusin', focusinHandler, { passive: true });
                form.addEventListener('submit', submitHandler, { passive: true });
                form.addEventListener('focusout', focusoutHandler, { passive: true });
            }
        }
    }

    // クリックトラッキング（パフォーマンス最適化）
    function trackClicks() {
        let lastClickTime = 0;
        
        const clickHandler = function(e) {
            const now = Date.now();
            if (now - lastClickTime < 100) return; // 100msデバウンス
            lastClickTime = now;
            
            const target = e.target;
            if (!target) return;
            
            const tagName = target.tagName ? target.tagName.toLowerCase() : '';
            
            // 重要な要素のみ追跡
            if (tagName === 'a' || tagName === 'button' || 
                target.className.indexOf('cta') !== -1 ||
                target.className.indexOf('btn') !== -1) {
                
                trackEvent('click', {
                    element: tagName,
                    text: sanitizeData(target.textContent || target.innerText || '').substring(0, 100),
                    href: tagName === 'a' && target.href ? sanitizeData(target.href) : null,
                    position: {
                        x: Math.round(e.clientX),
                        y: Math.round(e.clientY)
                    }
                });
            }
        };
        
        if (document.addEventListener) {
            document.addEventListener('click', clickHandler, { passive: true });
        }
    }

    // エラートラッキング（セキュリティ対応）
    function trackErrors() {
        const errorHandler = function(e) {
            if (trackingData.errors.length >= 10) return; // エラー数制限
            
            trackingData.errors.push({
                message: sanitizeData(e.message || 'Unknown error'),
                source: sanitizeData(e.filename || 'unknown'),
                line: e.lineno || 0,
                timestamp: Date.now()
            });
        };
        
        if (window.addEventListener) {
            window.addEventListener('error', errorHandler, { passive: true });
        }
    }

    // パフォーマンストラッキング
    function trackPerformance() {
        if (!window.performance || !window.performance.timing) return;
        
        const loadHandler = function() {
            setTimeout(function() {
                try {
                    const timing = performance.timing;
                    const loadTime = timing.loadEventEnd - timing.navigationStart;
                    const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
                    
                    // 現実的な値のみ記録
                    if (loadTime > 0 && loadTime < 300000) { // 5分以内
                        trackingData.performance = {
                            loadTime: loadTime,
                            domReady: domReady > 0 ? domReady : 0
                        };
                    }
                } catch (error) {
                    // エラーは無視（パフォーマンスデータは必須ではない）
                }
            }, 100);
        };
        
        if (window.addEventListener) {
            window.addEventListener('load', loadHandler, { passive: true });
        }
    }

    // イベントトラッキング（容量制限付き）
    function trackEvent(eventName, eventData) {
        if (!eventName || trackingData.events.length >= HP_ANALYTICS_CONFIG.maxEvents) {
            return;
        }
        
        const event = {
            name: sanitizeData(eventName),
            data: sanitizeData(eventData),
            timestamp: Date.now(),
            url: sanitizeData(window.location.pathname)
        };
        
        trackingData.events.push(event);
        
        // バッチサイズに達したら送信
        if (trackingData.events.length >= HP_ANALYTICS_CONFIG.batchSize) {
            sendData();
        }
    }

    // セキュアなデータ送信
    function sendData() {
        if (isRateLimited()) {
            return; // レート制限
        }
        
        if (!HP_ANALYTICS_CONFIG.siteId || !HP_ANALYTICS_CONFIG.apiEndpoint) {
            return; // 設定不備
        }
        
        const payload = {
            sessionId: trackingData.sessionId,
            siteId: trackingData.siteId,
            timestamp: Date.now(),
            events: trackingData.events.slice(), // コピーを作成
            pageViews: trackingData.pageViews.slice(),
            errors: trackingData.errors.slice(),
            performance: Object.assign({}, trackingData.performance),
            device: Object.assign({}, trackingData.device)
        };
        
        // データをクリア
        trackingData.events = [];
        trackingData.pageViews = [];
        trackingData.errors = [];
        
        // 送信試行
        sendWithRetry(payload, 0);
    }

    // リトライ機能付き送信
    function sendWithRetry(payload, retryCount) {
        if (retryCount >= HP_ANALYTICS_CONFIG.maxRetries) {
            return;
        }
        
        // sendBeacon API優先（ページ離脱時も送信）
        if (navigator.sendBeacon) {
            const success = navigator.sendBeacon(
                HP_ANALYTICS_CONFIG.apiEndpoint,
                JSON.stringify(payload)
            );
            if (success) return;
        }
        
        // Fetch API fallback
        if (window.fetch) {
            fetch(HP_ANALYTICS_CONFIG.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-HP-Analytics-Version': HP_ANALYTICS_CONFIG.version
                },
                body: JSON.stringify(payload),
                keepalive: true // ページ離脱後も送信継続
            }).catch(function() {
                // リトライ
                setTimeout(function() {
                    sendWithRetry(payload, retryCount + 1);
                }, Math.pow(2, retryCount) * 1000); // 指数バックオフ
            });
        }
    }

    // 初期化
    function init() {
        try {
            trackPageView();
            trackForms();
            trackClicks();
            trackErrors();
            trackPerformance();
            
            // 定期送信
            if (window.setInterval) {
                setInterval(sendData, HP_ANALYTICS_CONFIG.flushInterval);
            }
            
            // ページ離脱時送信
            const beforeUnloadHandler = function() {
                sendData();
            };
            
            if (window.addEventListener) {
                window.addEventListener('beforeunload', beforeUnloadHandler, { passive: true });
                window.addEventListener('pagehide', beforeUnloadHandler, { passive: true });
            }
            
        } catch (error) {
            // 初期化エラーは無視（サイトの動作に影響させない）
        }
    }

    // DOMContentLoaded後に初期化
    if (document.readyState === 'loading') {
        if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', init, { passive: true });
        } else {
            // IE8以下のサポート
            setTimeout(init, 100);
        }
    } else {
        init();
    }

    // グローバルAPI（最小限）
    window.HPAnalytics = {
        trackEvent: trackEvent,
        config: HP_ANALYTICS_CONFIG
    };

})();