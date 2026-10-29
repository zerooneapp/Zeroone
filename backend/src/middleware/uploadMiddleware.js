const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    const mimetype = String(file.mimetype || '');
    // Some Android gallery/file pickers send an empty or generic mimetype for
    // a normal photo; accept those when the file extension is a media type.
    const hasMediaExtension = /\.(jpe?g|png|webp|heic|heif|gif|mp4|mov|webm)$/i.test(file.originalname || '');
    const isGenericType = !mimetype || mimetype === 'application/octet-stream';
    if (mimetype.startsWith('image/') || mimetype.startsWith('video/') || (isGenericType && hasMediaExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'), false);
    }
  },
});

module.exports = upload;
