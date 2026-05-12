import { loadDataSafely, LandscapeDataURL } from "../utils/data.js";
import animationManager from "../utils/animationManager.js";
import { byId, escapeHtml, setRootVars } from "../utils/dom.js";

const ANIMATION_DURATION = {
    LOADING: 2000,
    BOUNCE: 400
};

const FALLBACK_DATA = {
    "About Me": {
        background_iframe_src: "",
        background_color: "rgba(30, 30, 30)",
        title: "Loading...",
        title_navigation_color: "white",
        project_description: "Loading portfolio data...",
        project_description_color: "white",
        background_blur_filter: "drop-shadow(0px 0px 0px transparent)",
        background_blur_backdrop_filter: "blur(0px)",
        background_blur_color: "transparent",
        background_blur_radius: "0px",
        background_blur_border: ["0px", "0px", "0px", "0px"],
        background_blur_border_color: ["transparent", "transparent", "transparent", "transparent"],
        left_navigation_color: "white",
        right_navigation_color: "white",
        inner_project_filter: "drop-shadow(0px 0px 0px transparent)",
        inner_project_box_shadow: "0 0px 0px transparent",
        inner_project_backdrop_filter: "blur(0px)",
        inner_project_color: "transparent",
        inner_project_radius: "10px",
        inner_project_border: ["0px", "0px", "0px", "0px"],
        inner_project_border_color: ["transparent", "transparent", "transparent", "transparent"],
        project_iframe_src: "",
        pagination: "true",
        pagination_color: "grey",
        pagination_active_color: "deeppink",
        pagination_hover_color: "black"
    }
};

const elements = {
    background: byId("L-background"),
    backgroundBlur: byId("L-background-blur"),
    titleButton: byId("L-title-desktop"),
    projectCarousel: byId('L-project-carousel'),
    projectInnerCarousel: byId('L-project-inner-carousel'),
    leftNav: byId("L-left_navigation"),
    rightNav: byId("L-right_navigation"),
    projectDescription: byId("L-project-description"),
    carouselIndicators: byId("L-carousel-indicators"),
    loadingContainer: byId("L-loading-animation-container")
};

const state = {
    data: {},
    projectNames: [],
    activeIndex: 0,
    isInitialized: false,
    isTransitioning: false
};

async function loadLandscapeData() {
    state.data = await loadDataSafely(
        new URL('../L_DATA.json', import.meta.url).href,
        LandscapeDataURL,
        FALLBACK_DATA
    );
    state.projectNames = Object.keys(state.data);
}

function currentLayout() {
    return state.data[state.projectNames[state.activeIndex]];
}

function normalizeBorder(border) {
    if (Array.isArray(border)) return border;
    if (border && typeof border === "object") {
        return [border.top, border.right, border.bottom, border.left];
    }
    return ["0px", "0px", "0px", "0px"];
}

function buildCarouselFrames() {
    if (!elements.projectInnerCarousel) return;

    const frames = state.projectNames.length
        ? state.projectNames.map((_, index) => (
            `<div class="carousel-item h-100 w-100 absolute top-0 left-0 rounded-xl ${index === 0 ? 'active' : ''}"></div>`
        )).join('')
        : `<div class="carousel-item h-100 w-100 absolute top-0 left-0 rounded-xl active">
            <p>No content available for the carousel.</p>
        </div>`;

    elements.projectInnerCarousel.innerHTML = frames;
}

function initButtons() {
    if (!elements.titleButton || !elements.leftNav || !elements.rightNav) {
        console.error('Navigation buttons not found');
        return;
    }

    elements.titleButton.addEventListener("click", reloadCurrentProject);
    elements.leftNav.addEventListener("click", () => navigateProject(-1));
    elements.rightNav.addEventListener("click", () => navigateProject(1));

    [elements.leftNav, elements.rightNav, elements.carouselIndicators].forEach(el => {
        el?.addEventListener("mouseenter", () => window.focus());
    });
}

