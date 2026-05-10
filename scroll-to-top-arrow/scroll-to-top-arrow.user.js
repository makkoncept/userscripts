// ==UserScript==
// @name         Scroll To Top Arrow
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Shows a minimal bottom-left arrow on websites after scrolling down; click it to smoothly return to the top.
// @author       Mayank Nader
// @match        http://*/*
// @match        https://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const BUTTON_ID = 'mn-scroll-to-top-arrow';
    const VISIBLE_CLASS = 'mn-scroll-to-top-arrow-visible';
    const SCROLL_THRESHOLD = 280;

    if (document.getElementById(BUTTON_ID)) {
        return;
    }

    const style = document.createElement('style');
    style.textContent = `
        #${BUTTON_ID} {
            position: fixed;
            left: 18px;
            bottom: 18px;
            z-index: 2147483647;
            width: 38px;
            height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(31, 35, 40, 0.14);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.92);
            color: #24292f;
            box-shadow: 0 6px 20px rgba(31, 35, 40, 0.14);
            cursor: pointer;
            opacity: 0;
            transform: translateY(12px);
            pointer-events: none;
            transition: opacity 0.18s ease, transform 0.18s ease, background-color 0.18s ease;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
        }

        #${BUTTON_ID}.${VISIBLE_CLASS} {
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
        }

        #${BUTTON_ID}:hover {
            background: rgba(246, 248, 250, 0.98);
        }

        #${BUTTON_ID}:focus-visible {
            outline: 2px solid #0969da;
            outline-offset: 2px;
        }

        #${BUTTON_ID} svg {
            width: 18px;
            height: 18px;
            fill: currentColor;
        }
    `;

    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.title = 'Scroll to top';
    button.setAttribute('aria-label', 'Scroll to top');
    button.innerHTML = `
        <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8.53 3.22a.75.75 0 0 0-1.06 0L3.22 7.47a.75.75 0 0 0 1.06 1.06L7.25 5.56V12.5a.75.75 0 0 0 1.5 0V5.56l2.97 2.97a.75.75 0 0 0 1.06-1.06L8.53 3.22Z"></path>
        </svg>
    `;

    function updateVisibility() {
        button.classList.toggle(VISIBLE_CLASS, window.scrollY > SCROLL_THRESHOLD);
    }

    button.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    document.head.appendChild(style);
    document.body.appendChild(button);

    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility, { passive: true });

    updateVisibility();
})();
