import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const storageService = {
  /**
   * Generic file upload to Supabase Storage bucket
   * @param {string} bucketName - 'avatars' | 'service-images' | 'portfolio' | 'order-deliveries' | 'attachments'
   * @param {File} file
   * @param {string} pathPrefix
   * @returns {Promise<string>} Public URL of uploaded asset
   */
  uploadFile: async (bucketName, file, pathPrefix = 'uploads') => {
    if (isSupabaseConfigured && supabase) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${pathPrefix}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    }

    // Mock fallback: create local Object URL or return default image placeholder
    return URL.createObjectURL(file);
  },

  uploadAvatar: async (userId, file) => {
    return storageService.uploadFile('avatars', file, `user_${userId}`);
  },

  uploadServiceImage: async (serviceId, file) => {
    return storageService.uploadFile('service-images', file, `service_${serviceId}`);
  },

  uploadPortfolioImage: async (userId, file) => {
    return storageService.uploadFile('portfolio', file, `portfolio_${userId}`);
  },

  uploadOrderAttachment: async (orderId, file) => {
    return storageService.uploadFile('order-deliveries', file, `order_${orderId}`);
  },

  deleteFile: async (bucketName, filePath) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.storage.from(bucketName).remove([filePath]);
      if (error) throw error;
      return true;
    }
    return true;
  },
};

export default storageService;
