(function () {
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

    if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 7 });
    else map.setView([dest.lat, dest.lon], 5);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  start();
})();
