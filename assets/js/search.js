(function () {
  'use strict';

  const { fetchJSON, normalizeArabic, escapeHtml, getParam, debounce } = window.Lisan;

  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  const scope = document.getElementById('scope');
  const resultsEl = document.getElementById('search-results');

  const LIMIT = 20;
  let index = null;
  let busy = false;

  function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlight(text, query) {
    const safe = escapeHtml(text == null ? '' : text);
    if (!query) return safe;
    try {
      const pattern = new RegExp('(' + escapeRegExp(query) + ')', 'gi');
      return safe.replace(pattern, '<mark>$1</mark>');
    } catch (error) {
      return safe;
    }
  }

  function excerpt(value, query, max) {
    if (value == null) return '';
    const items = Array.isArray(value) ? value : [value];
    if (!items.length) return '';
    const joined = items.filter(Boolean).join('، ');
    const limit = max || 140;
    if (joined.length <= limit) return highlight(joined, query);
    return highlight(joined.slice(0, limit), query) + '…';
  }

  async function buildIndex() {
    const [semantic, loans, manifest] = await Promise.all([
      fetchJSON('data/semanticData.json'),
      fetchJSON('data/loan.json'),
      fetchJSON('data/fields.json')
    ]);

    const fieldEntries = Array.isArray(manifest.fields) ? manifest.fields : [];
    const loadedFields = await Promise.all(fieldEntries.map(async function (entry) {
      try {
        const raw = await fetchJSON(entry.file);
        const field = raw && Array.isArray(raw.fields) && raw.fields.length ? raw.fields[0] : raw;
        return { meta: entry, field: field };
      } catch (error) {
        console.error('تعذر تحميل الحقل', entry.id, error);
        return null;
      }
    }));

    index = {
      semanticEntries: Object.keys(semantic).map(function (word) {
        return { word: word, relations: semantic[word] || {} };
      }),
      loans: loans,
      fields: loadedFields.filter(Boolean)
    };
  }

  function formsOf(text) {
    const normalized = normalizeArabic(text);
    const set = new Set([normalized]);
    if (normalized.startsWith('ال')) set.add(normalized.slice(2));
    return set;
  }

  function anyFormMatches(text, queryForms) {
    const forms = formsOf(text);
    for (const form of forms) {
      for (const queryForm of queryForms) {
        if (!queryForm) continue;
        if (form === queryForm || form.includes(queryForm)) return true;
      }
    }
    return false;
  }

  function searchSemantic(query, queryForms) {
    const matches = [];

    index.semanticEntries.forEach(function (entry) {
      const synonyms = Array.isArray(entry.relations.synonym) ? entry.relations.synonym : [];
      const antonyms = Array.isArray(entry.relations.antonym) ? entry.relations.antonym : [];

      let reason = '';
      if (anyFormMatches(entry.word, queryForms)) reason = 'كلمة مفتاحية';
      else if (synonyms.some(function (word) { return anyFormMatches(word, queryForms); })) reason = 'وردت ضمن المرادفات';
      else if (antonyms.some(function (word) { return anyFormMatches(word, queryForms); })) reason = 'وردت ضمن الأضداد';

      if (!reason) return;

      const snippetParts = [];
      if (synonyms.length) snippetParts.push('المرادفات: ' + synonyms.slice(0, 6).join('، '));
      if (antonyms.length) snippetParts.push('الأضداد: ' + antonyms.slice(0, 6).join('، '));

      matches.push({
        title: entry.word,
        reason: reason,
        snippet: snippetParts.join(' · '),
        href: 'syns-ants.html?q=' + encodeURIComponent(entry.word),
        badge: 'الترادف والتضاد',
        badgeClass: ''
      });
    });

    return matches.sort(function (a, b) {
      if (a.reason === 'كلمة مفتاحية' && b.reason !== 'كلمة مفتاحية') return -1;
      if (b.reason === 'كلمة مفتاحية' && a.reason !== 'كلمة مفتاحية') return 1;
      return a.title.localeCompare(b.title, 'ar');
    });
  }

  function searchLoans(query, queryForms) {
    const results = [];

    index.loans.forEach(function (word) {
      const fields = [word.arabic, word.meaning, word.original, word.origin];
      const matched = fields.some(function (value) { return anyFormMatches(value || '', queryForms); });
      if (!matched) return;

      results.push({
        title: word.arabic,
        reason: 'الأصل: ' + (word.origin || 'غير محدد'),
        snippet: (word.meaning || '') + (word.original ? ' · الكلمة الأصلية: ' + word.original : ''),
        href: 'l-words.html?q=' + encodeURIComponent(word.arabic),
        badge: 'الكلمات الدخيلة',
        badgeClass: 'badge-gold'
      });
    });

    return results;
  }

  function searchFields(query, queryForms) {
    const results = [];
    const seen = new Set();

    index.fields.forEach(function (item) {
      const field = item.field || {};
      const fieldId = field.id || item.meta.id;
      const fieldTitle = field.title || item.meta.title;

      const fieldText = (fieldTitle || '') + ' ' + (field.description || '') + ' ' + (item.meta.summary || '');
      if (anyFormMatches(fieldText, queryForms) && !seen.has('field:' + fieldId)) {
        seen.add('field:' + fieldId);
        results.push({
          title: fieldTitle,
          reason: 'حقل دلالي',
          snippet: field.description || item.meta.summary || '',
          href: 'semantic-fields.html?field=' + encodeURIComponent(fieldId),
          badge: 'الحقول الدلالية',
          badgeClass: 'badge-soft'
        });
      }

      (Array.isArray(field.nodes) ? field.nodes : []).forEach(function (node) {
        const text = [node.label, node.definition, node.id]
          .concat(Array.isArray(node.examples) ? node.examples : [])
          .join(' ');

        if (!anyFormMatches(text, queryForms)) return;
        const key = 'node:' + fieldId + ':' + node.id;
        if (seen.has(key)) return;
        seen.add(key);

        const typeLabel = {
          core: 'مفهوم مركزي', event: 'حدث', actor: 'فاعل', method: 'طريقة', emotion: 'عاطفة', result: 'نتيجة'
        }[node.type] || 'مفهوم';

        results.push({
          title: node.label || node.id,
          reason: 'في ' + fieldTitle + ' — ' + typeLabel,
          snippet: node.definition || '',
          href: 'semantic-fields.html?field=' + encodeURIComponent(fieldId) + '&node=' + encodeURIComponent(node.id),
          badge: 'الحقول الدلالية',
          badgeClass: 'badge-soft'
        });
      });
    });

    return results;
  }

  function groupHtml(title, badgeClass, items, query, moreHref, moreLabel) {
    if (!items.length) return '';
    const shown = items.slice(0, LIMIT);

    let html = '<div class="search-group"><div class="search-group-head">' +
      '<h2>' + title + '</h2>' +
      '<span class="badge">' + items.length + ' نتيجة</span></div>' +
      '<div class="search-list">';

    shown.forEach(function (item) {
      html += '<a class="search-item" href="' + item.href + '">' +
        '<div class="item-head"><strong>' + highlight(item.title, query) + '</strong>' +
        '<span class="badge ' + (item.badgeClass || '') + '">' + escapeHtml(item.reason) + '</span></div>' +
        (item.snippet ? '<p>' + excerpt(item.snippet, query, 170) + '</p>' : '') +
        '</a>';
    });

    html += '</div>';
    if (items.length > LIMIT && moreHref) {
      html += '<div class="search-group-more"><a href="' + moreHref + '">' + (moreLabel || 'عرض بقية النتائج') + ' ←</a></div>';
    }
    html += '</div>';
    return html;
  }

  function runSearch(rawQuery, scopeValue) {
    const query = (rawQuery || '').trim();

    if (!index) {
      resultsEl.innerHTML = '<div class="panel"><div class="loading-state"><span class="spinner"></span> يُجهَّز فهرس البحث…</div></div>';
      return;
    }

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (scopeValue && scopeValue !== 'all') params.set('scope', scopeValue);
    window.history.replaceState(null, '', window.location.pathname + (params.toString() ? '?' + params.toString() : ''));

    if (!query) {
      resultsEl.innerHTML = '<div class="panel"><div class="empty-state" style="border:0"><b>ابحث في كل شيء</b>اكتب كلمة في الحقل أعلاه، أو اختر أحد الاقتراحات. يشمل البحث المعاني والأصول الأجنبية وأسماء العقد الدلالية.</div></div>';
      return;
    }

    const queryForms = formsOf(query);
    const semantic = (scopeValue === 'all' || scopeValue === 'semantic') ? searchSemantic(query, queryForms) : [];
    const loans = (scopeValue === 'all' || scopeValue === 'loan') ? searchLoans(query, queryForms) : [];
    const fields = (scopeValue === 'all' || scopeValue === 'fields') ? searchFields(query, queryForms) : [];
    const total = semantic.length + loans.length + fields.length;

    if (!total) {
      resultsEl.innerHTML = '<div class="panel"><div class="empty-state" style="border:0"><b>لا توجد نتائج لـ «' + escapeHtml(query) + '»</b>جرّب كلمة أقصر، أو ابحث بصيغة أخرى (مثل: فرح بدل الفرح)، أو غيّر نطاق البحث.</div></div>';
      return;
    }

    const summary = '<div class="panel"><div class="search-summary">' +
      '<span class="badge badge-gold">' + total + ' نتيجة</span>' +
      (semantic.length ? '<span class="badge">الترادف والتضاد: ' + semantic.length + '</span>' : '') +
      (loans.length ? '<span class="badge badge-gold">الكلمات الدخيلة: ' + loans.length + '</span>' : '') +
      (fields.length ? '<span class="badge badge-soft">الحقول الدلالية: ' + fields.length + '</span>' : '') +
      '</div><p class="muted small mb-0">نتائج البحث عن «<b>' + escapeHtml(query) + '</b>»</p></div>';

    const groups =
      groupHtml('الترادف والتضاد', '', semantic, query, 'syns-ants.html?q=' + encodeURIComponent(query), 'عرض كل النتائج في أداة الترادف') +
      groupHtml('الكلمات الدخيلة', 'badge-gold', loans, query, 'l-words.html?q=' + encodeURIComponent(query), 'عرض كل النتائج في المعجم') +
      groupHtml('الحقول الدلالية', 'badge-soft', fields, query, 'semantic-fields.html', 'تصفّح خرائط الحقول');

    resultsEl.innerHTML = summary + '<div style="margin-top:22px">' + groups + '</div>';
  }

  function triggerSearch() {
    runSearch(input.value, scope.value);
  }

  async function init() {
    if (busy) return;
    busy = true;

    input.value = getParam('q');
    const requestedScope = getParam('scope');
    if (['all', 'semantic', 'loan', 'fields'].includes(requestedScope)) scope.value = requestedScope;

    try {
      await buildIndex();
      busy = false;
      triggerSearch();
    } catch (error) {
      console.error(error);
      busy = false;
      resultsEl.innerHTML = '<div class="panel"><div class="error-state"><b>تعذر تجهيز فهرس البحث</b><br>تأكد من تشغيل الموقع عبر خادم محلي أو من خلال الاستضافة، ثم أعد تحميل الصفحة.</div></div>';
    }
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    triggerSearch();
  });

  scope.addEventListener('change', triggerSearch);
  input.addEventListener('input', debounce(triggerSearch, 350));

  document.addEventListener('click', function (event) {
    const chip = event.target.closest('.suggestions button[data-word]');
    if (!chip) return;
    input.value = chip.getAttribute('data-word');
    triggerSearch();
    input.focus();
  });

  init();
})();
