(function () {
  var stage = document.querySelector('.stage[data-fpe]');
  if (!stage) return;
  var id = stage.getAttribute('data-fpe');

  // the origin-only shortcut sends the token in the fragment, since there is no json response to read it out of
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

  var loading = null;
  function exporter() {
    loading = loading || new Promise(function (resolve, reject) {
      if (window.FPECard) return resolve();
      var el = document.createElement('script');
      el.src = '/cardimage.js';
      el.onload = resolve;
      el.onerror = reject;
      document.head.appendChild(el);
    });
    return loading;
  }

  // the card and the attached file save the same way, they just hand the exporter a different lump of the page
  function wire(selector, target, filename, call) {
    var button = stage.querySelector(selector);
    if (!button) return;

    button.addEventListener('click', function () {
      var el = stage.querySelector(target);
      if (!el) return;
      button.disabled = true;
      var original = button.textContent;
      button.textContent = 'PREPARING…';

      exporter().then(function () {
        return window.FPECard[call](el, filename);
      }).then(function (how) {
        button.textContent = how === 'shared' ? 'SHARED'
          : how === 'cancelled' ? original
          : 'SAVED';
        button.disabled = false;
        if (how !== 'cancelled') {
          setTimeout(function () { button.textContent = original; }, 2500);
        }
      }).catch(function () {
        button.textContent = 'COULD NOT SAVE — SCREENSHOT INSTEAD';
        button.disabled = false;
        setTimeout(function () { button.textContent = original; }, 3500);
      });
    });
  }

  wire('[data-action="save"]', '.card', 'FPE-' + id + '.png', 'save');
  wire('[data-action="save-sheet"]', '.rf__sheet', 'FPE-' + id + '-FILE.png', 'saveSheet');
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
