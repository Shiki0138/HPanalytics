/**
 * AI-Powered Adaptive Design System
 * Next-Generation Interactive Analytics Dashboard 2025
 */

class AIAdaptiveSystem {
    constructor() {
        this.userInteractionData = {
            clicks: 0,
            hovers: 0,
            scrollPattern: [],
            preferredSections: new Map(),
            attentionHeatmap: new Map(),
            sessionStart: Date.now()
        };
        
        this.adaptationRules = new Map();
        this.animationQueue = [];
        this.performanceMetrics = {
            fps: 60,
            smoothness: 1.0,
            cpuUsage: 'low'
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeParticleSystem();
        this.startAdaptiveMonitoring();
        this.setupMagneticCursor();
        this.initializeNeuralConnections();
        this.setupPerformanceMonitoring();
    }

    setupEventListeners() {
        // Track user interactions for AI learning
        document.addEventListener('click', (e) => {
            this.recordInteraction('click', e);
            this.createRippleEffect(e);
        });

        document.addEventListener('mouseover', (e) => {
            this.recordInteraction('hover', e);
            this.updateMagneticEffect(e);
        });

        // Advanced scroll tracking with velocity
        let scrollVelocity = 0;
        let lastScrollY = window.scrollY;
        let scrollTimeout;

        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            scrollVelocity = currentScrollY - lastScrollY;
            lastScrollY = currentScrollY;

            this.updateParallax(currentScrollY, scrollVelocity);
            this.recordScrollPattern(currentScrollY, scrollVelocity);

            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                scrollVelocity = 0;
            }, 100);
        });

        // Intersection Observer for attention tracking
        this.setupAttentionTracking();
    }

    recordInteraction(type, event) {
        this.userInteractionData[type + 's']++;
        
        const element = event.target.closest('[data-importance], .metric-card-v2, .metric-card-3d');
        if (element) {
            const importance = element.dataset.importance || 'medium';
            const current = this.userInteractionData.preferredSections.get(importance) || 0;
            this.userInteractionData.preferredSections.set(importance, current + 1);
            
            // Adaptive importance boosting
            this.boostElementImportance(element, type);
        }
    }

    boostElementImportance(element, interactionType) {
        const currentWeight = parseFloat(element.style.getPropertyValue('--font-variation-weight')) || 400;
        const boostAmount = interactionType === 'click' ? 50 : 25;
        const newWeight = Math.min(900, currentWeight + boostAmount);
        
        element.style.setProperty('--font-variation-weight', newWeight);
        
        // Gradually return to normal
        setTimeout(() => {
            const fadeAmount = boostAmount / 10;
            const interval = setInterval(() => {
                const current = parseFloat(element.style.getPropertyValue('--font-variation-weight'));
                if (current <= 400) {
                    clearInterval(interval);
                    return;
                }
                element.style.setProperty('--font-variation-weight', Math.max(400, current - fadeAmount));
            }, 200);
        }, 2000);
    }

    createRippleEffect(event) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: fixed;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: radial-gradient(circle, 
                color-mix(in oklch, var(--color-primary) 40%, transparent), 
                transparent 70%);
            pointer-events: none;
            z-index: 9999;
            left: ${event.clientX - 10}px;
            top: ${event.clientY - 10}px;
            animation: rippleExpand 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        `;

        document.body.appendChild(ripple);
        
        // Remove after animation
        setTimeout(() => {
            ripple.remove();
        }, 800);
    }

    initializeParticleSystem() {
        const particleContainers = document.querySelectorAll('.metric-card-v2, .metric-card-3d');
        
        particleContainers.forEach((container, index) => {
            if (!container.querySelector('.data-particles')) {
                const particleSystem = document.createElement('div');
                particleSystem.className = 'data-particles';
                
                // Create particles based on data importance
                const importance = container.dataset.importance || 'medium';
                const particleCount = importance === 'critical' ? 12 : importance === 'high' ? 8 : 6;
                
                for (let i = 0; i < particleCount; i++) {
                    const particle = document.createElement('div');
                    particle.className = 'particle';
                    particle.style.cssText = `
                        left: ${Math.random() * 80 + 10}%;
                        top: ${Math.random() * 80 + 10}%;
                        animation-delay: ${Math.random() * 8}s;
                        animation-duration: ${8 + Math.random() * 4}s;
                    `;
                    particleSystem.appendChild(particle);
                }
                
                container.appendChild(particleSystem);
            }
        });
    }

    setupMagneticCursor() {
        const magneticElements = document.querySelectorAll('.metric-card-v2, .metric-card-3d, .morph-button');
        
        magneticElements.forEach(element => {
            element.classList.add('magnetic-element');
            
            element.addEventListener('mousemove', (e) => {
                const rect = element.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                const distance = Math.sqrt(x * x + y * y);
                const maxDistance = 100;
                
                if (distance < maxDistance) {
                    const force = (maxDistance - distance) / maxDistance;
                    const moveX = (x / distance) * force * 8;
                    const moveY = (y / distance) * force * 8;
                    
                    element.style.transform = `translateX(${moveX}px) translateY(${moveY}px) scale(${1 + force * 0.02})`;
                }
            });
            
            element.addEventListener('mouseleave', () => {
                element.style.transform = '';
            });
        });
    }

    initializeNeuralConnections() {
        const dashboard = document.querySelector('.dashboard-grid');
        if (!dashboard) return;

        const connections = document.createElement('div');
        connections.className = 'neural-connections';
        
        // Create connection lines between metric cards
        const cards = dashboard.querySelectorAll('.metric-card-v2, .metric-card-3d');
        
        for (let i = 0; i < cards.length - 1; i++) {
            setTimeout(() => {
                const line = document.createElement('div');
                line.className = 'connection-line';
                line.style.cssText = `
                    width: ${Math.random() * 200 + 100}px;
                    left: ${Math.random() * 80}%;
                    top: ${Math.random() * 80}%;
                    transform: rotate(${Math.random() * 360}deg);
                    animation-delay: ${Math.random() * 3}s;
                `;
                connections.appendChild(line);
            }, i * 500);
        }
        
        dashboard.appendChild(connections);
    }

    setupAttentionTracking() {
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: [0, 0.25, 0.5, 0.75, 1]
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const elementId = entry.target.id || entry.target.className;
                const visibility = entry.intersectionRatio;
                
                // Record attention time
                if (visibility > 0.5) {
                    const current = this.userInteractionData.attentionHeatmap.get(elementId) || 0;
                    this.userInteractionData.attentionHeatmap.set(elementId, current + 1);
                    
                    // Adaptive enhancement for highly viewed elements
                    if (current > 10) {
                        this.enhanceElement(entry.target);
                    }
                }
            });
        }, options);

        // Observe all metric cards and important sections
        document.querySelectorAll('.metric-card-v2, .metric-card-3d, section').forEach(el => {
            observer.observe(el);
        });
    }

    enhanceElement(element) {
        if (element.classList.contains('enhanced')) return;
        
        element.classList.add('enhanced');
        element.style.setProperty('--font-variation-weight', '600');
        element.style.setProperty('--spring-tension', '1.2');
        
        // Add breathing animation for high-attention elements
        element.classList.add('breath-animation');
    }

    updateParallax(scrollY, velocity) {
        document.documentElement.style.setProperty('--scroll-y', scrollY);
        
        const parallaxElements = document.querySelectorAll('.parallax-layer');
        parallaxElements.forEach(element => {
            const speed = element.dataset.speed || 'medium';
            let multiplier = 0.5;
            
            switch (speed) {
                case 'slow': multiplier = 0.2; break;
                case 'fast': multiplier = 0.8; break;
            }
            
            const yPos = -(scrollY * multiplier);
            element.style.transform = `translate3d(0, ${yPos}px, 0)`;
        });
    }

    recordScrollPattern(scrollY, velocity) {
        this.userInteractionData.scrollPattern.push({
            position: scrollY,
            velocity: velocity,
            timestamp: Date.now()
        });
        
        // Keep only last 100 scroll events
        if (this.userInteractionData.scrollPattern.length > 100) {
            this.userInteractionData.scrollPattern.shift();
        }
    }

    setupPerformanceMonitoring() {
        let frames = 0;
        let lastTime = performance.now();
        
        const measureFPS = () => {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                this.performanceMetrics.fps = Math.round((frames * 1000) / (currentTime - lastTime));
                frames = 0;
                lastTime = currentTime;
                
                this.adaptAnimationsToPerformance();
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        measureFPS();
    }

    adaptAnimationsToPerformance() {
        const particles = document.querySelectorAll('.particle');
        
        if (this.performanceMetrics.fps < 30) {
            // Reduce particle count for better performance
            particles.forEach((particle, index) => {
                if (index % 2 === 0) {
                    particle.style.display = 'none';
                }
            });
            
            // Disable some heavy animations
            document.documentElement.style.setProperty('--animation-performance-mode', 'reduced');
        } else if (this.performanceMetrics.fps > 50) {
            // Re-enable all animations
            particles.forEach(particle => {
                particle.style.display = '';
            });
            
            document.documentElement.style.setProperty('--animation-performance-mode', 'full');
        }
    }

    startAdaptiveMonitoring() {
        // Analyze user behavior every 30 seconds
        setInterval(() => {
            this.analyzeUserBehavior();
            this.adaptInterface();
        }, 30000);
    }

    analyzeUserBehavior() {
        const sessionDuration = Date.now() - this.userInteractionData.sessionStart;
        const interactionRate = (this.userInteractionData.clicks + this.userInteractionData.hovers) / (sessionDuration / 1000);
        
        // Determine user engagement level
        let engagementLevel = 'low';
        if (interactionRate > 0.5) engagementLevel = 'high';
        else if (interactionRate > 0.2) engagementLevel = 'medium';
        
        // Store analysis results
        this.userAnalysis = {
            engagementLevel,
            interactionRate,
            preferredImportance: this.getMostInteractedImportance(),
            scrollBehavior: this.analyzeScrollBehavior()
        };
    }

    getMostInteractedImportance() {
        let maxInteractions = 0;
        let mostInteracted = 'medium';
        
        for (const [importance, count] of this.userInteractionData.preferredSections) {
            if (count > maxInteractions) {
                maxInteractions = count;
                mostInteracted = importance;
            }
        }
        
        return mostInteracted;
    }

    analyzeScrollBehavior() {
        const pattern = this.userInteractionData.scrollPattern;
        if (pattern.length < 10) return 'insufficient_data';
        
        const avgVelocity = pattern.reduce((sum, p) => sum + Math.abs(p.velocity), 0) / pattern.length;
        
        if (avgVelocity > 10) return 'fast_scanner';
        if (avgVelocity > 3) return 'normal_reader';
        return 'careful_reader';
    }

    adaptInterface() {
        if (!this.userAnalysis) return;
        
        const { engagementLevel, preferredImportance, scrollBehavior } = this.userAnalysis;
        
        // Adapt based on engagement level
        if (engagementLevel === 'low') {
            this.increaseVisualStimulation();
        } else if (engagementLevel === 'high') {
            this.optimizeForSpeed();
        }
        
        // Adapt based on preferred importance
        this.highlightPreferredContent(preferredImportance);
        
        // Adapt based on scroll behavior
        if (scrollBehavior === 'fast_scanner') {
            this.emphasizeKeyMetrics();
        } else if (scrollBehavior === 'careful_reader') {
            this.provideDetailedInsights();
        }
    }

    increaseVisualStimulation() {
        // Add more animations and visual feedback for low-engagement users
        document.querySelectorAll('.metric-card-v2').forEach(card => {
            card.classList.add('breath-animation');
            card.style.setProperty('--animation-intensity', '1.5');
        });
    }

    optimizeForSpeed() {
        // Reduce animations for high-engagement users who want efficiency
        document.querySelectorAll('.particle').forEach(particle => {
            particle.style.animationDuration = '4s';
        });
    }

    highlightPreferredContent(importance) {
        document.querySelectorAll(`[data-importance="${importance}"]`).forEach(element => {
            element.style.setProperty('--highlight-boost', '1.2');
            element.classList.add('preferred-content');
        });
    }

    emphasizeKeyMetrics() {
        // Make critical metrics more prominent for fast scanners
        document.querySelectorAll('[data-importance="critical"], [data-importance="high"]').forEach(element => {
            element.style.setProperty('--font-variation-weight', '700');
            element.style.setProperty('--scale-emphasis', '1.05');
        });
    }

    provideDetailedInsights() {
        // Add more detailed information for careful readers
        document.querySelectorAll('.metric-card-v2').forEach(card => {
            card.setAttribute('title', 'Click for detailed analysis and trends');
            card.classList.add('detailed-mode');
        });
    }

    // Public API methods
    getAnalytics() {
        return {
            userInteractionData: this.userInteractionData,
            userAnalysis: this.userAnalysis,
            performanceMetrics: this.performanceMetrics
        };
    }

    forceAdaptation() {
        this.analyzeUserBehavior();
        this.adaptInterface();
    }
}

// Initialize the AI Adaptive System when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.aiSystem = new AIAdaptiveSystem();
    });
} else {
    window.aiSystem = new AIAdaptiveSystem();
}

// Add CSS for ripple animation
const style = document.createElement('style');
style.textContent = `
    @keyframes rippleExpand {
        0% {
            transform: scale(0);
            opacity: 1;
        }
        100% {
            transform: scale(20);
            opacity: 0;
        }
    }
    
    .preferred-content {
        position: relative;
    }
    
    .preferred-content::after {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: linear-gradient(45deg, var(--color-primary), var(--color-secondary));
        z-index: -1;
        border-radius: inherit;
        opacity: 0.1;
    }
    
    .detailed-mode {
        cursor: help;
    }
    
    .enhanced {
        position: relative;
        z-index: 2;
    }
`;

document.head.appendChild(style);