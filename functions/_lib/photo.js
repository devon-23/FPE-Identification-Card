const MAX_PHOTO_BYTES = 400 * 1024;
function stripMetadata(buf) {

  // this throws away everything that is not needed to decode the thing
  // exif my op
  const b = new Uint8Array(buf);
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;

  const keep = [b.subarray(0, 2)];
  let i = 2;

  while (i < b.length - 1) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      keep.push(b.subarray(i, i + 2));
      i += 2;
      continue;
    }

    if (marker === 0xda) {
      keep.push(b.subarray(i));
      i = b.length;
      break;
    }

    if (i + 4 > b.length) return null;

    const length = (b[i + 2] << 8) | b[i + 3];

    if (length < 2 || i + 2 + length > b.length) return null;

    const isAppSegment = marker >= 0xe1 && marker <= 0xef;
    const isComment = marker === 0xfe;

    if (!isAppSegment && !isComment) keep.push(b.subarray(i, i + 2 + length));

    i += 2 + length;
  }

  const total = keep.reduce((n, part) => n + part.length, 0);
  const out = new Uint8Array(total);
  let at = 0;

  for (const part of keep) { 
    out.set(part, at); at += part.length; 
  }

  return out;
}
export async function readJpeg(file) {
  if (!file || typeof file.arrayBuffer !== 'function') return { error: 'NO FILE' };
  if (file.size > MAX_PHOTO_BYTES) return { error: 'IMAGE TOO LARGE' };

  const buf = await file.arrayBuffer();
  const b = new Uint8Array(buf);

  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8 || b[2] !== 0xff) {
    return { error: 'UNREADABLE IMAGE' };
  }

  const cleaned = stripMetadata(buf);

  if (!cleaned) return { error: 'UNREADABLE IMAGE' };
  return { bytes: cleaned };
}

export async function putPhoto(bucket, id, bytes) {
  await bucket.put(`${id}.jpg`, bytes, {
    httpMetadata: { 
      contentType: 'image/jpeg', 
      cacheControl: 'public, max-age=31536000, immutable' 
    },
  });
  
  return `${id}.jpg`;
}
