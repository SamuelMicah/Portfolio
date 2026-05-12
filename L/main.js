import { loadDataSafely, LandscapeDataURL } from "../utils/data.js";
import animationManager from "../utils/animationManager.js";

// Animation timing constants
const ANIMATION_DURATION = {
    LOADING: 2000,
    BOUNCE: 400,
    TRANSITION: 600
};

// Fallback data
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

let DATA;
let numberOfCarousels = 0;
let activeCarousel = 0;
let isTransitioning = false;
let isInitialized = false;
// Remove activeAnimations Set - now managed by animationManager

// DOM element references (cached for performance)
const elements = {
    background: document.getElementById("L-background"),
    backgroundBlur: document.getElementById("L-background-blur"),
    titleButton: document.getElementById("L-title-desktop"),
    projectCarousel: document.getElementById('L-project-carousel'),
    projectInnerCarousel: document.getElementById('L-project-inner-carousel'),
    leftNav: document.getElementById("L-left_navigation"),
    rightNav: document.getElementById("L-right_navigation"),
    projectDescription: document.getElementById("L-project-description"),
    carouselIndicators: document.getElementById("L-carousel-indicators"),
    loadingContainer: document.getElementById("L-loading-animation-container")
};

// Initialize data
async function initData() {
    try {
        DATA = await loadDataSafely(
            new URL('../L_DATA.json', import.meta.url).href,
            LandscapeDataURL,
            FALLBACK_DATA
        );
        return true;
    } catch (error) {
        console.error('Fatal error loading landscape data:', error);
        DATA = FALLBACK_DATA;
        return false;
    }
}

// Utility: Escape HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Utility: Sort data keys
function sortData(initialProjectNumber = 0) {
    const dataAssignments = {};
    let currentProjectNumber = initialProjectNumber;

    for (const key in DATA) {
        if (Object.prototype.hasOwnProperty.call(DATA, key)) {
            dataAssignments[currentProjectNumber] = key;
            currentProjectNumber++;
        }
    }
    return dataAssignments;
}

let sortedData = {};

// Initialize buttons with proper event handling
function initButtons() {
    if (!elements.titleButton || !elements.leftNav || !elements.rightNav) {
        console.error('Navigation buttons not found');
        return;
    }

    elements.titleButton.addEventListener("click", handleReloadProject);
    elements.leftNav.addEventListener("click", () => navigateProject(-1));
    elements.rightNav.addEventListener("click", () => navigateProject(1));

    // Focus management for better UX
    [elements.leftNav, elements.rightNav, elements.carouselIndicators].forEach(el => {
        if (el) {
            el.addEventListener("mouseenter", () => window.focus());
        }
    });
}

// Initialize pagination dots
function initPagination() {
    if (!elements.carouselIndicators) return;

    elements.carouselIndicators.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < numberOfCarousels; i++) {
        const dot = document.createElement("div");
        dot.classList.add("L-pagination-dot");
        dot.innerHTML = "+";
        dot.setAttribute("role", "button");
        dot.setAttribute("aria-label", `Go to project ${i + 1}`);
        dot.setAttribute("tabindex", "0");
        
        if (i === 0) dot.classList.add("active");

        dot.setAttribute("data-bs-target", "#L-project-carousel");
        dot.setAttribute("data-bs-slide-to", i.toString());

        // Click handler
        dot.addEventListener("click", () => {
            if (!isTransitioning) {
                const carousel = bootstrap.Carousel.getOrCreateInstance(elements.projectCarousel);
                carousel.to(i);
            }
        });

        // Keyboard accessibility
        dot.addEventListener("keydown", (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                dot.click();
            }
        });

        fragment.appendChild(dot);
    }

    elements.carouselIndicators.appendChild(fragment);
}

// Build inner carousel HTML
function buildInnerCarouselContent() {
    if (!elements.projectInnerCarousel) return;

    let carouselHtml = '';
    let isFirstItem = true;

    for (const project in DATA) {
        if (Object.hasOwnProperty.call(DATA, project)) {
            const activeClass = isFirstItem ? 'active' : '';
            isFirstItem = false;
            carouselHtml += `<div class="carousel-item h-100 w-100 absolute top-0 left-0 rounded-xl ${activeClass}"></div>`;
        }
    }

    if (Object.keys(DATA).length === 0) {
        carouselHtml = `<div class="carousel-item h-100 w-100 absolute top-0 left-0 rounded-xl active">
                        <p>No content available for the carousel.</p>
                    </div>`;
    }

    elements.projectInnerCarousel.innerHTML = carouselHtml;
}

