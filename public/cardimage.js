// Renders the card to a PNG for saving or sharing.
//
// Loaded on demand, never on a plain record view -- a record page stays a
// ~1 KB no-JavaScript document. Every value is read back out of the rendered
// DOM, so the image cannot drift from the card on screen.
(function () {
  'use strict';

  var MONO = '"American Typewriter", "Courier New", Courier, ui-monospace, monospace';

  // The CSS card is 360px wide; 3x gives a 1080px export and lets every
  // measurement below be the CSS pixel value.
  var S = 3;
  var CW = 360;
  var PAD = 16;

  // Pulled from the stylesheet so a saved card matches the theme on screen.
  var CARD, BLACK, INK, DIM, FAINT, LINE, GOLD, WALL, ONLIGHT;

  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    var get = function (name, fallback) {
      var v = cs.getPropertyValue(name).trim();
      return v || fallback;
    };
    CARD    = get('--card', '#121211');
    BLACK   = get('--plate', '#000');
    INK     = get('--ink', '#e7e3d7');
    DIM     = get('--dim', '#8b8678');
    FAINT   = get('--faint', '#595346');
    LINE    = get('--line', '#2b2924');
    GOLD    = get('--accent', '#c9a227');
    WALL    = get('--wall', '#38342b');
    ONLIGHT = get('--onlight', '#0a0a09');
  }

  var SEGMENTS = 18;

  function px(v) { return v * S; }
  function font(weight, size) { return weight + ' ' + px(size) + 'px ' + MONO; }

  /** Fit text to a width. Sizes are CSS pixels; font() applies the scale. */
  function fitLines(ctx, text, maxWidth, size, weight, minSize, maxLines) {
    var s = size;
    ctx.font = font(weight, s);
    if (ctx.measureText(text).width <= maxWidth) return { lines: [text], size: s };

    if (maxLines > 1) {
      var words = text.split(/\s+/);   // spaces only: splitting on '-' would eat it
      if (words.length > 1) {
        var best = null;
        for (var i = 1; i < words.length; i++) {
          var a = words.slice(0, i).join(' ');
          var b = words.slice(i).join(' ');
          var w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
          if (!best || w < best.w) best = { a: a, b: b, w: w };
        }
        if (best) {
          var t = s;
          while (t > minSize) {
            ctx.font = font(weight, t);
            if (Math.max(ctx.measureText(best.a).width, ctx.measureText(best.b).width) <= maxWidth) break;
            t -= 1;
          }
          return { lines: [best.a, best.b], size: t };
        }
      }
    }

    while (s > minSize) {
      s -= 1;
      ctx.font = font(weight, s);
      if (ctx.measureText(text).width <= maxWidth) break;
    }
    return { lines: [text], size: s };
  }

  /** Greedy word wrap at a fixed size. */
  function wrap(ctx, text, maxWidth, size, weight) {
    ctx.font = font(weight, size);
    var words = String(text).split(/\s+/);
    var lines = [];
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var next = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function centred(ctx, text, cx, y) { ctx.textAlign = 'center'; ctx.fillText(text, cx, y); }

  /** Grayscale + contrast by hand: ctx.filter is unreliable on older iOS. */
  function desaturate(ctx, x, y, w, h) {
    var img = ctx.getImageData(x, y, w, h);
    var d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var g = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      g = ((g - 128) * 1.3 + 128) * 0.86;
      d[i] = d[i + 1] = d[i + 2] = g < 0 ? 0 : g > 255 ? 255 : g;
    }
    ctx.putImageData(img, x, y);
  }

  /** The city mark, matching glyph.js: nine sections, the bishop's one lit. */
  function drawMark(ctx, cx, cy, size, bishopIdx, wallColour, litColour) {
    var R1 = size * 0.44, R0 = size * 0.25, RI = size * 0.19;
    var step = (Math.PI * 2) / 9;
    var gap = step * 0.1;

    ctx.beginPath();
    ctx.arc(cx, cy, RI, 0, Math.PI * 2);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = Math.max(1, size * 0.012);
    ctx.stroke();

    var origin = -Math.PI / 2 - step / 2;
    for (var i = 0; i < 9; i++) {
      var a0 = i * step + origin + gap / 2;
      var a1 = (i + 1) * step + origin - gap / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R1, a0, a1);
      ctx.arc(cx, cy, R0, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = i === bishopIdx ? litColour : wallColour;
      ctx.fill();
    }
  }

  function loadImage(src) {
    return new Promise(function (resolve) {
      if (!src) return resolve(null);
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;   // same-origin or a data URL, so the canvas stays clean
    });
  }

  function readCard(card) {
    var t = function (sel) {
      var el = card.querySelector(sel);
      return el ? el.textContent.trim() : '';
    };
    var strips = card.querySelectorAll('.card__strip span');
    var charge = card.querySelectorAll('.card__charge span');
    var statute = card.querySelectorAll('.card__statute span');
    var facts = card.querySelectorAll('.card__facts .fact');
    var list = [];
    for (var i = 1; i < facts.length; i++) {
      list.push({
        label: facts[i].querySelector('dt').textContent.trim(),
        value: facts[i].querySelector('dd').textContent.trim(),
      });
    }
    var photo = card.querySelector('.card__photo');
    return {
      bureau: strips[0] ? strips[0].textContent.trim() : '',
      form: strips[1] ? strips[1].textContent.trim() : '',
      chargeTop: charge[0] ? charge[0].textContent.trim() : '',
      chargeMain: t('.card__charge b'),
      chargeBy: charge[1] ? charge[1].textContent.trim() : '',
      statute: [
        statute[0] ? statute[0].textContent.trim() : '',
        statute[1] ? statute[1].textContent.trim() : '',
      ],
      designation: t('.card__designation'),
      name: t('.fact--name dd'),
      facts: list,
      lyric: t('.card__lyric'),
      venue: t('.card__place b'),
      when: t('.card__place span'),
      standing: strips[2] ? strips[2].textContent.trim() : 'IF FOUND, RETURN TO DEMA',
      faction: t('.card__faction'),
      photoSrc: photo ? photo.src : null,
      bandito: card.classList.contains('card--bandito'),
      blank: card.classList.contains('card--blank'),
      bishop: parseInt(card.getAttribute('data-bishop') || '0', 10),
    };
  }

  function draw(d, photo) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var edge = d.bandito ? GOLD : DIM;
    var inner = CW - PAD * 2;
    var plateW = inner * 0.38;
    var plateH = plateW * 1.25;
    var factsX = PAD + plateW + 12;
    var factsW = inner - plateW - 12;

    // Measure the wrapping blocks first; they decide the card's height.
    canvas.width = px(CW); canvas.height = px(1200);
    ctx.font = font('700', 15);
    var nameFit = fitLines(ctx, d.name, px(factsW), 15, '700', 9, 2);
    ctx.font = font('400', 12);
    var lyricFit = wrap(ctx, d.lyric, px(inner), 12, '400');

    var factsH = 10 + nameFit.lines.length * 17 + 7;
    for (var i = 0; i < d.facts.length; i++) factsH += 10 + 17 + 7;
    var bodyH = Math.max(plateH, factsH - 7);

    var headH = 18 + 12 + 3 + 17 + 3 + 12 + 10 + 12 + 12;
    var lyricH = 4 + lyricFit.length * 18 + 10;
    var placeH = 12 + 15 + 15 + 2;
    var markH = 14 + 80 + 18;

    var H = 24 + headH + 14 + bodyH + lyricH + 14 + 44 + 10 + placeH + markH + 24;

    canvas.width = Math.round(px(CW));
    canvas.height = Math.round(px(H));
    ctx = canvas.getContext('2d');

    ctx.fillStyle = CARD;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var cx = canvas.width / 2;
    var y = 0;

    // top strip
    ctx.fillStyle = BLACK;
    ctx.fillRect(0, 0, canvas.width, px(24));
    ctx.fillStyle = LINE;
    ctx.fillRect(0, px(23), canvas.width, Math.max(1, px(1)));
    ctx.fillStyle = '#a9a396';
    ctx.font = font('400', 8);
    ctx.textAlign = 'left';
    ctx.fillText(d.bureau, px(11), px(15.5));
    ctx.textAlign = 'right';
    ctx.fillText(d.form, canvas.width - px(11), px(15.5));
    y = 24;

    // the charge
    y += 18;
    ctx.fillStyle = DIM;
    ctx.font = font('400', 8);
    centred(ctx, d.chargeTop, cx, px(y + 9));
    y += 12 + 3;
    ctx.fillStyle = d.blank ? DIM : INK;
    var mainFit = fitLines(ctx, d.chargeMain, px(inner), 12, '700', 8, 1);
    ctx.font = font('700', mainFit.size);
    centred(ctx, d.chargeMain, cx, px(y + 13));
    y += 17 + 3;
    ctx.fillStyle = DIM;
    ctx.font = font('400', 8);
    centred(ctx, d.chargeBy, cx, px(y + 9));
    y += 12 + 10;

    ctx.fillStyle = FAINT;
    ctx.font = font('400', 7);
    centred(ctx, d.statute[0], cx, px(y + 8));
    centred(ctx, d.statute[1], cx, px(y + 20));
    y += 24;

    // photo well
    y += 14;
    var plx = px(PAD), ply = px(y), plw = px(plateW), plh = px(plateH);
    ctx.fillStyle = BLACK;
    ctx.fillRect(plx, ply, plw, plh);

    if (photo) {
      var side = Math.min(photo.naturalWidth, photo.naturalHeight);
      var sx = (photo.naturalWidth - side) / 2;
      var sy = (photo.naturalHeight - side) / 2;
      var srcW = side * 0.8;    // cover a 4:5 well from a square source
      ctx.drawImage(photo, sx + (side - srcW) / 2, sy, srcW, side, plx, ply, plw, plh);
      desaturate(ctx, Math.round(plx), Math.round(ply), Math.round(plw), Math.round(plh));
    } else {
      ctx.fillStyle = '#1e1c18';
      var hc = plx + plw / 2;
      ctx.beginPath();
      ctx.arc(hc, ply + plh * 0.36, plw * 0.155, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hc - plw * 0.32, ply + plh * 0.78);
      ctx.arc(hc, ply + plh * 0.62, plw * 0.32, Math.PI, 0);
      ctx.lineTo(hc + plw * 0.32, ply + plh * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#332f28';
      ctx.font = font('400', 7);
      centred(ctx, 'NO IMAGE', hc, ply + plh - px(6));
    }
    ctx.strokeStyle = LINE;
    ctx.lineWidth = Math.max(1, px(1));
    ctx.strokeRect(plx, ply, plw, plh);

    // facts column
    var fy = y;
    ctx.textAlign = 'left';
    ctx.fillStyle = FAINT;
    ctx.font = font('400', 7);
    ctx.fillText('NAME', px(factsX), px(fy + 7));
    ctx.fillStyle = d.blank ? DIM : INK;
    ctx.font = font('700', nameFit.size);
    for (var n = 0; n < nameFit.lines.length; n++) {
      ctx.fillText(nameFit.lines[n], px(factsX), px(fy + 10 + 14 + n * 17));
    }
    fy += 10 + nameFit.lines.length * 17 + 7;

    for (var k = 0; k < d.facts.length; k++) {
      ctx.fillStyle = FAINT;
      ctx.font = font('400', 7);
      ctx.fillText(d.facts[k].label, px(factsX), px(fy + 7));
      ctx.fillStyle = d.facts[k].value === '[REDACTED]' ? FAINT : INK;
      var vFit = fitLines(ctx, d.facts[k].value, px(factsW), 12, '400', 8, 1);
      ctx.font = font('400', vFit.size);
      ctx.fillText(d.facts[k].value, px(factsX), px(fy + 10 + 13));
      fy += 10 + 17 + 7;
    }

    y += bodyH;

    // the chosen line
    ctx.fillStyle = d.lyric === '[REDACTED]' ? FAINT : DIM;
    ctx.font = font('400', 12);
    for (var b = 0; b < lyricFit.length; b++) {
      centred(ctx, lyricFit[b], cx, px(y + 4 + 13 + b * 18));
    }
    y += lyricH;

    // the number
    y += 14;
    ctx.fillStyle = d.blank ? DIM : INK;
    var dFit = fitLines(ctx, d.designation, px(inner), 44, '700', 24, 1);
    ctx.font = font('700', dFit.size);
    centred(ctx, d.designation, cx, px(y + 38));
    y += 44 + 10;

    // place
    ctx.strokeStyle = LINE;
    ctx.lineWidth = Math.max(1, px(1));
    ctx.beginPath();
    ctx.moveTo(0, px(y)); ctx.lineTo(canvas.width, px(y)); ctx.stroke();
    y += 12;
    ctx.fillStyle = DIM;
    ctx.font = font('400', 9);
    var vFit2 = fitLines(ctx, d.venue, px(inner), 9, '400', 6, 1);
    ctx.font = font('400', vFit2.size);
    centred(ctx, d.venue, cx, px(y + 10));
    ctx.fillStyle = FAINT;
    ctx.font = font('400', 9);
    centred(ctx, d.when, cx, px(y + 25));
    y += 30;

    // the city
    drawMark(ctx, cx, px(y + 14 + 40), px(80), d.bishop,
             WALL, d.bandito ? GOLD : (d.blank ? DIM : INK));
    y += markH;

    // bottom strip
    ctx.fillStyle = BLACK;
    ctx.fillRect(0, px(y), canvas.width, canvas.height - px(y));
    ctx.fillStyle = LINE;
    ctx.fillRect(0, px(y), canvas.width, Math.max(1, px(1)));
    ctx.fillStyle = '#a9a396';
    ctx.font = font('400', 8);
    ctx.textAlign = 'left';
    ctx.fillText(d.standing, px(11), px(y + 15.5));
    ctx.textAlign = 'right';
    ctx.fillStyle = edge;
    ctx.font = font('700', 8);
    ctx.fillText(d.faction, canvas.width - px(11), px(y + 15.5));

    return canvas;
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    if ('download' in a) {
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      return 'downloaded';
    }
    window.open(url, '_blank');
    return 'opened';
  }

  window.FPECard = {
    render: function (card) {
      readTheme();
      var d = readCard(card);
      return loadImage(d.photoSrc).then(function (photo) { return draw(d, photo); });
    },
    save: function (card, filename) {
      return window.FPECard.render(card)
        .then(function (c) { return new Promise(function (r) { c.toBlob(r, 'image/png'); }); })
        .then(function (blob) {
          if (!blob) throw new Error('render failed');
          var file = new File([blob], filename, { type: 'image/png' });
          // Best on a phone: the native share sheet, straight into Instagram
          // or Messages. Falls back to a download, then to opening the image.
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            return navigator.share({ files: [file] })
              .then(function () { return 'shared'; })
              .catch(function (e) {
                if (e && e.name === 'AbortError') return 'cancelled';
                return download(blob, filename);
              });
          }
          return download(blob, filename);
        });
    },
  };
})();
