import imageOptimizer from "../utils/imageOptimizer.js";
import { loadDataSafely, PortraitDataURL } from "../utils/data.js";
import { byId, escapeHtml, on } from "../utils/dom.js";

const FALLBACK_DATA = {
    welcomeMsg: "Hey! I'm",
    name: "Samuel Micah",
    welcomeEmoji: "👋",
    about: "Portfolio loading...",
    projectTagline: "Loading projects...",
    contact: {
        email: "samuelmicah02@gmail.com",
        cvUrl: "./Projects/Samuel_Micah_CV.pdf"
    },
    socials: [],
    certs: [],
    skills: [],
    projects: []
};

const elements = {
    about: byId('l-about'),
    welcomeMsg: byId('l-welcome-msg'),
    welcomeEmoji: byId('l-welcome-emoji'),
    name: byId('l-name'),
    projectTagline: byId('l-project-tagline'),
    certs: byId('certifications-container'),
    skillsTrack: byId('skills-track'),
    skillsIndicators: byId('carousel-indicators'),
    projects: byId('projects-container'),
    socials: byId('social-links'),
    cvButton: byId('btn-download-cv'),
    contactButton: byId('btn-contact'),
    themeToggle: byId('theme-toggle'),
    skillsCarousel: byId('skillsCarousel'),
    navBrand: byId('nav-brand')
};

let data = null;
let isInitialized = false;

function renderAbout() {
    if (!elements.about || !elements.welcomeMsg || !elements.welcomeEmoji || !elements.name || !elements.projectTagline) {
        console.error('Missing required DOM elements for renderAbout');
        return;
    }

    elements.about.textContent = data.about;
    elements.welcomeMsg.textContent = data.welcomeMsg;
    elements.welcomeEmoji.textContent = data.welcomeEmoji;
    elements.name.textContent = data.name;
    elements.projectTagline.textContent = data.projectTagline;
}

function renderCerts() {
    if (!elements.certs || !data.certs?.length) return;

    elements.certs.innerHTML = data.certs.map((cert, index) => {
        const isCritical = index < 2;
        const sourceAttr = isCritical
            ? `src="${escapeHtml(cert.img)}"`
            : `data-src="${escapeHtml(cert.img)}" loading="lazy"`;

        return `
            <div class="p-certification"
                 data-cert-url="${escapeHtml(cert.url)}"
                 title="${escapeHtml(cert.name)}">
                <img ${sourceAttr}
                     alt="${escapeHtml(cert.name)}"
                     class="p-cert-badge"
                     width="75"
                     height="75" />
            </div>
        `;
    }).join('');

    elements.certs.querySelectorAll('img[data-src]').forEach(img => imageOptimizer.observe(img));
}

