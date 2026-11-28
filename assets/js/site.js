/* ============================================================
   اللسان العماني — السكربت المشترك
   ترويسة + قائمة منسدلة + تذييل
   ============================================================ */

(function () {
  'use strict';

  const NAV = [
    { href: 'index.html', label: 'الرئيسية', nav: 'home' },
    { href: 'dialect.html', label: 'المعجم اللهجي', nav: 'dialect' },
    { href: 'map.html', label: 'الخريطة', nav: 'map' },
    { href: 'proverbs.html', label: 'الأمثال', nav: 'proverbs' },
    { href: 'assistant.html', label: 'المساعد الذكي', nav: 'assistant' },
    { href: 'about.html', label: 'عن المشروع', nav: 'about' },
    { href: 'contact.html', label: 'اتصل بنا', nav: 'contact' }
  ];

  function navHtml(current) {
    return NAV.map(function (item) {
      const currentAttr = item.nav === current ? ' aria-current="page"' : '';
      return `<a href="${item.href}"${currentAttr}>${item.label}</a>`;
    }).join('');
  }

  const BOTTOM_NAV = [
    {
      href: 'index.html',
      label: 'الرئيسية',
      nav: 'home',
      icon: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>'
    },
    {
      href: 'dialect.html',
      label: 'المعجم',
      nav: 'dialect',
      icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h5"/>'
    },
    {
      href: 'map.html',
      label: 'الخريطة',
      nav: 'map',
      icon: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'
    },
    {
      href: 'proverbs.html',
      label: 'الأمثال',
      nav: 'proverbs',
      icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 8h8M8 12h5"/>'
    },
    {
      href: 'assistant.html',
      label: 'المساعد',
      nav: 'assistant',
      icon: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z"/>'
    }
  ];

  function bottomNavHtml(current) {
    return `
      <nav class="bottom-nav" aria-label="التنقل السريع">
        ${BOTTOM_NAV.map(function (item) {
          const currentAttr = item.nav === current ? ' aria-current="page"' : '';
          return `<a href="${item.href}"${currentAttr}>
            <span class="bottom-nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg>
            </span>
            <span class="bottom-nav-label">${item.label}</span>
          </a>`;
        }).join('')}
      </nav>`;
  }

  function headerHtml(current) {
    return `
      <a class="skip-link" href="#main">تجاوز إلى المحتوى</a>
      <header class="site-header">
        <div class="header-inner">
          <a class="brand" href="index.html" aria-label="اللسان العماني — الصفحة الرئيسية">
            <img class="brand-logo" src="assets/img/logo-wordmark.png" alt="اللسان العماني" width="1036" height="219">
          </a>

          <button class="menu-btn" id="menu-btn" aria-label="فتح القائمة" aria-expanded="false" aria-controls="site-menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          </button>
        </div>

        <nav class="site-menu" id="site-menu" aria-label="التنقل الرئيسي" hidden>
          ${navHtml(current)}
        </nav>
      </header>`;
  }

  function footerHtml() {
    return `
      <footer class="site-footer">
        <div class="container footer-inner">
          <nav class="footer-nav" aria-label="روابط التذييل">${navHtml('')}</nav>
          <p class="footer-note">© <span id="year">2026</span> اللسان العماني · نسخة مراجعة</p>
        </div>
      </footer>`;
  }

  function mountLayout() {
    const current = document.body.dataset.nav || 'home';
    const headerMount = document.getElementById('site-header');
    const footerMount = document.getElementById('site-footer');

    if (headerMount) headerMount.innerHTML = headerHtml(current);
    if (footerMount) footerMount.innerHTML = footerHtml();

    let bottomMount = document.getElementById('site-bottom');
    if (!bottomMount) {
      bottomMount = document.createElement('div');
      bottomMount.id = 'site-bottom';
      document.body.appendChild(bottomMount);
    }
    bottomMount.innerHTML = bottomNavHtml(current);

    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    const btn = document.getElementById('menu-btn');
    const menu = document.getElementById('site-menu');
    if (!btn || !menu) return;

    function setMenu(open) {
      btn.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      document.body.classList.toggle('menu-open', open);
    }

    btn.addEventListener('click', function () {
      setMenu(menu.hidden);
    });

    menu.addEventListener('click', function (event) {
      if (event.target.closest('a')) setMenu(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !menu.hidden) {
        setMenu(false);
        btn.focus();
      }
    });

    document.addEventListener('click', function (event) {
      if (menu.hidden) return;
      if (event.target.closest('.site-header')) return;
      setMenu(false);
    });
  }

  /* ---------- أدوات مشتركة للصفحات ---------- */

  function normalizeArabic(text) {
    if (!text) return '';
    return String(text)
      .trim()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/[ؤ]/g, 'و')
      .replace(/[ئ]/g, 'ي')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/\s+/g, ' ');
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const jsonCache = new Map();
  function fetchJSON(url) {
    if (jsonCache.has(url)) return jsonCache.get(url);
    const promise = fetch(url).then(function (response) {
      if (!response.ok) throw new Error('تعذر تحميل البيانات (' + response.status + ')');
      return response.json();
    });
    jsonCache.set(url, promise);
    promise.catch(function () { jsonCache.delete(url); });
    return promise;
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name) || '';
  }

  function debounce(fn, wait) {
    let timer = null;
    return function () {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(null, args); }, wait || 200);
    };
  }

  window.Lisan = {
    normalizeArabic: normalizeArabic,
    escapeHtml: escapeHtml,
    fetchJSON: fetchJSON,
    getParam: getParam,
    debounce: debounce,
    bottomNavHtml: bottomNavHtml
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountLayout);
  } else {
    mountLayout();
  }
})();
