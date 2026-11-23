(function () {
  'use strict';

  const { normalizeArabic, escapeHtml, fetchJSON, getParam } = window.Lisan;

  const form = document.getElementById('search-form');
  const input = document.getElementById('word-input');
  const typeSelect = document.getElementById('relation-type');
  const analyzeBtn = document.getElementById('analyze-btn');
  const resultsContainer = document.getElementById('results-container');
  const toolbar = document.getElementById('results-toolbar');
  const countEl = document.getElementById('results-count');
  const suggestionsEl = document.getElementById('suggestions');
  const dataCountEl = document.getElementById('data-count');

  const SUGGESTIONS = ['نور', 'سعيد', 'كريم', 'شجاع', 'صدق', 'عدل', 'علم', 'جميل', 'سريع', 'غني'];

  let dataset = null;

  function forms(word) {
    const normalized = normalizeArabic(word);
    const formsSet = new Set([normalized]);
    if (normalized.startsWith('ال')) formsSet.add(normalized.slice(2));
    return formsSet;
  }

  function matches(word, queryForms) {
    const wordForms = forms(word);
    for (const form of wordForms) {
      if (queryForms.has(form)) return true;
    }
    return false;
  }

  function findEntries(data, query) {
    const queryForms = forms(query);
    const results = [];

    Object.keys(data).forEach(function (mainWord) {
      const relations = data[mainWord] || {};
      const synonymMatch = Array.isArray(relations.synonym) && relations.synonym.some(function (word) {
        return matches(word, queryForms);
      });
      const antonymMatch = Array.isArray(relations.antonym) && relations.antonym.some(function (word) {
        return matches(word, queryForms);
      });

      if (matches(mainWord, queryForms)) {
        results.push({ mainWord: mainWord, foundAs: 'كلمة مفتاحية', relations: relations });
      } else if (synonymMatch) {
        results.push({ mainWord: mainWord, foundAs: 'مرادف', relations: relations });
      } else if (antonymMatch) {
        results.push({ mainWord: mainWord, foundAs: 'ضد', relations: relations });
      }
    });

    return results;
  }

  function wordButtons(words) {
    return words.map(function (word) {
      return '<button type="button" data-word="' + escapeHtml(word) + '">' + escapeHtml(word) + '</button>';
    }).join('، ');
  }

  function renderEntry(entry, query, type) {
    const card = document.createElement('article');
    card.className = 'result-card';

    let html = '<div class="main-word">' + escapeHtml(entry.mainWord) + '</div>';
    if (entry.foundAs !== 'كلمة مفتاحية') {
      html += '<span class="found-as">وُجدت «' + escapeHtml(query) + '» بوصفها ' + escapeHtml(entry.foundAs) + '</span>';
    }

    const synonyms = Array.isArray(entry.relations.synonym) ? entry.relations.synonym : [];
    const antonyms = Array.isArray(entry.relations.antonym) ? entry.relations.antonym : [];

    if ((type === 'all' || type === 'synonym') && synonyms.length) {
      html += '<div class="section-label">المرادفات</div><div class="words-text">' + wordButtons(synonyms) + '</div>';
    }
    if ((type === 'all' || type === 'antonym') && antonyms.length) {
      html += '<div class="section-label">الأضداد</div><div class="words-text">' + wordButtons(antonyms) + '</div>';
    }

    if (!html.includes('words-text')) {
      html += '<p class="muted small" style="margin:14px 0 0">لا توجد علاقات مسجّلة من النوع المحدد لهذا المدخل.</p>';
    }

    card.innerHTML = html;
    return card;
  }

  function showEmpty(title, text) {
    resultsContainer.innerHTML = '<div class="empty-state"><b>' + title + '</b>' + text + '</div>';
    toolbar.hidden = true;
  }

  function runSearch(query, type, options) {
    const opts = options || {};
    const word = (query || '').trim();
    const relationType = type || 'all';

    if (!word) {
      showEmpty('أدخل كلمة أولًا', 'اكتب كلمة عربية في الحقل أعلاه لبدء البحث.');
      input.focus();
      return;
    }

    if (!dataset) {
      resultsContainer.innerHTML = '<div class="loading-state"><span class="spinner"></span> تُحمَّل البيانات…</div>';
      return;
    }

    const entries = findEntries(dataset, word);
    resultsContainer.innerHTML = '';

    if (!entries.length) {
      showEmpty('لا توجد نتائج', 'لم نعثر على «' + escapeHtml(word) + '» في قاعدة البيانات الحالية. جرّب كلمة أخرى أو ابحث في البحث الشامل.');
      if (!opts.silent) syncUrl(word, relationType);
      return;
    }

    toolbar.hidden = false;
    countEl.innerHTML = 'عُثر على <b>' + entries.length + '</b> ' + (entries.length === 1 ? 'مدخل' : 'مدخلات') + ' للكلمة «<b>' + escapeHtml(word) + '</b>»';

    entries.forEach(function (entry) {
      resultsContainer.appendChild(renderEntry(entry, word, relationType));
    });

    if (!opts.silent) syncUrl(word, relationType);
    if (opts.scroll) resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function syncUrl(word, type) {
    const params = new URLSearchParams();
    if (word) params.set('q', word);
    if (type && type !== 'all') params.set('type', type);
    const url = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState(null, '', url);
  }

  function renderSuggestions() {
    SUGGESTIONS.forEach(function (word) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = word;
      chip.addEventListener('click', function () {
        input.value = word;
        typeSelect.value = 'all';
        runSearch(word, 'all');
      });
      suggestionsEl.appendChild(chip);
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    runSearch(input.value, typeSelect.value);
  });

  typeSelect.addEventListener('change', function () {
    if (input.value.trim() && dataset) runSearch(input.value, typeSelect.value, { silent: true });
  });

  resultsContainer.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-word]');
    if (!button) return;
    const word = button.getAttribute('data-word');
    input.value = word;
    runSearch(word, typeSelect.value, { scroll: true });
  });

  async function init() {
    renderSuggestions();

    try {
      dataset = await fetchJSON('data/semanticData.json');
      const count = Object.keys(dataset).length;
      if (dataCountEl) dataCountEl.textContent = count + ' مدخلًا';

      const q = getParam('q');
      const type = getParam('type');
      if (type === 'synonym' || type === 'antonym') typeSelect.value = type;

      if (q) {
        input.value = q;
        runSearch(q, typeSelect.value, { silent: true });
      }
    } catch (error) {
      console.error(error);
      resultsContainer.innerHTML = '<div class="error-state"><b>تعذر تحميل البيانات</b><br>تأكد من تشغيل الموقع عبر خادم محلي أو من خلال الاستضافة، ثم أعد تحميل الصفحة.</div>';
    }
  }

  init();
})();
