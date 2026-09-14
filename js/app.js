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
    about_text: "Catering Menu is the premier discovery directory connecting event planners and hosts with top-rated caterers, verified menus, genuine reviews, and seamless booking inquiries for unforgettable celebrations.",
    quick_heading: "Quick Links",
    quick_links: [
      { label: "Home", url: "/" },
      { label: "Caterers", url: "/listings" },
      { label: "About Us", url: "/about" },
      { label: "How It Works", url: "/about#how-it-works" },
      { label: "List Your Business", url: "/get-listed" },
      { label: "FAQs", url: "/faqs" },
      { label: "Contact Us", url: "/contact" }
    ],
    cuisines_heading: "Popular Catering",
    cuisine_links: [
      { label: "Wedding Catering", url: "/listings/wedding" },
      { label: "Corporate Galas", url: "/listings/corporate" },
      { label: "Live BBQ & Grill Stations", url: "/listings/bbq" },
      { label: "Italian & Wood-Fired", url: "/listings/italian" },
      { label: "Royal Indian & Asian", url: "/listings/asian" },
      { label: "Cocktails & Canapés", url: "/listings/cocktail" }
    ],
    legal_heading: "Legal & Policy",
    legal_links: [
      { label: "Privacy Policy", url: "/privacy" },
      { label: "Terms of Service", url: "/terms" },
      { label: "Allergen & Disclaimer", url: "/disclaimer" },
      { label: "Food Safety Standards", url: "/disclaimer" }
    ],
    show_socials: false,
    socials: [],
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

function setMetaTag(selector, attrName, attrValue, content) {
  if (!content) return;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function applySEOMetadata(cms) {
  if (!cms) return;

  const seo = cms.seo || {};
  const currentUrl = window.location.href;
  const siteName = (cms.seo_global && cms.seo_global.site_name) || 'Catering Menu';
  const defaultOg = (cms.seo_global && cms.seo_global.default_og_image) || 'https://www.catering-menu.com/assets/img/catering-menu-logo.png';
  const ogImg = seo.og_image || defaultOg;

  // 1. Dynamic Meta Title
  if (seo.title) {
    document.title = seo.title;
  }

  // 2. Dynamic Meta Description & Keywords
  if (seo.description) {
    setMetaTag('meta[name="description"]', 'name', 'description', seo.description);
  }
  if (seo.keywords) {
    setMetaTag('meta[name="keywords"]', 'name', 'keywords', seo.keywords);
  }

  // 3. Dynamic Open Graph (WhatsApp, Facebook, LinkedIn)
  setMetaTag('meta[property="og:type"]', 'property', 'og:type', 'website');
  setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', siteName);
  setMetaTag('meta[property="og:title"]', 'property', 'og:title', seo.title || document.title);
  setMetaTag('meta[property="og:description"]', 'property', 'og:description', seo.description || '');
  setMetaTag('meta[property="og:url"]', 'property', 'og:url', currentUrl);
  setMetaTag('meta[property="og:image"]', 'property', 'og:image', ogImg);

  // 4. Dynamic Twitter Cards
  setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', seo.title || document.title);
  setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', seo.description || '');
  setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', ogImg);

  // 5. Dynamic Robots Meta (Global Switch from D1)
  let robotsMeta = document.querySelector('meta[name="robots"]');
  if (!robotsMeta) {
    robotsMeta = document.createElement('meta');
    robotsMeta.name = 'robots';
    document.head.appendChild(robotsMeta);
  }

  if (cms.seo_global && cms.seo_global.indexing_enabled === true) {
    if (seo.robots) {
      robotsMeta.content = seo.robots;
    } else {
      robotsMeta.content = 'index, follow';
    }
  } else {
    robotsMeta.content = 'noindex, nofollow';
  }

  // 6. Dynamic Schema.org Structured Data
  applyDynamicSchema(cms);
}

function applyDynamicSchema(cms) {
  if (!cms) return;
  let scriptEl = document.getElementById('dynamic-schema');
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.type = 'application/ld+json';
    scriptEl.id = 'dynamic-schema';
    document.head.appendChild(scriptEl);
  }

  // If FAQ page with faq_items
  if (Array.isArray(cms.faq_items) && cms.faq_items.length > 0) {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": cms.faq_items.map(item => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer
        }
      }))
    };
    scriptEl.textContent = JSON.stringify(faqSchema, null, 2);
    return;
  }

  // Default WebSite & Organization Schema
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": (cms.seo && cms.seo.title) || document.title,
    "description": (cms.seo && cms.seo.description) || "",
    "url": window.location.href,
    "publisher": {
      "@type": "Organization",
      "name": "Catering Menu",
      "url": "https://www.catering-menu.com",
      "logo": "https://www.catering-menu.com/assets/img/catering-menu-logo.png"
    }
  };
  scriptEl.textContent = JSON.stringify(schema, null, 2);
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
  initHamburger();

  fixSubdomainLinks();
}

