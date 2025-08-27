/**
 * Emergency Site ID Generator
 * Standalone JavaScript for production-install-emergency-fix.html
 */

console.log('Emergency fix script loading...');

function generateSiteId() {
    console.log('generateSiteId called');
    
    const urlInput = document.getElementById('siteUrl');
    const url = urlInput ? urlInput.value : '';
    
    if (!url) {
        alert('URLを入力してください');
        return;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        alert('有効なURLを入力してください（http://またはhttps://で開始）');
        return;
    }
    
    // Generate unique ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const siteId = 'site_' + timestamp + '_' + random;
    
    console.log('Generated site ID:', siteId);
    
    // Show result
    const resultDiv = document.getElementById('siteIdResult');
    const idDisplay = document.getElementById('generatedSiteId');
    const placeholder = document.getElementById('siteIdPlaceholder');
    
    if (resultDiv) resultDiv.classList.remove('hidden');
    if (idDisplay) idDisplay.textContent = siteId;
    if (placeholder) placeholder.textContent = siteId;
    
    console.log('Site ID generated successfully');
    
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

function copyCode() {
    console.log('copyCode called');
    
    const codeElement = document.getElementById('trackingCode');
    if (!codeElement) {
        alert('コードが見つかりません');
        return;
    }
    
    const textToCopy = codeElement.textContent;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).then(function() {
            const button = document.getElementById('copyBtnFix');
            if (button) {
                button.textContent = 'コピー完了!';
                button.classList.add('copied');
                
                setTimeout(function() {
                    button.textContent = 'コピー';
                    button.classList.remove('copied');
                }, 2000);
            }
        }).catch(function(err) {
            console.error('Copy failed:', err);
            alert('コピーに失敗しました。手動でコピーしてください。');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            const button = document.getElementById('copyBtnFix');
            if (button) {
                button.textContent = 'コピー完了!';
                setTimeout(function() {
                    button.textContent = 'コピー';
                }, 2000);
            }
        } catch (err) {
            alert('コピーに失敗しました。手動でコピーしてください。');
        }
        
        document.body.removeChild(textArea);
    }
}

// Make functions globally available
window.generateSiteId = generateSiteId;
window.copyCode = copyCode;

// Setup event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, setting up event listeners...');
    
    const generateBtn = document.getElementById('generateBtnFix');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateSiteId);
        console.log('Generate button listener added');
    } else {
        console.error('Generate button not found');
    }
    
    const copyBtn = document.getElementById('copyBtnFix');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyCode);
        console.log('Copy button listener added');
    } else {
        console.error('Copy button not found');
    }
    
    const urlInput = document.getElementById('siteUrl');
    if (urlInput) {
        urlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                generateSiteId();
            }
        });
        console.log('URL input Enter key listener added');
    }
    
    console.log('All event listeners setup complete');
});

console.log('Emergency fix script loaded successfully');