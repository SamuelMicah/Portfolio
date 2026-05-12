// Initialize data
const DATA = await fetch('/P_DATA.json').then(r => r.json()).catch(err => {
console.error(err);
return FALLBACK_DATA;
});

function renderSocials() {
const container = document.getElementById("social-links");
if (!container) return;

container.innerHTML = DATA.socials
    .map(
    (s) => `
        <i class="${s.icon} fab p-social-icon" onclick="window.open('${s.url}', '_blank')"></i>
    `
    )
    .join("");
}

function renderSkills() {
const track = document.getElementById("skills-track");
const indicators = document.getElementById("carousel-indicators");
if (!track || !indicators) return;

track.innerHTML = DATA.skills
    .map(
    (slide, index) => `
<div class="carousel-item ${index === 0 ? "active" : ""}">
    <p class="p-title h3 mb-3">${slide.title}</p>
    <ul class="list-unstyled">
        ${slide.items
            .map(
            (item) => `
            <li class="mb-2">
                <span class="p-text-highlight fw-bold">${item.label}:</span>
                <span class="p-description">${item.val}</span>
            </li>
        `
            )
            .join("")}
    </ul>
</div>
`
    )
    .join("");

indicators.innerHTML = DATA.skills
    .map(
    (_, index) => `
<div class="p-pagination-dot ${index === 0 ? "active" : ""}" 
        data-bs-target="#skillsCarousel" 
        data-bs-slide-to="${index}">+</div>
`
    )
    .join("");
}

function renderCerts() {
    const container = document.getElementById('certifications-container');
    if (!container) return;

    container.innerHTML = DATA.certs.map(cert => `
        <div class="p-certification" title="${cert.name}" onclick="window.open('${cert.url}', '_blank')" style="cursor: pointer;">
            <img src="${cert.img}" alt="${cert.name}" class="p-cert-badge" />
        </div>
    `).join('');
}

function initNav() {
    const carousel = document.getElementById('skillsCarousel');
    const dots = document.querySelectorAll('.p-pagination-dot');
    
    if (carousel) {
        carousel.addEventListener('slide.bs.carousel', event => {
            dots.forEach(d => d.classList.remove('active'));
            if(dots[event.to]) dots[event.to].classList.add('active');
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
                document.querySelectorAll('.p-nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
}

function initContactButtons() {
    const cvBtn = document.getElementById('btn-download-cv');

    if (cvBtn && DATA.contact.cvUrl) {
        cvBtn.addEventListener('click', () => window.open(DATA.contact.cvUrl, '_blank'));
    }
}

renderSkills();
renderSocials();
renderCerts();
initNav();
initContactButtons();