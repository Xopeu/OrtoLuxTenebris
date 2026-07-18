/* =========================================================
   Ordo Lux Tenebris — counter.js
   Счётчик почти всегда показывает "1". Очень редко число
   быстро накручивается вверх (как будто кто-то считает
   заходы в реальном времени), задерживается на пике долю
   секунды и тут же откручивается обратно.

   Первый файл из будущей серии "аномальных" скриптов —
   site.js отвечает только за звук, всё странное копим здесь
   и в соседних файлах на уровнях 2-4.
   ========================================================= */

(function () {
  var el = document.getElementById('visitor-count');
  if (!el) {
    return;
  }

  var BASE_COUNT = 1;
  var CHECK_INTERVAL_MS = 6000;   // как часто "бросаем монетку"
  var SPIKE_CHANCE = 0.012;       // редко — примерно раз в 8 минут
  var HOLD_AT_PEAK_MS = 150;      // пауза на пике перед откатом

  function render(n) {
    el.textContent = String(n);
  }

  function countTo(target, stepDelay, onDone) {
    var current = Number(el.textContent) || BASE_COUNT;
    var direction = target > current ? 1 : -1;

    function step() {
      current += direction;
      render(current);
      if (current === target) {
        if (onDone) {
          onDone();
        }
        return;
      }
      setTimeout(step, stepDelay);
    }

    step();
  }

  function runSpike() {
    var peak = BASE_COUNT + Math.floor(Math.random() * 40) + 8;
    el.classList.add('is-spiking');

    // быстрый разгон вверх, шаг цифра за цифрой
    countTo(peak, 22, function () {
      setTimeout(function () {
        // резкий откат вниз, чуть быстрее подъёма
        countTo(BASE_COUNT, 14, function () {
          el.classList.remove('is-spiking');
        });
      }, HOLD_AT_PEAK_MS);
    });
  }

  function maybeSpike() {
    if (Math.random() < SPIKE_CHANCE) {
      runSpike();
    }
  }

  render(BASE_COUNT);
  setInterval(maybeSpike, CHECK_INTERVAL_MS);
})();
