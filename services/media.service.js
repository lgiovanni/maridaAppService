const cloudinary = require('cloudinary').v2;
const config = require('../config/config');

// Configurar Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret
});

class MediaService {
  async uploadFile(file, folder = 'general') {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder,
        resource_type: 'auto',
        quality: 'auto',
        fetch_format: 'auto'
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        type: result.resource_type
      };
    } catch (error) {
      console.error('Error al subir archivo a Cloudinary:', error);
      throw new Error('Error al procesar el archivo multimedia');
    }
  }

  async deleteFile(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Error al eliminar archivo de Cloudinary:', error);
      throw new Error('Error al eliminar el archivo multimedia');
    }
  }

  getSecureUrl(publicId, options = {}) {
    return cloudinary.url(publicId, {
      secure: true,
      ...options
    });
  }

  async generateSignature(publicId, options = {}) {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, public_id: publicId, ...options },
      config.cloudinary.apiSecret
    );
    return { timestamp, signature };
  }
}

module.exports = new MediaService();