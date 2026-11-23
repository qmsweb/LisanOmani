(function () {
  'use strict';

  const { escapeHtml, fetchJSON, getParam, debounce } = window.Lisan;

  const input = document.getElementById('word-input');
  const originSelect = document.getElementById('origin-type');
  const searchBtn = document.getElementById('search-btn');
  const resetBtn = document.getElementById('reset-btn');
  const resultsContainer = document.getElementById('results-container');
  const resultsCount = document.getElementById('results-count');
  const dataCount = document.getElementById('data-count');

  let words = [];

  function normalizeLatin(text) {
    return String(text || '').toLowerCase().replace(/[éèêë]/g, 'e').replace(/[àâ]/g, 'a').replace(/[ïî]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ûü]/g, 'u');
  }

  function populateOrigins() {
    const counts = new Map();
    words.forEach(function (word) {
      const origin = word.origin || 'غير محدد';
      counts.set(origin, (counts.get(origin) || 0) + 1);
    });

    const origins = Array.from(counts.keys()).sort(function (a, b) {
      return a.localeCompare(b, 'ar');
    });

    origins.forEach(function (origin) {
      const option = document.createElement('option');
      option.value = origin;
      option.textContent = origin + ' (' + counts.get(origin) + ')';
      originSelect.appendChild(option);
    });
  }

  function cardHtml(word) {
    let html = '<div class="main-word">' + escapeHtml(word.arabic) + '</div>';
    html += '<span class="origin-label">الأصل: ' + escapeHtml(word.origin || 'غير محدد') + '</span>';
    if (word.original) {
      html += '<div class="origin">الكلمة الأصلية: ' + escapeHtml(word.original) + '</div>';
    }
    html += '<span class="meaning-label">المعنى أو الاستعمال</span>';
    html += '<div class="meaning">' + escapeHtml(word.meaning || '—') + '</div>';
    return html;
  }

  function render(list) {
    resultsContainer.innerHTML = '';

    const filtersActive = input.value.trim() !== '' || originSelect.value !== 'all';
    resetBtn.hidden = !filtersActive;

    if (!list.length) {
      resultsContainer.innerHTML = '<div class="empty-state"><b>لا توجد نتائج مطابقة</b>جرّب كلمة أخرى، أو أزل عامل التصفية، أو اختر أصلًا مختلفًا.</div>';
      resultsCount.innerHTML = 'لا توجد نتائج من أصل <b>' + words.length + '</b> كلمة.';
      return;
    }

    resultsCount.innerHTML = 'عرض <b>' + list.length + '</b> من أصل <b>' + words.length + '</b> كلمة.';

    list.forEach(function (word) {
      const card = document.createElement('article');
      card.className = 'result-card';
      card.innerHTML = cardHtml(word);
      resultsContainer.appendChild(card);
    });
  }

  function applyFilters(updateUrl) {
    const term = input.value.trim();
    const selectedOrigin = originSelect.value;
    const normalizedTerm = normalizeLatin(term);

    const filtered = words.filter(function (word) {
      if (selectedOrigin !== 'all' && word.origin !== selectedOrigin) return false;
      if (!normalizedTerm) return true;
      const haystack = [
        word.arabic,
        word.meaning,
        word.original,
        word.origin
      ].map(normalizeLatin).join(' ');
      return haystack.includes(normalizedTerm);
    });

    render(filtered);

    if (updateUrl !== false) {
      const params = new URLSearchParams();
      if (term) params.set('q', term);
      if (selectedOrigin !== 'all') params.set('origin', selectedOrigin);
      const url = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState(null, '', url);
    }
  }

  function reset() {
    input.value = '';
    originSelect.value = 'all';
    applyFilters();
    input.focus();
  }

  async function init() {
    try {
      words = await fetchJSON('data/loan.json');
      dataCount.textContent = 'قاعدة تضم ' + words.length + ' كلمة، مع أصلها ومعناها.';
      populateOrigins();

      input.value = getParam('q');
      const origin = getParam('origin');
      if (origin && Array.from(originSelect.options).some(function (o) { return o.value === origin; })) {
        originSelect.value = origin;
      }

      render(words);
      if (input.value || originSelect.value !== 'all') applyFilters(false);
      else resultsCount.innerHTML = 'عرض <b>' + words.length + '</b> كلمة موثّقة.';
    } catch (error) {
      console.error(error);
      resultsContainer.innerHTML = '<div class="error-state"><b>تعذر تحميل القائمة</b><br>تأكد من تشغيل الموقع عبر خادم محلي أو من خلال الاستضافة، ثم أعد تحميل الصفحة.</div>';
      resultsCount.textContent = '';
      dataCount.textContent = 'تعذر تحميل البيانات.';
    }
  }

  searchBtn.addEventListener('click', function () { applyFilters(); });
  resetBtn.addEventListener('click', reset);
  originSelect.addEventListener('change', function () { applyFilters(); });
  input.addEventListener('input', debounce(function () { applyFilters(); }, 180));
  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') { event.preventDefault(); applyFilters(); }
  });
  document.addEventListener('click', function (event) {
    const chip = event.target.closest('.suggestions button[data-word]');
    if (!chip) return;
    input.value = chip.getAttribute('data-word');
    applyFilters();
  });

  init();
})();
