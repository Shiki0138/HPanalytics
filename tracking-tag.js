/**
 * HP改善分析システム - トラッキングタグ
 * このスクリプトをあなたのサイトに埋め込んでください
 */

(function() {
    'use strict';

    // 設定
    const HP_ANALYTICS_CONFIG = {
        apiEndpoint: 'http://localhost:8000/api/track', // 実際のエンドポイントに変更してください
        siteId: 'YOUR_SITE_ID', // サイトIDを設定してください
        debug: true // デバッグモード（本番環境ではfalseに）
    };

    // トラッキングデータの初期化
    const trackingData = {
        sessionId: generateSessionId(),
        siteId: HP_ANALYTICS_CONFIG.siteId,
        pageViews: [],
        events: [],
        errors: [],
        performance: {},
        device: getDeviceInfo(),
        startTime: Date.now()
    };

    // セッションID生成
    function generateSessionId() {
        return 'hp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // デバイス情報取得
    function getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            screenWidth: screen.width,
            screenHeight: screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
            language: navigator.language
        };
    }

    // ページビュートラッキング
    function trackPageView() {
        const pageView = {
            url: window.location.href,
            title: document.title,
            referrer: document.referrer,
            timestamp: Date.now(),
            timeOnPage: 0,
            scrollDepth: 0,
            exitPoint: null
        };

        trackingData.pageViews.push(pageView);
        
        if (HP_ANALYTICS_CONFIG.debug) {
            console.log('📊 HP Analytics: Page view tracked', pageView);
        }

        // スクロール深度の追跡
        trackScrollDepth(pageView);
        
        // ページ離脱時間の追跡
        trackTimeOnPage(pageView);
    }

    // スクロール深度トラッキング
    function trackScrollDepth(pageView) {
        let maxScrollDepth = 0;
        
        window.addEventListener('scroll', throttle(function() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrollPercent = Math.round((scrollTop / docHeight) * 100);
            
            if (scrollPercent > maxScrollDepth) {
                maxScrollDepth = scrollPercent;
                pageView.scrollDepth = maxScrollDepth;
            }
        }, 500));
    }

    // ページ滞在時間トラッキング
    function trackTimeOnPage(pageView) {
        const startTime = Date.now();
        
        window.addEventListener('beforeunload', function() {
            pageView.timeOnPage = Date.now() - startTime;
            pageView.exitPoint = identifyExitPoint();
            sendData();
        });
    }

    // フォームトラッキング
    function trackForms() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach((form, index) => {
            const formId = form.id || `form_${index}`;
            let formStartTime = null;
            let fieldInteractions = {};
            
            // フォームフォーカス
            form.addEventListener('focusin', function(e) {
                if (!formStartTime) {
                    formStartTime = Date.now();
                    trackEvent('form_start', {
                        formId: formId,
                        formName: form.name || 'unnamed',
                        fieldCount: form.elements.length
                    });
                }
                
                // フィールドごとのインタラクション追跡
                if (e.target.name) {
                    fieldInteractions[e.target.name] = {
                        focused: true,
                        startTime: Date.now()
                    };
                }
            });
            
            // フォーム送信
            form.addEventListener('submit', function(e) {
                const duration = formStartTime ? Date.now() - formStartTime : 0;
                
                trackEvent('form_submit', {
                    formId: formId,
                    duration: duration,
                    completedFields: Object.keys(fieldInteractions).length,
                    success: true
                });
            });
            
            // フォーム離脱
            form.addEventListener('focusout', function(e) {
                // フォームから完全に離脱したかチェック
                setTimeout(() => {
                    if (!form.contains(document.activeElement)) {
                        const duration = formStartTime ? Date.now() - formStartTime : 0;
                        
                        trackEvent('form_abandon', {
                            formId: formId,
                            duration: duration,
                            lastField: e.target.name,
                            completedFields: Object.keys(fieldInteractions).length
                        });
                    }
                }, 100);
            });
        });
    }

    // クリックトラッキング
    function trackClicks() {
        document.addEventListener('click', function(e) {
            const target = e.target;
            const tagName = target.tagName.toLowerCase();
            
            // 重要な要素のクリックを追跡
            if (tagName === 'a' || tagName === 'button' || target.classList.contains('cta')) {
                trackEvent('click', {
                    element: tagName,
                    text: target.textContent.trim().substring(0, 50),
                    href: target.href || null,
                    classes: target.className,
                    id: target.id,
                    position: {
                        x: e.clientX,
                        y: e.clientY
                    }
                });
            }
        });
    }

    // エラートラッキング
    function trackErrors() {
        window.addEventListener('error', function(e) {
            trackingData.errors.push({
                message: e.message,
                source: e.filename,
                line: e.lineno,
                column: e.colno,
                timestamp: Date.now(),
                userAgent: navigator.userAgent
            });
            
            if (HP_ANALYTICS_CONFIG.debug) {
                console.error('📊 HP Analytics: Error tracked', e);
            }
        });
    }

    // パフォーマンストラッキング
    function trackPerformance() {
        window.addEventListener('load', function() {
            setTimeout(() => {
                const perfData = performance.timing;
                const loadTime = perfData.loadEventEnd - perfData.navigationStart;
                const domReady = perfData.domContentLoadedEventEnd - perfData.navigationStart;
                const firstPaint = performance.getEntriesByType('paint')[0]?.startTime || 0;
                
                trackingData.performance = {
                    loadTime: loadTime,
                    domReady: domReady,
                    firstPaint: firstPaint,
                    resources: performance.getEntriesByType('resource').length
                };
                
                if (HP_ANALYTICS_CONFIG.debug) {
                    console.log('📊 HP Analytics: Performance tracked', trackingData.performance);
                }
            }, 0);
        });
    }

    // イベントトラッキング
    function trackEvent(eventName, eventData) {
        const event = {
            name: eventName,
            data: eventData,
            timestamp: Date.now(),
            url: window.location.href
        };
        
        trackingData.events.push(event);
        
        if (HP_ANALYTICS_CONFIG.debug) {
            console.log('📊 HP Analytics: Event tracked', event);
        }
        
        // 重要なイベントは即座に送信
        if (['form_abandon', 'error', 'cart_abandon'].includes(eventName)) {
            sendData();
        }
    }

    // 離脱ポイントの特定
    function identifyExitPoint() {
        const lastInteraction = trackingData.events[trackingData.events.length - 1];
        return {
            element: lastInteraction?.data?.element || 'unknown',
            action: lastInteraction?.name || 'none',
            timestamp: Date.now()
        };
    }

    // データ送信
    function sendData() {
        if (HP_ANALYTICS_CONFIG.debug) {
            console.log('📊 HP Analytics: Sending data', trackingData);
            
            // ローカルストレージに保存（デバッグ用）
            const existingData = JSON.parse(localStorage.getItem('hp_analytics_data') || '[]');
            existingData.push({
                ...trackingData,
                sentAt: new Date().toISOString()
            });
            localStorage.setItem('hp_analytics_data', JSON.stringify(existingData));
            
            console.log('📊 HP Analytics: Data saved to localStorage. View with: JSON.parse(localStorage.getItem("hp_analytics_data"))');
        }
        
        // 実際のAPI送信（本番環境）
        if (!HP_ANALYTICS_CONFIG.debug && HP_ANALYTICS_CONFIG.apiEndpoint) {
            fetch(HP_ANALYTICS_CONFIG.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(trackingData)
            }).catch(err => console.error('HP Analytics: Failed to send data', err));
        }
    }

    // ユーティリティ: スロットリング
    function throttle(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // カート離脱の検出（ECサイト用）
    function trackCartAbandonment() {
        // カートページの検出
        if (window.location.href.includes('cart') || document.querySelector('.cart, #cart')) {
            let cartStartTime = Date.now();
            
            window.addEventListener('beforeunload', function() {
                // 購入完了ページに遷移していない場合
                if (!window.location.href.includes('complete') && !window.location.href.includes('thank')) {
                    trackEvent('cart_abandon', {
                        timeInCart: Date.now() - cartStartTime,
                        url: window.location.href
                    });
                }
            });
        }
    }

    // 検索トラッキング
    function trackSearch() {
        const searchInputs = document.querySelectorAll('input[type="search"], input[name*="search"], input[name*="query"], #search');
        
        searchInputs.forEach(input => {
            let searchStarted = false;
            
            input.addEventListener('focus', () => {
                searchStarted = true;
            });
            
            input.addEventListener('blur', () => {
                if (searchStarted && input.value.trim()) {
                    trackEvent('search', {
                        query: input.value.trim(),
                        results: document.querySelectorAll('.search-result, .product-item').length
                    });
                }
                searchStarted = false;
            });
        });
    }

    // 初期化
    function init() {
        console.log('📊 HP Analytics: Initializing tracking...');
        
        // 各トラッキング機能を有効化
        trackPageView();
        trackForms();
        trackClicks();
        trackErrors();
        trackPerformance();
        trackCartAbandonment();
        trackSearch();
        
        // 定期的なデータ送信（30秒ごと）
        setInterval(sendData, 30000);
        
        console.log('📊 HP Analytics: Tracking initialized successfully!');
    }

    // DOMContentLoaded後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // グローバルAPIの公開
    window.HPAnalytics = {
        trackEvent: trackEvent,
        getTrackingData: () => trackingData,
        sendData: sendData,
        config: HP_ANALYTICS_CONFIG
    };

})();