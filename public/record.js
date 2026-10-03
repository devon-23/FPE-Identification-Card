(function () {
  var stage = document.querySelector('.stage[data-fpe]');
  if (!stage) return;
  var id = stage.getAttribute('data-fpe');

  // the origin-only shortcut sends the token in the fragment, since there is
  // no json response to read it out of
  try {
    var handoff = location.hash.match(/^#t=([A-Za-z0-9_-]{20,})$/);
    if (handoff) {
      localStorage.setItem('fpe:token:' + id, handoff[1]);
      history.replaceState(null, '', location.pathname);
    }
  } catch (e) {  }

  try {
    if (localStorage.getItem('fpe:token:' + id)) {
      var owned = stage.querySelectorAll('[data-owner-only]');
      for (var i = 0; i < owned.length; i++) owned[i].hidden = false;
    }
  } catch (e) {  }

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
  } catch (e) {  }

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

// old version of the save button, before the share sheet existed.
// keep in case ios ever breaks navigator.share again
//
// function oldSave(canvas, name) {
//   var a = document.createElement('a');
//   a.href = canvas.toDataURL('image/png');
//   a.download = name;
//   a.click();
// }
