export const MAX_PHOTO_BYTES = 400 * 1024;

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
  return { bytes: buf };
}

export async function putPhoto(bucket, id, bytes) {
  await bucket.put(`${id}.jpg`, bytes, {
    httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000, immutable' },
  });
  return `${id}.jpg`;
}
