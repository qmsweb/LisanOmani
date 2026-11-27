/* المعجم اللهجي — بحث وتصفية */
(function () {
  'use strict';

  const { fetchJSON, normalizeArabic, escapeHtml, getParam, debounce } = window.Lisan;

  const input = document.getElementById('dialect-q');
  const regionSelect = document.getElementById('dialect-region');
  const results = document.getElementById('dialect-results');
  const count = document.getElementById('dialect-count');

  let entries = [];
  let note = '';

  function render() {
    const query = normalizeArabic(input.value);
    const region = regionSelect.value;

    const filtered = entries.filter(function (entry) {
      if (region && entry.region !== region) return false;
      if (!query) return true;
      const haystack = normalizeArabic([entry.word, entry.meaning, entry.example, entry.note].join(' '));
      return haystack.includes(query);
    });

    count.textContent = filtered.length;

    if (!filtered.length) {
      results.innerHTML = '<div class="empty-state"><b>لا توجد نتائج</b>جرّب كلمة أخرى أو أزل التصفية.</div>';
      return;
    }

    results.innerHTML = filtered.map(function (entry) {
      return `
        <article class="entry">
          <div class="entry-top">
            <h2 class="entry-word">${escapeHtml(entry.word)}</h2>
            <span class="badge badge-soft">${escapeHtml(entry.region)}</span>
          </div>
          <p class="entry-meaning">${escapeHtml(entry.meaning)}</p>
          <p class="entry-example">${escapeHtml(entry.example)}</p>
          ${entry.note ? `<p class="entry-note">${escapeHtml(entry.note)}</p>` : ''}
        </article>`;
    }).join('');
  }

  function fillRegions() {
    const regions = Array.from(new Set(entries.map(function (entry) { return entry.region; })));
    regionSelect.innerHTML = '<option value="">كل المناطق</option>' +
      regions.map(function (region) {
        return `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`;
      }).join('');
  }

  function init() {
    fetchJSON('data/dialect.json').then(function (data) {
      entries = data.entries || [];
      note = data.note || '';
      const noteEl = document.getElementById('dialect-note');
      if (noteEl && note) noteEl.textContent = note;
      fillRegions();

      const q = getParam('q');
      if (q) input.value = q;
      render();
    }).catch(function (error) {
      results.innerHTML = '<div class="error-state">' + escapeHtml(error.message) + '</div>';
    });
  }

  input.addEventListener('input', debounce(render, 120));
  regionSelect.addEventListener('change', render);
  init();
})();
