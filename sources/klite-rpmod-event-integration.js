
// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - Event Integration System
// Direct integration with KoboldAI Lite events
// =============================================

window.KLITE_RPMod_EventIntegration = {
    initialized: false,
    originalFunctions: {},
    queuePosition: 0,
    waitTime: 0,
    isHordeConnected: false,
    queueMonitorInterval: null,
    
    init() {
        if (this.initialized) return;
        console.log('🔌 Initializing RPMod Event Integration');
        
        this.hookGenerationEvents();
        this.hookStreamingEvents();
        this.hookQueueEvents();
        this.hookUIEvents();
        this.addSyncMonitor();
        
        this.initialized = true;
    },
    
    hookGenerationEvents() {
        // Hook submit function
        if (typeof window.submit_generation_button === 'function') {
            this.originalFunctions.submit = window.submit_generation_button;
            window.submit_generation_button = (...args) => {
                console.log('🚀 Generation started');
                
                // Update RPMod UI immediately
                if (window.KLITE_RPMod) {
                    KLITE_RPMod.buttonState.isGenerating = true;
                    KLITE_RPMod.startGenerating();
                }
                
                // Call original
                return this.originalFunctions.submit.apply(window, args);
            };
        }
        
        // Hook abort function
        if (typeof window.abort_generation === 'function') {
            this.originalFunctions.abort = window.abort_generation;
            window.abort_generation = (...args) => {
                console.log('🛑 Generation aborted');
                
                // Reset queue display
                this.resetQueueDisplay();
                
                // Update RPMod UI
                if (window.KLITE_RPMod) {
                    KLITE_RPMod.buttonState.isGenerating = false;
                    KLITE_RPMod.stopGenerating();
                }
                
                // Call original
                return this.originalFunctions.abort.apply(window, args);
            };
        }
        
        // Hook generation completion
        if (typeof window.getresult === 'function') {
            this.originalFunctions.getresult = window.getresult;
            window.getresult = (data) => {
                console.log('✅ Generation completed');
                
                // Reset queue display
                this.resetQueueDisplay();
                
                // Update RPMod UI
                if (window.KLITE_RPMod) {
                    KLITE_RPMod.buttonState.isGenerating = false;
                    KLITE_RPMod.stopGenerating();
                    
                    // Update token counts
                    KLITE_RPMod.updateStoryTokenCount();
                }
                
                // Call original
                return this.originalFunctions.getresult.call(window, data);
            };
        }
    },
    
    hookStreamingEvents() {
        // Hook SSE streaming
        if (typeof window.sse_listen === 'function') {
            this.originalFunctions.sse_listen = window.sse_listen;
            window.sse_listen = (callback) => {
                const wrappedCallback = (data) => {
                    // Handle streaming in RPMod
                    this.handleStreamingData(data);
                    
                    // Call original callback
                    return callback(data);
                };
                
                return this.originalFunctions.sse_listen.call(window, wrappedCallback);
            };
        }
        
        // Listen for token events
        window.addEventListener('sse:token', (e) => {
            this.handleStreamingData(e.detail);
        });
    },
    
    handleStreamingData(data) {
        const chatDisplay = document.getElementById('klite-rpmod-chat-display');
        if (!chatDisplay) return;
        
        // Find or create streaming message
        let streamingMsg = chatDisplay.querySelector('.streaming-message');
        if (!streamingMsg) {
            streamingMsg = document.createElement('span');
            streamingMsg.className = 'streaming-message';
            streamingMsg.style.cssText = 'display: block; background: #262626; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #333;';
            chatDisplay.appendChild(streamingMsg);
        }
        
        if (data.token) {
            streamingMsg.textContent += data.token;
            
            // Auto-scroll to bottom
            chatDisplay.scrollTop = chatDisplay.scrollHeight;
        }
        
        if (data.final) {
            streamingMsg.classList.remove('streaming-message');
        }
    },
    
    hookQueueEvents() {
        console.log('🔌 Hooking HordeAI queue events (simplified)');
        
        // Store original console.log
        const originalConsoleLog = console.log;
        
        // Intercept console logs to capture queue data
        console.log = (...args) => {
            // Call original console.log first
            originalConsoleLog.apply(console, args);
            
            // Check connection status periodically
            this.checkHordeConnection();
            
            // Only process if we're connected to Horde
            if (!this.isHordeConnected) return;
            
            try {
                const logStr = args.join(' ');
                
                // Look for Horde queue data
                if (logStr.includes('Still awaiting') && logStr.includes('queue_position')) {
                    const jsonMatch = logStr.match(/\{.*\}/);
                    if (jsonMatch) {
                        const data = JSON.parse(jsonMatch[0]);
                        
                        // Update queue position and wait time
                        if (data.queue_position !== undefined) {
                            this.queuePosition = data.queue_position;
                            this.updateQueueDisplay();
                        }
                        if (data.wait_time !== undefined) {
                            this.waitTime = data.wait_time;
                            this.updateQueueDisplay();
                        }
                        
                        // Check if generation is complete
                        if (data.done === true || data.finished > 0) {
                            console.log('Horde reports generation done, resetting queue');
                            setTimeout(() => {
                                this.resetQueueDisplay();
                            }, 100);
                        }
                    }
                }
                
                // Check for various completion indicators
                if (logStr.includes('Generation completed') || 
                    logStr.includes('Generation aborted') ||
                    logStr.includes('async request: finished') ||
                    logStr.includes('SSE stream closed') ||
                    logStr.includes('getresult') ||
                    logStr.includes('✅ Generation completed') ||
                    logStr.includes('🛑 Generation aborted') ||
                    logStr.includes('Stopping generation')) {
                    console.log('Detected generation end, resetting queue display');
                    this.resetQueueDisplay();
                }
            } catch (e) {
                // Silently fail
            }
        };
        
        // Hook into startGenerating to begin monitoring
        if (window.KLITE_RPMod) {
            const originalStart = window.KLITE_RPMod.startGenerating;
            window.KLITE_RPMod.startGenerating = function() {
                console.log('Starting generation, beginning queue monitoring');
                
                // Call original
                if (originalStart) {
                    originalStart.call(window.KLITE_RPMod);
                }
                
                // Start monitoring during generation
                if (window.KLITE_RPMod_EventIntegration.queueMonitorInterval) {
                    clearInterval(window.KLITE_RPMod_EventIntegration.queueMonitorInterval);
                }
                
                window.KLITE_RPMod_EventIntegration.queueMonitorInterval = setInterval(() => {
                    window.KLITE_RPMod_EventIntegration.checkHordeConnection();
                    
                    // If not Horde, ensure queue is reset
                    if (!window.KLITE_RPMod_EventIntegration.isHordeConnected) {
                        window.KLITE_RPMod_EventIntegration.resetQueueDisplay();
                    }
                    
                    // Check if generation has stopped
                    if (!window.KLITE_RPMod.buttonState.isGenerating) {
                        // If we're not generating but still have queue values, reset them
                        if (window.KLITE_RPMod_EventIntegration.queuePosition !== 0 || 
                            window.KLITE_RPMod_EventIntegration.waitTime !== 0) {
                            console.log('Generation stopped but queue values remain, resetting...');
                            window.KLITE_RPMod_EventIntegration.resetQueueDisplay();
                        }
                        // Stop monitoring
                        clearInterval(window.KLITE_RPMod_EventIntegration.queueMonitorInterval);
                        window.KLITE_RPMod_EventIntegration.queueMonitorInterval = null;
                    }
                }, 500);
            };
        }
        
        // Hook into stopGenerating to ensure cleanup
        if (window.KLITE_RPMod) {
            const originalStop = window.KLITE_RPMod.stopGenerating;
            window.KLITE_RPMod.stopGenerating = function() {
                // Reset queue when generation stops
                window.KLITE_RPMod_EventIntegration.resetQueueDisplay();
                
                // Stop monitoring interval
                if (window.KLITE_RPMod_EventIntegration.queueMonitorInterval) {
                    clearInterval(window.KLITE_RPMod_EventIntegration.queueMonitorInterval);
                    window.KLITE_RPMod_EventIntegration.queueMonitorInterval = null;
                }
                
                // Call original
                if (originalStop) {
                    originalStop.call(window.KLITE_RPMod);
                }
            };
        }
        
        console.log('✅ HordeAI queue monitoring initialized');
    },
    
    checkHordeConnection() {
        const connectionText = document.getElementById('klite-connection-text');
        if (connectionText) {
            const text = connectionText.textContent.toLowerCase();
            this.isHordeConnected = text.includes('horde') || text.includes('ai horde');
        }
    },
    
    updateQueueDisplay() {
        const queueEl = document.getElementById('klite-queue-position');
        const timeEl = document.getElementById('klite-wait-time');
        
        if (queueEl) {
            queueEl.textContent = `#${this.queuePosition}`;
        }
        
        if (timeEl) {
            timeEl.textContent = `${this.waitTime}s`;
        }
    },
    
    resetQueueDisplay() {
        this.queuePosition = 0;
        this.waitTime = 0;
        this.updateQueueDisplay();
    },
    
    hookUIEvents() {
        // Monitor for Lite UI refreshes
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if main container was recreated
                    const mainAdded = Array.from(mutation.addedNodes).some(
                        node => node.id === 'main_container' || node.id === 'gametext'
                    );
                    
                    if (mainAdded) {
                        console.log('🔄 Lite UI recreated, resyncing...');
                        this.resyncWithLite();
                    }
                }
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    },

    addSyncMonitor() {
        // Monitor for changes in Lite UI and sync to RPMod if visible
        const monitorLiteChanges = () => {
            // Only sync if RPMod is visible
            if (document.getElementById('klite-rpmod-container')?.style.display === 'none') {
                return;
            }
            
            // Monitor memory field
            const liteMemory = document.getElementById('memorytext');
            if (liteMemory && !liteMemory.hasAttribute('data-rpmod-monitored')) {
                liteMemory.setAttribute('data-rpmod-monitored', 'true');
                liteMemory.addEventListener('input', () => {
                    const rpmodMemory = document.querySelector('#klite-rpmod-panel-right #memorytext');
                    if (rpmodMemory) {
                        rpmodMemory.value = liteMemory.value;
                    }
                });
            }
            
            // Monitor author's note
            const liteAnote = document.getElementById('anotetext');
            if (liteAnote && !liteAnote.hasAttribute('data-rpmod-monitored')) {
                liteAnote.setAttribute('data-rpmod-monitored', 'true');
                liteAnote.addEventListener('input', () => {
                    const rpmodAnote = document.querySelector('#klite-rpmod-panel-right #anotetext');
                    if (rpmodAnote) {
                        rpmodAnote.value = liteAnote.value;
                    }
                });
            }
        };
        
        // Check periodically for new elements
        setInterval(monitorLiteChanges, 1000);
    },

    resyncWithLite() {
        // Re-sync game text
        if (window.KLITE_RPMod) {
            KLITE_RPMod.syncWithKobold();
        }
        
        // Re-establish event hooks
        setTimeout(() => {
            this.hookGenerationEvents();
        }, 100);
    }
};