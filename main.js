import animationManager from "./utils/animationManager.js";

const MODULE_VERSION = "perf-20260512";

const portraitView = document.getElementById("portrait-view");
const landscapeView = document.getElementById("landscape-view");

const mediaQuery = window.matchMedia("(max-width: 768px) or (orientation: portrait)");

let currentMode = null;
let debounceTimer = null;
let orientationVersion = 0;
let portraitModulePromise = null;
let portraitAnimationPromise = null;
let landscapeModulePromise = null;

function loadPortrait() {
    portraitModulePromise ??= import(`./P/main.js?v=${MODULE_VERSION}`);
    portraitAnimationPromise ??= import(`./P/animations.js?v=${MODULE_VERSION}`);
    return Promise.all([portraitModulePromise, portraitAnimationPromise]);
}

function loadLandscape() {
    landscapeModulePromise ??= import(`./L/main.js?v=${MODULE_VERSION}`);
    return landscapeModulePromise;
}

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
async function handleOrientationChange(e) {
    const isPortrait = e.matches;
    const version = ++orientationVersion;
    
    // Avoid unnecessary mode switches
    if (currentMode === (isPortrait ? 'portrait' : 'landscape')) {
        return;
    }

    if (isPortrait) {
        // === PORTRAIT MODE ===
        currentMode = 'portrait';

        if (landscapeModulePromise) {
            const landscape = await landscapeModulePromise;
            if (version !== orientationVersion) return;
            landscape.cleanupLandscape?.();
        }

        portraitView.classList.remove("hidden");
        landscapeView.classList.add("hidden");

        const [portrait, animations] = await loadPortrait();
        if (version !== orientationVersion) return;
        portrait.initPortrait?.();

        requestAnimationFrame(() => {
            if (version === orientationVersion) animations.startPAnimation?.();
        });

    } else {
        // === LANDSCAPE MODE ===
        currentMode = 'landscape';

        if (portraitAnimationPromise) {
            const animations = await portraitAnimationPromise;
            if (version !== orientationVersion) return;
            animations.stopPAnimation?.();
        }

        landscapeView.classList.remove("hidden");
        portraitView.classList.add("hidden");

        const landscape = await loadLandscape();
        if (version !== orientationVersion) return;
        landscape.initLandscape?.();
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
        if (currentMode === 'portrait' && portraitAnimationPromise) {
            portraitAnimationPromise.then(module => module.stopPAnimation?.());
        }
    } else {
        // Page is visible again, resume animations
        if (currentMode === 'portrait' && portraitAnimationPromise) {
            requestAnimationFrame(() => {
                portraitAnimationPromise.then(module => module.startPAnimation?.());
            });
        }
    }
});

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
    clearTimeout(debounceTimer);
    portraitAnimationPromise?.then(module => module.stopPAnimation?.());
    landscapeModulePromise?.then(module => module.cleanupLandscape?.());
    animationManager.cleanupAll();
});
