// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - WI Panel Implementation
// Simple modal approach - no embedding, just remote control
// =============================================

window.KLITE_RPMod_Panels = window.KLITE_RPMod_Panels || {};

window.KLITE_RPMod_Panels.WI = {
    modalOpen: false,
    
    load(container, panel) {
        console.log('🌍 Loading WI panel...');
        
        // Create a simple panel with a button
        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
                <div style="text-align: center; max-width: 400px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">🌍</div>
                    <h2 style="color: #e0e0e0; margin-bottom: 20px;">World Info Manager</h2>
                    <p style="color: #999; margin-bottom: 30px; line-height: 1.6;">
                        Manage your World Info entries to add context and lore to your story. 
                        World Info helps the AI remember important details about characters, locations, and events.
                    </p>
                    <button id="klite-rpmod-open-wi" style="
                        padding: 15px 30px;
                        background: #337ab7;
                        border: 1px solid #2e6da4;
                        border-radius: 4px;
                        color: white;
                        font-size: 16px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.backgroundColor='#286090'" 
                       onmouseout="this.style.backgroundColor='#337ab7'">
                        Open World Info Editor
                    </button>
                    
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #333;">
                        <p style="color: #666; font-size: 12px;">
                            <strong>Tip:</strong> Use keywords to trigger World Info entries when those words appear in your story.
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        // Add click handler
        const openButton = document.getElementById('klite-rpmod-open-wi');
        if (openButton) {
            openButton.onclick = () => this.openWIModal();
        }
    },
    
    openWIModal() {
        // Don't open if already open
        if (this.modalOpen) return;
        
        // Check if WI container exists
        let wiContainer = document.getElementById('wi_tab_container');
        
        if (!wiContainer) {
            // Try to initialize WI
            if (typeof btn_wi === 'function') {
                try {
                    // Create a temporary container
                    const tempContainer = document.createElement('div');
                    tempContainer.id = 'wi_tab_container';
                    tempContainer.style.display = 'none';
                    document.body.appendChild(tempContainer);
                    
                    btn_wi();
                    
                    wiContainer = document.getElementById('wi_tab_container');
                } catch (e) {
                    console.error('Failed to initialize WI:', e);
                }
            }
            
            if (!wiContainer) {
                alert('World Info system could not be initialized. Please make sure you have a story loaded.');
                return;
            }
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'klite-rpmod-wi-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            width: 90%;
            max-width: 1200px;
            height: 85vh;
            background: #262626;
            border: 2px solid #444;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            animation: slideIn 0.3s ease;
        `;
        
        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 15px 20px;
            background: #1a1a1a;
            border-bottom: 1px solid #444;
            display: flex;
            justify-content: between;
            align-items: center;
        `;
        
        header.innerHTML = `
            <h2 style="margin: 0; color: #e0e0e0; flex: 1;">World Info Editor</h2>
            <button id="klite-rpmod-wi-close" style="
                background: transparent;
                border: none;
                color: #999;
                font-size: 24px;
                cursor: pointer;
                padding: 0 10px;
                transition: color 0.2s ease;
            " onmouseover="this.style.color='#fff'" 
               onmouseout="this.style.color='#999'">
                ✕
            </button>
        `;
        
        // Create body
        const body = document.createElement('div');
        body.style.cssText = `
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 20px;
        `;
        
        // Show WI container in modal
        wiContainer.style.display = 'block';
        wiContainer.style.visibility = 'visible';
        wiContainer.style.width = '100%';
        wiContainer.classList.remove('hidden');
        
        // Store original parent for restoration
        this.originalParent = wiContainer.parentElement;
        
        // Move WI container to modal
        body.appendChild(wiContainer);
        
        // Update WI display
        if (typeof update_wi === 'function') {
            setTimeout(() => {
                try {
                    update_wi();
                } catch (e) {
                    console.warn('Error updating WI:', e);
                }
            }, 100);
        }
        
        // Assemble modal
        modalContent.appendChild(header);
        modalContent.appendChild(body);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideIn {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        // Close handlers
        const closeModal = () => {
            if (!this.modalOpen) return;
            
            // Move WI container back to body
            document.body.appendChild(wiContainer);
            wiContainer.style.display = 'none';
            
            // Remove modal
            modal.remove();
            style.remove();
            
            this.modalOpen = false;
        };
        
        document.getElementById('klite-rpmod-wi-close').onclick = closeModal;
        
        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };
        
        // Close on Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape' && this.modalOpen) {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        this.modalOpen = true;
    },
    
    openWIModal() {
        // Don't open if already open
        if (this.modalOpen) return;
        
        // Check if WI container exists
        let wiContainer = document.getElementById('wi_tab_container');
        
        if (!wiContainer) {
            // Try to initialize WI
            if (typeof btn_wi === 'function') {
                try {
                    // Create a temporary container
                    const tempContainer = document.createElement('div');
                    tempContainer.id = 'wi_tab_container';
                    tempContainer.style.display = 'none';
                    document.body.appendChild(tempContainer);
                    
                    btn_wi();
                    
                    wiContainer = document.getElementById('wi_tab_container');
                } catch (e) {
                    console.error('Failed to initialize WI:', e);
                }
            }
            
            if (!wiContainer) {
                alert('World Info system could not be initialized. Please make sure you have a story loaded.');
                return;
            }
        }
        
        // Store original parent and position
        this.originalParent = wiContainer.parentElement;
        this.originalNextSibling = wiContainer.nextSibling;
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'klite-rpmod-wi-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            width: 90%;
            max-width: 1200px;
            height: 85vh;
            background: #262626;
            border: 2px solid #444;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            animation: slideIn 0.3s ease;
        `;
        
        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 15px 20px;
            background: #1a1a1a;
            border-bottom: 1px solid #444;
            display: flex;
            justify-content: between;
            align-items: center;
        `;
        
        header.innerHTML = `
            <h2 style="margin: 0; color: #e0e0e0; flex: 1;">World Info Editor</h2>
            <button id="klite-rpmod-wi-close" style="
                background: transparent;
                border: none;
                color: #999;
                font-size: 24px;
                cursor: pointer;
                padding: 0 10px;
                transition: color 0.2s ease;
            " onmouseover="this.style.color='#fff'" 
               onmouseout="this.style.color='#999'">
                ✕
            </button>
        `;
        
        // Create body
        const body = document.createElement('div');
        body.style.cssText = `
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 20px;
        `;
        
        // Show WI container
        wiContainer.style.display = 'block';
        wiContainer.style.visibility = 'visible';
        wiContainer.style.width = '100%';
        wiContainer.classList.remove('hidden');
        
        // Move WI container to modal
        body.appendChild(wiContainer);
        
        // Update WI display
        if (typeof update_wi === 'function') {
            setTimeout(() => {
                try {
                    update_wi();
                } catch (e) {
                    console.warn('Error updating WI:', e);
                }
            }, 100);
        }
        
        // Assemble modal
        modalContent.appendChild(header);
        modalContent.appendChild(body);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Add animations
        const style = document.createElement('style');
        style.setAttribute('data-wi-modal', 'true');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideIn {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        // Close handlers
        const closeModal = () => this.closeModal();
        
        document.getElementById('klite-rpmod-wi-close').onclick = closeModal;
        
        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };
        
        // Close on Escape
        this.escapeHandler = (e) => {
            if (e.key === 'Escape' && this.modalOpen) {
                closeModal();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
        
        this.modalOpen = true;
    },
    
    closeModal() {
        if (!this.modalOpen) return;
        
        const modal = document.getElementById('klite-rpmod-wi-modal');
        const wiContainer = document.getElementById('wi_tab_container');
        
        if (wiContainer && this.originalParent) {
            // Restore WI container to its original position
            if (this.originalNextSibling) {
                this.originalParent.insertBefore(wiContainer, this.originalNextSibling);
            } else {
                this.originalParent.appendChild(wiContainer);
            }
            
            // Reset all styles to default
            wiContainer.style.display = '';
            wiContainer.style.visibility = '';
            wiContainer.style.width = '';
            
            // Ensure it has the hidden class (Lite's default state)
            wiContainer.classList.add('hidden');
        }
        
        // Remove modal
        if (modal) {
            modal.remove();
        }
        
        // Remove style if exists
        const style = document.querySelector('style[data-wi-modal]');
        if (style) {
            style.remove();
        }
        
        // Remove escape handler
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }
        
        this.modalOpen = false;
        this.originalParent = null;
        this.originalNextSibling = null;
    },
};