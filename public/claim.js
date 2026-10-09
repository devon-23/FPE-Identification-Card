(function () {
  'use strict';

  var stage = document.querySelector('.maker');
  if (!stage) return;

  // make this into an el 
  var id = stage.getAttribute('data-fpe');
  var mode = stage.getAttribute('data-mode');
  var form = document.getElementById('maker');
  var tagKey = form.getAttribute('data-key') || '';
  var card = stage.querySelector('.card');
  var status = form.querySelector('.form__status');

  var nameEl = document.getElementById('name');
  var attemptsEl = document.getElementById('attempts');
  var handleEl = document.getElementById('handle');
  var hometownEl = document.getElementById('hometown');
  var bioEl = document.getElementById('bio');
  var lyricEl = document.getElementById('lyric');
  var firstShowEl = document.getElementById('firstShow');
  var bishopEl = document.getElementById('bishop');
  var attendingEl = document.getElementById('attending');
  var photoEl = document.getElementById('photo');
  var consentEl = document.getElementById('consent');
  var consentBox = form.querySelector('.consent');
  var pickBtn = form.querySelector('[data-action="pick"]');
  var dropBtn = form.querySelector('[data-action="drop"]');
  var submitBtn = form.querySelector('[data-action="submit"]');

  var slotName = card.querySelector('[data-slot="name"]');
  var slotFaction = card.querySelector('[data-slot="faction"]');
  var slotHandle = card.querySelector('[data-slot="handle"]');
  var slotAttempts = card.querySelector('[data-slot="attempts"]');
  var slotHometown = card.querySelector('[data-slot="hometown"]');
  var slotLyric = card.querySelector('[data-slot="lyric"]');
  var slotFirstShow = card.querySelector('[data-slot="firstShow"]');
  var slotBishop = card.querySelector('[data-slot="bishop"]');
  var slotWhen = card.querySelector('[data-slot="when"]');
  var REDACTED = '[REDACTED]';
  var plate  = card.querySelector('.card__plate');

  var photoBlob = null;
  var photoURL = null;
  var photoDataURL = null;
  var removePhoto = false;

  var TOKEN_KEY = 'fpe:token:' + id;
  var PHOTO_KEY = 'fpe:photo:' + id;

  function store(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function drop(key) { try { localStorage.removeItem(key); } catch (e) {} }

  var token = load(TOKEN_KEY);
  if (mode === 'amend' && !token) { // amend mode added for testing purposes
    stage.innerHTML =
      '<p class="kicker">ACCESS DENIED</p>' +
      '<p class="designation">FPE-' + id + '</p>' +
      '<p class="note">THIS RECORD IS HELD BY ANOTHER DEVICE. IT CANNOT BE AMENDED FROM HERE.</p>' +
      '<p class="actions"><a class="button" href="/f/' + id + '">VIEW RECORD</a></p>';
    return;
  }

  form.hidden = false;

  // the other half of this lives in card.js as nameWidth(). keep them the same or the preview will not match what gets filed
  function nameWidth(text) {
    var w = 0;
    var s = String(text || '').toUpperCase();
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (ch === 'W') w += 0.95;
      else if (ch === 'M') w += 0.85;
      else if ('IJLT .,\'-'.indexOf(ch) !== -1) w += 0.45;
      //else if ('IJLT .,\'-'.indexOf(ch) !== -1) w += 0.25;
      else if (ch >= '0' && ch <= '9') w += 0.62;
      else w += 0.72;
    }
    return Math.max(1, Math.round(w * 1.03 * 100) / 100);
  }

  function paintName() {
    var v = nameEl.value.trim();
    var shown = v ? v.toUpperCase() : 'UNREGISTERED';
    slotName.textContent = shown;
    slotName.style.setProperty('--w', String(nameWidth(shown)));
    card.classList.toggle('card--blank', !v);
  }

  function paintFaction() {
    var f = form.querySelector('input[name="faction"]:checked').value;
    slotFaction.textContent = f;
    card.classList.toggle('card--citizen', f === 'CITIZEN');
    card.classList.toggle('card--escapee', f === 'ESCAPEE');
    card.classList.toggle('card--bandito', f === 'BANDITO');
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

  function paintOptional(input, slot, decorate) {
    // handle, hometown and first show live on the attached file, not the card, so there is nothing to paint for those. this used to throw on every keystroke in those three fields
    if (!slot) return;
    // blank fields read [REDACTED] on the card, same as they will once filed
    var v = input.value.trim();

    slot.textContent = v ? (decorate ? decorate(v) : v) : REDACTED;
    slot.classList.toggle('is-redacted', !v);
  }

  function paintAttempts() {
    var n = parseInt(attemptsEl.value, 10);
    if (!isFinite(n) || n < 0) n = 1;
    // keep this the same as ATTEMPTS_MAX or the preview lies about what gets filed
    if (n > 9999) n = 9999;
    slotAttempts.textContent = String(n).padStart(2, '0');
  }

  function paintBishop() { // BRUHHHH
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

  // the night only goes on the card if they say they were there
  function paintWhen() {
    if (!slotWhen || !attendingEl) return;
    slotWhen.classList.toggle('is-empty', !attendingEl.checked);
  }
  paintWhen();
  if (attendingEl) attendingEl.addEventListener('change', paintWhen);

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

  var SIDE = 900;

  function processPhoto(file) { //🙂‍↕️😫 i just realized you can put emojis in vs code
    // 900px square, re-encoded. the re-encode is what drops the gps
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
          // drawing through an <img> is what rotates the photo upright. don't swap this for createImageBitmap, it comes out sideways on iphones
        try {
          var side = Math.min(img.naturalWidth, img.naturalHeight);
          var sx = (img.naturalWidth  - side) / 2;
          var sy = (img.naturalHeight - side) / 2;

          var canvas = document.createElement('canvas');
          canvas.width = canvas.height = SIDE;
          var ctx = canvas.getContext('2d');
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, sx, sy, side, side, 0, 0, SIDE, SIDE);
/*
          var img = document.createElement('img');
          img.width = img.height = SIDE;
          var ctx = img.getContext('2d');
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, sx, sy, side, side, 0, 0, SIDE, SIDE);
*/
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

// all event listeners

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

  function say(msg) { status.textContent = msg; }

  form.addEventListener('submit', function (ev) {
    // a photo with the consent box unticked is never attached to the request. it goes to localStorage and nowhere else
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
    body.append('attending', attendingEl && attendingEl.checked ? '1' : '0');
    if (mode !== 'amend') body.append('key', tagKey);
    if (mode === 'amend') {
      body.append('token', token);
      body.append('photo_action', removePhoto ? 'remove' : (consented ? 'replace' : 'keep'));
    }
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
    }).then(function (r) { // never got to test this so lets hope it works
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

  if (mode === 'amend') {
    var localPhoto = load(PHOTO_KEY);
    if (localPhoto) paintPhoto(localPhoto);
  }

  paintAll();
}
)();
