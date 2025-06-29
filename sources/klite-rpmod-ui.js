// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - UI Components and Styles
// Provides reusable UI components and styling
// =============================================

    window.KLITE_RPMod_UI = {
        // Button styles from mockup
        buttonStyles: {
            primary: `
                padding: 10px 20px;
                background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
                border: 2px solid #5a9fee;
                border-radius: 8px;
                color: white;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
            `,
            secondary: `
                padding: 10px 20px;
                background: #3a3a3a;
                border: 2px solid #4a4a4a;
                border-radius: 8px;
                color: #ccc;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            `,
            danger: `
                padding: 10px 20px;
                background: linear-gradient(135deg, #e24a4a 0%, #bd3535 100%);
                border: 2px solid #ee5a5a;
                border-radius: 8px;
                color: white;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 8px rgba(226, 74, 74, 0.3);
            `,
            text: `
                padding: 10px 20px;
                background: transparent;
                border: none;
                color: #4a90e2;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                text-decoration: underline;
            `
        },

        // Create a styled button
        createButton(text, type = 'primary', onClick) {
            const button = document.createElement('button');
            button.textContent = text;
            button.style.cssText = this.buttonStyles[type] || this.buttonStyles.primary;
            
            // Add hover effect
            button.onmouseover = () => {
                button.style.transform = 'translateY(-1px)';
                button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
            };
            
            button.onmouseout = () => {
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = type === 'primary' || type === 'danger' ? 
                    '0 2px 8px rgba(74, 144, 226, 0.3)' : 'none';
            };
            
            if (onClick) {
                button.onclick = onClick;
            }
            
            return button;
        },

        // Create an input field
        createInput(placeholder, type = 'text') {
            const input = document.createElement('input');
            input.type = type;
            input.placeholder = placeholder;
            input.style.cssText = `
                width: 100%;
                padding: 10px 15px;
                background: #1a1a1a;
                border: 2px solid #3a3a3a;
                border-radius: 8px;
                color: #ddd;
                font-size: 14px;
                transition: all 0.2s ease;
                box-sizing: border-box;
            `;
            
            input.onfocus = () => {
                input.style.borderColor = '#4a90e2';
                input.style.boxShadow = '0 0 0 3px rgba(74, 144, 226, 0.1)';
            };
            
            input.onblur = () => {
                input.style.borderColor = '#3a3a3a';
                input.style.boxShadow = 'none';
            };
            
            return input;
        },

        // Create a textarea
        createTextarea(placeholder, rows = 4) {
            const textarea = document.createElement('textarea');
            textarea.placeholder = placeholder;
            textarea.rows = rows;
            textarea.style.cssText = `
                width: 100%;
                padding: 10px 15px;
                background: #1a1a1a;
                border: 2px solid #3a3a3a;
                border-radius: 8px;
                color: #ddd;
                font-size: 14px;
                font-family: inherit;
                resize: vertical;
                transition: all 0.2s ease;
                box-sizing: border-box;
            `;
            
            textarea.onfocus = () => {
                textarea.style.borderColor = '#4a90e2';
                textarea.style.boxShadow = '0 0 0 3px rgba(74, 144, 226, 0.1)';
            };
            
            textarea.onblur = () => {
                textarea.style.borderColor = '#3a3a3a';
                textarea.style.boxShadow = 'none';
            };
            
            return textarea;
        },

        // Create a section container
        createSection(title, content) {
            const section = document.createElement('div');
            section.style.cssText = `
                margin-bottom: 20px;
                padding: 20px;
                background: #222;
                border: 2px solid #333;
                border-radius: 10px;
            `;
            
            if (title) {
                const header = document.createElement('h3');
                header.textContent = title;
                header.style.cssText = `
                    margin: 0 0 15px 0;
                    color: #ddd;
                    font-size: 16px;
                    font-weight: 600;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #333;
                `;
                section.appendChild(header);
            }
            
            if (content) {
                if (typeof content === 'string') {
                    const contentDiv = document.createElement('div');
                    contentDiv.innerHTML = content;
                    section.appendChild(contentDiv);
                } else {
                    section.appendChild(content);
                }
            }
            
            return section;
        },

        // Create a select dropdown
        createSelect(options, selected) {
            const select = document.createElement('select');
            select.style.cssText = `
                width: 100%;
                padding: 10px 15px;
                background: #1a1a1a;
                border: 2px solid #3a3a3a;
                border-radius: 8px;
                color: #ddd;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
                box-sizing: border-box;
            `;
            
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value || opt;
                option.textContent = opt.label || opt;
                if (selected === option.value) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            
            select.onfocus = () => {
                select.style.borderColor = '#4a90e2';
            };
            
            select.onblur = () => {
                select.style.borderColor = '#3a3a3a';
            };
            
            return select;
        },

        // Create a checkbox with label
        createCheckbox(label, checked = false) {
            const container = document.createElement('label');
            container.style.cssText = `
                display: flex;
                align-items: center;
                cursor: pointer;
                user-select: none;
                margin-bottom: 10px;
            `;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = checked;
            checkbox.style.cssText = `
                width: 20px;
                height: 20px;
                margin-right: 10px;
                cursor: pointer;
            `;
            
            const labelText = document.createElement('span');
            labelText.textContent = label;
            labelText.style.cssText = `
                color: #ccc;
                font-size: 14px;
            `;
            
            container.appendChild(checkbox);
            container.appendChild(labelText);
            
            return { container, checkbox };
        },

        // Create a slider with label
        createSlider(label, min, max, value, step = 1) {
            const container = document.createElement('div');
            container.style.cssText = `margin-bottom: 15px;`;
            
            const labelDiv = document.createElement('div');
            labelDiv.style.cssText = `
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
            `;
            
            const labelText = document.createElement('span');
            labelText.textContent = label;
            labelText.style.cssText = `color: #ccc; font-size: 14px;`;
            
            const valueText = document.createElement('span');
            valueText.textContent = value;
            valueText.style.cssText = `color: #4a90e2; font-size: 14px;`;
            
            labelDiv.appendChild(labelText);
            labelDiv.appendChild(valueText);
            
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = min;
            slider.max = max;
            slider.value = value;
            slider.step = step;
            slider.style.cssText = `
                width: 100%;
                height: 6px;
                background: #333;
                border-radius: 3px;
                outline: none;
                -webkit-appearance: none;
            `;
            
            // Update value display
            slider.oninput = () => {
                valueText.textContent = slider.value;
            };
            
            container.appendChild(labelDiv);
            container.appendChild(slider);
            
            return { container, slider };
        },

        // Create a divider
        createDivider() {
            const divider = document.createElement('hr');
            divider.style.cssText = `
                border: none;
                border-top: 2px solid #333;
                margin: 20px 0;
            `;
            return divider;
        },

        // Create an info box
        createInfoBox(text, type = 'info') {
            const colors = {
                info: { bg: '#1a3a52', border: '#2a5a82', text: '#6ab7ff' },
                success: { bg: '#1a4a2a', border: '#2a7a4a', text: '#6aff8a' },
                warning: { bg: '#4a3a1a', border: '#7a5a2a', text: '#ffb76a' },
                error: { bg: '#4a1a1a', border: '#7a2a2a', text: '#ff6a6a' }
            };
            
            const color = colors[type] || colors.info;
            
            const box = document.createElement('div');
            box.style.cssText = `
                padding: 15px;
                background: ${color.bg};
                border: 2px solid ${color.border};
                border-radius: 8px;
                color: ${color.text};
                font-size: 14px;
                margin-bottom: 15px;
            `;
            box.textContent = text;
            
            return box;
        },

        // Show a notification
        showNotification(message, type = 'info', duration = 3000) {
            const notification = this.createInfoBox(message, type);
            notification.style.cssText += `
                position: fixed;
                top: 20px;
                right: 20px;
                max-width: 400px;
                z-index: 10000;
                animation: slideIn 0.3s ease;
            `;
            
            document.body.appendChild(notification);
            
            window.setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                window.setTimeout(() => notification.remove(), 300);
            }, duration);
        }
    };

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
