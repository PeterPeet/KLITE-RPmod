// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE Character Manager - Panel CSS
// Styles separated for better maintainability
// =============================================

window.KLITE_CharacterManager_CSS = `
    .KLITECharacterManager-panel {
        width: 100%;
        height: 100%;
        background-color: transparent;
        color: #e0e0e0;
        font-family: inherit;
        display: flex;
        flex-direction: column;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-content-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-scroll-container {
        overflow-y: auto;
        width: 100%;
        flex-grow: 1;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-section {
        margin-bottom: 10px;
        border-bottom: 1px solid #444;
        overflow: hidden;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-section-header {
        padding: 8px 10px;
        background-color: #2d2d2d;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-section-header:hover {
        background-color: #333;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-section-header span:last-child {
        margin-left: 10px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-section-content {
        padding: 10px;
        transition: all 0.3s ease;
        overflow: hidden;
        will-change: height;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-section.collapsed .KLITECharacterManager-section-content {
        display: none;
        border-bottom: 1px solid #444;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
        margin-top: 2px;
        align-items: center;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-tag {
        background: #333;
        color: #ccc;
        padding: 2px 5px;
        font-size: 9px;
        border: 1px solid #444;
        border-radius: 3px;
        line-height: 1.2;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-add-tag-btn {
        background: #333;
        color: #ccc;
        border: 1px solid #444;
        width: 16px;
        height: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        transition: all 0.2s;
        border-radius: 3px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-add-tag-btn:hover {
        background: #444;
        color: #fff;
        border-color: #555;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button {
        padding: 6px 12px;
        font-size: 14px;
        border: none;
        border-radius: 4px;
        background-color: #337ab7;
        border: 1px solid #2e6da4;
        color: white;
        cursor: pointer;
        margin: 2px 0;
        transition: background-color 0.3s ease;
        white-space: nowrap;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button:hover {
        background-color: #286090;
        border-color: #204d74;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background-color: #666;
        border-color: #555;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button:disabled:hover {
        opacity: 0.5;
        background-color: #666;
        border-color: #555;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button.scenario-btn {
        background-color: #337ab7;
        border-color: #2e6da4;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button.worldinfo-btn {
        background-color: #337ab7;
        border-color: #2e6da4;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button.delete-btn {
        background-color: #663333;
        border-color: #774444;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button.delete-btn:hover {
        background-color: #774444;
        border-color: #885555;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-input {
        width: 100%;
        padding: 4px 6px;
        background: #0f0f0f;
        border: 1px solid #333;
        color: #e0e0e0;
        margin-bottom: 5px;
        border-radius: 3px;
        box-sizing: border-box;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-input:focus {
        outline: none;
        border-color: #4a90e2;
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
    }

    .KLITECharacterManager-panel .KLITECharacterManager-upload-zone {
        border: 1px dashed #444;
        background: #0f0f0f;
        padding: 8px;
        text-align: center;
        margin-bottom: 8px;
        cursor: pointer;
        font-size: 11px;
        color: #888;
        transition: all 0.2s;
        border-radius: 4px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-upload-zone:hover,
    .KLITECharacterManager-panel .KLITECharacterManager-upload-zone.dragover {
        border-color: #4a90e2;
        background: #1a1a1a;
        color: #4a90e2;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        overflow-y: auto;
        flex: 1;
        padding: 4px;
        max-height: 420px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-card {
        background: #0f0f0f;
        border: 1px solid #333;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
        overflow: hidden;
        border-radius: 6px;
        min-height: 180px;
        display: flex;
        flex-direction: column;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-card:hover {
        border-color: #4a90e2;
        background: #1a1a1a;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(74, 144, 226, 0.2);
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-card.selected {
        border-color: #4a90e2;
        background: #2a2a2a;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-image {
        width: 100%;
        aspect-ratio: 2/3;
        object-fit: cover;
        background: #333;
        display: block;
        flex-shrink: 0;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-info {
        padding: 6px;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-height: 40px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-name {
        font-weight: 600;
        font-size: 12px;
        color: #e0e0e0;
        line-height: 1.2;
        margin-bottom: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        max-height: 30px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-creator {
        font-size: 10px;
        color: #999;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        margin-bottom: 2px;
        line-height: 1.2;
        max-height: 14px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-rating {
        margin-top: auto;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-rating-dropdown {
        width: 100%;
        padding: 2px 4px;
        font-size: 8px;
        background: #0f0f0f;
        color: #ccc;
        border: 1px solid #333;
        border-radius: 2px;
        cursor: pointer;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-rating-dropdown:focus {
        outline: none;
        border-color: #4a90e2;
        background: #1a1a1a;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-view {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #1a1a1a;
        z-index: 1;
        display: none;
        overflow-y: auto;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-view.show {
        display: block;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-header {
        background: #262626;
        border-bottom: 1px solid #444;
        padding: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        position: sticky;
        top: 0;
        z-index: 2;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-actions {
        grid-template-columns: 1fr 1fr;
        display: grid;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
        max-width: 600px;
        margin: 2px 10px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-actions .KLITECharacterManager-button {
        padding: 4px 8px;
        font-size: 12px;
        margin: 1px 0;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-content {
        padding: 15px;
        color: #e0e0e0;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 4;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal:not(.hidden) {
        display: flex;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal-content {
        background: #262626;
        border: 1px solid #444;
        padding: 20px;
        max-width: 400px;
        width: 90%;
        border-radius: 5px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal-content h3 {
        margin-bottom: 15px;
        color: #e0e0e0;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal-content input {
        width: 100%;
        padding: 8px;
        border: 1px solid #444;
        background: #0f0f0f;
        color: #e0e0e0;
        margin-bottom: 15px;
        box-sizing: border-box;
        border-radius: 4px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal-content input:focus {
        outline: none;
        border-color: #4a90e2;
        background: #1a1a1a;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal-buttons {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-success-message {
        background: #1a4a2a;
        color: #6aff8a;
        padding: 8px 12px;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 5;
        border: 1px solid #2a7a4a;
        display: none;
        border-radius: 4px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-success-message.show {
        display: block;
    }

    /* Fullscreen section styles */
    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section {
        margin-bottom: 10px;
        border: 1px solid #444;
        border-radius: 5px;
        overflow: hidden;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-header {
        padding: 8px 10px;
        background-color: #2d2d2d;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
        color: #e0e0e0;
        font-weight: 600;
        font-size: 14px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-header:hover {
        background-color: #333;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-content {
        padding: 10px;
        background-color: #262626;
        color: #ccc;
        font-size: 12px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-wrap: break-word;
        max-height: none;
        overflow: visible;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section.collapsed .KLITECharacterManager-fullscreen-section-content {
        display: none;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-arrow {
        transition: transform 0.2s ease;
        color: #888;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section.collapsed .KLITECharacterManager-fullscreen-section-arrow {
        transform: rotate(-90deg);
    }

    /* Rating filter styles */
    .KLITECharacterManager-panel .KLITECharacterManager-rating-filter {
        width: 100%;
        padding: 4px 6px;
        background: #0f0f0f;
        color: #e0e0e0;
        margin-bottom: 5px;
        border: 1px solid #333;
        border-radius: 3px;
        box-sizing: border-box;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-rating-filter:focus {
        outline: none;
        border-color: #4a90e2;
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
    }

    /* Character info header section */
    .KLITECharacterManager-panel .KLITECharacterManager-character-header {
        background: #262626;
        border: 1px solid #444;
        border-radius: 5px;
        padding: 20px;
        margin-bottom: 10px;
        text-align: center;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-header-image {
        width: 250px;
        height: 375px;
        object-fit: cover;
        border: 1px solid #333;
        background: #1a1a1a;
        border-radius: 8px;
        margin: 0 auto 15px auto;
        display: block;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-header-info {
        text-align: center;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-header-name {
        font-size: 24px;
        font-weight: 600;
        color: #e0e0e0;
        margin-bottom: 5px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-header-meta {
        font-size: 13px;
        color: #888;
        margin-bottom: 10px;
    }

    /* Tags in header */
    .KLITECharacterManager-panel .KLITECharacterManager-character-header-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
        margin-top: 10px;
        justify-content: center;
    }

    /* World info entry styling */
    .KLITECharacterManager-panel .KLITECharacterManager-wi-entry {
        background: #2d2d2d;
        border: 1px solid #3a3a3a;
        padding: 8px;
        margin-bottom: 8px;
        border-radius: 4px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-wi-entry-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-wi-keys {
        font-weight: 600;
        color: #4a90e2;
        font-size: 12px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-wi-options {
        display: flex;
        gap: 8px;
        font-size: 10px;
        color: #777;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-wi-content {
        color: #ccc;
        font-size: 11px;
        line-height: 1.4;
        white-space: pre-wrap;
        word-wrap: break-word;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-rating {
        margin-bottom: 15px;
        text-align: center;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-rating select {
        padding: 4px 8px;
        background: #0f0f0f;
        color: #e0e0e0;
        border: 1px solid #333;
        border-radius: 4px;
        font-size: 12px;
    }

    /* Scrollbar styling */
    .KLITECharacterManager-panel .KLITECharacterManager-scroll-container::-webkit-scrollbar,
    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-content::-webkit-scrollbar {
        width: 8px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-scroll-container::-webkit-scrollbar-track,
    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-content::-webkit-scrollbar-track {
        background: #1a1a1a;
        border-radius: 4px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-scroll-container::-webkit-scrollbar-thumb,
    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-content::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-scroll-container::-webkit-scrollbar-thumb:hover,
    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-content::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
`;
