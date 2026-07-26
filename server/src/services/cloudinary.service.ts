import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { BadRequestError } from '../utils/errors';

const isCloudinaryConfigured = (): boolean => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name_here' &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key_here' &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_API_SECRET !== 'your_cloudinary_api_secret_here'
  );
};

// Configure Cloudinary if keys exist
if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export class UploadService {
  /**
   * Uploads a file to Cloudinary, or falls back to local disk storage in development
   * if Cloudinary credentials are not configured.
   * 
   * @param file Express.Multer.File object
   * @param folder Target folder/prefix (e.g., 'avatars', 'attachments')
   * @param options Transformation options
   */
  public static async uploadFile(
    file: Express.Multer.File, 
    folder: string,
    options?: { cropSquare?: boolean }
  ): Promise<{ url: string; publicId: string }> {
    // 1. Cloudinary upload path
    if (isCloudinaryConfigured()) {
      return new Promise((resolve, reject) => {
        const uploadOptions: any = { folder: `project-management/${folder}` };
        if (options?.cropSquare) {
          uploadOptions.transformation = [
            { width: 256, height: 256, crop: 'fill', gravity: 'center' }
          ];
        }
        
        const stream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('[Cloudinary Error] Failed to upload:', error);
              reject(new Error('Cloudinary upload failed.'));
            } else {
              resolve({
                url: result!.secure_url,
                publicId: result!.public_id,
              });
            }
          }
        );
        stream.end(file.buffer);
      });
    }

    // 2. Local fallback storage path
    console.log(`[Upload] Cloudinary not configured. Storing file "${file.originalname}" locally.`);
    
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExt = path.extname(file.originalname);
    const filename = `${folder}-${uniqueSuffix}${fileExt}`;
    const destPath = path.join(uploadsDir, filename);

    fs.writeFileSync(destPath, file.buffer);

    const serverUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const localUrl = `${serverUrl}/uploads/${filename}`;

    return {
      url: localUrl,
      publicId: `local-${filename}`,
    };
  }

  /**
   * Decodes a base64 encoded image string, performs size/type validation, 
   * and uploads it to either Cloudinary or local disk storage.
   */
  public static async uploadBase64(base64String: string, folder: string): Promise<{ url: string; publicId: string }> {
    if (!base64String.startsWith('data:image/')) {
      throw new BadRequestError('Invalid image data format.');
    }

    const parts = base64String.split(';base64,');
    if (parts.length !== 2) {
      throw new BadRequestError('Invalid base64 image encoding.');
    }

    const mime = parts[0].split(':')[1];
    const extension = mime.split('/')[1] || 'png';
    
    // Validate image format
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!allowedTypes.includes(mime)) {
      throw new BadRequestError('Only PNG, JPG, JPEG, and GIF images are allowed.');
    }

    const buffer = Buffer.from(parts[1], 'base64');
    
    // Validate size (2MB limit)
    if (buffer.length > 2 * 1024 * 1024) {
      throw new BadRequestError('Uploaded image size cannot exceed 2 MB.');
    }

    const mockFile: Express.Multer.File = {
      buffer,
      originalname: `logo-${Date.now()}.${extension}`,
      fieldname: 'logo',
      encoding: '7bit',
      mimetype: mime,
      size: buffer.length,
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };

    return this.uploadFile(mockFile, folder, { cropSquare: folder === 'workspaces' });
  }

  /**
   * Deletes a file from Cloudinary, or deletes it from local disk if it was a fallback file.
   */
  public static async deleteFile(publicId: string): Promise<void> {
    if (!publicId) return;

    if (publicId.startsWith('local-')) {
      const filename = publicId.replace('local-', '');
      const filePath = path.join(__dirname, '../../uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Upload] Deleted local fallback file: ${filename}`);
      }
      return;
    }

    if (isCloudinaryConfigured()) {
      await cloudinary.uploader.destroy(publicId).catch((err) => {
        console.error('[Cloudinary Error] Failed to destroy resource:', err);
      });
    }
  }
}
