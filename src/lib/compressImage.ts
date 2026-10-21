/**
 * Shrink a camera photo before upload: longest side ≤ `maxSide`, re-encoded as JPEG. Phone photos are
 * often 3–12 MB; this keeps them well under the upload limit and quick to send on mobile data.
 * Returns the original file (renamed) when it is already small or the browser can't re-encode it.
 */
export async function compressPhoto(file: File, baseName: string, maxSide = 2560, quality = 0.85): Promise<File> {
  // The extension always matches the type actually uploaded.
  const originalExt = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : file.type.split('/')[1] || 'jpg';
  const renamed = () => new File([file], `${baseName}.${originalExt}`, { type: file.type, lastModified: Date.now() });
  if (!file.type.startsWith('image/') || typeof createImageBitmap !== 'function') return renamed();
  try {
    // createImageBitmap applies the photo's EXIF orientation, so portrait shots stay upright.
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return renamed();
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    // Keep the original when re-encoding doesn't help (e.g. an already small JPEG).
    if (!blob || blob.size >= file.size) return renamed();
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return renamed();
  }
}
