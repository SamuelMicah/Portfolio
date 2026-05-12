import imageOptimizer from "../utils/imageOptimizer.js";
import { loadDataSafely, PortraitDataURL } from "../utils/data.js";

// Fallback data in case all fetches fail
const FALLBACK_DATA = {
    welcomeMsg: "Hey! I'm",
    name: "Samuel Micah",
    welcomeEmoji: "👋",
    about: "Portfolio loading...",
    projectTagline: "Loading projects...",
    contact: {
        email: "samuelmicah02@gmail.com",
        cvUrl: "/Samuel_Micah_CV.pdf"
    },
    socials: [],
    certs: [],
    skills: [],
    projects: []
};

let DATA = null;
let isInitialized = false;

/* ================= RENDERERS ================= */
function renderAbout() {
    const elements = {
        about: document.getElementById('l-about'),
        welcomeMsg: document.getElementById('l-welcome-msg'),
        welcomeEmoji: document.getElementById('l-welcome-emoji'),
        name: document.getElementById('l-name'),
        projectTagline: document.getElementById('l-project-tagline')
    };

    // Check all elements exist
    const allExist = Object.values(elements).every(el => el !== null);
    if (!allExist) {
        console.error('Missing required DOM elements for renderAbout');
        return;
    }

    elements.about.textContent = DATA.about;
    elements.welcomeMsg.textContent = DATA.welcomeMsg;
    elements.welcomeEmoji.textContent = DATA.welcomeEmoji;
    elements.name.textContent = DATA.name;
    elements.projectTagline.textContent = DATA.projectTagline;
}

function renderCerts() {
    const container = document.getElementById('certifications-container');
    if (!container || !DATA.certs?.length) return;

    // Use event delegation instead of inline onclick
    container.innerHTML = DATA.certs.map((cert, index) => {
        const isCritical = index < 2; // First 2 are critical (above fold)
        
        return `
        <div class="p-certification" 
             data-cert-url="${escapeHtml(cert.url)}" 
             title="${escapeHtml(cert.name)}">
            <img ${isCritical ? `src="${escapeHtml(cert.img)}"` : `data-src="${escapeHtml(cert.img)}"`}
                 alt="${escapeHtml(cert.name)}" 
                 class="p-cert-badge" 
                 width="75"
                 height="75"
                 ${isCritical ? '' : 'loading="lazy"'} />
        </div>
        `;
    }).join('');

    // Observe lazy-loaded images
    container.querySelectorAll('img[data-src]').forEach(img => {
        imageOptimizer.observe(img);
    });

    // Add event delegation
    container.addEventListener('click', (e) => {
        const cert = e.target.closest('.p-certification');
        if (cert) {
            const url = cert.dataset.certUrl;
            if (url && url !== '#') {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        }
    });
}

function renderSkills() {
    const track = document.getElementById('skills-track');
    const indicators = document.getElementById('carousel-indicators');
    
    if (!track || !indicators || !DATA.skills?.length) return;

    track.innerHTML = DATA.skills.map((slide, index) => `
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

    indicators.innerHTML = DATA.skills.map((_, index) => `
        <div class="p-pagination-dot ${index === 0 ? 'active' : ''}" 
             data-bs-target="#skillsCarousel" 
             data-bs-slide-to="${index}" 
             role="button" 
             aria-label="Slide ${index + 1}">+</div>
    `).join('');
}

function renderProjects() {
    const container = document.getElementById('projects-container');
    if (!container || !DATA.projects?.length) return;

    container.innerHTML = DATA.projects.map((proj, index) => `
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

    // Observe all project images for lazy loading
    container.querySelectorAll('img[data-src]').forEach(img => {
        imageOptimizer.observe(img);
    });

    // Event delegation for project links
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.project-link-btn');
        if (btn) {
            const link = btn.dataset.projectLink;
            if (link) {
                window.open(link, '_blank', 'noopener,noreferrer');
            }
        }
    });
}

function renderSocials() {
    const container = document.getElementById('social-links');
    if (!container || !DATA.socials?.length) return;

    container.innerHTML = DATA.socials.map(s => `
        <i class="${escapeHtml(s.icon)} fab p-social-icon" 
           data-social-url="${escapeHtml(s.url)}"
           role="button"
           aria-label="Visit ${escapeHtml(s.icon.replace('fa-', ''))} profile"
           tabindex="0"></i>
    `).join('');

    // Event delegation for social links
    container.addEventListener('click', (e) => {
        const icon = e.target.closest('.p-social-icon');
        if (icon) {
            const url = icon.dataset.socialUrl;
            if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        }
    });

    // Keyboard accessibility
    container.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const icon = e.target.closest('.p-social-icon');
            if (icon) {
                e.preventDefault();
                icon.click();
            }
        }
    });
}

/* ================= UTILS ================= */
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

function initContactButtons() {
    const cvBtn = document.getElementById('btn-download-cv');
    const contactBtn = document.getElementById('btn-contact');

    if (cvBtn && DATA.contact?.cvUrl) {
        cvBtn.addEventListener('click', () => {
            window.open(DATA.contact.cvUrl, '_blank', 'noopener,noreferrer');
        });
    }

    if (contactBtn && DATA.contact?.email) {
        contactBtn.addEventListener('click', () => {
            window.location.href = `mailto:${DATA.contact.email}`;
        });
    }
}

function initTheme() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    
    const icon = toggle.querySelector('i');
    
    // Try to get saved theme, fallback to system preference
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
        icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
    };

    apply();

    toggle.addEventListener('click', () => {
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
    const carousel = document.getElementById('skillsCarousel');
    const dots = document.querySelectorAll('.p-pagination-dot');
    
    if (carousel && dots.length) {
        carousel.addEventListener('slide.bs.carousel', event => {
            dots.forEach(d => d.classList.remove('active'));
            if (dots[event.to]) {
                dots[event.to].classList.add('active');
            }
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
                
                // Update active nav link
                document.querySelectorAll('.p-nav-link').forEach(l => 
                    l.classList.remove('active')
                );
                this.classList.add('active');
            }
        });
    });
}

/* ================= INIT ================= */
export async function initPortrait() {
    if (isInitialized) return;

    DATA = await loadDataSafely(
        new URL('../P_DATA.json', import.meta.url).href,
        PortraitDataURL,
        FALLBACK_DATA
    );

    // Render all sections
    renderAbout();
    renderCerts();
    renderSkills();
    renderProjects();
    renderSocials();
    
    // Initialize interactive features
    initContactButtons();
    initTheme();
    initNav();
    
    isInitialized = true;
}
