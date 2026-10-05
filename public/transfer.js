(function () {
  // held.js is loaded first and does the localStorage reading for both of us
  function start() {
    if (!window.FPEHeld) return setTimeout(start, 30);

    var box = document.querySelector('[data-transfer]');
    var fresh = document.querySelector('[data-held-hide]');
    if (!box || !fresh) return;

    var target = box.getAttribute('data-target');
    var key = box.getAttribute('data-key');
    var mine = window.FPEHeld.ids();
    if (!mine.length) return;

    var list = box.querySelector('[data-held-list]');
    var say = box.querySelector('.form__status');
    var go = box.querySelector('[data-action="transfer"]');
    var chosen = mine[0];

    paint(mine.map(function (id) { return { id: id, name: null }; }));
    window.FPEHeld.names(mine).then(function (rows) {
      if (rows.length) paint(rows);
    });

    function paint(rows) {
      list.textContent = '';
      rows.forEach(function (row, i) {
        var li = document.createElement('li');
        var label = document.createElement('label');

        var radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'move';
        radio.value = row.id;
        if (row.id === chosen || (rows.length === 1 && i === 0)) radio.checked = true;
        radio.addEventListener('change', function () { chosen = row.id; });
        label.appendChild(radio);

        var tag = document.createElement('b');
        tag.textContent = 'FPE-' + row.id;
        label.appendChild(tag);

        if (row.name) {
          var who = document.createElement('span');
          who.textContent = row.name + (row.hometown ? ' · ' + row.hometown : '');
          label.appendChild(who);
        }

        li.appendChild(label);
        list.appendChild(li);
      });
      // only one to move, so there is nothing to pick between
      list.hidden = rows.length < 2;
    }

    box.hidden = false;
    fresh.hidden = true;

    box.querySelector('[data-action="anyway"]').addEventListener('click', function () {
      box.hidden = true;
      fresh.hidden = false;
    });

    go.addEventListener('click', function () {
      go.disabled = true;
      say.textContent = 'MOVING THE FILE…';

      var body = new FormData();
      body.append('key', key);
      body.append('from', chosen);
      try { body.append('token', localStorage.getItem('fpe:token:' + chosen) || ''); } catch (e) {  }

      fetch('/f/' + target + '/transfer', { method: 'POST', body: body })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) {
            say.textContent = res.d.error || 'COULD NOT MOVE THE FILE.';
            go.disabled = false;
            return;
          }
          try {
            localStorage.setItem('fpe:token:' + target, res.d.token);
            // a photo kept on the device only travels with them
            var local = localStorage.getItem('fpe:photo:' + chosen);
            if (local) localStorage.setItem('fpe:photo:' + target, local);
            localStorage.removeItem('fpe:token:' + chosen);
            localStorage.removeItem('fpe:photo:' + chosen);
          } catch (e) {  }
          location.href = res.d.next;
        })
        .catch(function () {
          say.textContent = 'NO CONNECTION. NOTHING WAS MOVED — TRY AGAIN.';
          go.disabled = false;
        });
    });
  }

  start();
})();
