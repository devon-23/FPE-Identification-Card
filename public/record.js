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

  var mine = false;
  try { mine = !!localStorage.getItem('fpe:token:' + id); } catch (e) {  }

  if (mine) {
    var owned = stage.querySelectorAll('[data-owner-only]');
    for (var i = 0; i < owned.length; i++) owned[i].hidden = false;
    var save = stage.querySelector('[data-action="save"]');
    if (save) save.classList.add('button--primary');
  } else {
    // somebody tapped a friend's card. saving it is still allowed -- it is a
    // nice thing to do -- but the loud button at the bottom is the one that
    // sends them off to make their own
    var guest = stage.querySelector('[data-guest-only]');
    if (guest) {
      guest.hidden = false;
      var held = (window.FPEHeld && window.FPEHeld.ids()) || [];
      if (held.length) {
        var go = guest.querySelector('[data-yours-go]');
        guest.querySelector('[data-yours-head]').textContent = 'THIS IS SOMEBODY ELSE\u2019S FILE.';
        guest.querySelector('[data-yours-body]').textContent =
          'YOURS IS FILED SEPARATELY, UNDER FPE-' + held[0] + '.';
        go.textContent = 'VIEW YOUR CARD \u2014\u2014\u2014>';
        go.href = '/f/' + held[0];
      }
    }
  }

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

  // the words that go with the picture, hashes included -- the intent link
  // takes its tags in a separate parameter, a share sheet does not
  function caption() {
    var tags = (stage.getAttribute('data-tags') || '').split(',').filter(Boolean);
    var line = stage.getAttribute('data-share') || '';
    if (tags.length) line += ' ' + tags.map(function (t) { return '#' + t; }).join(' ');
    return line;
  }

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

  // one button, both pictures. the card and the attached file are drawn the
  // same way, they just hand the exporter a different lump of the page
  var button = stage.querySelector('[data-action="save"]');
  if (button) {
    button.addEventListener('click', function () {
      var card = stage.querySelector('.card');
      var sheet = stage.querySelector('.rf__sheet');
      if (!card) return;

      button.disabled = true;
      var original = button.textContent;
      button.textContent = 'PREPARING…';

      exporter().then(function () {
        var jobs = [window.FPECard.render(card)];
        if (sheet) jobs.push(window.FPECard.renderSheet(sheet));
        return Promise.all(jobs);
      }).then(function (canvases) {
        var names = ['FPE-' + id + '.png', 'FPE-' + id + '-FILE.png'];
        return Promise.all(canvases.map(function (c, i) {
          return toBlob(c).then(function (blob) {
            return new File([blob], names[i], { type: 'image/png' });
          });
        }));
      }).then(function (files) {
        return deliver(files);
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

  function toBlob(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) { return b ? resolve(b) : reject(new Error('render failed')); }, 'image/png');
    });
  }

  // a phone takes both at once and the caption with them, which is the whole
  // point -- pick X out of the sheet and the card is already attached.
  // everywhere else they come down as two files
  function deliver(files) {
    var text = caption();
    if (navigator.canShare && navigator.canShare({ files: files })) {
      var payload = { files: files };
      if (text && navigator.canShare({ files: files, text: text })) payload.text = text;
      return navigator.share(payload)
        .then(function () { return 'shared'; })
        .catch(function (e) {
          if (e && e.name === 'AbortError') return 'cancelled';
          return saveAll(files);
        });
    }
    return Promise.resolve(saveAll(files));
  }

  // browsers get suspicious about two downloads from one click, so the
  // second one waits a beat rather than arriving in the same tick
  function saveAll(files) {
    files.forEach(function (file, i) {
      setTimeout(function () { download(file, file.name); }, i * 400);
    });
    return 'downloaded';
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
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