// Setup carousel event listeners
function setupCarouselEvents() {
    if (!elements.projectCarousel) return;

    elements.projectCarousel.addEventListener('slide.bs.carousel', event => {
        isTransitioning = true;
        const direction = event.direction === "left" ? 1 : -1;
        loadingIndicator(direction);
        unloadLayout();
    });

    elements.projectCarousel.addEventListener('slid.bs.carousel', event => {
        const activeItem = elements.projectCarousel.querySelector('.carousel-item.active');
        activeCarousel = Array.from(elements.projectCarousel.querySelectorAll('.carousel-item')).indexOf(activeItem);
        
        const layoutData = DATA[sortedData[activeCarousel]];
        if (layoutData) {
            loadLayout(layoutData);
        }

        if (!elements.carouselIndicators.classList.contains("hidden")) {
            updatePaginationDots(activeCarousel);
        }
        
        isTransitioning = false;
    });
}

// Update pagination dots
function updatePaginationDots(index) {
    const dots = elements.carouselIndicators?.querySelectorAll(".L-pagination-dot");
    if (!dots) return;

    dots.forEach((dot, i) => {
        dot.classList.toggle("active", i === index);
    });
}

function getBorderValues(border) {
    if (Array.isArray(border)) return border;
    if (border && typeof border === "object") {
        return [border.top, border.right, border.bottom, border.left];
    }
    return ["0px", "0px", "0px", "0px"];
}

// Toggle navigation buttons
function toggleNavigation(navElement, enable) {
    if (!navElement) return;
    
    navElement.disabled = !enable;
    navElement.classList.toggle("L-fade_Out", !enable);
    
    if (!enable) {
        const otherNav = navElement === elements.rightNav ? elements.leftNav : elements.rightNav;
        otherNav?.classList.add("scroll-down");
    }
}

// Update navigation boundaries
function navigationBoundaries(forceDisabled = false) {
    if (forceDisabled) {
        toggleNavigation(elements.leftNav, false);
        toggleNavigation(elements.rightNav, false);
        return;
    }
    toggleNavigation(elements.leftNav, activeCarousel !== 0);
    toggleNavigation(elements.rightNav, activeCarousel !== numberOfCarousels - 1);
}

// Navigate to next/previous project
function navigateProject(direction) {
    if (isTransitioning) return;
    
    const nextChildIndex = activeCarousel + direction;

    if (nextChildIndex >= 0 && nextChildIndex <= numberOfCarousels - 1) {
        bootstrap.Carousel.getOrCreateInstance(elements.projectCarousel).to(nextChildIndex);
        
        const isRight = direction === 1;
        const nav = isRight ? elements.rightNav : elements.leftNav;
        const bounceClass = isRight ? 'L-bounce_right' : 'L-bounce_left';
        
        if (!nav) return;
        
        nav.disabled = true;
        nav.classList.add(bounceClass);

        const cleanup = () => {
            nav.classList.remove(bounceClass);
            nav.disabled = false;
        };

        nav.addEventListener("transitionend", cleanup, { once: true });
        setTimeout(cleanup, ANIMATION_DURATION.BOUNCE);
    }
}

// Reload current project with animation
function handleReloadProject() {
    if (isTransitioning || !elements.titleButton) return;
    
    isTransitioning = true;
    elements.titleButton.disabled = true;
    elements.titleButton.style.color = "transparent";
    elements.titleButton.classList.add("L-delete");

    loadingIndicator(-1);
    loadingIndicator(1);

    const onFirstAnimationEnd = () => {
        const currentLayout = DATA[sortedData[activeCarousel]];
        if (currentLayout) {
            elements.titleButton.innerHTML = escapeHtml(currentLayout.title);
            elements.titleButton.style.color = currentLayout.title_navigation_color;
        }
        
        elements.titleButton.classList.remove("L-delete");
        elements.titleButton.classList.add("L-write");

        const onSecondAnimationEnd = () => {
            elements.titleButton.disabled = false;
            isTransitioning = false;
        };

        elements.titleButton.addEventListener("animationend", onSecondAnimationEnd, { once: true });
    };

    elements.titleButton.addEventListener("animationend", onFirstAnimationEnd, { once: true });
}