function renderSkills() {
    if (!elements.skillsTrack || !elements.skillsIndicators || !data.skills?.length) return;

    elements.skillsTrack.innerHTML = data.skills.map((slide, index) => `
        <div class="carousel-item ${index === 0 ? 'active' : ''}">
            <p class="p-title h3 mb-3">${escapeHtml(slide.title)}</p>
            <ul class="list-unstyled">
                ${slide.items.map(item => `
                    <li class="mb-2">
                        <span class="p-text-highlight fw-bold">${escapeHtml(item.label)}:</span>
                        <span class="p-description">${escapeHtml(item.val)}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('');

    elements.skillsIndicators.innerHTML = data.skills.map((_, index) => `
        <div class="p-pagination-dot ${index === 0 ? 'active' : ''}"
             data-bs-target="#skillsCarousel"
             data-bs-slide-to="${index}"
             role="button"
             aria-label="Slide ${index + 1}">+</div>
    `).join('');
}

function renderProjects() {
    if (!elements.projects || !data.projects?.length) return;

    elements.projects.innerHTML = data.projects.map(proj => `
        <div class="p-card">
            <div class="row align-items-center">
                <div class="col-md-5">
                    <img data-src="${escapeHtml(proj.img)}"
                         alt="${escapeHtml(proj.title)}"
                         class="p-project-img shadow-sm"
                         loading="lazy"
                         width="400"
                         height="300" />
                </div>
                <div class="col-md-7">
                    <h3 class="p-title mt-3 mt-md-0">${escapeHtml(proj.title)}</h3>
                    <p class="p-description">${escapeHtml(proj.desc)}</p>
                    <button class="btn p-btn-primary mt-2 project-link-btn"
                            data-project-link="${escapeHtml(proj.link)}"
                            aria-label="View ${escapeHtml(proj.title)} code on GitHub">
                        <i class="fab fa-github me-2" aria-hidden="true"></i> View Code
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    elements.projects.querySelectorAll('img[data-src]').forEach(img => imageOptimizer.observe(img));
}

function renderSocials() {
    if (!elements.socials || !data.socials?.length) return;

    elements.socials.innerHTML = data.socials.map(s => `
        <i class="${escapeHtml(s.icon)} fab p-social-icon"
           data-social-url="${escapeHtml(s.url)}"
           role="button"
           aria-label="Visit ${escapeHtml(s.icon.replace('fa-', ''))} profile"
           tabindex="0"></i>
    `).join('');
}

function initDelegatedLinks() {
    on(elements.certs, 'click', event => {
        const cert = event.target.closest('.p-certification');
        const url = cert?.dataset.certUrl;
        if (url && url !== '#') window.open(url, '_blank', 'noopener,noreferrer');
    });

    on(elements.projects, 'click', event => {
        const button = event.target.closest('.project-link-btn');
        const link = button?.dataset.projectLink;
        if (link) window.open(link, '_blank', 'noopener,noreferrer');
    });

    on(elements.socials, 'click', event => {
        const icon = event.target.closest('.p-social-icon');
        const url = icon?.dataset.socialUrl;
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });

    on(elements.socials, 'keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        const icon = event.target.closest('.p-social-icon');
        if (!icon) return;

        event.preventDefault();
        icon.click();
    });
}

function initContactButtons() {
    if (elements.cvButton && data.contact?.cvUrl) {
        elements.cvButton.addEventListener('click', () => {
            window.open(data.contact.cvUrl, '_blank', 'noopener,noreferrer');
        });
    }

    if (elements.contactButton && data.contact?.email) {
        elements.contactButton.addEventListener('click', () => {
            window.location.href = `mailto:${data.contact.email}`;
        });
    }
}

function initTheme() {
    if (!elements.themeToggle) return;

    const icon = elements.themeToggle.querySelector('i');
    let savedTheme = null;

    try {
        savedTheme = localStorage.getItem('theme');
    } catch (e) {
        console.warn('localStorage not available, using default theme');
    }

    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let isDark = savedTheme === 'dark' || (!savedTheme && systemDark);

    const apply = () => {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        if (icon) icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
    };

    apply();

    elements.themeToggle.addEventListener('click', () => {
        isDark = !isDark;
        try {
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        } catch (e) {
            console.warn('Cannot save theme preference');
        }
        apply();
    });
}

function initNav() {
    elements.navBrand?.addEventListener('click', () => location.reload());
    elements.navBrand?.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        location.reload();
    });

    if (elements.skillsCarousel && elements.skillsIndicators) {
        elements.skillsCarousel.addEventListener('slide.bs.carousel', event => {
            elements.skillsIndicators.querySelectorAll('.p-pagination-dot').forEach((dot, index) => {
                dot.classList.toggle('active', index === event.to);
            });
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', event => {
            event.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (!target) return;

            target.scrollIntoView({ behavior: 'smooth' });
            document.querySelectorAll('.p-nav-link').forEach(link => link.classList.remove('active'));
            anchor.classList.add('active');
        });
    });
}

function render() {
    renderAbout();
    renderCerts();
    renderSkills();
    renderProjects();
    renderSocials();
}

export async function initPortrait() {
    if (isInitialized) return;

    data = await loadDataSafely(
        new URL('../P_DATA.json', import.meta.url).href,
        PortraitDataURL,
        FALLBACK_DATA
    );

    render();
    initDelegatedLinks();
    initContactButtons();
    initTheme();
    initNav();

    isInitialized = true;
}
