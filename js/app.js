/**
 * DineVault - Shared Client Script for Cloudflare Pages
 */

const DEFAULT_GLOBAL = {
  nav: {
    logo_icon: "fas fa-utensils",
    logo_text: "DineVault",
    links: [
      { label: "Home", url: "/index.html" },
      { label: "Restaurants", url: "/listings.html" },
      { label: "About Us", url: "/about.html" },
      { label: "FAQs", url: "/faqs.html" },
      { label: "Contact", url: "/contact.html" }
    ],
    cta_btn: { label: "Get Listed", url: "/get-listed.html" }
  },
  footer: {
    about_heading: "About DineVault",
    about_text: "DineVault is the premier destination for discovering exceptional dining experiences. We connect food lovers with the finest restaurants, curated reviews, and unforgettable culinary journeys across the city.",
    quick_heading: "Quick Links",
    quick_links: [
      { label: "Home", url: "/index.html" },
      { label: "About Us", url: "/about.html" },
      { label: "Restaurants", url: "/listings.html" },
      { label: "Get Listed", url: "/get-listed.html" },
      { label: "FAQs", url: "/faqs.html" },
      { label: "Contact", url: "/contact.html" }
    ],
    legal_heading: "Legal",
    legal_links: [
      { label: "Privacy Policy", url: "/privacy.html" },
      { label: "Terms of Service", url: "/terms.html" },
      { label: "Disclaimer", url: "/disclaimer.html" }
    ],
    social_heading: "Follow Us",
    socials: [
      { icon: "fab fa-facebook-f", url: "#", label: "Facebook" },
      { icon: "fab fa-twitter", url: "#", label: "Twitter" },
      { icon: "fab fa-instagram", url: "#", label: "Instagram" },
      { icon: "fab fa-youtube", url: "#", label: "YouTube" }
    ],
    copyright: "© 2026 DineVault. All rights reserved."
  }
};

async function fetchCMSContent(pageName) {
  try {
    const res = await fetch(`/api/content?page=${encodeURIComponent(pageName)}`);
    if (res.ok) {
      const data = await res.json();
      applySEOMetadata(data);
      return data;
    }
  } catch (e) {
    console.warn('API unavailable, using fallback', e);
  }
  return null;
}

function applySEOMetadata(cms) {
  if (!cms) return;

  // 1. Dynamic Meta Title
  if (cms.seo && cms.seo.title) {
    document.title = cms.seo.title;
  }

  // 2. Dynamic Meta Description
  if (cms.seo && cms.seo.description) {
    let descMeta = document.querySelector('meta[name="description"]');
    if (!descMeta) {
      descMeta = document.createElement('meta');
      descMeta.name = 'description';
      document.head.appendChild(descMeta);
    }
    descMeta.content = cms.seo.description;
  }

  // 3. Dynamic Robots Meta (Global Switch from D1)
  const isGlobalIndexingEnabled = cms.seo_global && cms.seo_global.indexing_enabled === true;
  
  let robotsMeta = document.querySelector('meta[name="robots"]');
  if (!robotsMeta) {
    robotsMeta = document.createElement('meta');
    robotsMeta.name = 'robots';
    document.head.appendChild(robotsMeta);
  }

  if (!isGlobalIndexingEnabled) {
    robotsMeta.content = 'noindex, nofollow';
  } else {
    robotsMeta.content = (cms.seo && cms.seo.robots) || 'index, follow';
  }
}

function renderHeader(navData) {
  const navContainer = document.getElementById('navbar');
  if (!navContainer) return;

  const data = navData || DEFAULT_GLOBAL.nav;
  const currentPath = window.location.pathname;

  let linksHtml = '';
  (data.links || []).forEach(link => {
    const isActive = currentPath.endsWith(link.url) || 
      (link.url === '/index.html' && (currentPath === '/' || currentPath.endsWith('/index.html') || currentPath === ''));
    linksHtml += `<a href="${link.url}" class="${isActive ? 'active' : ''}">${escapeHtml(link.label)}</a>`;
  });

  if (data.cta_btn) {
    linksHtml += `<a href="${data.cta_btn.url}" class="nav-cta">${escapeHtml(data.cta_btn.label)}</a>`;
  }

  navContainer.innerHTML = `
    <div class="container">
      <a href="/index.html" class="nav-logo">
        <i class="${escapeHtml(data.logo_icon || 'fas fa-utensils')}"></i>
        ${escapeHtml(data.logo_text || 'DineVault')}
      </a>
      <div class="nav-links" id="navLinks">
        ${linksHtml}
      </div>
      <button class="hamburger" id="hamburger" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  `;

  // Attach hamburger handler
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('active');
    });
  }
}

function renderFooter(footerData) {
  const footerContainer = document.getElementById('footer');
  if (!footerContainer) return;

  const data = footerData || DEFAULT_GLOBAL.footer;

  let socialsHtml = '';
  (data.socials || []).forEach(s => {
    socialsHtml += `<a href="${s.url}" aria-label="${escapeHtml(s.label)}"><i class="${escapeHtml(s.icon)}"></i></a>`;
  });

  let quickHtml = '';
  (data.quick_links || []).forEach(l => {
    quickHtml += `<li><a href="${l.url}">${escapeHtml(l.label)}</a></li>`;
  });

  let legalHtml = '';
  (data.legal_links || []).forEach(l => {
    legalHtml += `<li><a href="${l.url}">${escapeHtml(l.label)}</a></li>`;
  });

  let socialListHtml = '';
  (data.socials || []).forEach(s => {
    socialListHtml += `<li><a href="${s.url}"><i class="${escapeHtml(s.icon)}"></i> ${escapeHtml(s.label)}</a></li>`;
  });

  footerContainer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col">
          <h4>${escapeHtml(data.about_heading || 'About DineVault')}</h4>
          <p>${escapeHtml(data.about_text || '')}</p>
          <div class="footer-socials">${socialsHtml}</div>
        </div>
        <div class="footer-col">
          <h4>${escapeHtml(data.quick_heading || 'Quick Links')}</h4>
          <ul>${quickHtml}</ul>
        </div>
        <div class="footer-col">
          <h4>${escapeHtml(data.legal_heading || 'Legal')}</h4>
          <ul>${legalHtml}</ul>
        </div>
        <div class="footer-col">
          <h4>${escapeHtml(data.social_heading || 'Follow Us')}</h4>
          <ul>${socialListHtml}</ul>
        </div>
      </div>
      <div class="footer-bottom">${escapeHtml(data.copyright || '© 2026 DineVault. All rights reserved.')}</div>
    </div>
  `;
}

function setupScrollBehaviors() {
  const navbar = document.getElementById('navbar');
  const moveToTopBtn = document.getElementById('moveToTop');

  window.addEventListener('scroll', () => {
    if (navbar) {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    }
    if (moveToTopBtn) {
      moveToTopBtn.classList.toggle('visible', window.scrollY > 400);
    }
  });

  if (moveToTopBtn) {
    moveToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', async () => {
  setupScrollBehaviors();
});
