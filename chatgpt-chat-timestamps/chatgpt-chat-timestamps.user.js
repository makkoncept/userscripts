// ==UserScript==
// @name         ChatGPT chat timestamps
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Display create_time and update_time for ChatGPT chats
// @author       Mayank Nader(https://github.com/makkoncept)
// @match        https://chatgpt.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Store conversation data: Map<conversationId, {create_time, update_time, title}>
    const conversationData = new Map();
    
    // Track which conversations have had timestamps injected
    const injectedConversations = new Set();

    /**
     * Format absolute date/time
     */
    function formatAbsolute(date) {
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        const dateStr = date.toLocaleDateString('en-US', options);
        const timeStr = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        return `${dateStr} ${timeStr}`;
    }

    /**
     * Format relative time
     */
    function formatRelative(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        if (diffSecs < 60) {
            return diffSecs <= 1 ? 'just now' : `${diffSecs} seconds ago`;
        } else if (diffMins < 60) {
            return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
        } else if (diffHours < 24) {
            return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        } else if (diffDays < 7) {
            return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
        } else if (diffWeeks < 4) {
            return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
        } else if (diffMonths < 12) {
            return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
        } else {
            return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
        }
    }

    /**
     * Find conversation element by ID in href
     */
    function findConversationElement(conversationId) {
        // Find <a> tag with href containing the conversation ID
        const link = document.querySelector(`a[href="/c/${conversationId}"]`);
        if (link) {
            return link;
        }
        return null;
    }

    /**
     * Inject timestamp into conversation element
     */
    function injectTimestamp(conversationId) {
        if (injectedConversations.has(conversationId)) {
            return;
        }

        const data = conversationData.get(conversationId);
        if (!data) {
            return;
        }

        const linkElement = findConversationElement(conversationId);
        if (!linkElement) {
            return; // Element not found yet, will retry later
        }

        // Check if already has timestamp tooltip
        if (linkElement.hasAttribute('data-timestamp-added')) {
            injectedConversations.add(conversationId);
            return;
        }

        // Format timestamps
        const createDate = new Date(data.create_time);
        const updateDate = new Date(data.update_time);
        const createdAbsolute = formatAbsolute(createDate);
        const createdRelative = formatRelative(createDate);
        const updatedAbsolute = formatAbsolute(updateDate);
        const updatedRelative = formatRelative(updateDate);

        // Add tooltip to the link element using title attribute
        const existingTitle = linkElement.getAttribute('title') || '';
        const tooltipText = `Created: ${createdAbsolute} (${createdRelative})\nUpdated: ${updatedAbsolute} (${updatedRelative})`;
        
        // Combine with existing title if any, or just use our tooltip
        linkElement.setAttribute('title', existingTitle ? `${existingTitle}\n\n${tooltipText}` : tooltipText);
        linkElement.setAttribute('data-timestamp-added', 'true');
        
        injectedConversations.add(conversationId);
        // console.log('[ChatGPT chat timestamps] Tooltip injected:', conversationId);
    }

    /**
     * Process all stored conversations
     */
    function processStoredConversations() {
        conversationData.forEach((data, conversationId) => {
            injectTimestamp(conversationId);
        });
    }

    /**
     * Intercept fetch requests
     */
    function setupFetchInterception() {
        const originalFetch = window.fetch;
        
        window.fetch = async function(...args) {
            const url = args[0];
            let urlString = '';
            
            if (typeof url === 'string') {
                urlString = url;
            } else if (url instanceof Request) {
                urlString = url.url;
            } else if (url && typeof url.toString === 'function') {
                urlString = url.toString();
            }
            
            if (urlString.includes('/backend-api/conversations')) {
                try {
                    const response = await originalFetch.apply(this, args);
                    
                    // Clone response to read it without consuming the original
                    const clonedResponse = response.clone();
                    
                    // Parse and store the response
                    clonedResponse.json().then(data => {
                        if (data?.items && Array.isArray(data.items)) {
                            // console.log('[ChatGPT chat timestamps] Intercepted conversations:', data.items.length);
                            data.items.forEach((item, index) => {
                                if (item.id && item.create_time && item.update_time) {
                                    // Store conversation data
                                    conversationData.set(item.id, {
                                        id: item.id,
                                        title: item.title || '',
                                        create_time: item.create_time,
                                        update_time: item.update_time
                                    });
                                    
                                    // Try to inject if DOM is ready
                                    if (document.readyState === 'complete' || document.readyState === 'interactive') {
                                        setTimeout(() => injectTimestamp(item.id), 100);
                                    }
                                }
                            });
                        }
                    }).catch(err => {
                        // Silently handle errors
                    });
                    
                    return response;
                } catch (error) {
                    return originalFetch.apply(this, args);
                }
            }
            
            // Not a conversations API call, pass through
            return originalFetch.apply(this, args);
        };
    }

    /**
     * Setup MutationObserver to watch for new conversations
     */
    function setupMutationObserver() {
        const observer = new MutationObserver(() => {
            // Debounce processing
            setTimeout(() => {
                processStoredConversations();
            }, 300);
        });

        function startObserving() {
            const targetNode = document.body || document.documentElement;
            if (targetNode) {
                observer.observe(targetNode, {
                    childList: true,
                    subtree: true
                });
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startObserving);
        } else {
            startObserving();
        }
    }

    /**
     * Initialize
     */
    function init() {
        // console.log('[ChatGPT chat timestamps] Script initialized');
        
        // Setup fetch interceptor
        setupFetchInterception();
        
        // Setup MutationObserver when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setupMutationObserver();
                // Process after a delay to let React render
                setTimeout(processStoredConversations, 2000);
            });
        } else {
            setupMutationObserver();
            setTimeout(processStoredConversations, 2000);
        }
    }

    init();
})();

