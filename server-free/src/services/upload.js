const cloudinary = require('cloudinary').v2;
const config = require('../config');

let cloudinaryAvailable = false;

function initCloudinary() {
  if (!config.upload.cloudinaryUrl) return false;
  try {
    cloudinary.config({ url: config.upload.cloudinaryUrl });
    cloudinaryAvailable = true;
    console.log('[Upload] Cloudinary 已配置');
    return true;
  } catch (e) {
    console.warn('[Upload] Cloudinary 配置失败:', e.message);
    return false;
  }
}

async function uploadToCloudinary(filePath, folder) {
  if (!cloudinaryAvailable) return null;
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder || 'campus-lost-found',
      transformation: [{ width: 800, crop: 'limit' }, { quality: 'auto' }],
      format: 'jpg'
    });
    return result.secure_url;
  } catch (e) {
    console.error('[Upload] Cloudinary 上传失败:', e.message);
    return null;
  }
}

async function uploadBufferToCloudinary(buffer, folder) {
  if (!cloudinaryAvailable) return null;
  return new Promise((resolve) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folder || 'campus-lost-found', transformation: [{ width: 800, crop: 'limit' }, { quality: 'auto' }], format: 'jpg' },
      (error, result) => {
        if (error) {
          console.error('[Upload] Cloudinary 上传失败:', error.message);
          resolve(null);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    stream.end(buffer);
  });
}

function isCloudinaryUrl(url) {
  return url && url.indexOf('res.cloudinary.com') !== -1;
}

function isAvailable() {
  return cloudinaryAvailable;
}

module.exports = { initCloudinary, uploadToCloudinary, uploadBufferToCloudinary, isCloudinaryUrl, isAvailable };