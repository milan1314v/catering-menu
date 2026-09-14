/**
 * DineVault - Shared Client Script for Cloudflare Pages
 */

const DEFAULT_GLOBAL = {
  nav: {
    logo_image: "/assets/img/catering-menu-logo.png",
    logo_icon: "fas fa-utensils",
    logo_text: "Catering Menu",
    links: [
      { label: "Home", url: "/" },
      { label: "Caterers", url: "/listings" },
      { label: "About Us", url: "/about" },
      { label: "FAQs", url: "/faqs" },
      { label: "Contact", url: "/contact" }
    ],
    cta_btn: { label: "List Your Business", url: "/get-listed" }
  },
  footer: {
    about_heading: "About Catering Menu",
    about_text: "Catering Menu is the premier discovery directory for exceptional catering services and culinary experiences. We connect event planners and hosts with top-rated caterers, verified menus, genuine reviews, and seamless booking inquiries.",
    quick_heading: "Quick Links",
    quick_links: [
      { label: "Home", url: "/" },
      { label: "Caterers", url: "/listings" },
      { label: "About Us", url: "/about" },
      { label: "List Your Business", url: "/get-listed" },
      { label: "FAQs", url: "/faqs" },
      { label: "Contact", url: "/contact" }
    ],
    legal_heading: "Legal",
    legal_links: [
      { label: "Privacy Policy", url: "/privacy" },
      { label: "Terms of Service", url: "/terms" },
      { label: "Disclaimer", url: "/disclaimer" }
    ],
    social_heading: "Follow Us",
    socials: [
      { icon: "fab fa-facebook-f", url: "#", label: "Facebook" },
      { icon: "fab fa-twitter", url: "#", label: "Twitter" },
      { icon: "fab fa-instagram", url: "#", label: "Instagram" },
      { icon: "fab fa-youtube", url: "#", label: "YouTube" }
    ],
    copyright: "© 2026 Catering Menu. All rights reserved."
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
  const currentPath = (window.location.pathname.replace(/\/$/, '') || '/').replace(/\.html$/, '');

  const hostParts = window.location.hostname.split('.');
  const isSubdomain = hostParts.length >= 3 && hostParts[0] !== 'www' && hostParts[0] !== 'admin';
  const mainOrigin = isSubdomain && window.location.hostname.includes('catering-menu.com') ? 'https://www.catering-menu.com' : '';
  let linksHtml = '';
  (data.links || []).forEach(link => {
    let label = (link.label || '').trim();
    if (label.toLowerCase() === 'restaurants' || label.toLowerCase() === 'restaurant' || label.toLowerCase() === 'all restaurants') {
      label = 'Caterers';
    }
    let linkClean = (link.url.replace(/\/$/, '') || '/').replace(/\.html$/, '');
    if (linkClean === '' || linkClean === 'index' || linkClean === '/index') {
      linkClean = '/';
    }
    if (linkClean === '/listings' && (label.toLowerCase().includes('restaurant') || label === 'Listings')) {
      label = 'Caterers';
    }
    const href = mainOrigin ? (linkClean === '/' ? `${mainOrigin}/` : `${mainOrigin}${linkClean}`) : linkClean;
    const isActive = !isSubdomain && ((currentPath === linkClean) || 
      (linkClean === '/' && (currentPath === '' || currentPath === '/' || currentPath === '/index')));
    linksHtml += `<a href="${href}" class="${isActive ? 'active' : ''}">${escapeHtml(label)}</a>`;
  });

  if (data.cta_btn) {
    let ctaClean = data.cta_btn.url.replace(/\.html$/, '');
    if (ctaClean === '/index' || ctaClean === 'index') ctaClean = '/';
    const ctaHref = mainOrigin ? (ctaClean === '/' ? `${mainOrigin}/` : `${mainOrigin}${ctaClean}`) : ctaClean;
    linksHtml += `<a href="${ctaHref}" class="nav-cta">${escapeHtml(data.cta_btn.label)}</a>`;
  }

  const logoImgSrc = (data.logo_image !== undefined) ? data.logo_image : '/assets/img/catering-menu-logo.png';
  const logoText = data.logo_text || 'Catering Menu';
  const logoIcon = data.logo_icon || 'fas fa-utensils';

  let logoInnerHtml = '';
  if (logoImgSrc && logoImgSrc.trim()) {
    logoInnerHtml = `<img src="${escapeHtml(logoImgSrc)}" alt="${escapeHtml(logoText)}" class="nav-logo-img" id="mainNavLogo">`;
  } else {
    logoInnerHtml = `<i class="${escapeHtml(logoIcon)}"></i> <span>${escapeHtml(logoText)}</span>`;
  }

  const logoHref = mainOrigin ? `${mainOrigin}/` : '/';

  navContainer.innerHTML = `
    <div class="container">
      <a href="${logoHref}" class="nav-logo" aria-label="${escapeHtml(logoText)}">
        ${logoInnerHtml}
      </a>
      <div class="nav-links" id="navLinks">
        ${linksHtml}
      </div>
      <button class="hamburger" id="hamburger" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  `;

  // Auto-enhance logo contrast for dark navbar
  const navLogoImg = document.getElementById('mainNavLogo');
  if (navLogoImg) {
    enhanceLogoForDarkBackground(navLogoImg);
  }

  // Hamburger Toggle
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      hamburger.classList.toggle('active');
    });
  }

  fixSubdomainLinks();
}

