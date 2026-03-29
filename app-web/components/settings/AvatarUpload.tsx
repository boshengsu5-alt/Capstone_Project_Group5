// @ts-nocheck
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Upload, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onUploadSuccess: (url: string) => void;
}

export default function AvatarUpload({ currentAvatarUrl, onUploadSuccess }: AvatarUploadProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // 上传成功后立即显示新头像，不等父组件回调刷新
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 优先显示本地刚上传的 URL，其次是父组件传入的（用 || 而非 ?? 避免空字符串问题）
  const displayUrl = localAvatarUrl || currentAvatarUrl || null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsModalOpen(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !canvasRef.current) return;

    try {
      setUploading(true);
      
      // Ensure avatars bucket exists (Best effort)
      await supabase.storage.createBucket('avatars', { public: true });

      // Get canvas blob
      const blob = await new Promise<Blob>((resolve) => {
        canvasRef.current!.toBlob((b) => resolve(b!), 'image/jpeg', 0.9);
      });

      const fileName = `avatar-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update Auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (authError) throw authError;

      // 同步更新 profiles 表中的 avatar_url（Auth metadata 之外的数据库记录）
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.id) {
        await (supabase as any).from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id);
      }

      // 立即更新本地显示，不等父组件重新渲染
      setLocalAvatarUrl(publicUrl);
      onUploadSuccess(publicUrl);

      // Global sync
      window.dispatchEvent(new Event('avatar-updated'));

      setIsModalOpen(false);
      setPreviewUrl(null);
      setSelectedFile(null);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Draw circular preview on canvas
  useEffect(() => {
    if (previewUrl && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = previewUrl;
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        canvas.width = 400;
        canvas.height = 400;
        
        ctx?.clearRect(0, 0, 400, 400);
        
        // Draw circular clip
        ctx?.beginPath();
        ctx?.arc(200, 200, 200, 0, Math.PI * 2);
        ctx?.clip();
        
        // Draw center-cropped image
        ctx?.drawImage(
          img,
          (img.width - size) / 2, (img.height - size) / 2, size, size,
          0, 0, 400, 400
        );
      };
    }
  }, [previewUrl]);

  return (
    <div className="relative group">
      {/* Avatar Display */}
      <div className="relative p-1 rounded-full bg-gradient-to-tr from-purple-500 to-amber-400 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
        <div className="h-24 w-24 rounded-full bg-gray-900 overflow-hidden flex items-center justify-center border-2 border-gray-950">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="text-purple-300">
              <Camera size={40} />
            </div>
          )}
        </div>

        {/* Hover Overlay */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-x-0 bottom-0 top-0 rounded-full bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-1 border-2 border-purple-500/50"
        >
          <Camera size={20} className="text-white" />
          <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Edit</span>
        </button>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Cropping Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-gray-900 border border-purple-500/30 rounded-3xl p-8 max-w-sm w-full shadow-2xl shadow-purple-900/40">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white tracking-wide">Crop Profile Photo</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black/40 border border-white/5 mb-8 flex items-center justify-center">
              <canvas 
                ref={canvasRef} 
                className="max-w-full h-auto cursor-crosshair rounded-full shadow-[0_0_40px_rgba(168,85,247,0.2)]"
              />
              <div className="absolute inset-0 pointer-events-none ring-1 ring-white/10 rounded-full" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="py-3 px-4 rounded-xl border border-white/10 text-gray-400 font-bold text-sm tracking-widest hover:bg-white/5 transition-all uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="py-3 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl text-white font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check size={18} />
                )}
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