function initPagination() {
    if (!elements.carouselIndicators) return;

    const fragment = document.createDocumentFragment();
    elements.carouselIndicators.replaceChildren();

    state.projectNames.forEach((_, index) => {
        const dot = document.createElement("div");
        dot.className = `L-pagination-dot ${index === 0 ? 'active' : ''}`;
        dot.textContent = "+";
        dot.setAttribute("role", "button");
        dot.setAttribute("aria-label", `Go to project ${index + 1}`);
        dot.setAttribute("tabindex", "0");
        dot.setAttribute("data-bs-target", "#L-project-carousel");
        dot.setAttribute("data-bs-slide-to", index.toString());

        dot.addEventListener("click", () => goToProject(index));
        dot.addEventListener("keydown", event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                goToProject(index);
            }
        });

        fragment.appendChild(dot);
    });

    elements.carouselIndicators.appendChild(fragment);
}

function setupCarouselEvents() {
    if (!elements.projectCarousel) return;

    elements.projectCarousel.addEventListener('slide.bs.carousel', event => {
        state.isTransitioning = true;
        loadingIndicator(event.direction === "left" ? 1 : -1);
        unloadLayout();
    });

    elements.projectCarousel.addEventListener('slid.bs.carousel', event => {
        state.activeIndex = event.to ?? getActiveCarouselIndex();
        loadLayout(currentLayout());
        updatePaginationDots();
        state.isTransitioning = false;
    });
}

function getActiveCarouselIndex() {
    const activeItem = elements.projectCarousel?.querySelector('.carousel-item.active');
    const items = Array.from(elements.projectCarousel?.querySelectorAll('.carousel-item') || []);
    return Math.max(0, items.indexOf(activeItem));
}

function updatePaginationDots() {
    elements.carouselIndicators?.querySelectorAll(".L-pagination-dot").forEach((dot, index) => {
        dot.classList.toggle("active", index === state.activeIndex);
    });
}

function toggleNavigation(navElement, enable) {
    if (!navElement) return;

    navElement.disabled = !enable;
    navElement.classList.toggle("L-fade_Out", !enable);

    if (!enable) {
        const otherNav = navElement === elements.rightNav ? elements.leftNav : elements.rightNav;
        otherNav?.classList.add("scroll-down");
    } else {
        navElement.classList.remove("scroll-down");
    }
}

function updateNavigation() {
    toggleNavigation(elements.leftNav, state.activeIndex !== 0);
    toggleNavigation(elements.rightNav, state.activeIndex !== state.projectNames.length - 1);
}

function goToProject(index) {
    if (state.isTransitioning || index === state.activeIndex) return;
    if (index < 0 || index >= state.projectNames.length) return;

    bootstrap.Carousel.getOrCreateInstance(elements.projectCarousel).to(index);
}

function navigateProject(direction) {
    if (state.isTransitioning) return;

    const nextIndex = state.activeIndex + direction;
    if (nextIndex < 0 || nextIndex >= state.projectNames.length) return;

    goToProject(nextIndex);
    bounceNavigation(direction === 1 ? elements.rightNav : elements.leftNav, direction === 1);
}

function bounceNavigation(nav, isRight) {
    if (!nav) return;

    const bounceClass = isRight ? 'L-bounce_right' : 'L-bounce_left';
    nav.disabled = true;
    nav.classList.add(bounceClass);

    const cleanup = () => {
        nav.classList.remove(bounceClass);
        nav.disabled = false;
    };

    nav.addEventListener("transitionend", cleanup, { once: true });
    animationManager.addTimeout(cleanup, ANIMATION_DURATION.BOUNCE);
}

function reloadCurrentProject() {
    if (state.isTransitioning || !elements.titleButton) return;

    state.isTransitioning = true;
    elements.titleButton.disabled = true;
    elements.titleButton.style.color = "transparent";
    elements.titleButton.classList.add("L-delete");

    loadingIndicator(-1);
    loadingIndicator(1);

    const onFirstAnimationEnd = () => {
        const layout = currentLayout();
        if (layout) {
            elements.titleButton.innerHTML = escapeHtml(layout.title);
            elements.titleButton.style.color = layout.title_navigation_color;
        }

        elements.titleButton.classList.remove("L-delete");
        elements.titleButton.classList.add("L-write");

        elements.titleButton.addEventListener("animationend", () => {
            elements.titleButton.disabled = false;
            state.isTransitioning = false;
        }, { once: true });
    };

    elements.titleButton.addEventListener("animationend", onFirstAnimationEnd, { once: true });
}

