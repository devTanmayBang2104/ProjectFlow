import multer from 'multer';
import { BadRequestError } from '../utils/errors';

const storage = multer.memoryStorage();

// Validate file type (allowing standard images, documents, and archives)
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        `Unsupported file format: ${file.mimetype}. Only images (JPEG, PNG, GIF, WebP), documents (PDF, DOCX, XLSX, TXT), and ZIP archives are allowed.`
      ),
      false
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB maximum file size limit
  }
});
