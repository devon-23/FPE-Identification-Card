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

  var save = stage.querySelector('[data-action="save"]');
  if (save) {
    save.addEventListener('click', function () {
      save.textContent = 'SAVE COMING IN NEXT STAGE';
    });
  }
})();
