// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - TEXTDB Panel Implementation
// Simple modal approach - no embedding, just remote control
// =============================================

window.KLITE_RPMod_Panels = window.KLITE_RPMod_Panels || {};

window.KLITE_RPMod_Panels.TEXTDB = {
    modalOpen: false,
    
    load(container, panel) {
        console.log('📚 Loading TextDB panel...');
        
        // Create a simple panel with a button
        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
                <div style="text-align: center; max-width: 400px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">📚</div>
                    <h2 style="color: #e0e0e0; margin-bottom: 20px;">Text Database Manager</h2>
                    <p style="color: #999; margin-bottom: 30px; line-height: 1.6;">
                        Manage your Text Database for semantic search and retrieval. 
                        TextDB helps the AI find relevant information from large documents based on meaning rather than just keywords.
                    </p>
                    <button id="klite-rpmod-open-textdb" style="
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
                        Open Text Database Editor
                    </button>
                    
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #333;">
                        <p style="color: #666; font-size: 12px;">
                            <strong>Tip:</strong> TextDB uses semantic search to find contextually relevant passages from your documents.
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        // Add click handler
        const openButton = document.getElementById('klite-rpmod-open-textdb');
        if (openButton) {
            openButton.onclick = () => this.openTextDBModal();
        }
    },
    
    openTextDBModal() {
        // Don't open if already open
        if (this.modalOpen) return;
        
        // Check if TextDB container exists
        let textdbContainer = document.getElementById('documentdb_tab_container');
        
        if (!textdbContainer) {
            // Try to initialize TextDB
            if (typeof btn_documentdb === 'function') {
                try {
                    // Create a temporary container
                    const tempContainer = document.createElement('div');
                    tempContainer.id = 'documentdb_tab_container';
                    tempContainer.style.display = 'none';
                    document.body.appendChild(tempContainer);
                    
                    btn_documentdb();
                    
                    textdbContainer = document.getElementById('documentdb_tab_container');
                } catch (e) {
                    console.error('Failed to initialize TextDB:', e);
                }
            }
            
            if (!textdbContainer) {
                alert('Text Database system could not be initialized. Please make sure you have a story loaded.');
                return;
            }
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'klite-rpmod-textdb-modal';
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
            <h2 style="margin: 0; color: #e0e0e0; flex: 1;">Text Database Editor</h2>
            <button id="klite-rpmod-textdb-close" style="
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
        
        // Show TextDB container
        textdbContainer.style.display = 'block';
        textdbContainer.style.visibility = 'visible';
        textdbContainer.style.width = '100%';
        textdbContainer.classList.remove('hidden');
        
        // Move TextDB container to modal
        body.appendChild(textdbContainer);
        
        // Update TextDB display
        if (typeof estimate_and_show_textDB_usage === 'function') {
            setTimeout(() => {
                try {
                    estimate_and_show_textDB_usage();
                } catch (e) {
                    console.warn('Error updating TextDB:', e);
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
        style.setAttribute('data-textdb-modal', 'true');
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
        
        document.getElementById('klite-rpmod-textdb-close').onclick = closeModal;
        
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
        
        const modal = document.getElementById('klite-rpmod-textdb-modal');
        const textdbContainer = document.getElementById('documentdb_tab_container');
        
        if (textdbContainer) {
            // Get the memory container and footer as reference
            const memoryContainer = document.getElementById('memory_tab_container');
            const memoryFooter = document.getElementById('memorycontainerfooter');
            const memoryFooter2 = document.getElementById('memorycontainerfooter2');
            
            // Find the correct parent (where memory container is)
            const targetParent = memoryContainer ? memoryContainer.parentElement : document.body;
            
            // Move TextDB container back to the same parent as memory container
            // Insert it before the footer if footer exists
            if (memoryFooter && memoryFooter.parentElement === targetParent) {
                targetParent.insertBefore(textdbContainer, memoryFooter);
            } else if (memoryFooter2 && memoryFooter2.parentElement === targetParent) {
                targetParent.insertBefore(textdbContainer, memoryFooter2);
            } else {
                targetParent.appendChild(textdbContainer);
            }
            
            // Reset all styles to default
            textdbContainer.style.display = '';
            textdbContainer.style.visibility = '';
            textdbContainer.style.width = '';
            
            // Ensure it has the hidden class (Lite's default state)
            textdbContainer.classList.add('hidden');
        }
        
        // Remove modal
        if (modal) {
            modal.remove();
        }
        
        // Remove style if exists
        const style = document.querySelector('style[data-textdb-modal]');
        if (style) {
            style.remove();
        }
        
        // Remove escape handler
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }
        
        this.modalOpen = false;
    },
    
    cleanup() {
        // Close modal if open
        this.closeModal();
    }
};