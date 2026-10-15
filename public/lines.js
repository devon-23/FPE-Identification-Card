(function () {
  var list = document.querySelector('[data-lines]');
  var tag = document.getElementById('pool');
  if (!list || !tag) return;

  var pool = [];
  try { pool = JSON.parse(tag.textContent) || []; } catch (e) { return; }
  if (pool.length < 2) return;

  var slots = [].slice.call(list.children);
  var next = slots.length % pool.length;     // what the markup already used
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // one slot at a time, never the whole wall at once -- all seven turning
  // over together looks like a slot machine, one at a time looks like a room
  function swap(slot) {
    var line = pool[next % pool.length];
    next++;

    var a = slot.querySelector('a');
    if (!a) return;

    if (still) {
      a.textContent = line.t;
      a.href = '/f/' + line.id;
      return;
    }

    slot.classList.add('is-going');
    setTimeout(function () {
      a.textContent = line.t;
      a.href = '/f/' + line.id;
      slot.classList.remove('is-going');
    }, 700);
  }

  // stagger them so they are never in step
  var timers = [];
  function run() {
    stop();
    slots.forEach(function (slot, i) {
      timers.push(setTimeout(function () {
        swap(slot);
        timers.push(setInterval(function () { swap(slot); }, 7000 + i * 900));
      }, 2200 + i * 1100));
    });
  }
  function stop() {
    timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
    timers = [];
  }

  // a tab nobody is looking at does not need to keep cycling
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else run();
  });

  var shuffle = document.querySelector('[data-shuffle]');
  if (shuffle) {
    shuffle.addEventListener('click', function () {
      for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
      }
      next = 0;
      slots.forEach(function (slot, i) { setTimeout(function () { swap(slot); }, i * 120); });
    });
  }

  run();
})();
