/* Постоянный загрузчик виджета меню «Тайны Камчатки».
   🚩 ЭТОТ ФАЙЛ НЕ МЕНЯЕТСЯ НИКОГДА: ссылка на него один раз вставляется в Tilda и больше не трогается.
   При каждом открытии страницы он узнаёт актуальную версию виджета из version.json (лежит в репозитории,
   отдаётся «свежим» с raw) и подключает widget.js именно этой версии с jsDelivr. Версии неизменяемы,
   поэтому кэш CDN/браузера не мешает, а обновление и откат делаются правкой одного version.json.
   Вставка в Tilda:
     <div id="tk-menu" data-section="Основное меню" data-top="200"></div>
     <script src="https://cdn.jsdelivr.net/gh/AleksTheBorsh/tayny-live@<ПОСТОЯННЫЙ-ХЭШ>/loader.js" defer></script>
*/
(function () {
  if (window.__tkMenuLoader) return; window.__tkMenuLoader = 1;
  var REPO = 'AleksTheBorsh/tayny-live';
  var FALLBACK = '636256b';   // если version.json вдруг недоступен — заведомо рабочая версия
  function inject(ver) {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/gh/' + REPO + '@' + ver + '/widget.js';
    document.head.appendChild(s);
  }
  fetch('https://raw.githubusercontent.com/' + REPO + '/main/version.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (v) { inject(/^[0-9a-f]{7,40}$/.test(v && v.widget) ? v.widget : FALLBACK); })   // только хэш коммита
    .catch(function () { inject(FALLBACK); });
})();