// Loading indicator animation
function loadingIndicator(direction) {
    const paths = [
        "./L/loading_animation/purple.json",
        "./L/loading_animation/pink.json",
        "./L/loading_animation/red.json",
        "./L/loading_animation/brown.json",
        "./L/loading_animation/black.json"
    ];

    if (!elements.loadingContainer) return;

    const loaderAnimationEl = document.createElement("div");
    loaderAnimationEl.classList.add("L-loader-animation");

    const startX = direction === -1 ? "-55vw" : "55vw";
    const scaleX = direction === -1 ? "1" : "-1";
    loaderAnimationEl.style.transform = `translateX(${startX}) translateY(-33%) scaleX(${scaleX})`;

    elements.loadingContainer.appendChild(loaderAnimationEl);

    let animation = null;
    const animationId = `loader-${Date.now()}-${direction}`;
    
    try {
        animation = lottie.loadAnimation({
            container: loaderAnimationEl,
            renderer: "canvas",
            loop: true,
            autoplay: true,
            path: paths[Math.floor(Math.random() * paths.length)]
        });
        
        // Register with animation manager
        animationManager.register(animationId, animation, { type: 'lottie' });
    } catch (error) {
        console.error('Failed to load Lottie animation:', error);
    }

    // Trigger reflow
    void loaderAnimationEl.offsetWidth;

    // Animate
    requestAnimationFrame(() => {
        const endX = direction === -1 ? "55vw" : "-55vw";
        loaderAnimationEl.style.transform = `translateX(${endX}) translateY(-33%) scaleX(${scaleX})`;
    });

    // Cleanup using animation manager
    animationManager.addTimeout(() => {
        animationManager.unregister(animationId);
        loaderAnimationEl.remove();
    }, ANIMATION_DURATION.LOADING);
}

