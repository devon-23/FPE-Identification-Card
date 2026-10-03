(function () {
  // off the origin-only form: the token comes back in the fragment, same as
  // the record page does it
  try {
    var filed = document.querySelector('.filed');
    var handoff = location.hash.match(/^#t=([A-Za-z0-9_-]{20,})$/);
    if (filed && handoff) {
      localStorage.setItem('fpe:token:' + filed.getAttribute('data-fpe'), handoff[1]);
      history.replaceState(null, '', location.pathname + location.search);
    }
  } catch (e) {  }

  function start() {
    if (!window.L) return setTimeout(start, 50);

    var pins = JSON.parse(document.getElementById('pins').textContent || '[]');
    var dest = JSON.parse(document.getElementById('dest').textContent || '{}');

    var map = L.map('map', { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    // the destination gets a ring instead of a dot so it reads as different
    var destMarker = L.circleMarker([dest.lat, dest.lon], {
      radius: 11, color: '#a3281f', weight: 3, fill: false, className: 'pin pin--dest',
    }).addTo(map);
    destMarker.bindPopup('<b>TO HERE</b><br>' + dest.label);

    var bounds = [[dest.lat, dest.lon]];

    pins.forEach(function (p) {
      // one pin per town. it grows a little when more than one person is on it
      var many = p.people.length > 1;
      var m = L.circleMarker([p.lat, p.lon], {
        radius: many ? 8 : 6,
        color: '#000',
        weight: 2,
        fillColor: '#000',
        fillOpacity: 1,
      }).addTo(map);

      var rows = p.people.map(function (s) {
        return '<a href="/f/' + s.id + '">FPE-' + s.id + ' &middot; ' + esc(s.name) + '</a>';
      }).join('<br>');

      m.bindPopup(
        '<b>' + esc(p.town || '') + '</b>' +
        (many ? '<br>' + p.people.length + ' SUBJECTS' : '') +
        '<br>' + rows
      );
      bounds.push([p.lat, p.lon]);
    });

    // always opens on columbus, far enough out to take in most of the states.
    // fitting to the pins meant one person in australia zoomed everyone out
    map.setView([dest.lat, dest.lon], 4);
    // map.fitBounds(bounds, { padding: [30, 30], maxZoom: 7 });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  start();
})();