function loadingIndicator(direction) {
    if (!elements.loadingContainer || typeof lottie === "undefined") return;

    const paths = [
        "./L/loading_animation/purple.json",
        "./L/loading_animation/pink.json",
        "./L/loading_animation/red.json",
        "./L/loading_animation/brown.json",
        "./L/loading_animation/black.json"
    ];

    const loaderAnimationEl = document.createElement("div");
    loaderAnimationEl.classList.add("L-loader-animation");

    const startX = direction === -1 ? "-55vw" : "55vw";
    const endX = direction === -1 ? "55vw" : "-55vw";
    const scaleX = direction === -1 ? "1" : "-1";
    loaderAnimationEl.style.transform = `translateX(${startX}) translateY(-33%) scaleX(${scaleX})`;

    elements.loadingContainer.appendChild(loaderAnimationEl);

    const animationId = `loader-${Date.now()}-${direction}`;
    const animation = lottie.loadAnimation({
        container: loaderAnimationEl,
        renderer: "canvas",
        loop: true,
        autoplay: true,
        path: paths[Math.floor(Math.random() * paths.length)]
    });

    animationManager.register(animationId, animation, { type: 'lottie' });

    requestAnimationFrame(() => {
        loaderAnimationEl.style.transform = `translateX(${endX}) translateY(-33%) scaleX(${scaleX})`;
    });

    animationManager.addTimeout(() => {
        animationManager.unregister(animationId);
        loaderAnimationEl.remove();
    }, ANIMATION_DURATION.LOADING);
}

function appendProjectIframe(layout) {
    const carouselItem = elements.projectInnerCarousel?.children[state.activeIndex];
    if (!carouselItem || carouselItem.childElementCount || !layout.project_iframe_src) return;

    const iframe = document.createElement("iframe");
    iframe.src = layout.project_iframe_src;
    iframe.allowFullscreen = true;
    iframe.loading = "lazy";
    iframe.classList.add("h-100", "w-100");
    iframe.style.borderRadius = layout.inner_project_radius;
    iframe.style.opacity = "0";
    iframe.style.transition = "opacity 2s ease";
    iframe.addEventListener("load", () => {
        requestAnimationFrame(() => {
            iframe.style.opacity = "1";
        });
    }, { once: true });
    carouselItem.appendChild(iframe);
}

function replaceBackground(layout) {
    if (!elements.background) return;

    if (layout.background_iframe_src) {
        const iframe = document.createElement("iframe");
        iframe.src = layout.background_iframe_src;
        iframe.allowFullscreen = true;
        iframe.loading = "lazy";
        iframe.classList.add("h-100", "w-100");
        iframe.style.opacity = "0";
        iframe.style.transition = "opacity 2s ease";
        iframe.addEventListener("load", () => {
            requestAnimationFrame(() => {
                iframe.style.opacity = "1";
            });
        }, { once: true });
        elements.background.replaceChildren(iframe);
        return;
    }

    if (layout.background_video_src) {
        const video = document.createElement("video");
        video.src = layout.background_video_src;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.classList.add("h-100", "w-100");
        video.style.objectFit = "cover";
        video.style.opacity = "0";
        video.style.transition = "opacity 2s ease";
        video.addEventListener("loadeddata", () => {
            requestAnimationFrame(() => {
                video.style.opacity = "1";
            });
        }, { once: true });
        elements.background.replaceChildren(video);
        return;
    }

    elements.background.replaceChildren();
}

