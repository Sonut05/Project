import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { ValidationError } from '../utils/errors.js';
import { config } from '../config/env.js';

const uploadDir = path.resolve(process.cwd(), config.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const rawExt = path.extname(file.originalname).toLowerCase();
    const ext = allowedExts.includes(rawExt) ? rawExt : '.jpg';
    const secureId = crypto.randomUUID();
    cb(null, `item-${secureId}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname || '').toLowerCase();

  if (!allowedExts.includes(ext)) {
    return cb(new ValidationError('Invalid file extension. Only .jpg, .jpeg, .png, .webp, and .gif files are allowed.'));
  }

  if (allowedMime.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.'));
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter
});

export function safeUploadMiddleware(req, res, next) {
  const upload = uploadMiddleware.single('image');
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: {
              code: 'UPLOAD_TOO_LARGE',
              message: 'Image must be 5 MB or smaller.'
            }
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            error: {
              code: 'UPLOAD_UNEXPECTED_FILE',
              message: 'Unexpected field in upload. Field name must be "image".'
            }
          });
        }
        return res.status(400).json({
          error: {
            code: 'UPLOAD_ERROR',
            message: 'Failed to upload file.'
          }
        });
      }
      if (err instanceof ValidationError || err.statusCode === 400) {
        return res.status(400).json({
          error: {
            code: 'INVALID_FILE_TYPE',
            message: err.message
          }
        });
      }
      return next(err);
    }
    next();
  });
}

export function verifyImageSignature(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) return false;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytesRead >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4E &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0D &&
      buffer[5] === 0x0A &&
      buffer[6] === 0x1A &&
      buffer[7] === 0x0A
    ) {
      return 'png';
    }

    // GIF: GIF87a or GIF89a
    if (
      bytesRead >= 6 &&
      buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 &&
      buffer[3] === 0x38 && (buffer[4] === 0x37 || buffer[4] === 0x39) &&
      buffer[5] === 0x61
    ) {
      return 'gif';
    }

    // WEBP: RIFF....WEBP
    if (
      bytesRead >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
      return 'webp';
    }

    return false;
  } catch {
    return false;
  }
}

export function handleUpload(req, res, next) {
  try {
    if (!req.file) {
      throw new ValidationError('No file was uploaded.');
    }

    const detectedFormat = verifyImageSignature(req.file.path);
    if (!detectedFormat) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
      return res.status(400).json({
        error: {
          code: 'INVALID_IMAGE_CONTENT',
          message: 'The uploaded file is not a valid readable image.'
        }
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(201).json({
      message: 'Image uploaded successfully',
      url: fileUrl
    });
  } catch (err) {
    next(err);
  }
}