// Load layout with batched style updates
function loadLayout(layout) {
    if (!layout) return;

    navigationBoundaries();

    // Load iframe if needed
    const carouselItem = elements.projectInnerCarousel.children[activeCarousel];
    if (carouselItem && carouselItem.innerHTML === "" && layout.project_iframe_src) {
        const innerProject = document.createElement("iframe");
        innerProject.src = layout.project_iframe_src;
        innerProject.allowFullscreen = true;
        innerProject.classList.add("h-100", "w-100");
        innerProject.style.borderRadius = layout.inner_project_radius;
        innerProject.setAttribute("loading", "lazy");
        carouselItem.appendChild(innerProject);
    }
    
    // Enable pointer events if there's content (iframe or background color)
    const hasContent = layout.project_iframe_src || 
                      (layout.inner_project_color && layout.inner_project_color !== "transparent");
    elements.projectCarousel.style.pointerEvents = hasContent ? "auto" : "none";
    elements.projectInnerCarousel.style.pointerEvents = hasContent ? "auto" : "none";

    // Load background iframe or video
    if(elements.background) {
        if (layout.background_iframe_src) {
            const innerBackground = document.createElement("iframe");
            innerBackground.src = layout.background_iframe_src;
            innerBackground.allowFullscreen = true;
            innerBackground.classList.add("h-100", "w-100");
            innerBackground.setAttribute("loading", "lazy");
            elements.background.replaceChildren(innerBackground);
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
            elements.background.replaceChildren(video);
        }
    }

    // Toggle pagination
    const showPagination = layout.pagination !== "false";
    elements.carouselIndicators?.classList.toggle("hidden", !showPagination);

    // Update title - use textContent for security
    if (elements.titleButton) {
        elements.titleButton.textContent = layout.title;
        elements.titleButton.style.color = layout.title_navigation_color;
        elements.titleButton.classList.remove("L-delete");
        elements.titleButton.classList.add("L-write");
    }

    // Update description
    if (elements.projectDescription) {
        elements.projectDescription.textContent = layout.project_description;
        elements.projectDescription.style.color = layout.project_description_color;
    }

    // Batch DOM updates using cssText for better performance
    if (elements.background) {
        elements.background.style.cssText = `
            background-color: ${layout.background_color};
            opacity: 1;
        `;
    }

    if (elements.leftNav) elements.leftNav.style.color = layout.left_navigation_color;
    if (elements.rightNav) elements.rightNav.style.color = layout.right_navigation_color;

    if (elements.backgroundBlur) {
        const border = getBorderValues(layout.background_blur_border);
        elements.backgroundBlur.style.cssText = `
            background-color: ${layout.background_blur_color};
            filter: ${layout.background_blur_filter};
            backdrop-filter: ${layout.background_blur_backdrop_filter};
            -webkit-backdrop-filter: ${layout.background_blur_backdrop_filter};
            border-top: ${border[0]} solid ${layout.background_blur_border_color[0]};
            border-right: ${border[1]} solid ${layout.background_blur_border_color[1]};
            border-bottom: ${border[2]} solid ${layout.background_blur_border_color[2]};
            border-left: ${border[3]} solid ${layout.background_blur_border_color[3]};
            border-radius: ${layout.background_blur_radius};
        `;
    }

    if (elements.projectCarousel) {
        const border = getBorderValues(layout.inner_project_border);
        elements.projectCarousel.style.cssText = `
            background-color: ${layout.inner_project_color};
            filter: ${layout.inner_project_filter};
            backdrop-filter: ${layout.inner_project_backdrop_filter};
            -webkit-backdrop-filter: ${layout.inner_project_backdrop_filter};
            border-top: ${border[0]} solid ${layout.inner_project_border_color[0]};
            border-right: ${border[1]} solid ${layout.inner_project_border_color[1]};
            border-bottom: ${border[2]} solid ${layout.inner_project_border_color[2]};
            border-left: ${border[3]} solid ${layout.inner_project_border_color[3]};
            border-radius: ${layout.inner_project_radius};
            box-shadow: ${layout.inner_project_box_shadow};
        `;
    }

    // Update CSS variables
    document.documentElement.style.setProperty('--pagination-color', layout.pagination_color);
    document.documentElement.style.setProperty('--pagination-active-color', layout.pagination_active_color);
    document.documentElement.style.setProperty('--pagination-hover-color', layout.pagination_hover_color);
}

// Unload layout
function unloadLayout() {
    if (elements.titleButton) {
        elements.titleButton.style.color = "transparent";
        elements.titleButton.classList.add("L-delete");
    }

    if (elements.background) {
        elements.background.style.cssText = `
            background-color: transparent;
            opacity: 0;
        `;
        elements.background.replaceChildren();
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

    if (elements.projectDescription) {
        elements.projectDescription.innerHTML = "";
    }

    document.documentElement.style.setProperty('--pagination-color', "transparent");
    document.documentElement.style.setProperty('--pagination-active-color', "transparent");
    document.documentElement.style.setProperty('--pagination-hover-color', "transparent");
}

// Cleanup function for when view is hidden
export function cleanupLandscape() {
    // Use animation manager for comprehensive cleanup
    animationManager.cleanupAll();
    unloadLayout();
    
    // Additional landscape-specific cleanup
    isTransitioning = false;
}

// Initialize everything
export async function initLandscape() {
    if (isInitialized) {
        loadLayout(DATA[sortedData[activeCarousel]]);
        return;
    }

    const success = await initData();

    if (!success) {
        console.error('Failed to initialize landscape data');
    }

    sortedData = sortData();

    initButtons();
    buildInnerCarouselContent();

    numberOfCarousels = Array.from(elements.projectCarousel.querySelectorAll('.carousel-item')).length;

    setupCarouselEvents();
    initPagination();

    if (window.location.pathname.match(/\/project\/(\d+)/)) {
        const match = window.location.pathname.match(/\/project\/(\d+)/);
        loadLayout(DATA[sortedData[match[1]]]);
    } else {
        loadLayout(DATA[sortedData[0]]);
    }
    isInitialized = true;
}