function applyLayoutStyles(layout) {
    const blurBorder = normalizeBorder(layout.background_blur_border);
    const projectBorder = normalizeBorder(layout.inner_project_border);

    if (elements.background) {
        elements.background.style.cssText = `
            background-color: ${layout.background_color};
            opacity: 1;
        `;
    }

    if (elements.backgroundBlur) {
        elements.backgroundBlur.style.cssText = `
            background-color: ${layout.background_blur_color};
            filter: ${layout.background_blur_filter};
            backdrop-filter: ${layout.background_blur_backdrop_filter};
            -webkit-backdrop-filter: ${layout.background_blur_backdrop_filter};
            border-top: ${blurBorder[0]} solid ${layout.background_blur_border_color[0]};
            border-right: ${blurBorder[1]} solid ${layout.background_blur_border_color[1]};
            border-bottom: ${blurBorder[2]} solid ${layout.background_blur_border_color[2]};
            border-left: ${blurBorder[3]} solid ${layout.background_blur_border_color[3]};
            border-radius: ${layout.background_blur_radius};
        `;
    }

    if (elements.projectCarousel) {
        elements.projectCarousel.style.cssText = `
            pointer-events: ${layout.project_iframe_src || layout.inner_project_color !== "transparent" ? "auto" : "none"};
            background-color: ${layout.inner_project_color};
            filter: ${layout.inner_project_filter};
            backdrop-filter: ${layout.inner_project_backdrop_filter};
            -webkit-backdrop-filter: ${layout.inner_project_backdrop_filter};
            border-top: ${projectBorder[0]} solid ${layout.inner_project_border_color[0]};
            border-right: ${projectBorder[1]} solid ${layout.inner_project_border_color[1]};
            border-bottom: ${projectBorder[2]} solid ${layout.inner_project_border_color[2]};
            border-left: ${projectBorder[3]} solid ${layout.inner_project_border_color[3]};
            border-radius: ${layout.inner_project_radius};
            box-shadow: ${layout.inner_project_box_shadow};
        `;
    }

    if (elements.projectInnerCarousel) {
        elements.projectInnerCarousel.style.pointerEvents = layout.project_iframe_src ? "auto" : "none";
    }

    if (elements.leftNav) elements.leftNav.style.color = layout.left_navigation_color;
    if (elements.rightNav) elements.rightNav.style.color = layout.right_navigation_color;

    setRootVars({
        '--pagination-color': layout.pagination_color,
        '--pagination-active-color': layout.pagination_active_color,
        '--pagination-hover-color': layout.pagination_hover_color
    });
}

function loadLayout(layout) {
    if (!layout) return;

    updateNavigation();
    appendProjectIframe(layout);
    replaceBackground(layout);
    applyLayoutStyles(layout);

    elements.carouselIndicators?.classList.toggle("hidden", layout.pagination === "false");

    if (elements.titleButton) {
        elements.titleButton.textContent = layout.title;
        elements.titleButton.style.color = layout.title_navigation_color;
        elements.titleButton.classList.remove("L-delete");
        elements.titleButton.classList.add("L-write");
    }

    if (elements.projectDescription) {
        elements.projectDescription.textContent = layout.project_description;
        elements.projectDescription.style.color = layout.project_description_color;
    }
}

function unloadLayout() {
    elements.titleButton?.classList.add("L-delete");
    if (elements.titleButton) elements.titleButton.style.color = "transparent";

    elements.background?.replaceChildren();
    if (elements.background) {
        elements.background.style.cssText = `
            background-color: transparent;
            opacity: 0;
        `;
    }

    if (elements.backgroundBlur) {
        elements.backgroundBlur.style.cssText = `
            filter: drop-shadow(0px 0px 0px transparent);
            background-color: rgba(0, 0, 0, 1);
            backdrop-filter: blur(0px);
            border: 0px solid transparent;
            border-radius: 0px;
        `;
    }

    if (elements.projectCarousel) {
        elements.projectCarousel.style.cssText = `
            filter: drop-shadow(0px 0px 0px transparent);
            background-color: transparent;
            backdrop-filter: blur(0px);
            border: 0px solid transparent;
            border-radius: 0px;
            box-shadow: 0 0px 0px transparent;
        `;
    }

    if (elements.projectDescription) elements.projectDescription.textContent = "";

    setRootVars({
        '--pagination-color': "transparent",
        '--pagination-active-color': "transparent",
        '--pagination-hover-color': "transparent"
    });
}

function loadInitialLayout() {
    const match = window.location.pathname.match(/\/project\/(\d+)/);
    const index = match ? Number(match[1]) : 0;
    state.activeIndex = Math.min(Math.max(index, 0), state.projectNames.length - 1);
    loadLayout(currentLayout());
}

export function cleanupLandscape() {
    animationManager.cleanupAll();
    unloadLayout();
    state.isTransitioning = false;
}

export async function initLandscape() {
    if (state.isInitialized) {
        loadLayout(currentLayout());
        return;
    }

    await loadLandscapeData();
    buildCarouselFrames();
    initButtons();

    setupCarouselEvents();
    initPagination();
    loadInitialLayout();

    state.isInitialized = true;
}
