// Card maker: live preview, local photo processing, submission.
(function () {
  'use strict';

  var stage = document.querySelector('.maker');
  if (!stage) return;

  var id    = stage.getAttribute('data-fpe');
  var mode  = stage.getAttribute('data-mode');          // 'claim' | 'amend'
  var form  = document.getElementById('maker');
  var card  = stage.querySelector('.card');
  var status = form.querySelector('.form__status');

  var nameEl     = document.getElementById('name');
  var attemptsEl = document.getElementById('attempts');
  var handleEl   = document.getElementById('handle');
  var hometownEl = document.getElementById('hometown');
  var bioEl       = document.getElementById('bio');
  var lyricEl     = document.getElementById('lyric');
  var firstShowEl = document.getElementById('firstShow');
  var bishopEl    = document.getElementById('bishop');
  var photoEl   = document.getElementById('photo');
  var consentEl = document.getElementById('consent');   // absent when storage is off
  var consentBox = form.querySelector('.consent');
  var pickBtn   = form.querySelector('[data-action="pick"]');
  var dropBtn   = form.querySelector('[data-action="drop"]');
  var submitBtn = form.querySelector('[data-action="submit"]');

  var slotName     = card.querySelector('[data-slot="name"]');
  var slotFaction  = card.querySelector('[data-slot="faction"]');
  var slotHandle   = card.querySelector('[data-slot="handle"]');
  var slotAttempts = card.querySelector('[data-slot="attempts"]');
  var slotHometown = card.querySelector('[data-slot="hometown"]');
  var slotLyric     = card.querySelector('[data-slot="lyric"]');
  var slotFirstShow = card.querySelector('[data-slot="firstShow"]');
  var slotBishop    = card.querySelector('[data-slot="bishop"]');
  var REDACTED = '[REDACTED]';
  var plate       = card.querySelector('.card__plate');

  var photoBlob = null;      // processed JPEG awaiting upload
  var photoURL  = null;      // object URL for the preview
  var photoDataURL = null;   // kept only for the device-only path
  var removePhoto = false;

  var TOKEN_KEY = 'fpe:token:' + id;
  var PHOTO_KEY = 'fpe:photo:' + id;

  function store(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function drop(key) { try { localStorage.removeItem(key); } catch (e) {} }

  // --- ownership gate -------------------------------------------------------
  // Amending requires the token this device was given at claim time. The server
  // re-checks it on every write; this is only so the UI tells the truth early.
  var token = load(TOKEN_KEY);
  if (mode === 'amend' && !token) {
    stage.innerHTML =
      '<p class="kicker">ACCESS DENIED</p>' +
      '<p class="designation">FPE-' + id + '</p>' +
      '<p class="note">THIS RECORD IS HELD BY ANOTHER DEVICE. IT CANNOT BE AMENDED FROM HERE.</p>' +
      '<p class="actions"><a class="button" href="/f/' + id + '">VIEW RECORD</a></p>';
    return;
  }

  form.hidden = false;

  // --- live preview ---------------------------------------------------------

  function paintName() {
    var v = nameEl.value.trim();
    slotName.textContent = v ? v.toUpperCase() : 'UNREGISTERED';
    card.classList.toggle('card--blank', !v);
  }

  function paintFaction() {
    var f = form.querySelector('input[name="faction"]:checked').value;
    slotFaction.textContent = f;
    card.classList.toggle('card--bandito', f === 'BANDITO');
    card.classList.toggle('card--citizen', f !== 'BANDITO');
  }

  function paintPhoto(src) {
    var existing = plate.querySelector('.card__photo');
    var sil = plate.querySelector('.card__silhouette');
    var nofile = plate.querySelector('.card__nofile');

    if (src) {
      if (existing) { existing.src = src; }
      else {
        var img = new Image();
        img.className = 'card__photo';
        img.alt = '';
        img.src = src;
        plate.insertBefore(img, plate.firstChild);
      }
      if (sil) sil.hidden = true;
      if (nofile) nofile.hidden = true;
    } else {
      if (existing) existing.remove();
      if (sil) sil.hidden = false;
      if (nofile) nofile.hidden = false;
    }
  }

  // Anything left blank reads [REDACTED], exactly as it will once filed.
  function paintOptional(input, slot, decorate) {
    var v = input.value.trim();
    slot.textContent = v ? (decorate ? decorate(v) : v) : REDACTED;
    slot.classList.toggle('is-redacted', !v);
  }

  function paintAttempts() {
    var n = parseInt(attemptsEl.value, 10);
    if (!isFinite(n) || n < 1) n = 1;
    if (n > 99) n = 99;
    slotAttempts.textContent = String(n).padStart(2, '0');
  }

  // Picking a bishop moves the lit section of the city with it.
  function paintBishop() {
    var v = bishopEl.value;
    slotBishop.textContent = v;
    var lit = bishopEl.selectedIndex;
    var segs = card.querySelectorAll('.mark__wall');
    for (var i = 0; i < segs.length; i++) {
      segs[i].classList.toggle('mark__wall--lit', Number(segs[i].getAttribute('data-seg')) === lit);
    }
    card.setAttribute('data-bishop', String(lit));
  }

  function paintAll() {
    paintName();
    paintFaction();
    paintAttempts();
    paintBishop();
    paintOptional(handleEl, slotHandle, function (v) { return '@' + v.replace(/^@+/, ''); });
    paintOptional(hometownEl, slotHometown);
    paintOptional(lyricEl, slotLyric);
    paintOptional(firstShowEl, slotFirstShow);
  }

  nameEl.addEventListener('input', paintName);
  attemptsEl.addEventListener('input', paintAttempts);
  bishopEl.addEventListener('change', paintBishop);
  handleEl.addEventListener('input', function () {
    paintOptional(handleEl, slotHandle, function (v) { return '@' + v.replace(/^@+/, ''); });
  });
  hometownEl.addEventListener('input', function () { paintOptional(hometownEl, slotHometown); });
  lyricEl.addEventListener('input', function () { paintOptional(lyricEl, slotLyric); });
  firstShowEl.addEventListener('input', function () { paintOptional(firstShowEl, slotFirstShow); });
  var radios = form.querySelectorAll('input[name="faction"]');
  for (var i = 0; i < radios.length; i++) radios[i].addEventListener('change', paintFaction);

  // --- photo ----------------------------------------------------------------

  var SIDE = 900;   // the plate is square, so the stored image is too

  function processPhoto(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          // Browsers apply EXIF orientation when drawing an <img>, so a photo
          // taken sideways lands upright and the EXIF block -- GPS included --
          // is dropped entirely by re-encoding through the canvas.
          var side = Math.min(img.naturalWidth, img.naturalHeight);
          var sx = (img.naturalWidth  - side) / 2;
          var sy = (img.naturalHeight - side) / 2;

          var canvas = document.createElement('canvas');
          canvas.width = canvas.height = SIDE;
          var ctx = canvas.getContext('2d');
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, sx, sy, side, side, 0, 0, SIDE, SIDE);

          canvas.toBlob(function (blob) {
            URL.revokeObjectURL(url);
            blob ? resolve(blob) : reject(new Error('ENCODE FAILED'));
          }, 'image/jpeg', 0.82);
        } catch (e) { URL.revokeObjectURL(url); reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('UNREADABLE IMAGE')); };
      img.src = url;
    });
  }

  pickBtn.addEventListener('click', function () { photoEl.click(); });

  photoEl.addEventListener('change', function () {
    var file = photoEl.files && photoEl.files[0];
    if (!file) return;
    say('PROCESSING IMAGE…');
    processPhoto(file).then(function (blob) {
      photoBlob = blob;
      removePhoto = false;
      if (photoURL) URL.revokeObjectURL(photoURL);
      photoURL = URL.createObjectURL(blob);
      paintPhoto(photoURL);
      consentBox.hidden = false;
      dropBtn.hidden = false;
      pickBtn.textContent = 'CHOOSE A DIFFERENT PHOTO';
      say('');
    }).catch(function () {
      say('THAT IMAGE COULD NOT BE READ. TRY ANOTHER.');
    });
  });

  dropBtn.addEventListener('click', function () {
    photoBlob = null;
    removePhoto = true;
    if (photoURL) { URL.revokeObjectURL(photoURL); photoURL = null; }
    photoDataURL = null;
    photoEl.value = '';
    paintPhoto(null);
    consentBox.hidden = true;
    dropBtn.hidden = true;
    pickBtn.textContent = 'TAKE OR CHOOSE PHOTO';
  });

  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  // --- submit ---------------------------------------------------------------

  function say(msg) { status.textContent = msg; }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    submitBtn.disabled = true;
    say(mode === 'amend' ? 'FILING AMENDMENT…' : 'FILING RECORD…');

    var consented = !!(photoBlob && consentEl && consentEl.checked);

    var body = new FormData();
    body.append('name', nameEl.value);
    body.append('faction', form.querySelector('input[name="faction"]:checked').value);
    body.append('attempts', attemptsEl.value);
    body.append('handle', handleEl.value);
    body.append('hometown', hometownEl.value);
    body.append('bio', bioEl.value);
    body.append('lyric', lyricEl.value);
    body.append('firstShow', firstShowEl.value);
    body.append('bishop', bishopEl.value);
    if (mode === 'amend') {
      body.append('token', token);
      body.append('photo_action', removePhoto ? 'remove' : (consented ? 'replace' : 'keep'));
    }
    // A photo the user did not consent to publish is never attached.
    if (consented) body.append('photo', photoBlob, id + '.jpg');

    var keepLocal = photoBlob && !consented
      ? blobToDataURL(photoBlob).then(function (d) { photoDataURL = d; })
      : Promise.resolve();

    keepLocal.then(function () {
      return fetch('/f/' + id + '/' + (mode === 'amend' ? 'amend' : 'claim'), {
        method: 'POST', body: body, credentials: 'omit',
      });
    }).then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, data: data }; });
    }).then(function (r) {
      if (!r.ok) {
        say(r.data.error || 'SUBMISSION REFUSED.');
        submitBtn.disabled = false;
        if (r.data.claimed) {
          setTimeout(function () { location.href = '/f/' + id; }, 2200);
        }
        return;
      }
      if (r.data.token) store(TOKEN_KEY, r.data.token);
      if (photoDataURL) store(PHOTO_KEY, photoDataURL);
      else if (removePhoto || consented) drop(PHOTO_KEY);
      location.href = r.data.next || ('/f/' + id);
    }).catch(function () {
      say('NO CONNECTION. YOUR RECORD WAS NOT FILED — TRY AGAIN.');
      submitBtn.disabled = false;
    });
  });

  // --- prefill (amend) ------------------------------------------------------

  // Field values are prefilled server-side; only the device-only photo, which
  // never reached the server, has to be restored here.
  if (mode === 'amend') {
    var localPhoto = load(PHOTO_KEY);
    if (localPhoto) paintPhoto(localPhoto);
  }

  paintAll();
})();
