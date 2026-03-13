import { supabase } from './supabase';

/**
 * Upload a file (blob) to a specified bucket in Supabase Storage.
 * 
 * @param bucket - The name of the Supabase Storage bucket.
 * @param uri - The local URI of the file to upload.
 * @param fileName - The desired path/filename in the bucket.
 * @returns The public URL of the uploaded file.
 */
export async function uploadFile(bucket: string, uri: string, fileName: string): Promise<string> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Explicitly set content type to image/jpeg as most photos from mobile are JPEGs
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, { 
        contentType: 'image/jpeg',
        upsert: false 
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    if (!urlData.publicUrl) {
      throw new Error('Failed to retrieve public URL');
    }

    return urlData.publicUrl;
  } catch (error: any) {
    console.error(`Error in uploadFile for bucket ${bucket}:`, error);
    throw error;
  }
}
