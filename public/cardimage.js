// Renders the card to a PNG for saving or sharing.
//
// Loaded on demand, never on a plain record view -- a record page stays a
// ~4 KB no-JavaScript document. Everything drawn here is read back out of the
// DOM, so the image cannot drift from the card on screen.
(function () {
  'use strict';

  var MONO = 'ui-monospace, "SF Mono", Menlo, "Roboto Mono", Consolas, monospace';

  // The CSS card is 328px wide; drawing at 3.3x gives a crisp 1082px export
  // and lets every measurement below be the CSS pixel value.
  var S = 3.3;
  var CW = 328;
  var GUTTER = 12;

  var INK = '#16150f';
  var STOCK = '#e9e5d9';
  var STOCK_HI = '#f3f0e7';
  var OCHRE = '#d8a52b';
  var PLATE = '#121108';
  var SOFT = '#6c685c';

  function px(v) { return v * S; }

  function font(weight, size) {
    return weight + ' ' + px(size) + 'px ' + MONO;
  }

  /**
   * Fit text to a width. Sizes in and out are CSS pixels; font() applies the
   * scale. Prefers breaking a long name over two lines to shrinking it away.
   */
  function fitLines(ctx, text, maxWidth, size, weight, minSize, allowTwo) {
    var s = size;
    ctx.font = font(weight, s);
    if (ctx.measureText(text).width <= maxWidth) return { lines: [text], size: s };

    if (allowTwo && text.indexOf(' ') > -1) {
      var words = text.split(' ');
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

  function centred(ctx, text, cx, y) {
    ctx.textAlign = 'center';
    ctx.fillText(text, cx, y);
  }

  /** Grayscale + contrast done by hand: ctx.filter is unreliable on older iOS. */
  function desaturate(ctx, x, y, w, h) {
    var img = ctx.getImageData(x, y, w, h);
    var d = img.data;
    var contrast = 1.35, brightness = 0.92;
    for (var i = 0; i < d.length; i += 4) {
      var g = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      g = ((g - 128) * contrast + 128) * brightness;
      g = g < 0 ? 0 : g > 255 ? 255 : g;
      d[i] = d[i + 1] = d[i + 2] = g;
    }
    ctx.putImageData(img, x, y);
  }

  function loadImage(src) {
    return new Promise(function (resolve) {
      if (!src) return resolve(null);
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      // Same-origin or a data URL either way, so the canvas stays untainted.
      img.src = src;
    });
  }

  /** Read the rendered card rather than re-deriving it. */
  function readCard(card) {
    var text = function (sel) {
      var el = card.querySelector(sel);
      return el ? el.textContent.trim() : '';
    };
    var strip = card.querySelectorAll('.card__strip--bottom span');
    var meta = card.querySelectorAll('.card__meta span');
    var photo = card.querySelector('.card__photo');
    return {
      bureau: text('.card__strip--top span'),
      formcode: card.querySelectorAll('.card__strip--top span')[1].textContent.trim(),
      name: text('.card__name'),
      pillLabel: text('.card__pill span'),
      pill: text('.card__pill').replace(text('.card__pill span'), '').trim(),
      designation: text('.card__designation'),
      sector: meta[0] ? meta[0].textContent.trim() : '',
      attempt: meta[1] ? meta[1].textContent.trim() : '',
      faction: text('.card__faction'),
      line1: strip[0] ? strip[0].textContent.trim() : '',
      line2: strip[1] ? strip[1].textContent.trim() : '',
      photoSrc: photo ? photo.src : null,
      bandito: card.classList.contains('card--bandito'),
    };
  }

  function draw(d, photo) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var plateSize = CW - GUTTER * 2 - 10;      // frame border 2 + padding 3, both sides
    var accent = d.bandito ? OCHRE : SOFT;

    // --- measure the name first; it decides the card's height -------------
    canvas.width = px(CW); canvas.height = px(600);
    ctx.font = font('700', 24);
    var nameFit = fitLines(ctx, d.name, px(CW - 28), 24, '700', 11, true);

    var topH = 23;
    var nameBlock = 12 + nameFit.lines.length * (nameFit.size * 1.08) + 6;
    var pillH = 19 + 12;
    var frameH = plateSize + 10;
    var metaH = 8 + 13 + 12;
    var botH = 38;
    var cardH = topH + nameBlock + pillH + frameH + metaH + botH;

    canvas.width = Math.round(px(CW));
    canvas.height = Math.round(px(cardH));
    ctx = canvas.getContext('2d');
    ctx.textBaseline = 'alphabetic';

    var cx = canvas.width / 2;
    var y = 0;

    // --- card stock --------------------------------------------------------
    ctx.fillStyle = STOCK;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- top strip ---------------------------------------------------------
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, canvas.width, px(topH));
    ctx.fillStyle = STOCK;
    ctx.font = font('400', 9);
    ctx.textAlign = 'left';
    ctx.fillText(d.bureau, px(10), px(15.5));
    ctx.textAlign = 'right';
    ctx.fillText(d.formcode, canvas.width - px(10), px(15.5));
    y = topH;

    // --- name --------------------------------------------------------------
    ctx.fillStyle = INK;
    ctx.font = font('700', nameFit.size);
    var lineH = nameFit.size * 1.08;
    for (var i = 0; i < nameFit.lines.length; i++) {
      centred(ctx, nameFit.lines[i], cx, px(y + 12 + lineH * (i + 0.82)));
    }
    y += nameBlock;

    // --- bishop pill -------------------------------------------------------
    ctx.font = font('400', 9);
    var labelW = ctx.measureText(d.pillLabel + ' ').width;
    var valueW = ctx.measureText(d.pill).width;
    var pillW = labelW + valueW + px(24);
    var pillX = cx - pillW / 2;
    ctx.fillStyle = INK;
    ctx.fillRect(pillX, px(y), pillW, px(19));
    ctx.textAlign = 'left';
    ctx.fillStyle = OCHRE;
    ctx.fillText(d.pillLabel, pillX + px(12), px(y + 13.5));
    ctx.fillStyle = STOCK;
    ctx.fillText(d.pill, pillX + px(12) + labelW, px(y + 13.5));
    y += pillH;

    // --- photo frame -------------------------------------------------------
    var fx = px(GUTTER), fy = px(y);
    ctx.fillStyle = accent;
    ctx.fillRect(fx, fy, px(CW - GUTTER * 2), px(plateSize + 10));
    ctx.fillStyle = PLATE;
    ctx.fillRect(fx + px(2), fy + px(2), px(CW - GUTTER * 2 - 4), px(plateSize + 6));

    var pxx = fx + px(5), pyy = fy + px(5), pss = px(plateSize);
    ctx.fillStyle = PLATE;
    ctx.fillRect(pxx, pyy, pss, pss);

    if (photo) {
      var side = Math.min(photo.naturalWidth, photo.naturalHeight);
      ctx.drawImage(photo,
        (photo.naturalWidth - side) / 2, (photo.naturalHeight - side) / 2, side, side,
        pxx, pyy, pss, pss);
      desaturate(ctx, Math.round(pxx), Math.round(pyy), Math.round(pss), Math.round(pss));
    } else {
      ctx.fillStyle = '#302d20';
      var hr = pss * 0.075;
      ctx.beginPath();
      ctx.arc(pxx + pss / 2, pyy + pss * 0.235, hr, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(pxx + pss * 0.33, pyy + pss * 0.58);
      ctx.arc(pxx + pss / 2, pyy + pss * 0.455, pss * 0.17, Math.PI, 0);
      ctx.lineTo(pxx + pss * 0.67, pyy + pss * 0.58);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4a4634';
      ctx.font = font('400', 9);
      centred(ctx, 'NO IMAGE ON FILE', pxx + pss / 2, pyy + pss * 0.66);
    }

    // scrim under the designation
    var grad = ctx.createLinearGradient(0, pyy + pss * 0.48, 0, pyy + pss);
    grad.addColorStop(0, 'rgba(10,9,4,0)');
    grad.addColorStop(0.65, 'rgba(10,9,4,0.94)');
    grad.addColorStop(1, 'rgba(10,9,4,0.94)');
    ctx.fillStyle = grad;
    ctx.fillRect(pxx, pyy + pss * 0.48, pss, pss * 0.52);

    ctx.fillStyle = d.bandito ? OCHRE : STOCK_HI;
    var dFit = fitLines(ctx, d.designation, pss * 0.88, 38, '700', 20, false);
    ctx.font = font('700', dFit.size);
    centred(ctx, d.designation, pxx + pss / 2, pyy + pss - px(6));
    y += frameH;

    // --- meta row ----------------------------------------------------------
    ctx.font = font('400', 9);
    ctx.fillStyle = SOFT;
    ctx.textAlign = 'left';
    ctx.fillText(d.sector, px(GUTTER), px(y + 16));
    ctx.textAlign = 'center';
    ctx.fillText(d.attempt, cx, px(y + 16));
    ctx.textAlign = 'right';
    ctx.fillStyle = d.bandito ? '#9a7415' : INK;
    ctx.font = font('700', 9);
    ctx.fillText(d.faction, canvas.width - px(GUTTER), px(y + 16));
    y += metaH;

    // --- bottom strip ------------------------------------------------------
    ctx.fillStyle = INK;
    ctx.fillRect(0, px(y), canvas.width, canvas.height - px(y));
    ctx.fillStyle = STOCK;
    ctx.font = font('400', 8);
    centred(ctx, d.line1, cx, px(y + 15));
    var l2 = fitLines(ctx, d.line2, canvas.width - px(16), 8, '400', 5.5, false);
    ctx.font = font('400', l2.size);
    centred(ctx, l2.lines[0], cx, px(y + 27));

    return canvas;
  }

  function toBlob(canvas) {
    return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
  }

  window.FPECard = {
    render: function (card) {
      var d = readCard(card);
      return loadImage(d.photoSrc).then(function (photo) { return draw(d, photo); });
    },
    save: function (card, filename) {
      return window.FPECard.render(card).then(toBlob).then(function (blob) {
        if (!blob) throw new Error('render failed');
        var file = new File([blob], filename, { type: 'image/png' });

        // Best on a phone: the native share sheet, straight into Instagram
        // or Messages. Falls back to a download, then to opening the image.
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          return navigator.share({ files: [file] }).then(function () { return 'shared'; })
            .catch(function (e) {
              if (e && e.name === 'AbortError') return 'cancelled';
              return download(blob, filename);
            });
        }
        return download(blob, filename);
      });
    },
  };

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
})();
