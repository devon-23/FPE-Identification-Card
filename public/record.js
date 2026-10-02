// Record page behaviour. Everything here is progressive enhancement -- the
// card renders and reads correctly with JavaScript disabled.
(function () {
  var stage = document.querySelector('.stage[data-fpe]');
  if (!stage) return;
  var id = stage.getAttribute('data-fpe');

  // Reveal owner-only controls when this device holds the edit token.
  try {
    if (localStorage.getItem('fpe:token:' + id)) {
      var owned = stage.querySelectorAll('[data-owner-only]');
      for (var i = 0; i < owned.length; i++) owned[i].hidden = false;
    }
  } catch (e) { /* storage blocked -- read-only is the correct fallback */ }

  // A device-only photo never reached the server; paint it in locally.
  try {
    var local = localStorage.getItem('fpe:photo:' + id);
    if (local) {
      var plate = stage.querySelector('.card__plate');
      var sil = plate && plate.querySelector('.card__silhouette');
      if (plate && sil) {
        var img = new Image();
        img.className = 'card__photo';
        img.alt = '';
        img.src = local;
        plate.replaceChild(img, sil);
        var nofile = plate.querySelector('.card__nofile');
        if (nofile) nofile.remove();
      }
    }
  } catch (e) { /* ignore */ }

  // The exporter is ~10 KB and most visitors never tap this, so it is only
  // fetched on demand -- a plain record view stays script-free in practice.
  var save = stage.querySelector('[data-action="save"]');
  if (save) {
    var loading = null;
    save.addEventListener('click', function () {
      var card = stage.querySelector('.card');
      if (!card) return;
      save.disabled = true;
      var original = save.textContent;
      save.textContent = 'PREPARING…';

      loading = loading || new Promise(function (resolve, reject) {
        if (window.FPECard) return resolve();
        var el = document.createElement('script');
        el.src = '/cardimage.js';
        el.onload = resolve;
        el.onerror = reject;
        document.head.appendChild(el);
      });

      loading.then(function () {
        return window.FPECard.save(card, 'FPE-' + id + '.png');
      }).then(function (how) {
        save.textContent = how === 'shared' ? 'SHARED'
          : how === 'cancelled' ? original
          : 'SAVED';
        save.disabled = false;
        if (how !== 'cancelled') {
          setTimeout(function () { save.textContent = original; }, 2500);
        }
      }).catch(function () {
        save.textContent = 'COULD NOT SAVE — SCREENSHOT INSTEAD';
        save.disabled = false;
        setTimeout(function () { save.textContent = original; }, 3500);
      });
    });
  }
})();
