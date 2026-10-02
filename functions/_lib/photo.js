export const MAX_PHOTO_BYTES = 400 * 1024;

/**
 * Strip every metadata segment from a JPEG, keeping only what a decoder
 * needs.
 *
 * The browser already re-encodes the photo through a canvas, which cannot
 * carry GPS or camera fields across -- but the encoders on Apple platforms
 * write their own APP1/Exif and APP13/Photoshop blocks into the output. None
 * of it is user data, and none of it has any business being published, so it
 * goes. APP0/JFIF is kept because some decoders expect it.
 *
 * Returns null if the structure is not a JPEG we recognise.
 */
export function stripMetadata(buf) {
  const b = new Uint8Array(buf);
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;

  const keep = [b.subarray(0, 2)];           // SOI
  let i = 2;

  while (i < b.length - 1) {
    if (b[i] !== 0xff) return null;          // desynchronised: refuse it
    const marker = b[i + 1];

    // Standalone markers carry no payload.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      keep.push(b.subarray(i, i + 2));
      i += 2;
      continue;
    }

    // Start of scan: entropy-coded data runs to the end of the file.
    if (marker === 0xda) {
      keep.push(b.subarray(i));
      i = b.length;
      break;
    }

    if (i + 4 > b.length) return null;
    const length = (b[i + 2] << 8) | b[i + 3];
    if (length < 2 || i + 2 + length > b.length) return null;

    const isAppSegment = marker >= 0xe1 && marker <= 0xef;   // APP1..APP15
    const isComment = marker === 0xfe;
    if (!isAppSegment && !isComment) keep.push(b.subarray(i, i + 2 + length));

    i += 2 + length;
  }

  const total = keep.reduce((n, part) => n + part.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of keep) { out.set(part, at); at += part.length; }
  return out;
}

/**
 * The client always sends a canvas-encoded JPEG. Verifying the magic bytes
 * means a hand-rolled request cannot park arbitrary content in the bucket
 * under an image content-type.
 */
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
    httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000, immutable' },
  });
  return `${id}.jpg`;
}