function initHamburger() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (!hamburger || !navLinks) return;

  if (hamburger.dataset.bound === 'true') return;
  hamburger.dataset.bound = 'true';

  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = navLinks.classList.toggle('open');
    navLinks.classList.toggle('active', isOpen);
    hamburger.classList.toggle('active', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('open', 'active');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open', 'active');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
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
  const logoHref = mainOrigin ? `${mainOrigin}/` : '/';

  // Quick Links
  const quickLinks = (data.quick_links && data.quick_links.length > 0) ? data.quick_links : DEFAULT_GLOBAL.footer.quick_links;
  let quickHtml = '';
  quickLinks.forEach(l => {
    let label = (l.label || '').trim();
    if (label.toLowerCase() === 'restaurants' || label.toLowerCase() === 'restaurant' || label.toLowerCase() === 'all restaurants') {
      label = 'Caterers';
    }
    let clean = l.url.replace(/\.html$/, '');
    if (clean === '/index' || clean === 'index' || clean === '') clean = '/';
    const href = mainOrigin ? (clean === '/' ? `${mainOrigin}/` : `${mainOrigin}${clean}`) : clean;
    quickHtml += `<li><a href="${href}"><i class="fas fa-angle-right"></i> ${escapeHtml(label)}</a></li>`;
  });

  // Cuisines / Specialties
  const cuisineLinks = (data.cuisine_links && data.cuisine_links.length > 0) ? data.cuisine_links : [
    { label: "Wedding Catering", url: "/listings/wedding" },
    { label: "Corporate Galas", url: "/listings/corporate" },
    { label: "Live BBQ & Grill Stations", url: "/listings/bbq" },
    { label: "Italian & Wood-Fired", url: "/listings/italian" },
    { label: "Royal Indian & Asian", url: "/listings/asian" },
    { label: "Cocktails & Canapés", url: "/listings/cocktail" }
  ];
  let cuisineHtml = '';
  cuisineLinks.forEach(l => {
    let clean = l.url.replace(/\.html$/, '');
    if (clean === '/index' || clean === 'index' || clean === '') clean = '/';
    const href = mainOrigin ? (clean === '/' ? `${mainOrigin}/` : `${mainOrigin}${clean}`) : clean;
    cuisineHtml += `<li><a href="${href}"><i class="fas fa-angle-right"></i> ${escapeHtml(l.label)}</a></li>`;
  });

  // Legal Links
  const legalLinks = (data.legal_links && data.legal_links.length > 0) ? data.legal_links : DEFAULT_GLOBAL.footer.legal_links;
  let legalHtml = '';
  legalLinks.forEach(l => {
    let clean = l.url.replace(/\.html$/, '');
    if (clean === '/index' || clean === 'index') clean = '/';
    const href = mainOrigin ? (clean === '/' ? `${mainOrigin}/` : `${mainOrigin}${clean}`) : clean;
    legalHtml += `<li><a href="${href}"><i class="fas fa-shield-alt"></i> ${escapeHtml(l.label)}</a></li>`;
  });

  // Socials handling: Only show if explicitly enabled AND non-empty non-hash URLs exist
  const hasValidSocials = data.show_socials === true && (data.socials || []).some(s => s.url && s.url !== '#' && s.url.startsWith('http'));
  let socialsHtml = '';
  if (hasValidSocials) {
    (data.socials || []).filter(s => s.url && s.url !== '#' && s.url.startsWith('http')).forEach(s => {
      socialsHtml += `<a href="${s.url}" class="social-icon" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(s.label)}"><i class="${escapeHtml(s.icon)}"></i></a>`;
    });
  }

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
        <!-- 1. Brand & Trust -->
        <div class="footer-col footer-brand">
          <a href="${logoHref}" class="footer-logo-link" aria-label="Catering Menu Home">
            <img src="/assets/img/catering-menu-logo.png" alt="Catering Menu" class="footer-logo-img">
          </a>
          <p>${escapeHtml(aboutText)}</p>
          <div class="footer-trust-pills">
            <span class="footer-trust-pill"><i class="fas fa-check-circle"></i> Verified Menus</span>
            <span class="footer-trust-pill"><i class="fas fa-gem"></i> Premier Caterers</span>
            <span class="footer-trust-pill"><i class="fas fa-bolt"></i> Direct Connect</span>
          </div>
          ${hasValidSocials ? `<div class="footer-socials" style="margin-top:12px;">${socialsHtml}</div>` : ''}
        </div>

        <!-- 2. Quick Navigation -->
        <div class="footer-col">
          <h4>${escapeHtml(data.quick_heading || 'Quick Links')}</h4>
          <ul>${quickHtml}</ul>
        </div>

        <!-- 3. Catering Specialities -->
        <div class="footer-col">
          <h4>${escapeHtml(data.cuisines_heading || 'Popular Catering')}</h4>
          <ul>${cuisineHtml}</ul>
        </div>

        <!-- 4. Legal & Trust -->
        <div class="footer-col">
          <h4>${escapeHtml(data.legal_heading || 'Legal & Policy')}</h4>
          <ul>${legalHtml}</ul>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="footer-bottom">
        <div class="footer-bottom-flex">
          <div>${escapeHtml(copyrightText)}</div>
          <div class="footer-bottom-tagline">Crafted for unforgettable celebrations & luxury feasts</div>
          <div class="footer-bottom-links">
            <a href="${mainOrigin ? `${mainOrigin}/privacy` : '/privacy'}">Privacy Policy</a>
            <span style="opacity:0.3;">•</span>
            <a href="${mainOrigin ? `${mainOrigin}/terms` : '/terms'}">Terms</a>
            <span style="opacity:0.3;">•</span>
            <a href="${mainOrigin ? `${mainOrigin}/disclaimer` : '/disclaimer'}">Disclaimer</a>
            <span style="opacity:0.3;">•</span>
            <a href="${mainOrigin ? `${mainOrigin}/contact` : '/contact'}">Contact</a>
          </div>
        </div>
      </div>
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
      <a href="/listings/${encodeURIComponent(q.toLowerCase())}" class="search-suggest-footer">
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
          window.location.href = `/listings/${encodeURIComponent(q.toLowerCase())}`;
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

function renderStatsGrid(containerId, statsArray) {
  const container = document.getElementById(containerId);
  if (!container || !Array.isArray(statsArray)) return;
  container.innerHTML = statsArray.map(s => `
    <div class="stat-card glass">
      <div class="stat-number">${escapeHtml(s.number)}</div>
      <div class="stat-label">${escapeHtml(s.label)}</div>
    </div>
  `).join('');
}

function renderLegalDocument(cms) {
  if (!cms) return;
  if (cms.hero) {
    const titleEl = document.getElementById('legalTitle');
    if (titleEl && cms.hero.title) titleEl.textContent = cms.hero.title;
    const subEl = document.getElementById('legalSubtitle');
    if (subEl && cms.hero.subtitle) subEl.textContent = cms.hero.subtitle;
  }
  if (cms.last_updated) {
    const badge = document.getElementById('legalLastUpdated');
    if (badge) badge.textContent = cms.last_updated;
  }
  const secContainer = document.getElementById('legalSectionsContainer');
  if (secContainer && Array.isArray(cms.sections)) {
    secContainer.innerHTML = cms.sections.map(sec => `
      <div class="legal-sec">
        <h2>${escapeHtml(sec.title)}</h2>
        <p>${escapeHtml(sec.content).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>
      </div>
    `).join('');
  }
  if (cms.contact_box) {
    const box = document.getElementById('legalContactBox');
    if (box) {
      box.innerHTML = `
        <h3><i class="fas fa-headset"></i> ${escapeHtml(cms.contact_box.title || 'Catering Menu Legal Team')}</h3>
        ${cms.contact_box.email ? `<p>Email: <a href="mailto:${escapeHtml(cms.contact_box.email)}" style="color:#92400e;font-weight:700;text-decoration:underline;">${escapeHtml(cms.contact_box.email)}</a></p>` : ''}
        ${cms.contact_box.website ? `<p style="margin-top:4px;">Website: <a href="${escapeHtml(cms.contact_box.website)}" target="_blank" style="color:#92400e;font-weight:700;text-decoration:underline;">${escapeHtml(cms.contact_box.website)}</a></p>` : ''}
      `;
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  setupScrollBehaviors();
  initHamburger();

  try {
    sessionStorage.removeItem('dark_logo_cache_v2');
    sessionStorage.removeItem('dark_logo_cache_v3');
  } catch(e) {}
});