function enhanceLogoForDarkBackground(imgElement) {
  try {
    sessionStorage.removeItem('dark_logo_cache_v2');
    sessionStorage.removeItem('dark_logo_cache_v3');
  } catch(e) {}
}

function renderFooter(footerData) {
  const footerContainer = document.getElementById('footer');
  if (!footerContainer) return;

  const data = footerData || DEFAULT_GLOBAL.footer;

  const hostParts = window.location.hostname.split('.');
  const isSubdomain = hostParts.length >= 3 && hostParts[0] !== 'www' && hostParts[0] !== 'admin';
  const mainOrigin = isSubdomain && window.location.hostname.includes('catering-menu.com') ? 'https://www.catering-menu.com' : '';

  let socialsHtml = '';
  (data.socials || []).forEach(s => {
    socialsHtml += `<a href="${s.url}" class="social-icon" aria-label="${escapeHtml(s.label)}"><i class="${escapeHtml(s.icon)}"></i></a>`;
  });

  let quickHtml = '';
  (data.quick_links || []).forEach(l => {
    let label = (l.label || '').trim();
    if (label.toLowerCase() === 'restaurants' || label.toLowerCase() === 'restaurant' || label.toLowerCase() === 'all restaurants') {
      label = 'Caterers';
    }
    let clean = l.url.replace(/\.html$/, '');
    if (clean === '/index' || clean === 'index' || clean === '') clean = '/';
    const href = mainOrigin ? (clean === '/' ? `${mainOrigin}/` : `${mainOrigin}${clean}`) : clean;
    quickHtml += `<li><a href="${href}">${escapeHtml(label)}</a></li>`;
  });

  let legalHtml = '';
  (data.legal_links || []).forEach(l => {
    let clean = l.url.replace(/\.html$/, '');
    if (clean === '/index' || clean === 'index') clean = '/';
    const href = mainOrigin ? (clean === '/' ? `${mainOrigin}/` : `${mainOrigin}${clean}`) : clean;
    legalHtml += `<li><a href="${href}">${escapeHtml(l.label)}</a></li>`;
  });

  let socialListHtml = '';
  (data.socials || []).forEach(s => {
    socialListHtml += `<li><a href="${s.url}"><i class="${escapeHtml(s.icon)}"></i> ${escapeHtml(s.label)}</a></li>`;
  });

  let aboutHeading = (data.about_heading || '').trim();
  if (!aboutHeading || aboutHeading.toLowerCase().includes('dinevault') || aboutHeading.toLowerCase().includes('restaurant')) {
    aboutHeading = 'About Catering Menu';
  }
  let aboutText = (data.about_text || '').trim();
  if (!aboutText || aboutText.toLowerCase().includes('dinevault') || aboutText.toLowerCase().includes('dining')) {
    aboutText = DEFAULT_GLOBAL.footer.about_text;
  }
  let copyrightText = (data.copyright || '').trim();
  if (!copyrightText || copyrightText.toLowerCase().includes('dinevault')) {
    copyrightText = '© 2026 Catering Menu. All rights reserved.';
  }

  footerContainer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col">
          <h4>${escapeHtml(aboutHeading)}</h4>
          <p>${escapeHtml(aboutText)}</p>
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
      <div class="footer-bottom">${escapeHtml(copyrightText)}</div>
    </div>
  `;

  fixSubdomainLinks();
}

function fixSubdomainLinks() {
  const host = window.location.hostname.toLowerCase();
  const hostParts = host.split('.');
  const isSubdomain = hostParts.length >= 3 && hostParts[0] !== 'www' && hostParts[0] !== 'admin' && hostParts[0] !== 'api';

  // Sanitize any legacy links across all pages
  document.querySelectorAll('a').forEach(a => {
    let rawHref = a.getAttribute('href');
    if (!rawHref) return;

    // Direct /index or /index.html sanitization
    if (rawHref === '/index' || rawHref === '/index.html' || rawHref === 'index.html' || rawHref === 'index') {
      a.setAttribute('href', isSubdomain ? 'https://www.catering-menu.com/' : '/');
      return;
    }

    if (isSubdomain) {
      const mainOrigin = host.includes('catering-menu.com') ? 'https://www.catering-menu.com' : '';
      if (!mainOrigin) return;

      if (rawHref.startsWith('/') && !rawHref.startsWith('//')) {
        let clean = rawHref.replace(/\.html$/, '');
        if (clean === '/index' || clean === '') clean = '/';
        a.href = clean === '/' ? `${mainOrigin}/` : `${mainOrigin}${clean}`;
      } else if (rawHref.includes(window.location.hostname)) {
        try {
          const parsed = new URL(rawHref, window.location.origin);
          let path = (parsed.pathname || '').replace(/\.html$/, '');
          if (path === '/index' || path === '') path = '/';
          if (path && path !== '/') {
            a.href = `${mainOrigin}${path}${parsed.search}`;
          } else {
            a.href = `${mainOrigin}/`;
          }
        } catch(e) {}
      }
    }

    // Always sanitize text if it says "Restaurants"
    if (a.closest('#navLinks') && a.textContent.trim().toLowerCase() === 'restaurants') {
      a.textContent = 'Caterers';
    }
  });
}

function setupScrollBehaviors() {
  const navbar = document.getElementById('navbar');
  const moveToTopBtn = document.getElementById('moveToTop');

  fixSubdomainLinks();

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

function slugify(text) {
  if (!text) return '';
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Generates caterer detail page URL.
 * In production (*.catering-menu.com): https://[slug].catering-menu.com
 * In development / fallback: /restaurant?slug=[slug]
 */
function getCatererUrl(caterer) {
  if (!caterer) return '/listings';
  const slug = (caterer.slug || slugify(caterer.name || 'caterer')).toLowerCase();
  const host = window.location.hostname.toLowerCase();

  // If in production on catering-menu.com domain
  if (host.endsWith('catering-menu.com')) {
    return `${window.location.protocol}//${slug}.catering-menu.com`;
  }

  // If running locally, in staging or preview
  return `/restaurant?slug=${encodeURIComponent(slug)}`;
}

