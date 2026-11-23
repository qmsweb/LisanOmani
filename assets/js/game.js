(function () {
  'use strict';

  const { fetchJSON, normalizeArabic, escapeHtml } = window.Lisan;

  const grid = document.getElementById('game-grid');
  const hintsEl = document.getElementById('hints');
  const progressEl = document.getElementById('word-progress');
  const scoreEl = document.getElementById('score');
  const checkBtn = document.getElementById('check-btn');
  const hintBtn = document.getElementById('hint-btn');
  const nextBtn = document.getElementById('next-btn');
  const messageEl = document.getElementById('message');
  const resultCard = document.getElementById('result-card');
  const resultWord = document.getElementById('result-word');
  const synonymsList = document.getElementById('synonyms-list');
  const antonymsList = document.getElementById('antonyms-list');
  const phoneticsDetails = document.getElementById('phonetics-details');

  const WORDS = [
    { word: 'نور', hint: 'يضيء المكان ويبدد الظلام' },
    { word: 'سعيد', hint: 'الحالة المضادة للحزن والهم' },
    { word: 'كبير', hint: 'ما يتصف بالضخامة والعظمة' },
    { word: 'جميل', hint: 'ما يسرّ الناظرين ويبعث على الإعجاب' },
    { word: 'سريع', hint: 'ما يتميز بالسرعة في الحركة أو الأداء' },
    { word: 'كريم', hint: 'من يعطي بسخاء ولا يبخل' },
    { word: 'شجاع', hint: 'من يواجه الخطر بثبات ولا يرهبه' },
    { word: 'علم', hint: 'إدراك الأشياء على ما هي عليه، ونقيضه الجهل' }
  ];

  const PHONETIC_LABELS = {
    'التسمية': 'التسمية',
    'المخرج': 'المخرج',
    'طريقة النطق': 'طريقة النطق',
    'اهتزاز الوترين': 'اهتزاز الوترين',
    'شكل اللسان': 'شكل اللسان',
    'ملخَّص': 'الملخّص'
  };

  let semanticData = null;
  let sawametData = null;
  let index = 0;
  let current = null;
  let letters = [];
  let revealed = 0;
  let score = 0;
  let solved = 0;
  let locked = false;
  let finished = false;

  function setMessage(text, type) {
    messageEl.className = 'message ' + (type || 'info');
    messageEl.textContent = text;
  }

  function clearMessage() {
    messageEl.className = 'message';
    messageEl.textContent = '';
  }

  function updateScore() {
    scoreEl.textContent = score + ' نقطة';
  }

  function lookupSemantic(word) {
    if (!semanticData) return null;
    if (semanticData[word]) return semanticData[word];
    const target = normalizeArabic(word);
    const key = Object.keys(semanticData).find(function (item) {
      return normalizeArabic(item) === target;
    });
    return key ? semanticData[key] : null;
  }

  function buildGrid() {
    grid.innerHTML = '';
    letters = Array.from(current.word);
    revealed = 0;

    letters.forEach(function (letter, i) {
      const cell = document.createElement('div');
      cell.className = 'cell';

      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute('aria-label', 'الحرف ' + (i + 1) + ' من ' + letters.length);
      input.dataset.index = i;
      input.addEventListener('input', handleInput);
      input.addEventListener('keydown', handleKeyDown);

      cell.appendChild(input);
      grid.appendChild(cell);
    });

    // كشف حرف واحد عشوائيًا كبداية مساعدة
    const randomIndex = Math.floor(Math.random() * letters.length);
    revealLetter(randomIndex, false);

    const firstEditable = grid.querySelector('input:not(:disabled)');
    if (firstEditable) setTimeout(function () { firstEditable.focus(); }, 60);
  }

  function handleInput(event) {
    const input = event.target;
    const value = Array.from(input.value).filter(function (char) {
      return /[\u0600-\u06FF]/.test(char);
    })[0] || '';
    input.value = value;
    const i = Number(input.dataset.index);

    if (value && i < letters.length - 1) {
      const next = grid.querySelector('input[data-index="' + (i + 1) + '"]');
      if (next && !next.disabled) next.focus();
    }
  }

  function handleKeyDown(event) {
    const input = event.target;
    const i = Number(input.dataset.index);

    if (event.key === 'Backspace' && !input.value && i > 0) {
      const prev = grid.querySelector('input[data-index="' + (i - 1) + '"]');
      if (prev) { prev.focus(); event.preventDefault(); }
    }
    if (event.key === 'ArrowLeft' && i < letters.length - 1) {
      const next = grid.querySelector('input[data-index="' + (i + 1) + '"]');
      if (next) { next.focus(); event.preventDefault(); }
    }
    if (event.key === 'ArrowRight' && i > 0) {
      const prev = grid.querySelector('input[data-index="' + (i - 1) + '"]');
      if (prev) { prev.focus(); event.preventDefault(); }
    }
    if (event.key === 'Enter') checkAnswer();
  }

  function revealLetter(i, announce) {
    const input = grid.querySelector('input[data-index="' + i + '"]');
    if (!input || input.value) return false;
    input.value = letters[i];
    input.disabled = true;
    input.closest('.cell').classList.add('revealed');
    revealed++;
    if (announce !== false) {
      setMessage('كُشف لك حرف إضافي: «' + letters[i] + '»', 'info');
    }
    return true;
  }

  function revealRandomEmpty(announce) {
    const empties = [];
    letters.forEach(function (letter, i) {
      const input = grid.querySelector('input[data-index="' + i + '"]');
      if (input && !input.value) empties.push(i);
    });
    if (!empties.length) return false;
    return revealLetter(empties[Math.floor(Math.random() * empties.length)], announce);
  }

  function updateHints() {
    const nextTwo = [
      WORDS[(index + 1) % WORDS.length].hint,
      WORDS[(index + 2) % WORDS.length].hint
    ];
    hintsEl.innerHTML = '<div class="hint"><b>التعريف الأول</b><span>' + escapeHtml(WORDS[index].hint) + '</span></div>' +
      '<div class="hint"><b>التعريف الثاني</b><span>' + escapeHtml(nextTwo[0]) + '</span></div>' +
      '<div class="hint"><b>التعريف الثالث</b><span>' + escapeHtml(nextTwo[1]) + '</span></div>';
  }

  function loadWord() {
    current = WORDS[index];
    locked = false;
    clearMessage();
    resultCard.classList.remove('show');
    nextBtn.hidden = true;
    checkBtn.disabled = false;
    hintBtn.disabled = false;
    progressEl.textContent = 'الكلمة ' + (index + 1) + ' من ' + WORDS.length;
    buildGrid();
    updateHints();
    updateScore();
  }

  function userAnswer() {
    return letters.map(function (letter, i) {
      const input = grid.querySelector('input[data-index="' + i + '"]');
      return input ? input.value : '';
    }).join('');
  }

  function checkAnswer() {
    if (!current || locked) return;
    const answer = userAnswer();
    if (!answer || answer.length < letters.length) {
      setMessage('أكمل جميع الحروف أولًا.', 'info');
      return;
    }

    if (normalizeArabic(answer) === normalizeArabic(current.word)) {
      locked = true;
      score += 10;
      solved++;
      updateScore();
      setMessage('إجابة صحيحة! أحسنت.', 'success');
      grid.querySelectorAll('.cell').forEach(function (cell) { cell.classList.add('correct'); });
      checkBtn.disabled = true;
      hintBtn.disabled = true;
      nextBtn.hidden = false;
      nextBtn.focus();
      showSemantic(current.word);
    } else {
      setMessage('الإجابة غير صحيحة، حاول مرة أخرى.', 'error');
      grid.querySelectorAll('.cell').forEach(function (cell) { cell.classList.add('wrong'); });
      window.setTimeout(function () {
        grid.querySelectorAll('.cell').forEach(function (cell) { cell.classList.remove('wrong'); });
        if (revealRandomEmpty(false)) {
          setMessage('الإجابة غير صحيحة؛ كُشف لك حرف إضافي.', 'error');
        }
      }, 900);
    }
  }

  function showSemantic(word) {
    const data = lookupSemantic(word);
    resultWord.textContent = word;

    const synonyms = data && Array.isArray(data.synonym) ? data.synonym : [];
    const antonyms = data && Array.isArray(data.antonym) ? data.antonym : [];
    synonymsList.textContent = synonyms.length ? synonyms.join('، ') : 'لا توجد مرادفات مسجلة.';
    antonymsList.textContent = antonyms.length ? antonyms.join('، ') : 'لا توجد أضداد مسجلة.';

    const firstChar = Array.from(word)[0];
    const phonetics = sawametData ? sawametData[firstChar] : null;
    phoneticsDetails.innerHTML = '';

    if (phonetics) {
      Object.keys(phonetics).forEach(function (key) {
        const item = document.createElement('div');
        item.className = 'phonetic-item';
        item.innerHTML = '<span class="phonetic-term">' + escapeHtml(PHONETIC_LABELS[key] || key) + '</span><span class="phonetic-def">' + escapeHtml(phonetics[key]) + '</span>';
        phoneticsDetails.appendChild(item);
      });
    } else {
      phoneticsDetails.innerHTML = '<p class="muted small" style="margin:0">لا توجد بيانات صوتية متاحة لحرف «' + escapeHtml(firstChar) + '».</p>';
    }

    resultCard.classList.add('show');
  }

  function nextWord() {
    if (finished) {
      finished = false;
      index = 0;
      score = 0;
      solved = 0;
      nextBtn.textContent = 'الكلمة التالية';
      loadWord();
      return;
    }

    if (index === WORDS.length - 1) {
      finished = true;
      setMessage('أكملت جميع الكلمات! نتيجتك النهائية: ' + score + ' نقطة.', 'success');
      nextBtn.textContent = 'ابدأ من جديد';
      nextBtn.hidden = false;
      checkBtn.disabled = true;
      hintBtn.disabled = true;
      return;
    }

    index++;
    loadWord();
  }

  checkBtn.addEventListener('click', checkAnswer);
  hintBtn.addEventListener('click', function () {
    if (locked) return;
    if (!revealRandomEmpty()) {
      setMessage('كُشفت جميع الحروف؛ يمكنك الآن التحقق من الإجابة.', 'info');
    }
  });
  nextBtn.addEventListener('click', nextWord);

  async function init() {
    try {
      const results = await Promise.all([
        fetchJSON('data/semanticData.json'),
        fetchJSON('data/sawamet.json')
      ]);
      semanticData = results[0];
      sawametData = results[1];
      loadWord();
    } catch (error) {
      console.error(error);
      hintsEl.innerHTML = '<div class="error-state"><b>تعذر تحميل بيانات اللعبة</b><br>أعد تحميل الصفحة أو تأكد من تشغيلها عبر خادم محلي.</div>';
      progressEl.textContent = 'خطأ في التحميل';
      checkBtn.disabled = true;
      hintBtn.disabled = true;
    }
  }

  init();
})();
