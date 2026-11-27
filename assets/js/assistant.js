/* المساعد الذكي — إجابة محلية من بيانات المنصة */
(function () {
  'use strict';

  const { fetchJSON, normalizeArabic, escapeHtml } = window.Lisan;

  const log = document.getElementById('chat-log');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const suggestions = document.getElementById('chat-suggestions');

  let words = [];
  let proverbs = [];
  let regions = [];
  let loaded = false;

  const STOP = ['ما', 'شو', 'ايش', 'وش', 'ويش', 'معني', 'معنى', 'هو', 'هي', 'من', 'في', 'عن', 'على', 'الى', 'ال', 'اي', 'أي', 'كلمه', 'كلمة', 'مثل', 'امثال', 'أمثال', 'قال', 'يقال', 'تقال', 'تريد', 'اعرف', 'أعرف', 'اشرح', 'فسر', 'اللهجه', 'لهجه', 'منطقه', 'منطقة', 'عن'];

  function tokens(text) {
    return normalizeArabic(text)
      .replace(/[؟?.,،!:؛"«»'’]/g, ' ')
      .split(/\s+/)
      .filter(function (token) { return token && !STOP.includes(token); });
  }

  function findWord(query) {
    const q = normalizeArabic(query).replace(/[؟?.,،!:؛"«»]/g, ' ').trim();
    const qTokens = tokens(query);
    const sorted = words.slice().sort(function (a, b) { return b.word.length - a.word.length; });

    for (const entry of sorted) {
      const word = normalizeArabic(entry.word);
      if (qTokens.includes(word)) return entry;
      if (q === word) return entry;
    }
    for (const entry of sorted) {
      const word = normalizeArabic(entry.word);
      if (word.length > 2 && q.includes(word)) return entry;
    }
    return null;
  }

  function findProverbs(query) {
    const qTokens = tokens(query);
    if (!qTokens.length) return [];

    return proverbs.map(function (entry) {
      const hay = normalizeArabic(entry.text + ' ' + entry.meaning + ' ' + entry.theme);
      let score = 0;
      qTokens.forEach(function (token) {
        if (hay.includes(token)) score += token.length > 3 ? 2 : 1;
      });
      return { entry: entry, score: score };
    }).filter(function (item) { return item.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 2)
      .map(function (item) { return item.entry; });
  }

  function findRegion(query) {
    const q = normalizeArabic(query);
    return regions.find(function (region) {
      return q.includes(normalizeArabic(region.name)) || q.includes(normalizeArabic(region.capital));
    }) || null;
  }

  function wordCard(entry) {
    return `
      <p class="msg-title">${escapeHtml(entry.word)}</p>
      <p>${escapeHtml(entry.meaning)}</p>
      <p class="msg-ex">${escapeHtml(entry.example)}</p>
      <p class="msg-meta">المنطقة: ${escapeHtml(entry.region)}${entry.note ? ' · ' + escapeHtml(entry.note) : ''}</p>
      <p class="msg-link"><a href="dialect.html?q=${encodeURIComponent(entry.word)}">افتح في المعجم</a></p>`;
  }

  function proverbCard(entry) {
    return `
      <p class="msg-title">${escapeHtml(entry.text)}</p>
      <p>${escapeHtml(entry.meaning)}</p>
      <p class="msg-link"><a href="proverbs.html?q=${encodeURIComponent(entry.theme)}">أمثال في «${escapeHtml(entry.theme)}»</a></p>`;
  }

  function regionCard(region) {
    return `
      <p class="msg-title">${escapeHtml(region.name)}</p>
      <p>${escapeHtml(region.note)}</p>
      <p class="msg-meta">المركز: ${escapeHtml(region.capital)}</p>
      <p class="msg-link"><a href="map.html">اعرض على الخريطة</a></p>`;
  }

  function answer(query) {
    const asksProverb = /مثل|امثال|أمثال/.test(normalizeArabic(query));
    const region = findRegion(query);

    if (region) return regionCard(region);

    if (asksProverb) {
      const found = findProverbs(query);
      if (found.length) return found.map(proverbCard).join('<hr class="msg-sep">');
    }

    const word = findWord(query);
    if (word) return wordCard(word);

    const found = findProverbs(query);
    if (found.length) return found.map(proverbCard).join('<hr class="msg-sep">');

    return `
      <p>لم أجد إجابة في بيانات المنصة الحالية.</p>
      <p class="msg-meta">جرّب: «ما معنى تو؟» أو «أمثال عن التعاون» أو «ما لهجة ظفار؟».</p>`;
  }

  function addMessage(role, html) {
    const bubble = document.createElement('div');
    bubble.className = 'msg ' + role;
    bubble.innerHTML = html;
    log.appendChild(bubble);
    log.scrollTop = log.scrollHeight;
    return bubble;
  }

  function ask(query) {
    if (!query.trim()) return;
    addMessage('user', '<p>' + escapeHtml(query.trim()) + '</p>');
    input.value = '';

    const typing = addMessage('bot', '<span class="typing"><i></i><i></i><i></i></span>');

    setTimeout(function () {
      typing.innerHTML = loaded ? answer(query) : '<p>تعذر تحميل بيانات المنصة. أعد تحميل الصفحة.</p>';
      log.scrollTop = log.scrollHeight;
    }, 420);
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    ask(input.value);
  });

  suggestions.addEventListener('click', function (event) {
    const btn = event.target.closest('button');
    if (!btn) return;
    ask(btn.textContent.trim());
  });

  Promise.all([
    fetchJSON('data/dialect.json'),
    fetchJSON('data/proverbs.json'),
    fetchJSON('data/regions.json')
  ]).then(function (data) {
    words = data[0].entries || [];
    proverbs = data[1].entries || [];
    regions = data[2].regions || [];
    loaded = true;
    addMessage('bot', `
      <p>مرحبًا. أستطيع شرح مفردة من المعجم اللهجي، أو ذكر أمثال في موضوع، أو التعريف بمنطقة.</p>
      <p class="msg-meta">أجيب من بيانات المنصة فقط، ولست متصلًا بخدمة خارجية.</p>`);
  }).catch(function (error) {
    addMessage('bot', '<p>' + escapeHtml(error.message) + '</p>');
  });
})();
