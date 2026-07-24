import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

const isCloudinaryConfigured = (): boolean => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
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
   */
  public static async uploadFile(file: Express.Multer.File, folder: string): Promise<{ url: string; publicId: string }> {
    // 1. Cloudinary upload path
    if (isCloudinaryConfigured()) {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: `project-management/${folder}` },
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
