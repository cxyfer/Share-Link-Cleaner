// ==UserScript==
// @name         Share Link Cleaner
// @namespace    https://github.com/cxyfer/Share-Link-Cleaner
// @version      1.0.0
// @description  A tool to remove tracking parameters from share links, now supports YouTube.
// @author       cxyfer
// @match        https://www.youtube.com/*
// @match        https://www.bilibili.com/*
// @grant        GM_log
// ==/UserScript==

(function() {
    'use strict';

    // YouTube link handler class
    class YouTubeHandler {
        constructor() {
            this.domain = 'youtube.com';
            this.shareButton = null;
            this.copyButton = null;
            this.shareUrlInput = null;
            this.originalCopyFunction = null;
        }

        // Extract video ID and timestamp from URL
        extractVideoInfo(url) {
            // Use regex to match 11-digit video ID
            const videoIdMatch = url.match(/\/([a-zA-Z0-9_-]{11})/);
            // Match time parameter (e.g. &t=42)
            const timeMatch = url.match(/&t=(\d+)/);
            // Extract video ID, return empty string if not found
            const videoId = videoIdMatch ? videoIdMatch[1] : '';
            // Extract time parameter, add &t= prefix if exists
            const time = timeMatch ? '&t=' + timeMatch[1] : '';
            // Return combined result
            return videoId + time;
        }

        // Generate cleaned URL
        generateCleanUrl(originalUrl) {
            return 'https://youtu.be/' + this.extractVideoInfo(originalUrl);
        }

        // Get the ID of the share button
        getShareButtonId() {
            return 'top-level-buttons-computed';
        }

        // Get the ID of the copy button
        getCopyButtonId() {
            return 'copy-button';
        }

        getShareUrlInputId() {
            return 'share-url';
        }

        // Recursively initialize to find the share button
        initialize() {
            if (this.shareButton) return;
            let shareButton = document.getElementById(this.getShareButtonId());
            if (!shareButton) {
                setTimeout(this.initialize.bind(this), 500);
                return;
            } else {
                console.log('Share button:', shareButton);
                this.shareButton = shareButton;
                this.shareButton.addEventListener('click', this.handleShareButtonClick.bind(this));
            }
        }

        // When the share button is clicked, recursively find the copy button and override the copy function
        handleShareButtonClick() {
            if (this.copyButton) return;
            let copyButton = document.getElementById(this.getCopyButtonId());
            if (!copyButton) {
                setTimeout(this.handleShareButtonClick.bind(this), 500);
                return;
            } else {
                this.copyButton = copyButton;
                overrideCopyFunction(this);
            }
        }
    }

    // Bilibili link handler class
    class BilibiliHandler {
        constructor() {
            this.domain = 'bilibili.com';
            this.shareButton = null;
            this.copyButton = null;
            this.shareUrlInput = null;
            this.originalCopyFunction = null;
        }

        // Extract video ID and timestamp from URL
        extractVideoInfo(url) {
            // Use regex to match BV ID format (typically starts with BV followed by 10 characters)
            const videoIdMatch = url.match(/\/BV([a-zA-Z0-9]{10})/);
            // Match time parameter (e.g. &t=127)
            const timeMatch = url.match(/[?&]t=(\d+)/);
            // Extract video ID, return empty string if not found
            const videoId = videoIdMatch ? 'BV' + videoIdMatch[1] : '';
            // Extract time parameter, add ?t= prefix if exists
            const time = timeMatch ? '?t=' + timeMatch[1] : '';
            // Return combined result
            return videoId + time;
        }

        // Generate cleaned URL
        generateCleanUrl(originalUrl) {
            return 'https://b23.tv/' + this.extractVideoInfo(originalUrl);
        }

        // Get the ID of the share button
        getShareButtonId() {
            return 'share-btn-outer';
        }

        initialize() {
            if (this.shareButton) return;
            let shareButton = document.getElementById(this.getShareButtonId());
            if (!shareButton) {
                setTimeout(this.initialize.bind(this), 500);
                return;
            } else {
                console.log('Share button:', shareButton);
                this.shareButton = shareButton;
                this.shareButton.addEventListener('click', this.handleShareButtonClick.bind(this));
            }
        }

        // When the share button is clicked, monitor clipboard for Bilibili links
        handleShareButtonClick() {
            console.log('Share button clicked');
            processClipboardContent(this);
        }
    }

    // Website handler registry
    const handlers = [
        new YouTubeHandler(),
        new BilibiliHandler()
        // Future: add handlers for other websites here
    ];

    // Get handler for current domain
    function getCurrentHandler() {
        const hostname = window.location.hostname;
        console.log('Current hostname:', hostname);
        for (const handler of handlers) {
            if (hostname.includes(handler.domain)) {
                return handler;
            }
        }
        return null;
    }

    // Override the copy-to-clipboard function
    function overrideCopyFunction(handler) {
        // Get copy button element
        const copyButton = document.getElementById(handler.getCopyButtonId());

        // Save original click event handler
        const originalCopyFunction = copyButton.onclick;

        // Set new click event handler
        copyButton.onclick = function() {
            // Get share URL input field
            const shareUrlInput = document.getElementById(handler.getShareUrlInputId());
            // Get original URL
            const originalUrl = shareUrlInput.value;
            // Generate cleaned URL
            const modifiedUrl = handler.generateCleanUrl(originalUrl);
            // Set the modified URL to the share URL input field
            shareUrlInput.value = modifiedUrl;

            // Copy modified URL to clipboard
            navigator.clipboard.writeText(modifiedUrl)
                .then(() => {
                    console.log('Modified URL copied to clipboard:', modifiedUrl);
                })
                .catch(error => {
                    console.error('Error copying modified URL:', error);
                });

            // Call original copy function
            if (originalCopyFunction) {
                originalCopyFunction.apply(this, arguments);
            }
        };
    }

    // Read and paste the clipboard content
    function processClipboardContent(handler) {
        // Read from clipboard
        navigator.clipboard.readText()
            .then(text => {
                console.log('Clipboard content:', text);

                if (!text.includes(handler.domain)) {
                    console.log('No ' + handler.domain + ' URL found in clipboard');
                    return;
                }
                
                // Generate cleaned URL
                const cleanUrl = handler.generateCleanUrl(text);
                
                // Write back to clipboard
                navigator.clipboard.writeText(cleanUrl)
                    .then(() => {
                        console.log('Modified ' + handler.domain + ' URL copied to clipboard:', cleanUrl);
                    })
                    .catch(error => {
                        console.error('Error writing to clipboard:', error);
                    });
            })
            .catch(error => {
                console.error('Error reading from clipboard:', error);
            });
    }

    // Get the current domain handler
    const handler = getCurrentHandler();
    console.log('Handler found:', handler);
        
    // If no handler found, do not proceed
    if (!handler) {
        console.log('Current domain is not supported for link cleaning');
        return;
    }

    // Initialize
    handler.initialize();
})();