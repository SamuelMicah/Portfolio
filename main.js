import { startPAnimation, stopPAnimation } from "./P/animations.js";
import { cleanupLandscape } from "./L/main.js";
import animationManager from "./utils/animationManager.js";

const portraitView = document.getElementById("portrait-view");
const landscapeView = document.getElementById("landscape-view");

const mediaQuery = window.matchMedia("(max-width: 768px) or (orientation: portrait)");

let currentMode = null; // Track current mode to avoid unnecessary switches
let debounceTimer = null;

/**
 * Debounce utility to prevent rapid orientation change handling
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, delay = 150) {
    return function(...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Handle orientation/viewport changes
 * @param {MediaQueryListEvent|MediaQueryList} e - Media query event
 */
function handleOrientationChange(e) {
    const isPortrait = e.matches;
    
    // Avoid unnecessary mode switches
    if (currentMode === (isPortrait ? 'portrait' : 'landscape')) {
        return;
    }

    if (isPortrait) {
        // === PORTRAIT MODE ===
        currentMode = 'portrait';
        
        // Cleanup landscape resources first
        if (typeof cleanupLandscape === 'function') {
            cleanupLandscape();
        }
        
        portraitView.classList.remove("hidden");
        landscapeView.classList.add("hidden");

        // Start portrait animations after DOM is ready
        requestAnimationFrame(() => {
            if (typeof startPAnimation === 'function') {
                startPAnimation();
            }
        });

    } else {
        // === LANDSCAPE MODE ===
        currentMode = 'landscape';
        
        // Stop portrait animations first
        if (typeof stopPAnimation === 'function') {
            stopPAnimation();
        }
        
        landscapeView.classList.remove("hidden");
        portraitView.classList.add("hidden");
    }
}

// Debounced version for event listener
const debouncedOrientationChange = debounce(handleOrientationChange, 150);

// Initial setup
handleOrientationChange(mediaQuery);

// Listen for orientation changes with debouncing
mediaQuery.addEventListener("change", debouncedOrientationChange);

// Handle page visibility changes (optional but recommended)
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        // Page is hidden, pause animations to save resources
        if (currentMode === 'portrait' && typeof stopPAnimation === 'function') {
            stopPAnimation();
        }
    } else {
        // Page is visible again, resume animations
        if (currentMode === 'portrait' && typeof startPAnimation === 'function') {
            requestAnimationFrame(() => startPAnimation());
        }
    }
});

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
    clearTimeout(debounceTimer);
    if (typeof stopPAnimation === 'function') {
        stopPAnimation();
    }
    if (typeof cleanupLandscape === 'function') {
        cleanupLandscape();
    }
    animationManager.cleanupAll();
});