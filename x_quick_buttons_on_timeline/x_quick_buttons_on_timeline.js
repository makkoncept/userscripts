// ==UserScript==
// @name         X Quick Buttons on Timeline
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Adds quick "Not Interested" and "Block" buttons to tweets on the timeline
// @author       Mayank Nader
// @match        https://twitter.com/*
// @match        https://x.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const PREFIX = 'xqb';
    const LOG = `[${PREFIX}]`;

    const STYLES = `
        /* When stealth class is active, hide X's dropdown layer entirely */
        body.${PREFIX}-stealth #layers {
            opacity: 0 !important;
            pointer-events: none !important;
        }

        .${PREFIX}-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
            color: rgb(113, 118, 123);
            transition: color 0.2s, background-color 0.2s;
        }
        .${PREFIX}-btn svg {
            width: 1.25em;
            height: 1.25em;
            pointer-events: none;
        }
        .${PREFIX}-dismiss:hover {
            background-color: rgba(249, 24, 128, 0.1);
            color: rgb(249, 24, 128);
        }
        .${PREFIX}-block:hover {
            background-color: rgba(244, 33, 46, 0.1);
            color: rgb(244, 33, 46);
        }
    `;

    // --- Icons ---

    function makeSVG(pathD) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'currentColor');
        svg.setAttribute('aria-hidden', 'true');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        svg.appendChild(path);
        return svg;
    }

    // Cross / X icon
    const DISMISS_ICON = 'M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z';

    // Block / circle-slash icon
    const BLOCK_ICON = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9A7.902 7.902 0 014 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1A7.902 7.902 0 0120 12c0 4.42-3.58 8-8 8z';

    // --- Core Actions ---

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // Hide X's dropdown layer by toggling a class on body (style already in DOM)
    function hideMenuUI() { document.body.classList.add(`${PREFIX}-stealth`); }
    function restoreMenuUI() { document.body.classList.remove(`${PREFIX}-stealth`); }

    async function openCaretMenu(article) {
        const caret = article.querySelector('[data-testid="caret"]');
        if (!caret) return false;
        caret.click();
        await sleep(300);
        return true;
    }

    async function clickMenuItem(pattern) {
        for (const item of document.querySelectorAll('[role="menuitem"]')) {
            if (pattern.test(item.textContent)) {
                item.click();
                await sleep(200);
                document.querySelector('[data-testid="confirmationSheetConfirm"]')?.click();
                return true;
            }
        }
        return false;
    }

    async function dismissPost(article) {
        hideMenuUI();
        try {
            if (await openCaretMenu(article)) {
                await clickMenuItem(/not interested|not helpful/i);
            }
        } finally {
            restoreMenuUI();
        }
    }

    async function blockUser(article) {
        hideMenuUI();
        try {
            if (await openCaretMenu(article)) {
                await clickMenuItem(/block/i);
            }
        } finally {
            restoreMenuUI();
        }
    }

    // --- DOM ---

    function buildActionButton({ className, title, iconPath, action, article }) {
        const wrap = document.createElement('div');
        wrap.className = `${PREFIX}-wrap`;

        const btn = document.createElement('button');
        btn.className = `${PREFIX}-btn ${className}`;
        btn.title = title;
        btn.setAttribute('aria-label', title);
        btn.setAttribute('type', 'button');
        btn.appendChild(makeSVG(iconPath));

        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            btn.disabled = true;
            btn.style.opacity = '0.4';
            await action(article);
            btn.disabled = false;
            btn.style.opacity = '';
        });

        wrap.appendChild(btn);
        return wrap;
    }

    function processTweet(article) {
        if (article.dataset[PREFIX]) return;
        const group = article.querySelector('[role="group"]');
        if (!group) return;

        article.dataset[PREFIX] = '1';

        group.appendChild(buildActionButton({
            className: `${PREFIX}-dismiss`,
            title: 'Not interested',
            iconPath: DISMISS_ICON,
            action: dismissPost,
            article,
        }));

        group.appendChild(buildActionButton({
            className: `${PREFIX}-block`,
            title: 'Block user',
            iconPath: BLOCK_ICON,
            action: blockUser,
            article,
        }));
    }

    // --- Init ---

    const sheet = document.createElement('style');
    sheet.textContent = STYLES;
    document.head.appendChild(sheet);

    const run = () => document.querySelectorAll('article[data-testid="tweet"]').forEach(processTweet);
    run();

    new MutationObserver(mutations => {
        if (mutations.some(m => m.addedNodes.length)) run();
    }).observe(document.body, { childList: true, subtree: true });

    console.log(LOG, 'ready');
})();
