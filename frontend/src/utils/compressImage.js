// Shrinks a phone-camera photo before upload. Raw camera images are often
// 5-12MB; several of them in one request can exceed the server/nginx body
// limit or Cloudinary's 10MB per-image limit, which fails the whole upload.
// Returns the original file if it is not an image, already small, or if the
// browser cannot decode it.
const SKIP_BELOW_BYTES = 500 * 1024;

const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image could not be decoded')); };
  img.src = url;
});

export const compressImage = async (file, { maxDimension = 1600, quality = 0.8 } = {}) => {
  if (!file || !String(file.type || '').startsWith('image/') || file.size <= SKIP_BELOW_BYTES) {
    return file;
  }

  try {
    const img = await loadImage(file);
    const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    // White background so transparent PNGs do not turn black as JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;

    const baseName = String(file.name || 'image').replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch (err) {
    console.warn('[compressImage] Using original file:', err?.message);
    return file;
  }
};

export default compressImage;
