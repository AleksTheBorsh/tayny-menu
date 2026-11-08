/* Виджет меню «Тайны Камчатки» для вставки в Tilda (блок «T123 / HTML-код»).
   Рендерит меню прямо в странице (не iframe). Данные (menu.json) берёт из публичного
   репозитория tayny-live через GitHub CDN — свой сервер/туннель НЕ нужен.
   Обычная вставка (одна строка со скриптом):
     <div id="tk-menu" data-section="Основное меню"></div>
     <script src="https://cdn.jsdelivr.net/gh/AleksTheBorsh/tayny-live@main/widget.js" defer></script>
   data-section — какой раздел показать на этой странице (без него — карточки всех разделов).
   data-base (необязательно) — переопределить источник данных (menu.json + фото).
*/
(function () {
  var S = document.currentScript || document.querySelector('script[src*="widget.js"]');
  var SB = S ? S.src.replace(/\/widget\.js.*$/, '') : '';   // откуда загружен скрипт (для фото)
  var root = document.getElementById('tk-menu');
  if (!root) { root = document.createElement('div'); root.id = 'tk-menu'; (S && S.parentNode ? S.parentNode : document.body).insertBefore(root, S); }
  // menu.json — всегда со «свежего» raw (CORS:*, cache-busting ?t=); фото — с того же CDN, что и скрипт
  var SRC = (root.getAttribute('data-base') || 'https://raw.githubusercontent.com/AleksTheBorsh/tayny-live/main').replace(/\/$/, '');
  var IMGBASE = SB || 'https://cdn.jsdelivr.net/gh/AleksTheBorsh/tayny-live@main';
  // фон всей страницы — «вулканический песок» (тёмно-серый), чтобы их белая шапка читалась.
  // цвет меняется через data-bg="#......", отключить покраску — data-bg=""
  var PBG = root.getAttribute('data-bg'); if (PBG === null) PBG = '#615d56';
  if (PBG) { var pbs = document.createElement('style'); pbs.textContent = 'html,body{background:' + PBG + ' !important;}#allrecords{background:' + PBG + ' !important;}'; document.head.appendChild(pbs); }
  // меню — светлая «бумажная» карточка ниже их шапки; высоту отступа крутить через data-top="..."
  root.style.marginTop = (parseInt(root.getAttribute('data-top') || '150', 10) || 0) + 'px';
  root.style.marginBottom = '48px';

  var CSS = `
  #tk-menu{--tk-ink:#20272b;--tk-soft:#5d6b74;--tk-faint:#9aa4ab;--tk-line:#e8e0d0;--tk-gold:#b8945f;--tk-gold-d:#9c7a46;--tk-sea:#1b2a52;--tk-navy:#1b2a52;--tk-paper:#fbf8f1;
    font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--tk-ink);line-height:1.55;max-width:900px;margin:0 auto;background:var(--tk-paper);padding:clamp(22px,4vw,34px) clamp(16px,4vw,30px);border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,.28);}
  #tk-menu *{box-sizing:border-box;}
  #tk-menu .tk-serif{font-family:"Georgia","Times New Roman",serif;}
  #tk-menu .tk-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;}
  #tk-menu .tk-card{position:relative;border-radius:16px;overflow:hidden;cursor:pointer;min-height:230px;display:flex;flex-direction:column;justify-content:flex-end;color:#fff;box-shadow:0 10px 24px rgba(31,42,51,.14);transition:transform .2s;}
  #tk-menu .tk-card:hover{transform:translateY(-3px);}
  #tk-menu .tk-card .tk-bg{position:absolute;inset:0;background-size:cover;background-position:center;}
  #tk-menu .tk-card .tk-scrim{position:absolute;inset:0;background:linear-gradient(to top,rgba(16,22,26,.85) 8%,rgba(16,22,26,.15) 60%);}
  #tk-menu .tk-card .tk-in{position:relative;padding:18px;}
  #tk-menu .tk-card h3{margin:0;font-weight:600;font-size:22px;text-shadow:0 2px 10px rgba(0,0,0,.4);}
  #tk-menu .tk-card .tk-cnt{font-size:13px;opacity:.85;margin-top:2px;}
  #tk-menu .tk-card .tk-go{display:inline-block;margin-top:12px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;border:1.5px solid rgba(255,255,255,.75);border-radius:999px;padding:7px 16px;}
  #tk-menu .tk-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:4px 0 14px;}
  #tk-menu .tk-back{cursor:pointer;color:var(--tk-sea);font-weight:600;font-size:14px;border:none;background:none;}
  #tk-menu .tk-ttl{font-weight:600;font-size:22px;}
  #tk-menu .tk-row{display:flex;gap:8px;overflow-x:auto;padding:4px 0;}
  #tk-menu .tk-row::-webkit-scrollbar{display:none;}
  #tk-menu .tk-sec{white-space:nowrap;cursor:pointer;font-size:13px;font-weight:600;border:1.5px solid var(--tk-line);background:#fff;color:var(--tk-soft);border-radius:999px;padding:7px 14px;}
  #tk-menu .tk-sec.tk-on{background:var(--tk-sea);border-color:var(--tk-sea);color:#fff;}
  #tk-menu .tk-chips{display:flex;gap:8px;overflow-x:auto;padding:8px 0 4px;justify-content:center;flex-wrap:wrap;}
  #tk-menu .tk-chip{white-space:nowrap;cursor:pointer;font-size:13.5px;font-weight:600;border:1.5px solid var(--tk-line);background:#fff;color:var(--tk-soft);border-radius:999px;padding:8px 15px;}
  #tk-menu .tk-chip.tk-on{background:var(--tk-navy);border-color:var(--tk-navy);color:#fff;}
  #tk-menu .tk-cathdr{text-align:center;margin:24px 0 12px;}
  #tk-menu .tk-cathdr .tk-t{font-weight:600;font-size:25px;color:var(--tk-navy);}
  #tk-menu .tk-cathdr .tk-r{width:44px;height:2px;background:var(--tk-gold);margin:8px auto 0;border-radius:2px;}
  #tk-menu .tk-sub{font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--tk-gold-d);margin:18px 0 6px;text-align:center;}
  #tk-menu .tk-dish{padding:14px 0;border-bottom:1px solid var(--tk-line);}
  #tk-menu .tk-l1{display:flex;align-items:baseline;gap:12px;}
  #tk-menu .tk-nm{font-weight:600;font-size:17px;flex:1;}
  #tk-menu .tk-pr{font-weight:700;font-size:16px;white-space:nowrap;color:var(--tk-navy);}
  #tk-menu .tk-pr .tk-wt{color:var(--tk-faint);font-weight:400;font-size:13.5px;margin-right:6px;}
  #tk-menu .tk-ds{color:var(--tk-soft);font-size:14px;margin-top:4px;}
  #tk-menu .tk-ex{display:flex;flex-wrap:wrap;gap:7px 10px;margin-top:8px;font-size:12px;color:var(--tk-faint);}
  #tk-menu .tk-tag{background:#efe7d8;color:var(--tk-gold-d);border-radius:999px;padding:2px 9px;font-size:11px;font-weight:600;}
  #tk-menu .tk-empty{text-align:center;color:var(--tk-faint);padding:40px 10px;}
  #tk-menu .tk-pdfbar{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px;margin:0 0 10px;}
  .tk-age{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(16,22,26,.72);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}
  .tk-age *{box-sizing:border-box;}
  .tk-age-card{width:100%;max-width:420px;background:#fbf8f1;border-radius:18px;padding:28px 24px 20px;text-align:center;color:#20272b;box-shadow:0 24px 60px rgba(0,0,0,.4);}
  .tk-age-logo{display:block;width:120px;height:auto;margin:0 auto 14px;}
  .tk-age-q{font-family:Georgia,"Times New Roman",serif;font-size:23px;font-weight:600;color:#1b2a52;line-height:1.25;}
  .tk-age-r{width:44px;height:2px;background:#b8945f;margin:12px auto;border-radius:2px;}
  .tk-age-t{font-size:14px;color:#5d6b74;line-height:1.5;}
  .tk-age-b{display:flex;gap:10px;margin-top:20px;}
  .tk-age-b button{-webkit-appearance:none;appearance:none;margin:0;flex:1;cursor:pointer;font:inherit;font-size:15px;font-weight:700;line-height:1.2;border-radius:999px;padding:12px 14px;border:1.5px solid #1b2a52;transition:opacity .15s;}
  .tk-age-yes{background:#1b2a52;color:#fff;}
  .tk-age-no{background:#fff;color:#1b2a52;}
  .tk-age-b button:hover{opacity:.88;}
  .tk-age-w{font-size:11px;color:#9aa4ab;margin-top:16px;}
  #tk-menu .tk-pdf{cursor:pointer;font-size:13px;font-weight:700;border:1.5px solid var(--tk-navy);background:#fff;color:var(--tk-navy);border-radius:999px;padding:8px 16px;display:inline-flex;align-items:center;gap:6px;transition:.15s;}
  #tk-menu .tk-pdf:hover{background:var(--tk-navy);color:#fff;}
  #tk-menu .tk-pdf:disabled{opacity:.5;cursor:default;}
  `;
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  var DATA = { groups: [] };
  var num = function (v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; };   // «0» в кассе = не заполнено
  var esc = function (s) { return (s || '').replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); };
  var IMG = { 'Основное меню': 'sec_main.jpg', 'Меню завтраков': 'sec_breakfast.jpg', 'Детское меню': 'sec_kids.jpg', 'Винная карта': 'sec_wine.jpg' };
  var imgFor = function (t) { return IMGBASE + '/' + (IMG[t] || 'sec_main.jpg'); };

  // ——— PDF для гостей: pdfmake + общий генератор menupdf.js (тот же, что в админке) грузятся по клику ———
  function loadScript(src, ok, fail) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s); }
  function ensurePdf(ok, fail) {
    var b = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.12/';
    function gen() { if (window.TKPDF) ok(); else loadScript(IMGBASE + '/menupdf.js', ok, fail); }
    if (window.pdfMake && window.pdfMake.vfs) { gen(); return; }
    loadScript(b + 'pdfmake.min.js', function () { loadScript(b + 'vfs_fonts.js', gen, fail); }, fail);
  }
  // две кнопки: полное меню (состав, БЖУ, аллергены) и краткое (название, выход, цена)
  var PDFBAR = '<div class="tk-pdfbar">' +
    '<button class="tk-pdf" type="button" data-mode="full">⤓ PDF полное</button>' +
    '<button class="tk-pdf" type="button" data-mode="short">⤓ PDF краткое</button></div>';
  function wirePdf(groups, title) {
    root.querySelectorAll('.tk-pdf').forEach(function (pbtn) {
      pbtn.onclick = function () {
        var mode = pbtn.getAttribute('data-mode') || 'full', o = pbtn.innerHTML;
        var go = function () {
          pbtn.disabled = true; pbtn.innerHTML = 'Готовлю PDF…';
          var done = function () { pbtn.disabled = false; pbtn.innerHTML = o; };
          ensurePdf(function () {
            TKPDF.getLogo(IMGBASE + '/logo.png', function (logo) {
              try { TKPDF.download(groups, { mode: mode, logo: logo, fname: TKPDF.fileName(title, mode) }); } catch (e) {}
              done();
            });
          }, function () { done(); alert('Не удалось сформировать PDF (нет связи с CDN).'); });
        };
        // PDF всего меню включает алкоголь — без подтверждения возраста не отдаём
        if (groups.some(needsAge) && !ageOk()) ageGate(go, function () {}); else go();
      };
    });
  }

  // ——— Возрастной барьер 18+ для алкогольных разделов ———
  // Включается сам для «Винной карты» / «Барной карты» / «Алкоголь»; data-age="0" — выключить,
  // data-age="18" — включить принудительно; data-age-exit="URL" — куда уводить по «Нет» (по умолчанию главная).
  var AGE_KEY = 'tk_age18_ok', AGE_DAYS = 30;
  function ageOk() { try { var t = +localStorage.getItem(AGE_KEY); return !!t && (Date.now() - t) < AGE_DAYS * 864e5; } catch (e) { return false; } }
  function ageSave() { try { localStorage.setItem(AGE_KEY, String(Date.now())); } catch (e) {} }
  function needsAge(g) {
    var a = root.getAttribute('data-age');
    if (a === '0') return false;
    if (a) return true;
    return /винн[а-яё]*\s+карт|алкогол|барн[а-яё]*\s+(карт|меню)/i.test((g && g.title) || '');
  }
  function ageGate(onYes, onNo) {
    var html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = 'hidden';
    var ov = document.createElement('div');
    ov.className = 'tk-age'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = '<div class="tk-age-card">' +
      '<img class="tk-age-logo" src="' + IMGBASE + '/logo.png" alt="Тайны Камчатки">' +
      '<div class="tk-age-q">Вам уже исполнилось 18&nbsp;лет?</div><div class="tk-age-r"></div>' +
      '<div class="tk-age-t">Раздел содержит информацию об алкогольной продукции и предназначен только для совершеннолетних.</div>' +
      '<div class="tk-age-b"><button type="button" class="tk-age-yes">Да, мне есть 18</button><button type="button" class="tk-age-no">Нет</button></div>' +
      '<div class="tk-age-w">Чрезмерное употребление алкоголя вредит вашему здоровью</div></div>';
    document.body.appendChild(ov);
    var close = function () { html.style.overflow = prev; if (ov.parentNode) ov.parentNode.removeChild(ov); };
    ov.querySelector('.tk-age-yes').onclick = function () { ageSave(); close(); onYes(); };
    ov.querySelector('.tk-age-no').onclick = function () { close(); onNo(); };
    setTimeout(function () { var y = ov.querySelector('.tk-age-yes'); if (y) y.focus(); }, 30);
  }
  function ageExit() {
    root.innerHTML = '<div class="tk-empty">Раздел доступен только совершеннолетним.</div>';
    location.href = root.getAttribute('data-age-exit') || '/';
  }

  function load(cb) {
    var n = 0;
    (function attempt() {
      fetch(SRC + '/menu.json?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (d) { DATA = d; cb(true); })
        .catch(function () { if (++n < 5) setTimeout(attempt, 700); else cb(false); });
    })();
  }

  function dish(it) {
    var pr = it.price != null ? ((it.weight ? '<span class="tk-wt">' + esc(it.weight) + '</span>' : '') + it.price + ' ₽') : (it.weight ? '<span class="tk-wt">' + esc(it.weight) + '</span>' : '');
    var alg = (it.allergens || []).map(function (a) { return '<span class="tk-tag">' + esc(a) + '</span>'; }).join('');
    var bju = (it.bju && Object.keys(it.bju).length) ? ['kcal', 'bel', 'jir', 'ugl'].filter(function (k) { return num(it.bju[k]) > 0; }).map(function (k) { return ({ kcal: 'ккал', bel: 'Б', jir: 'Ж', ugl: 'У' })[k] + ' ' + esc(it.bju[k]); }).join(' · ') : '';
    return '<div class="tk-dish"><div class="tk-l1"><div class="tk-nm">' + esc(it.name) + '</div><div class="tk-pr">' + pr + '</div></div>' +
      (it.desc ? '<div class="tk-ds">' + esc(it.desc) + '</div>' : '') +
      ((bju || alg) ? '<div class="tk-ex">' + (bju ? '<span>' + bju + '</span>' : '') + alg + '</div>' : '') + '</div>';
  }

  function model(g) {
    var chips = [], map = {};
    g.categories.forEach(function (c) {
      var i = c.title.indexOf(' · '), top = i < 0 ? c.title : c.title.slice(0, i), sub = i < 0 ? null : c.title.slice(i + 3);
      if (!map[top]) { map[top] = []; chips.push(top); }
      map[top].push({ sub: sub, items: c.items });
    });
    return { chips: chips, map: map };
  }

  function landing() {
    var h = PDFBAR + '<div class="tk-cards">';
    (DATA.groups || []).forEach(function (g, i) {
      var n = g.count || g.categories.reduce(function (a, c) { return a + c.items.length; }, 0);
      h += '<div class="tk-card" data-sec="' + i + '"><div class="tk-bg" style="background-image:url(\'' + imgFor(g.title) + '\')"></div><div class="tk-scrim"></div>' +
        '<div class="tk-in"><h3 class="tk-serif">' + esc(g.title) + '</h3><div class="tk-cnt">' + n + ' блюд</div><span class="tk-go">Посмотреть</span></div></div>';
    });
    root.innerHTML = h + '</div>';
    root.querySelectorAll('.tk-card').forEach(function (el) { el.onclick = function () { section(+el.dataset.sec); }; });
    wirePdf(DATA.groups || [], 'Тайны Камчатки');
  }

  function section(i, direct) {
    var g = (DATA.groups || [])[i]; if (!g) return;
    if (needsAge(g) && !ageOk()) {   // алкоголь: сначала спрашиваем возраст, меню не рисуем
      root.innerHTML = '<div class="tk-empty">Раздел для лиц старше 18 лет.</div>';
      ageGate(function () { section(i, direct); }, direct ? ageExit : landing);
      return;
    }
    var m = model(g), cur = 0;
    function render() {
      var c = m.chips[cur];
      var h = '';
      if (!direct) {   // полный режим (лендинг с карточками): шапка + табы разделов
        h += '<div class="tk-head"><button class="tk-back">← Разделы</button><span class="tk-ttl tk-serif">' + esc(g.title) + '</span></div>';
        h += '<div class="tk-row">' + (DATA.groups || []).map(function (gg, k) { return '<button class="tk-sec' + (k === i ? ' tk-on' : '') + '" data-s="' + k + '">' + esc(gg.title) + '</button>'; }).join('') + '</div>';
      }
      h += PDFBAR;
      if (m.chips.length > 1)   // переключатель папок нужен только когда папок больше одной
        h += '<div class="tk-chips">' + m.chips.map(function (ch, k) { return '<button class="tk-chip' + (k === cur ? ' tk-on' : '') + '" data-c="' + k + '">' + esc(ch) + '</button>'; }).join('') + '</div>';
      h += '<div class="tk-cathdr"><div class="tk-t tk-serif">' + esc(c) + '</div><div class="tk-r"></div></div>';
      m.map[c].forEach(function (b) { if (b.sub) h += '<div class="tk-sub">' + esc(b.sub) + '</div>'; b.items.forEach(function (it) { h += dish(it); }); });
      root.innerHTML = h;
      if (!direct) {
        root.querySelector('.tk-back').onclick = landing;
        root.querySelectorAll('.tk-sec').forEach(function (el) { el.onclick = function () { section(+el.dataset.s); }; });
      }
      root.querySelectorAll('.tk-chip').forEach(function (el) { el.onclick = function () { cur = +el.dataset.c; render(); root.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
      wirePdf([g], g.title);   // кнопки PDF — весь раздел целиком
    }
    render();
  }

  root.innerHTML = '<div class="tk-empty">Загрузка меню…</div>';
  load(function (ok) {
    if (!ok) { root.innerHTML = '<div class="tk-empty">Не удалось загрузить меню. Обновите страницу.</div>'; return; }
    // режим одного раздела: <div id="tk-menu" data-section="Основное меню"></div>
    var want = (root.getAttribute('data-section') || (window.TK_SECTION || '')).trim();
    if (want) {
      var idx = -1;
      (DATA.groups || []).forEach(function (g, k) { if (g.title === want) idx = k; });
      if (idx >= 0) section(idx, true);
      else root.innerHTML = '<div class="tk-empty">Раздел «' + esc(want) + '» пока не заполнен.</div>';
    } else {
      landing();   // полный режим: карточки всех разделов
    }
  });
})();
