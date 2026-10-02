// Renders the card to a PNG for saving or sharing.
//
// Loaded on demand, never on a plain record view -- a record page stays a
// ~2 KB no-JavaScript document. Every value and every colour is read back out
// of the rendered page, so the image cannot drift from what is on screen.
(function () {
  'use strict';

  var MONO = 'Courier, "Lucida Sans Typewriter", Lucida, monospace';

  // The CSS card is 360px wide; 3x gives a 1080px export and lets every
  // measurement below be the CSS pixel value.
  var S = 3;
  var CW = 360;
  var PAD = 16;

  var C = {};

  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    var get = function (n, f) { return (cs.getPropertyValue(n) || '').trim() || f; };
    C.paper = get('--paper', '#fff');
    C.ink = get('--ink', '#000');
    C.dim = get('--ink-dim', '#444');
    C.faint = get('--ink-faint', '#777');
    C.rule = get('--rule', '#000');
    C.red = get('--red', '#a3281f');
    C.plate = get('--plate', '#111');
  }

  function px(v) { return v * S; }
  function font(weight, size) { return weight + ' ' + px(size) + 'px ' + MONO; }
  function centred(ctx, text, cx, y) { ctx.textAlign = 'center'; ctx.fillText(text, cx, y); }

  /** Greedy word wrap at a fixed size. */
  function wrap(ctx, text, maxWidth, size, weight) {
    ctx.font = font(weight, size);
    var words = String(text).split(/\s+/);
    var lines = [];
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var next = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = words[i]; }
      else { line = next; }
    }
    if (line) lines.push(line);
    return lines;
  }

  /** Shrink to fit, breaking over two lines first where that is allowed. */
  function fit(ctx, text, maxWidth, size, weight, minSize, twoLines) {
    var s = size;
    ctx.font = font(weight, s);
    if (ctx.measureText(text).width <= maxWidth) return { lines: [text], size: s };

    if (twoLines && text.indexOf(' ') > -1) {
      var words = text.split(/\s+/);   // spaces only: splitting on '-' would eat it
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

    while (s > minSize) {
      s -= 1;
      ctx.font = font(weight, s);
      if (ctx.measureText(text).width <= maxWidth) break;
    }
    return { lines: [text], size: s };
  }

  /** Grayscale + contrast by hand: ctx.filter is unreliable on older iOS. */
  function desaturate(ctx, x, y, w, h) {
    var img = ctx.getImageData(x, y, w, h);
    var d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var g = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      g = ((g - 128) * 1.4 + 128) * 1.02;
      d[i] = d[i + 1] = d[i + 2] = g < 0 ? 0 : g > 255 ? 255 : g;
    }
    ctx.putImageData(img, x, y);
  }

  /** The city seal, matching glyph.js: nine sections, the bishop's one lit. */
  function seal(ctx, cx, cy, size, bishopIdx) {
    var R1 = size * 0.44, R0 = size * 0.25, RI = size * 0.19;
    var step = (Math.PI * 2) / 9;
    var gap = step * 0.1;
    var origin = -Math.PI / 2 - step / 2;

    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(cx, cy, RI, 0, Math.PI * 2);
    ctx.strokeStyle = C.red;
    ctx.lineWidth = Math.max(1, size * 0.04);
    ctx.stroke();
    ctx.restore();

    for (var i = 0; i < 9; i++) {
      var a0 = i * step + origin + gap / 2;
      var a1 = (i + 1) * step + origin - gap / 2;
      ctx.save();
      ctx.globalAlpha = i === bishopIdx ? 1 : 0.32;
      ctx.beginPath();
      ctx.arc(cx, cy, R1, a0, a1);
      ctx.arc(cx, cy, R0, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = C.red;
      ctx.fill();
      ctx.restore();
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
      letterhead: t('.card__letterhead'),
      chargeTop: charge[0] ? charge[0].textContent.trim() : '',
      chargeMain: t('.card__charge b'),
      chargeBy: charge[1] ? charge[1].textContent.trim() : '',
      statute: [
        statute[0] ? statute[0].textContent.trim() : '',
        statute[1] ? statute[1].textContent.trim() : '',
      ],
      name: t('.fact--name dd'),
      facts: list,
      lyric: t('.card__lyric'),
      designation: t('.card__designation'),
      venue: t('.card__place b'),
      when: t('.card__place span'),
      benediction: t('.card__foot'),
      photoSrc: photo ? photo.src : null,
      bandito: card.classList.contains('card--bandito'),
      blank: card.classList.contains('card--blank'),
      bishop: parseInt(card.getAttribute('data-bishop') || '0', 10),
    };
  }

  function draw(d, photo) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var inner = CW - PAD * 2;
    var plateW = inner * 0.38;
    var plateH = plateW * 1.25;
    var factsX = PAD + plateW + 14;
    var factsW = inner - plateW - 14;

    // Measure the wrapping blocks; they decide the card's height.
    canvas.width = px(CW); canvas.height = px(1400);
    ctx = canvas.getContext('2d');
    var headLines = wrap(ctx, d.letterhead, px(inner), 8, '400');
    var nameFit = fit(ctx, d.name, px(factsW), 15, '700', 9, true);
    var lyricLines = wrap(ctx, d.lyric, px(inner - 8), 12, '400');

    // Each field is a value on a dotted rule with its label beneath.
    var factsH = nameFit.lines.length * 19 + 4 + 8 + 10;
    for (var i = 0; i < d.facts.length; i++) factsH += 17 + 4 + 8 + 10;
    var bodyH = Math.max(plateH, factsH - 10);

    var H = 18                                  // top padding
      + headLines.length * 13 + 2               // letterhead
      + 6 + 42 + 12                             // seal
      + 12 + 3 + 18 + 3 + 12                    // charge
      + 10 + 24                                 // statute
      + 16 + bodyH + 14                         // body
      + (d.lyric ? lyricLines.length * 18 : 0)  // lyric, when there is one
      + 10 + 42                                 // designation
      + 14 + 12 + 15 + 15                       // place
      + 16 + 12 + 12                            // benediction
      + 16;                                     // bottom padding

    canvas.width = Math.round(px(CW));
    canvas.height = Math.round(px(H));
    ctx = canvas.getContext('2d');

    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = Math.max(2, px(1));
    ctx.strokeRect(px(0.5), px(0.5), canvas.width - px(1), canvas.height - px(1));

    var cx = canvas.width / 2;
    var y = 18;

    // letterhead
    ctx.fillStyle = C.red;
    ctx.font = font('400', 8);
    for (var h = 0; h < headLines.length; h++) centred(ctx, headLines[h], cx, px(y + 9 + h * 13));
    y += headLines.length * 13 + 2 + 6;

    // seal
    seal(ctx, cx, px(y + 21), px(42), d.bishop);
    y += 42 + 12;

    // the charge
    ctx.fillStyle = C.dim;
    ctx.font = font('400', 8);
    centred(ctx, d.chargeTop, cx, px(y + 9));
    y += 12 + 3;
    ctx.fillStyle = d.blank ? C.dim : C.ink;
    var mainFit = fit(ctx, d.chargeMain, px(inner), 13, '700', 8, false);
    ctx.font = font('700', mainFit.size);
    centred(ctx, d.chargeMain, cx, px(y + 14));
    y += 18 + 3;
    ctx.fillStyle = C.dim;
    ctx.font = font('400', 8);
    centred(ctx, d.chargeBy, cx, px(y + 9));
    y += 12 + 10;

    ctx.fillStyle = C.faint;
    ctx.font = font('400', 8);
    centred(ctx, d.statute[0], cx, px(y + 9));
    centred(ctx, d.statute[1], cx, px(y + 21));
    y += 24 + 16;

    // photo well
    var plx = px(PAD), ply = px(y), plw = px(plateW), plh = px(plateH);
    ctx.fillStyle = C.plate;
    ctx.fillRect(plx, ply, plw, plh);

    if (photo) {
      var side = Math.min(photo.naturalWidth, photo.naturalHeight);
      var sx = (photo.naturalWidth - side) / 2;
      var sy = (photo.naturalHeight - side) / 2;
      var srcW = side * 0.8;   // cover a 4:5 well from a square source
      ctx.drawImage(photo, sx + (side - srcW) / 2, sy, srcW, side, plx, ply, plw, plh);
      desaturate(ctx, Math.round(plx), Math.round(ply), Math.round(plw), Math.round(plh));
    } else {
      ctx.fillStyle = '#2d2a23';
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
      ctx.fillStyle = '#4e4a3f';
      ctx.font = font('400', 7);
      centred(ctx, 'NO IMAGE ON FILE', hc, ply + plh - px(5));
    }

    // facts: written on the line, label printed beneath
    var fy = y;
    ctx.textAlign = 'left';

    function rule(atY) {
      ctx.save();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = Math.max(1, px(1));
      ctx.setLineDash([px(1.5), px(2)]);
      ctx.beginPath();
      ctx.moveTo(px(factsX), px(atY));
      ctx.lineTo(px(factsX + factsW), px(atY));
      ctx.stroke();
      ctx.restore();
    }

    function label(text, atY) {
      ctx.fillStyle = C.ink;
      ctx.font = font('400', 7);
      ctx.fillText(text, px(factsX), px(atY + 7));
    }

    ctx.fillStyle = d.blank ? C.faint : C.red;
    ctx.font = font('700', nameFit.size);
    for (var n = 0; n < nameFit.lines.length; n++) {
      ctx.fillText(nameFit.lines[n], px(factsX + 1), px(fy + 14 + n * 19));
    }
    fy += nameFit.lines.length * 19 + 4;
    rule(fy);
    label('NAME', fy + 3);
    fy += 8 + 10;

    for (var k = 0; k < d.facts.length; k++) {
      var isId = d.facts[k].label === 'CITIZEN ID';
      ctx.fillStyle = isId ? C.red : (d.facts[k].value === '[REDACTED]' ? C.faint : C.ink);
      var vFit = fit(ctx, d.facts[k].value, px(factsW), 13, '400', 8, false);
      ctx.font = font(isId ? '700' : '400', vFit.size);
      ctx.fillText(d.facts[k].value, px(factsX + 1), px(fy + 13));
      fy += 17 + 4;
      rule(fy);
      label(d.facts[k].label, fy + 3);
      fy += 8 + 10;
    }
    y += bodyH + 14;

    // the chosen line, if there is one
    if (d.lyric) {
      ctx.fillStyle = C.dim;
      ctx.font = font('400', 12);
      for (var b = 0; b < lyricLines.length; b++) centred(ctx, lyricLines[b], cx, px(y + 13 + b * 18));
      y += lyricLines.length * 18;
    }
    y += 10;

    // the designation
    ctx.fillStyle = d.blank ? C.dim : C.ink;
    var dFit = fit(ctx, d.designation, px(inner), 42, '700', 24, false);
    ctx.font = font('700', dFit.size);
    centred(ctx, d.designation, cx, px(y + 36));
    y += 42 + 14;

    // place
    ctx.strokeStyle = C.rule;
    ctx.lineWidth = Math.max(1, px(1));
    ctx.beginPath(); ctx.moveTo(px(PAD), px(y)); ctx.lineTo(canvas.width - px(PAD), px(y)); ctx.stroke();
    y += 12;
    ctx.fillStyle = C.dim;
    ctx.font = font('400', 9);
    var vFit2 = fit(ctx, d.venue, px(inner), 9, '400', 6, false);
    ctx.font = font('400', vFit2.size);
    centred(ctx, d.venue, cx, px(y + 10));
    ctx.fillStyle = C.faint;
    ctx.font = font('400', 9);
    centred(ctx, d.when, cx, px(y + 25));
    y += 30 + 16;

    // benediction
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = Math.max(1, px(1));
    ctx.beginPath(); ctx.moveTo(px(PAD), px(y)); ctx.lineTo(canvas.width - px(PAD), px(y)); ctx.stroke();
    y += 12;
    ctx.fillStyle = C.red;
    ctx.font = font('400', 7);
    var benFit = fit(ctx, d.benediction, px(inner), 7, '400', 5, false);
    ctx.font = font('400', benFit.size);
    centred(ctx, d.benediction, cx, px(y + 7));

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
