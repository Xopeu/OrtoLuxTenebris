/* =========================================================
   Ordo Lux Tenebris — nav-back.js
   Все ссылки с классом .back-link ведут туда, откуда
   реально пришёл пользователь (history.back()), а не всегда
   на index.html. Исходный href в разметке остаётся как
   запасной вариант — используется, только если у вкладки
   нет истории (например, если ссылку открыли напрямую).
   ========================================================= */

(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var links = document.querySelectorAll('.back-link');
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (window.history.length > 1) {
          e.preventDefault();
          window.history.back();
        }
        // если истории нет — сработает обычный href из разметки
      });
    });
  });
})();
