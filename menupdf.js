/* Общий генератор PDF меню «Тайны Камчатки».
   Один и тот же код у виджета на сайте (подгружает этот файл по клику с того же CDN, что widget.js)
   и у админки (подключает локально с serve.py) — правки PDF больше не дублируются.
   Нужен pdfmake (window.pdfMake). Экспорт: window.TKPDF.
   Форматы:  mode:'full'  — название, выход, цена + состав, БЖУ, аллергены (как раньше)
             mode:'short' — только название, выход, цена (краткое меню для печати)
*/
(function (W) {
  var PAGE_W = 595.28, PAGE_H = 841.89;
  var ML = 57, MT = 50, MR = 42, MB = 46;            // слева 57pt = 2 см под сшиватель
  var CW = Math.floor(PAGE_W - ML - MR);             // ширина содержимого и всех линеек (496)
  // как раздел называется в PDF, если печатное название отличается от кассового
  var PRINT_TITLE = { 'Основное меню': 'Меню' };
  // папки, которые в PDF стоят отдельной страницей (ШЕФ 09.11: «Специальное предложение» само по себе)
  var SOLO = ['специальное предложение'];
  function isSolo(t) { return SOLO.indexOf(String(t || '').trim().toLowerCase()) >= 0; }
  var C = { navy: '#1b2a52', gold: '#9c7a46', soft: '#5d6b74', faint: '#9aa4ab',
            line: '#e5ddcd', cream: '#fbf8f1', pager: '#b9b2a6' };

  // в кассе «0» и пустота значат «не заполнено» — такие значения не печатаем
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
  function bjuLine(b) {
    b = b || {}; var out = [];
    if (num(b.kcal) > 0) out.push(b.kcal + ' ккал');
    if (num(b.bel) > 0) out.push('Б ' + b.bel);
    if (num(b.jir) > 0) out.push('Ж ' + b.jir);
    if (num(b.ugl) > 0) out.push('У ' + b.ugl);
    return out.join(' · ');
  }

  // строки одного блюда; top — отступ над названием
  function dishRows(it, mode, top) {
    var price = it.price != null ? it.price + ' ₽' : '';
    var right = [];   // выход — мельче и светлее, цена — крупно; одна строка, по базовой линии
    if (it.weight) right.push({ text: it.weight + (price ? '   ' : ''), fontSize: 9.5, bold: false, color: C.soft });
    if (price) right.push({ text: price });
    var rows = [{ margin: [0, top, 0, 0], columns: [
      { text: it.name || '', width: '*', fontSize: 12.5, bold: true, color: C.navy },
      // цена с выходом никогда не переносится — переносится длинное название
      { text: right.length ? right : '', width: 'auto', noWrap: true, fontSize: 12.5, bold: true, color: C.navy, alignment: 'right' }
    ] }];
    if (mode !== 'short') {
      if (it.desc) rows.push({ text: it.desc, fontSize: 9.5, color: C.soft, margin: [0, 2, 0, 0] });
      var ln = bjuLine(it.bju);
      if (it.allergens && it.allergens.length) ln += (ln ? '      ' : '') + 'Аллергены: ' + it.allergens.join(', ');
      if (ln) rows.push({ text: ln, fontSize: 8, color: C.faint, margin: [0, 2, 0, 0] });
    }
    rows.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: CW, y2: 0, lineWidth: .5, lineColor: C.line }],
                margin: [0, mode === 'short' ? 5 : 7, 0, 0] });
    return rows;
  }

  function body(groups, mode) {
    var c = [], gap = mode === 'short' ? 5 : 7;
    groups.forEach(function (g, gi) {
      if (gi > 0) c.push({ text: '', pageBreak: 'before' });
      var pending = [   // заголовок раздела — приклеится к первому блюду
        { text: PRINT_TITLE[g.title] || g.title, fontSize: 24, bold: true, color: C.navy, margin: [0, 0, 0, 3] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 64, y2: 0, lineWidth: 2, lineColor: C.gold }], margin: [0, 0, 0, 12] }
      ];
      var first = true, breakNext = false;
      (g.categories || []).forEach(function (cat) {
        var items = cat.items || [];
        if (!items.length) return;
        var solo = isSolo(cat.title);
        // отдельная страница: перед «одиночной» папкой (если она не первая в разделе) и после неё
        var newPage = breakNext || (solo && !first);
        if (cat.title && cat.title !== g.title)
          pending.push({ text: cat.title.toUpperCase(), fontSize: 11, bold: true, color: C.gold, margin: [0, newPage ? 0 : 12, 0, 4] });
        items.forEach(function (it, k) {
          var rows = dishRows(it, mode, gap);
          // 🚩 блюдо целиком — один неразрывный блок; заголовок папки (и раздела) склеен с ПЕРВЫМ блюдом,
          // поэтому заголовок больше не может остаться один внизу страницы
          if (k === 0 && pending.length) { rows = pending.concat(rows); pending = []; }
          var node = { stack: rows, unbreakable: true };
          if (k === 0 && newPage) node.pageBreak = 'before';
          c.push(node);
        });
        breakNext = solo; first = false;
      });
      if (pending.length) c = c.concat(pending);   // раздел без блюд — просто заголовок
    });
    return c;
  }

  function requisites() {   // реквизиты мелким шрифтом — тоже одним неразрывным блоком
    return { unbreakable: true, stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: CW, y2: 0, lineWidth: .8, lineColor: C.gold }], margin: [0, 16, 0, 8] },
      { text: 'Цены актуальны на ' + new Date().toLocaleDateString('ru-RU'), fontSize: 8, color: C.soft, alignment: 'center', margin: [0, 0, 0, 5] },
      { text: 'ООО «Камчатские тайны», ИНН 4100044714', fontSize: 7.5, color: C.faint, alignment: 'center' },
      { text: 'Ресторан «Тайны Камчатки» · Камчатский край, п. Паратунка, ул. Елизова, 6а', fontSize: 7.5, color: C.faint, alignment: 'center', margin: [0, 2, 0, 0] },
      { text: 'info@mysterykamchatka.com     ·     +7 914 999 88 99', fontSize: 7.5, color: C.faint, alignment: 'center', margin: [0, 2, 0, 0] }
    ] };
  }

  function doc(groups, opts) {
    opts = opts || {};
    var mode = opts.mode === 'short' ? 'short' : 'full';
    var content = body(groups || [], mode);
    if (opts.logo) content.unshift({ image: opts.logo, width: 150, alignment: 'center', margin: [0, 0, 0, 16] });
    content.push(requisites());
    return {
      pageSize: 'A4', pageMargins: [ML, MT, MR, MB],
      background: function () { return { canvas: [{ type: 'rect', x: 0, y: 0, w: PAGE_W, h: PAGE_H, color: C.cream }] }; },
      content: content,
      footer: function (cur, tot) { return { text: cur + ' / ' + tot, fontSize: 8, color: C.pager, alignment: 'center', margin: [0, 8, 0, 0] }; },
      defaultStyle: { font: 'Roboto' }
    };
  }

  function fileName(title, mode) {
    return 'menu-' + String(title || 'menu').replace(/[^0-9A-Za-zА-Яа-яЁё]+/g, '_') + (mode === 'short' ? '-кратко' : '') + '.pdf';
  }

  var logos = {};   // эмблема для шапки PDF: тянем один раз и отдаём dataURL
  function getLogo(url, cb) {
    if (logos[url] !== undefined) { cb(logos[url]); return; }
    fetch(url).then(function (r) { return r.ok ? r.blob() : Promise.reject(); }).then(function (b) {
      var fr = new FileReader();
      fr.onload = function () { logos[url] = fr.result; cb(fr.result); };
      fr.onerror = function () { logos[url] = ''; cb(''); };
      fr.readAsDataURL(b);
    }).catch(function () { logos[url] = ''; cb(''); });
  }

  function download(groups, opts) {
    W.pdfMake.createPdf(doc(groups, opts)).download((opts && opts.fname) || fileName('menu', opts && opts.mode));
  }

  W.TKPDF = { doc: doc, download: download, fileName: fileName, getLogo: getLogo, num: num, bjuLine: bjuLine };
})(typeof window !== 'undefined' ? window : globalThis);
