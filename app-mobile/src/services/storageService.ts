import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

/**
 * Upload a local image to Supabase Storage.
 * 上传本地图片到 Supabase Storage
 *
 * @param bucket - Storage bucket name. 存储桶名称
 * @param uri - Local file URI (used as fallback). 本地文件 URI
 * @param fileName - Target path in bucket. 目标文件名
 * @param base64 - Base64 encoded file content (preferred for RN). Base64 编码内容
 * @returns Public URL of uploaded file. 上传后的公开 URL
 */
export async function uploadFile(
  bucket: string,
  uri: string,
  fileName: string,
  base64?: string,
): Promise<string> {
  try {
    let uploadData: ArrayBuffer | FormData;
    let contentType = 'image/jpeg';

    if (base64) {
      // base64 → ArrayBuffer，最可靠的 RN 上传方式
      uploadData = decode(base64);
    } else {
      // fallback: fetch URI
      const response = await fetch(uri);
      uploadData = await response.arrayBuffer();
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, uploadData, {
        contentType,
        upsert: false,
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