let cachedApprovedCaterers = null;

async function fetchAllApprovedCaterers() {
  if (cachedApprovedCaterers) return cachedApprovedCaterers;
  try {
    const res = await fetch('/api/restaurants?status=approved');
    if (res.ok) {
      cachedApprovedCaterers = await res.json();
      return cachedApprovedCaterers;
    }
  } catch (e) {
    console.warn('Could not load caterers for live search', e);
  }
  return [];
}

/**
 * Initializes a live suggestion dropdown for any search input.
 * Supports arrow keys, enter, direct caterer click, and see all results link.
 */
function initLiveSearchSuggestions({ inputId, suggestionsId, mode = 'navigate' }) {
  const input = document.getElementById(inputId);
  const container = document.getElementById(suggestionsId);
  if (!input || !container) return;

  let caterers = [];
  let selectedIndex = -1;

  fetchAllApprovedCaterers().then(data => {
    caterers = data;
  });

  function renderSuggestions() {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      container.style.display = 'none';
      container.innerHTML = '';
      selectedIndex = -1;
      return;
    }

    const matches = caterers.filter(c => {
      const name = (c.name || '').toLowerCase();
      const cuisine = (c.cuisine || '').toLowerCase();
      const loc = (c.locations || '').toLowerCase();
      const about = (c.about_text || '').toLowerCase();
      return name.includes(q) || cuisine.includes(q) || loc.includes(q) || about.includes(q);
    }).slice(0, 6);

    if (matches.length === 0) {
      container.innerHTML = `
        <div class="search-suggest-empty">
          <i class="fas fa-search"></i> No catering services found for "<strong>${escapeHtml(q)}</strong>"
        </div>
      `;
      container.style.display = 'block';
      selectedIndex = -1;
      return;
    }

    let itemsHtml = `
      <div class="search-suggest-header">
        <span><i class="fas fa-sparkles" style="color:var(--gold);"></i> Suggested Caterers</span>
        <span class="search-suggest-count">${matches.length} found</span>
      </div>
    `;

    matches.forEach((c, idx) => {
      const reviews = Array.isArray(c.reviews) ? c.reviews : [];
      let avg = '5.0';
      if (reviews.length > 0) {
        const total = reviews.reduce((sum, rev) => sum + (Number(rev.rating) || 0), 0);
        avg = (total / reviews.length).toFixed(1);
      }
      const firstLoc = (c.locations || '').split('|')[0].trim();
      const targetUrl = getCatererUrl(c);

      itemsHtml += `
        <a href="${targetUrl}" class="search-suggest-item ${idx === selectedIndex ? 'selected' : ''}" data-index="${idx}">
          <div class="search-suggest-thumb">
            <img src="${escapeHtml(c.banner_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200')}" alt="${escapeHtml(c.name)}">
          </div>
          <div class="search-suggest-info">
            <div class="search-suggest-name">${escapeHtml(c.name)}</div>
            <div class="search-suggest-meta">
              <span class="search-suggest-cuisine"><i class="fas fa-utensils"></i> ${escapeHtml(c.cuisine || 'Catering')}</span>
              ${firstLoc ? `<span class="search-suggest-loc"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(firstLoc)}</span>` : ''}
            </div>
          </div>
          <div class="search-suggest-rating">
            <i class="fas fa-star"></i> ${avg}
          </div>
        </a>
      `;
    });

    itemsHtml += `
      <a href="/listings?q=${encodeURIComponent(q)}" class="search-suggest-footer">
        <span>View all results for "<strong>${escapeHtml(q)}</strong>"</span>
        <i class="fas fa-arrow-right"></i>
      </a>
    `;

    container.innerHTML = itemsHtml;
    container.style.display = 'block';
  }

  input.addEventListener('input', () => {
    selectedIndex = -1;
    if (caterers.length === 0) {
      fetchAllApprovedCaterers().then(data => {
        caterers = data;
        renderSuggestions();
      });
    } else {
      renderSuggestions();
    }
  });

  input.addEventListener('focus', () => {
    if (input.value.trim().length > 0) {
      renderSuggestions();
    }
  });

  input.addEventListener('keydown', (e) => {
    const items = container.querySelectorAll('.search-suggest-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length > 0) {
        selectedIndex = (selectedIndex + 1) % items.length;
        updateSelectedSuggestItem(items, selectedIndex);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length > 0) {
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        updateSelectedSuggestItem(items, selectedIndex);
      }
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && items[selectedIndex]) {
        e.preventDefault();
        items[selectedIndex].click();
      } else if (mode === 'navigate') {
        const q = input.value.trim();
        if (q) {
          window.location.href = `/listings?q=${encodeURIComponent(q)}`;
        }
      }
    } else if (e.key === 'Escape') {
      container.style.display = 'none';
      selectedIndex = -1;
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#' + inputId) && !e.target.closest('#' + suggestionsId)) {
      container.style.display = 'none';
    }
  });
}

function updateSelectedSuggestItem(items, selectedIndex) {
  items.forEach((item, idx) => {
    if (idx === selectedIndex) {
      item.classList.add('selected');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('selected');
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  setupScrollBehaviors();

  try {
    sessionStorage.removeItem('dark_logo_cache_v2');
    sessionStorage.removeItem('dark_logo_cache_v3');
  } catch(e) {}
});
