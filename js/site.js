/* =========================================================
   Ordo Lux Tenebris — site.js
   Фоновая музыка. Состояние (играет / выключена) хранится
   в localStorage и переживает переход на новую страницу —
   не нужно каждый раз включать/выключать заново.

   Важно: это статичный многостраничный сайт, а не одна
   страница (SPA), так что сам трек технически перезапускается
   с начала при каждом переходе — полностью бесшовно (без
   микро-паузы на загрузку) это не сделать без смены архитектуры
   сайта. Но то, ИГРАЕТ звук или нет, теперь помнится верно.
   ========================================================= */

(function () {
  var audio = document.getElementById('bg-audio');
  var toggleBtn = document.getElementById('sound-toggle');
  var toggleLabel = document.getElementById('sound-toggle-label');

  if (!audio || !toggleBtn || !toggleLabel) {
    return;
  }

  var STORAGE_KEY = 'tenebris_sound_pref'; // 'on' | 'off'
  var isPlaying = false;

  function getPref() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return null;
    }
  }

  function setPref(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (err) {
      /* localStorage недоступен (приватный режим и т.п.) — тихо игнорируем */
    }
  }

  function updateLabel() {
    toggleLabel.textContent = isPlaying ? 'Sound Off' : 'Sound On';
  }

  function play() {
    var attempt = audio.play();
    if (attempt !== undefined) {
      attempt
        .then(function () {
          isPlaying = true;
          updateLabel();
        })
        .catch(function () {
          /* браузер заблокировал автоплей — сработает по первому клику ниже */
        });
    }
  }

  function pause() {
    audio.pause();
    isPlaying = false;
    updateLabel();
  }

  var pref = getPref();

  if (pref === 'off') {
    // пользователь явно выключал звук раньше — не пытаемся играть
    updateLabel();
  } else {
    // pref === 'on' или ещё не установлен — пробуем играть по умолчанию
    window.addEventListener('load', play);

    document.addEventListener(
      'click',
      function firstInteraction(event) {
        if (!isPlaying && event.target !== toggleBtn) {
          play();
        }
        document.removeEventListener('click', firstInteraction);
      },
      { once: true }
    );
  }

  toggleBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    if (isPlaying) {
      pause();
      setPref('off');
    } else {
      play();
      setPref('on');
    }
  });
})();
