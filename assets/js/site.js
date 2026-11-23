/* ============================================================
   اللسان العماني — السكربت المشترك
   ============================================================ */

(function () {
  'use strict';

  const NAV = [
    { href: 'index.html', label: 'الرئيسية', nav: 'home' },
    { href: 'tools.html', label: 'الأدوات', nav: 'tools' },
    { href: 'search.html', label: 'البحث الشامل', nav: 'search' },
    { href: 'about.html', label: 'عن المشروع', nav: 'about' },
    { href: 'contact.html', label: 'اتصل بنا', nav: 'contact' }
  ];

  const LOGO_MARK = `
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path d="M24.5 7.5v17.2a7.8 7.8 0 0 1-7.8 7.8h-3.4"
            fill="none" stroke="#ffffff" stroke-width="4.6" stroke-linecap="round"/>
      <circle cx="29.4" cy="9.4" r="2.7" fill="#f2c96b"/>
    </svg>`;

  function brandHref() {
    return 'index.html';
  }

  function navHtml(current) {
    return NAV.map(function (item) {
      const currentAttr = item.nav === current ? ' aria-current="page"' : '';
      return `<a href="${item.href}"${currentAttr}>${item.label}</a>`;
    }).join('');
  }

  function drawerHtml(current) {
    return `
      <div class="drawer" id="site-drawer" role="dialog" aria-modal="true" aria-label="قائمة التنقل">
        <div class="drawer-head">
          <a class="brand" href="${brandHref()}" aria-label="اللسان العماني — الرئيسية">
            <span class="brand-mark">${LOGO_MARK}</span>
            <span class="brand-text"><strong>اللسان العماني</strong><small>منصة الظواهر الدلالية</small></span>
          </a>
          <button class="drawer-close" id="drawer-close" aria-label="إغلاق القائمة">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
        <nav class="drawer-nav" aria-label="التنقل في الموقع">${navHtml(current)}</nav>
      </div>`;
  }

  function headerHtml(current) {
    return `
      <a class="skip-link" href="#main">تجاوز إلى المحتوى</a>
      <header class="site-header">
        <div class="header-inner">
          <a class="brand" href="${brandHref()}" aria-label="اللسان العماني — الصفحة الرئيسية">
            <span class="brand-mark">${LOGO_MARK}</span>
            <span class="brand-text">
              <strong>اللسان العماني</strong>
              <small>منصة الظواهر الدلالية</small>
            </span>
          </a>
          <nav class="site-nav" aria-label="التنقل الرئيسي">${navHtml(current)}</nav>
          <button class="nav-toggle" id="nav-toggle" aria-label="فتح قائمة التنقل" aria-expanded="false" aria-controls="site-drawer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          </button>
        </div>
      </header>
      ${drawerHtml(current)}`;
  }

  function footerHtml() {
    return `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-grid">
            <div class="footer-brand">
              <a class="brand" href="index.html" aria-label="اللسان العماني — الرئيسية">
                <span class="brand-mark">${LOGO_MARK}</span>
                <span class="brand-text"><strong>اللسان العماني</strong><small>منصة الظواهر الدلالية</small></span>
              </a>
              <p>منصة عربية تعنى بدراسة الظواهر الدلالية في اللغة العربية: الترادف والتضاد، والكلمات الدخيلة، والحقول الدلالية، وأدوات تفاعلية للتعلم والاستكشاف.</p>
            </div>
            <div class="footer-col">
              <h3>الأدوات</h3>
              <a href="syns-ants.html">الترادف والتضاد</a>
              <a href="l-words.html">الكلمات الدخيلة</a>
              <a href="semantic-fields.html">الحقول الدلالية</a>
              <a href="game.html">الكلمات المتقاطعة</a>
              <a href="search.html">البحث الشامل</a>
            </div>
            <div class="footer-col">
              <h3>المنصة</h3>
              <a href="index.html">الرئيسية</a>
              <a href="tools.html">جميع الأدوات</a>
              <a href="about.html">عن المشروع</a>
              <a href="contact.html">اتصل بنا</a>
              <a href="https://github.com/qmsweb/LisanOmani" target="_blank" rel="noopener">المستودع على GitHub</a>
            </div>
            <div class="footer-col">
              <h3>عن النسخة</h3>
              <div class="footer-note">
                <span class="badge badge-gold">الإصدار 1.0</span>
                <p style="margin:0">موقع ثابت سريع وآمن، يعمل دون خادم أو قاعدة بيانات، ويمكن استضافته مجانًا على GitHub Pages.</p>
              </div>
              <p style="margin:16px 0 0">
                <a href="https://github.com/qmsweb/LisanOmani/issues/new" target="_blank" rel="noopener">أبلغ عن مشكلة</a>
              </p>
            </div>
          </div>
          <div class="footer-bottom">
            <span>© <span id="year">2026</span> اللسان العماني — جميع الحقوق محفوظة.</span>
            <span>صُنع بعناية لخدمة اللغة العربية · <a href="about.html">عن المشروع</a></span>
          </div>
        </div>
      </footer>
      <button class="to-top" id="to-top" aria-label="العودة إلى أعلى الصفحة">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
      </button>`;
  }

  function mountLayout() {
    const current = document.body.dataset.nav || 'home';
    const headerMount = document.getElementById('site-header');
    const footerMount = document.getElementById('site-footer');

    if (headerMount) headerMount.innerHTML = headerHtml(current);
    if (footerMount) footerMount.innerHTML = footerHtml();

    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    const toggle = document.getElementById('nav-toggle');
    const drawer = document.getElementById('site-drawer');
    const close = document.getElementById('drawer-close');
    let lastFocused = null;

    function openDrawer() {
      if (!drawer) return;
      lastFocused = document.activeElement;
      drawer.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
      const firstLink = drawer.querySelector('.drawer-nav a');
      if (firstLink) firstLink.focus();
    }

    function closeDrawer() {
      if (!drawer) return;
      drawer.classList.remove('open');
      document.body.style.overflow = '';
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      } else if (lastFocused) {
        lastFocused.focus();
      }
    }

    if (toggle) toggle.addEventListener('click', openDrawer);
    if (close) close.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && drawer && drawer.classList.contains('open')) closeDrawer();
      if (event.key === 'Tab' && drawer && drawer.classList.contains('open')) {
        const focusables = drawer.querySelectorAll('a[href], button:not([disabled])');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    if (drawer) {
      drawer.addEventListener('click', function (event) {
        if (event.target.closest('a')) closeDrawer();
      });
    }

    const toTop = document.getElementById('to-top');
    if (toTop) {
      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      window.addEventListener('scroll', function () {
        toTop.classList.toggle('show', window.scrollY > 500);
      }, { passive: true });
    }

    const reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      reveals.forEach(function (el) { observer.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('visible'); });
    }
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
    debounce: debounce
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountLayout);
  } else {
    mountLayout();
  }
})();
