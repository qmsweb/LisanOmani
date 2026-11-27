/* الأمثال — عرض وبحث */
(function () {
  'use strict';

  const { fetchJSON, normalizeArabic, escapeHtml, getParam, debounce } = window.Lisan;

  const input = document.getElementById('proverb-q');
  const list = document.getElementById('proverb-list');
  const count = document.getElementById('proverb-count');

  let entries = [];

  function render() {
    const query = normalizeArabic(input.value);
    const filtered = entries.filter(function (entry) {
      if (!query) return true;
      return normalizeArabic([entry.text, entry.meaning, entry.theme].join(' ')).includes(query);
    });

    count.textContent = filtered.length;

    if (!filtered.length) {
      list.innerHTML = '<div class="empty-state"><b>لا توجد نتائج</b>جرّب كلمة من المثل أو موضوعه.</div>';
      return;
    }

    list.innerHTML = filtered.map(function (entry, index) {
      return `
        <article class="proverb">
          <div class="proverb-head">
            <span class="proverb-num">${String(index + 1).padStart(2, '0')}</span>
            <span class="badge badge-soft">${escapeHtml(entry.theme)}</span>
          </div>
          <h2 class="proverb-text">${escapeHtml(entry.text)}</h2>
          <p class="proverb-meaning">${escapeHtml(entry.meaning)}</p>
        </article>`;
    }).join('');
  }

  function init() {
    fetchJSON('data/proverbs.json').then(function (data) {
      entries = data.entries || [];
      const noteEl = document.getElementById('proverb-note');
      if (noteEl && data.note) noteEl.textContent = data.note;
      const q = getParam('q');
      if (q) input.value = q;
      render();
    }).catch(function (error) {
      list.innerHTML = '<div class="error-state">' + escapeHtml(error.message) + '</div>';
    });
  }

  input.addEventListener('input', debounce(render, 120));
  init();
})();
