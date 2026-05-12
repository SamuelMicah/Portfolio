import animationManager from "./utils/animationManager.js";
import { byId, setVisible } from "./utils/dom.js";

const MODULE_VERSION = "rebuild-20260512";
const mediaQuery = window.matchMedia("(max-width: 768px) or (orientation: portrait)");

class PortfolioApp {
    constructor() {
        this.views = {
            portrait: byId("portrait-view"),
            landscape: byId("landscape-view")
        };
        this.currentMode = null;
        this.switchVersion = 0;
        this.debounceTimer = null;
        this.modules = {
            portrait: null,
            portraitAnimation: null,
            landscape: null
        };
    }

    start() {
        this.switchMode(mediaQuery.matches ? "portrait" : "landscape");
        mediaQuery.addEventListener("change", event => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.switchMode(event.matches ? "portrait" : "landscape");
            }, 150);
        });

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                this.pauseActiveWork();
            } else {
                this.resumeActiveWork();
            }
        });

        window.addEventListener("beforeunload", () => this.destroy());
    }

    async switchMode(nextMode) {
        if (nextMode === this.currentMode) return;

        const version = ++this.switchVersion;
        const previousMode = this.currentMode;
        this.currentMode = nextMode;

        await this.pauseMode(previousMode);
        if (version !== this.switchVersion) return;

        setVisible(this.views.portrait, nextMode === "portrait");
        setVisible(this.views.landscape, nextMode === "landscape");

        if (nextMode === "portrait") {
            const [portrait, animation] = await Promise.all([
                this.loadPortrait(),
                this.loadPortraitAnimation()
            ]);
            if (version !== this.switchVersion) return;

            await portrait.initPortrait();
            requestAnimationFrame(() => {
                if (version === this.switchVersion) animation.startPAnimation();
            });
        } else {
            const landscape = await this.loadLandscape();
            if (version !== this.switchVersion) return;

            await landscape.initLandscape();
        }
    }

    loadPortrait() {
        this.modules.portrait ??= import(`./P/main.js?v=${MODULE_VERSION}`);
        return this.modules.portrait;
    }

    loadPortraitAnimation() {
        this.modules.portraitAnimation ??= import(`./P/animations.js?v=${MODULE_VERSION}`);
        return this.modules.portraitAnimation;
    }

    loadLandscape() {
        this.modules.landscape ??= import(`./L/main.js?v=${MODULE_VERSION}`);
        return this.modules.landscape;
    }

    async pauseMode(mode) {
        if (mode === "portrait" && this.modules.portraitAnimation) {
            const animation = await this.modules.portraitAnimation;
            animation.stopPAnimation();
        }

        if (mode === "landscape" && this.modules.landscape) {
            const landscape = await this.modules.landscape;
            landscape.cleanupLandscape();
        }
    }

    pauseActiveWork() {
        if (this.currentMode === "portrait" && this.modules.portraitAnimation) {
            this.modules.portraitAnimation.then(module => module.stopPAnimation());
        }
    }

    resumeActiveWork() {
        if (this.currentMode === "portrait" && this.modules.portraitAnimation) {
            requestAnimationFrame(() => {
                this.modules.portraitAnimation.then(module => module.startPAnimation());
            });
        }
    }

    destroy() {
        clearTimeout(this.debounceTimer);
        this.modules.portraitAnimation?.then(module => module.stopPAnimation());
        this.modules.landscape?.then(module => module.cleanupLandscape());
        animationManager.cleanupAll();
    }
}

new PortfolioApp().start();
