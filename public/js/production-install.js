/**
 * Production Install Page JavaScript
 * External script to comply with CSP and fix error handling
 */

'use strict';

// Input validation functions
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.replace(/<script[^>]*>.*?<\/script>/gi, '')
               .replace(/[<>'"&]/g, (char) => {
                   const entityMap = {
                       '<': '&lt;',
                       '>': '&gt;',
                       '"': '&quot;',
                       "'": '&#39;',
                       '&': '&amp;'
                   };
                   return entityMap[char] || char;
               })
               .trim()
               .substring(0, 2048);
}

function validateSiteUrl(url) {
    if (!url || typeof url !== 'string') {
        return { valid: false, error: 'URLを入力してください' };
    }
    
    const sanitized = sanitizeInput(url);
    if (sanitized !== url) {
        return { valid: false, error: '無効な文字が含まれています' };
    }
    
    if (!isValidUrl(url)) {
        return { valid: false, error: '有効なURLを入力してください（http://またはhttps://で開始）' };
    }
    
    if (url.length > 2048) {
        return { valid: false, error: 'URLが長すぎます' };
    }
    
    return { valid: true, url: sanitized };
}

// Generate Site ID with validation
function generateSiteId() {
    const rawUrl = document.getElementById('siteUrl').value;
    const validation = validateSiteUrl(rawUrl);
    
    if (!validation.valid) {
        alert(validation.error);
        return;
    }
    
    // Generate unique ID with additional security
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const urlHash = btoa(validation.url).substring(0, 8).replace(/[^a-zA-Z0-9]/g, '');
    const siteId = 'site_' + timestamp + '_' + random + '_' + urlHash;
    
    // Validate generated siteId
    if (!/^[a-zA-Z0-9_]+$/.test(siteId)) {
        alert('サイトID生成に失敗しました。もう一度お試しください。');
        return;
    }
    
    // Show result (using textContent for security)
    document.getElementById('generatedSiteId').textContent = siteId;
    document.getElementById('siteIdResult').classList.remove('hidden');
    
    // Update tracking code (using textContent for security)
    document.getElementById('siteIdPlaceholder').textContent = siteId;
    
    // Smooth scroll to next step
    setTimeout(function() {
        const nextStep = document.querySelector('.step-card:nth-child(2)');
        if (nextStep) {
            nextStep.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }, 500);
}

// Copy tracking code
function copyCode() {
    const codeElement = document.getElementById('trackingCode');
    const textToCopy = codeElement.textContent;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).then(function() {
            const button = document.getElementById('copyBtn');
            button.textContent = 'コピー完了!';
            button.classList.add('copied');
            
            setTimeout(function() {
                button.textContent = 'コピー';
                button.classList.remove('copied');
            }, 2000);
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        const button = document.getElementById('copyBtn');
        button.textContent = 'コピー完了!';
        button.classList.add('copied');
        
        setTimeout(function() {
            button.textContent = 'コピー';
            button.classList.remove('copied');
        }, 2000);
    }
}

// Verify installation
function verifyInstallation() {
    // Simulate verification
    const checks = ['check1', 'check2', 'check3'];
    let allChecked = true;
    
    checks.forEach(function(id) {
        if (!document.getElementById(id).checked) {
            allChecked = false;
        }
    });
    
    if (allChecked) {
        alert('✅ 設置が正常に完了しました！ダッシュボードで分析結果を確認できます。');
        
        // Auto-check all items
        checks.forEach(function(id) {
            document.getElementById(id).checked = true;
        });
        
        // Scroll to dashboard section
        setTimeout(function() {
            const dashboardStep = document.querySelector('.step-card:nth-child(4)');
            if (dashboardStep) {
                dashboardStep.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
        }, 500);
    } else {
        alert('⚠️ すべての項目を確認してください。問題がある場合はサポートにお問い合わせください。');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Generate button
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateSiteId);
    }
    
    // Copy button
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyCode);
    }
    
    // Verify button
    const verifyBtn = document.getElementById('verifyBtn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', verifyInstallation);
    }
    
    // Enter key support for URL input
    const siteUrlInput = document.getElementById('siteUrl');
    if (siteUrlInput) {
        siteUrlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                generateSiteId();
            }
        });
    }
});