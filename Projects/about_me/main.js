import { escapeHtml, resolveUrl } from "../../utils/dom.js";

const DATA = await fetch(new URL('../../P_DATA.json', import.meta.url).href)
    .then(response => response.json())
    .catch(error => {
        console.error(error);
        return { socials: [], skills: [], certs: [], contact: {} };
    });

const portfolioRoot = new URL('../../', import.meta.url);

const elements = {
    socials: document.getElementById("social-links"),
    skillsTrack: document.getElementById("skills-track"),
    indicators: document.getElementById("carousel-indicators"),
    certs: document.getElementById('certifications-container'),
    cvButton: document.getElementById('btn-download-cv'),
    skillsCarousel: document.getElementById('skillsCarousel')
};

function fromPortfolioRoot(path) {
    return resolveUrl(path, portfolioRoot);
}

function renderSocials() {
    if (!elements.socials) return;

    elements.socials.innerHTML = DATA.socials.map(s => `
        <i class="${escapeHtml(s.icon)} fab p-social-icon"
           data-social-url="${escapeHtml(s.url)}"
           role="button"
           tabindex="0"
           aria-label="Visit ${escapeHtml(s.icon.replace('fa-', ''))} profile"></i>
    `).join("");
}

function renderSkills() {
    if (!elements.skillsTrack || !elements.indicators) return;

    elements.skillsTrack.innerHTML = DATA.skills.map((slide, index) => `
        <div class="carousel-item ${index === 0 ? "active" : ""}">
            <p class="p-title h3 mb-3">${escapeHtml(slide.title)}</p>
            <ul class="list-unstyled">
                ${slide.items.map(item => `
                    <li class="mb-2">
                        <span class="p-text-highlight fw-bold">${escapeHtml(item.label)}:</span>
                        <span class="p-description">${escapeHtml(item.val)}</span>
                    </li>
                `).join("")}
            </ul>
        </div>
    `).join("");

    elements.indicators.innerHTML = DATA.skills.map((_, index) => `
        <div class="p-pagination-dot ${index === 0 ? "active" : ""}"
             data-bs-target="#skillsCarousel"
             data-bs-slide-to="${index}">+</div>
    `).join("");
}

function renderCerts() {
    if (!elements.certs) return;

    elements.certs.innerHTML = DATA.certs.map(cert => `
        <div class="p-certification"
             title="${escapeHtml(cert.name)}"
             data-cert-url="${escapeHtml(cert.url)}"
             style="cursor: pointer;">
            <img src="${fromPortfolioRoot(cert.img)}"
                 alt="${escapeHtml(cert.name)}"
                 class="p-cert-badge"
                 loading="lazy" />
        </div>
    `).join('');
}

function initEvents() {
    elements.certs?.addEventListener('click', event => {
        const cert = event.target.closest('.p-certification');
        const url = cert?.dataset.certUrl;
        if (url && url !== '#') window.open(url, '_blank', 'noopener,noreferrer');
    });

    elements.socials?.addEventListener('click', event => {
        const icon = event.target.closest('.p-social-icon');
        const url = icon?.dataset.socialUrl;
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });

    elements.socials?.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        const icon = event.target.closest('.p-social-icon');
        if (!icon) return;

        event.preventDefault();
        icon.click();
    });

    elements.skillsCarousel?.addEventListener('slide.bs.carousel', event => {
        elements.indicators?.querySelectorAll('.p-pagination-dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === event.to);
        });
    });

    if (elements.cvButton && DATA.contact.cvUrl) {
        elements.cvButton.addEventListener('click', () => {
            window.open(fromPortfolioRoot(DATA.contact.cvUrl), '_blank', 'noopener,noreferrer');
        });
    }
}

renderSkills();
renderSocials();
renderCerts();
initEvents();
