/**
 * HP改善分析システム - プロダクション版トラッキングタグ
 * セキュリティ強化 + パフォーマンス最適化 + ブラウザ互換性対応
 * Version: 2.0.0
 */

(function() {
    'use strict';

    // 設定（本番環境用）
    let HP_ANALYTICS_CONFIG = {
        apiEndpoint: 'https://hp-analytics-system.vercel.app/api/track', // 修正: 有効なエンドポイント
        siteId: '', // 設置時に設定
        debug: true, // デバッグ用に一時的にtrue
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
    let trackingData = {
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
        if (HP_ANALYTICS_CONFIG.debug) {
            console.log('📊 HP Analytics: Starting data send process');
        }
        
        if (isRateLimited()) {
            if (HP_ANALYTICS_CONFIG.debug) {
                console.warn('📊 HP Analytics: Request rate limited');
            }
            return; // レート制限
        }
        
        // siteId未設定時の処理
        if (!HP_ANALYTICS_CONFIG.siteId) {
            if (HP_ANALYTICS_CONFIG.debug) {
                console.error('📊 HP Analytics: siteId is not set. Data will not be sent to API but saved locally in debug mode.');
                
                // デバッグモードでは localStorage に保存
                saveToLocalStorage({
                    error: 'siteId not configured',
                    timestamp: Date.now(),
                    data: {
                        events: trackingData.events.slice(),
                        pageViews: trackingData.pageViews.slice(),
                        errors: trackingData.errors.slice(),
                        performance: Object.assign({}, trackingData.performance),
                        device: Object.assign({}, trackingData.device)
                    }
                });
            }
            return; // siteId未設定
        }
        
        if (!HP_ANALYTICS_CONFIG.apiEndpoint) {
            if (HP_ANALYTICS_CONFIG.debug) {
                console.error('📊 HP Analytics: API endpoint is not configured');
            }
            return; // API設定不備
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
        
        if (HP_ANALYTICS_CONFIG.debug) {
            console.log('📊 HP Analytics: Preparing to send payload', payload);
            
            // デバッグモードではlocalStorageに保存
            saveToLocalStorage(payload);
        }
        
        // データをクリア
        trackingData.events = [];
        trackingData.pageViews = [];
        trackingData.errors = [];
        
        // 送信試行
        sendWithRetry(payload, 0);
    }
    
    // デバッグモード時のlocalStorage保存
    function saveToLocalStorage(payload) {
        try {
            // XSS対策: データのサニタイズ
            const sanitizedPayload = sanitizeData(payload);
            const existingData = JSON.parse(localStorage.getItem('hp_analytics_debug_data') || '[]');
            
            // 容量制限チェック（5MBまで）
            const dataSize = JSON.stringify(existingData).length;
            if (dataSize > 5 * 1024 * 1024) {
                // 古いデータを削除（最新50件のみ保持）
                existingData.splice(0, existingData.length - 50);
                if (HP_ANALYTICS_CONFIG.debug) {
                    console.log('📊 HP Analytics: Cleaned old localStorage data due to size limit');
                }
            }
            
            existingData.push({
                ...sanitizedPayload,
                savedAt: new Date().toISOString(),
                debugMode: true
            });
            
            localStorage.setItem('hp_analytics_debug_data', JSON.stringify(existingData));
            
            if (HP_ANALYTICS_CONFIG.debug) {
                console.log('📊 HP Analytics: Data saved to localStorage. Total items:', existingData.length);
                console.log('📊 HP Analytics: View debug data with: JSON.parse(localStorage.getItem("hp_analytics_debug_data"))');
            }
        } catch (error) {
            if (HP_ANALYTICS_CONFIG.debug) {
                console.error('📊 HP Analytics: Failed to save to localStorage:', error.message);
            }
        }
    }

    // リトライ機能付き送信
    function sendWithRetry(payload, retryCount) {
        if (retryCount >= HP_ANALYTICS_CONFIG.maxRetries) {
            if (HP_ANALYTICS_CONFIG.debug) {
                console.error('📊 HP Analytics: Max retry attempts reached. Data sending failed permanently.');
                
                // 最終的にlocalStorageに保存（デバッグモード時）
                saveToLocalStorage({
                    ...payload,
                    error: 'Max retries exceeded',
                    finalAttempt: true
                });
            }
            return;
        }
        
        if (HP_ANALYTICS_CONFIG.debug) {
            console.log(`📊 HP Analytics: Sending data attempt ${retryCount + 1}/${HP_ANALYTICS_CONFIG.maxRetries + 1}`);
        }
        
        // sendBeacon API優先（ページ離脱時も送信）
        if (navigator.sendBeacon) {
            try {
                const success = navigator.sendBeacon(
                    HP_ANALYTICS_CONFIG.apiEndpoint,
                    JSON.stringify(payload)
                );
                
                if (success) {
                    if (HP_ANALYTICS_CONFIG.debug) {
                        console.log('📊 HP Analytics: Data sent successfully via sendBeacon');
                    }
                    return;
                } else {
                    if (HP_ANALYTICS_CONFIG.debug) {
                        console.warn('📊 HP Analytics: sendBeacon returned false, falling back to fetch');
                    }
                }
            } catch (beaconError) {
                if (HP_ANALYTICS_CONFIG.debug) {
                    console.warn('📊 HP Analytics: sendBeacon failed:', beaconError.message);
                }
            }
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
            })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }
                
                if (HP_ANALYTICS_CONFIG.debug) {
                    console.log('📊 HP Analytics: Data sent successfully via fetch. Status:', response.status);
                }
            })
            .catch(function(error) {
                if (HP_ANALYTICS_CONFIG.debug) {
                    console.error(`📊 HP Analytics: Fetch failed (attempt ${retryCount + 1}):`, error.message);
                }
                
                // ネットワークエラーの詳細をログに記録
                const isNetworkError = error.name === 'TypeError' || error.message.includes('network') || error.message.includes('fetch');
                const isTimeoutError = error.name === 'TimeoutError' || error.message.includes('timeout');
                const is5xxError = error.message.includes('status: 5');
                
                // リトライ可能なエラーかチェック
                const shouldRetry = isNetworkError || isTimeoutError || is5xxError;
                
                if (shouldRetry) {
                    const retryDelay = Math.pow(2, retryCount) * 1000; // 指数バックオフ
                    
                    if (HP_ANALYTICS_CONFIG.debug) {
                        console.log(`📊 HP Analytics: Retrying in ${retryDelay}ms...`);
                    }
                    
                    // リトライ
                    setTimeout(function() {
                        sendWithRetry(payload, retryCount + 1);
                    }, retryDelay);
                } else {
                    if (HP_ANALYTICS_CONFIG.debug) {
                        console.error('📊 HP Analytics: Non-retryable error occurred:', error.message);
                        
                        // 回復不可能なエラーの場合はlocalStorageに保存
                        saveToLocalStorage({
                            ...payload,
                            error: 'Non-retryable error: ' + error.message,
                            errorType: 'permanent'
                        });
                    }
                }
            });
        } else {
            if (HP_ANALYTICS_CONFIG.debug) {
                console.error('📊 HP Analytics: Neither sendBeacon nor fetch is available');
            }
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
        config: HP_ANALYTICS_CONFIG,
        // 設定更新関数
        updateConfig: function(newConfig) {
            if (newConfig && typeof newConfig === 'object') {
                Object.assign(HP_ANALYTICS_CONFIG, newConfig);
                // siteIdが更新された場合、trackingDataも更新
                if (newConfig.siteId) {
                    trackingData.siteId = newConfig.siteId;
                }
                if (HP_ANALYTICS_CONFIG.debug) {
                    console.log('📊 HP Analytics: Config updated', HP_ANALYTICS_CONFIG);
                }
            }
        },
        // デバッグ情報取得
        getDebugInfo: function() {
            return {
                config: HP_ANALYTICS_CONFIG,
                trackingData: trackingData,
                isInitialized: true,
                version: HP_ANALYTICS_CONFIG.version
            };
        },
        // 即座にデータ送信
        flush: function() {
            sendData();
        }
    };

})();