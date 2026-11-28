/* ============================================================
   الرئيسية — مفردة اليوم، مثل اليوم، واقتراحات البحث
   يعتمد على window.Lisan من site.js، ولا يعمل في الصفحات الأخرى.
   ============================================================ */

(function () {
  'use strict';

  const Lisan = window.Lisan;
  if (!Lisan) return;

  const form = document.querySelector('.home-search');
  const input = document.getElementById('home-q');
  const suggestBox = document.getElementById('home-suggest');
  const suggestList = document.getElementById('home-suggest-list');

  const todaySection = document.getElementById('home-today');
  const todayGrid = document.querySelector('.home-today-grid');
  const wordBlock = document.getElementById('home-word');
  const wordTitle = document.getElementById('home-word-title');
  const wordMeaning = document.getElementById('home-word-meaning');
  const wordExample = document.getElementById('home-word-example');
  const wordRegion = document.getElementById('home-word-region');
  const wordLink = document.getElementById('home-word-link');

  const proverbBlock = document.getElementById('home-proverb');
  const proverbTitle = document.getElementById('home-proverb-title');
  const proverbMeaning = document.getElementById('home-proverb-meaning');
  const proverbTheme = document.getElementById('home-proverb-theme');
  const proverbLink = document.getElementById('home-proverb-link');

  let dialectEntries = [];

  function daySerial() {
    const now = new Date();
    return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  }

  function pickOfDay(list, offset) {
    if (!list.length) return null;
    const index = (((daySerial() + (offset || 0)) % list.length) + list.length) % list.length;
    return list[index];
  }

  function showToday() {
    updateToday();
  }

  function updateToday() {
    if (!todaySection) return;
    const hasWord = wordBlock && !wordBlock.hidden;
    const hasProverb = proverbBlock && !proverbBlock.hidden;
    const hasSkeleton = !!document.getElementById('home-word-skeleton') ||
      !!document.getElementById('home-proverb-skeleton');
    todaySection.hidden = !(hasWord || hasProverb || hasSkeleton);
  }

  function clearSkeleton(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function skeletonHtml(isWord) {
    const id = isWord ? 'home-word-skeleton' : 'home-proverb-skeleton';
    return `
      <article class="home-pick skeleton-card" id="${id}" aria-hidden="true">
        <div class="skeleton skeleton-line skeleton-line-label"></div>
        <div class="skeleton skeleton-line skeleton-line-title"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line skeleton-line-short"></div>
        <div class="skeleton skeleton-line skeleton-line-meta"></div>
      </article>`;
  }

  function showTodaySkeletons() {
    if (!todayGrid) return;
    if (!document.getElementById('home-word-skeleton')) {
      todayGrid.insertAdjacentHTML('beforeend', skeletonHtml(true));
    }
    if (!document.getElementById('home-proverb-skeleton')) {
      todayGrid.insertAdjacentHTML('beforeend', skeletonHtml(false));
    }
    updateToday();
  }

  function fillWord(entry) {
    if (!entry || !wordBlock) return;

    wordTitle.textContent = entry.word || '';
    wordMeaning.textContent = entry.meaning || '';

    if (entry.example) {
      wordExample.textContent = entry.example;
      wordExample.hidden = false;
    } else {
      wordExample.hidden = true;
    }

    if (entry.region) {
      wordRegion.textContent = entry.region;
      wordRegion.hidden = false;
    } else {
      wordRegion.hidden = true;
    }

    if (wordLink && entry.word) {
      wordLink.href = 'dialect.html?q=' + encodeURIComponent(entry.word);
    }

    wordBlock.hidden = false;
    showToday();
  }

  function fillProverb(entry) {
    if (!entry || !proverbBlock) return;

    proverbTitle.textContent = entry.text || '';
    proverbMeaning.textContent = entry.meaning || '';

    if (entry.theme) {
      proverbTheme.textContent = entry.theme;
      proverbTheme.hidden = false;
    } else {
      proverbTheme.hidden = true;
    }

    if (proverbLink) {
      proverbLink.href = 'proverbs.html?q=' + encodeURIComponent(entry.theme || entry.text || '');
    }

    proverbBlock.hidden = false;
    showToday();
  }

  function hideSuggestions() {
    if (!suggestBox) return;
    suggestBox.hidden = true;
    if (suggestList) suggestList.innerHTML = '';
  }

  function renderSuggestions() {
    if (!input || !suggestBox || !suggestList) return;

    const query = Lisan.normalizeArabic(input.value);
    if (query.length < 2 || !dialectEntries.length) {
      hideSuggestions();
      return;
    }

    const matches = [];
    for (let i = 0; i < dialectEntries.length && matches.length < 5; i += 1) {
      const entry = dialectEntries[i];
      const haystack = Lisan.normalizeArabic(
        [entry.word, entry.meaning, entry.example, entry.note].join(' ')
      );
      if (haystack.includes(query)) matches.push(entry);
    }

    if (!matches.length) {
      hideSuggestions();
      return;
    }

    suggestList.innerHTML = matches.map(function (entry) {
      return '<li><a href="dialect.html?q=' + encodeURIComponent(entry.word) + '">' +
        '<span class="home-suggest-word">' + Lisan.escapeHtml(entry.word) + '</span>' +
        '<span class="home-suggest-meaning">' + Lisan.escapeHtml(entry.meaning) + '</span>' +
        '</a></li>';
    }).join('');

    suggestBox.hidden = false;
  }

  function initWord() {
    Lisan.fetchJSON('data/dialect.json').then(function (data) {
      dialectEntries = data.entries || [];
      fillWord(pickOfDay(dialectEntries, 0));
      clearSkeleton('home-word-skeleton');
      updateToday();
      renderSuggestions();
    }).catch(function () {
      if (wordBlock) wordBlock.hidden = true;
      clearSkeleton('home-word-skeleton');
      updateToday();
    });
  }

  function initProverb() {
    Lisan.fetchJSON('data/proverbs.json').then(function (data) {
      fillProverb(pickOfDay(data.entries || [], 3));
      clearSkeleton('home-proverb-skeleton');
      updateToday();
    }).catch(function () {
      if (proverbBlock) proverbBlock.hidden = true;
      clearSkeleton('home-proverb-skeleton');
      updateToday();
    });
  }

  if (form && input) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const value = input.value.trim();
      window.location.href = 'dialect.html' + (value ? '?q=' + encodeURIComponent(value) : '');
    });

    input.addEventListener('input', Lisan.debounce(renderSuggestions, 120));

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') hideSuggestions();
    });
  }

  showTodaySkeletons();
  initWord();
  initProverb();
})();
