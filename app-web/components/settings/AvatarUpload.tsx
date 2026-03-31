'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onUploadSuccess: (url: string) => void;
}

export default function AvatarUpload({ currentAvatarUrl, onUploadSuccess }: AvatarUploadProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

      await supabase.storage.createBucket('avatars', { public: true });

      const blob = await new Promise<Blob>((resolve) => {
        canvasRef.current!.toBlob((b) => resolve(b!), 'image/jpeg', 0.9);
      });

      const fileName = `avatar-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: authError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      if (authError) throw authError;

      const currentUser = await getCurrentUser();
      if (currentUser?.id) {
        await (supabase as any).from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id);
      }

      setLocalAvatarUrl(publicUrl);
      onUploadSuccess(publicUrl);
      window.dispatchEvent(new Event('avatar-updated'));

      setIsModalOpen(false);
      setPreviewUrl(null);
      setSelectedFile(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('common.unknown');
      showToast(t('settings.avatarUploadFailed', { message }), 'error');
    } finally {
      setUploading(false);
    }
  };

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
        ctx?.beginPath();
        ctx?.arc(200, 200, 200, 0, Math.PI * 2);
        ctx?.clip();
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
      <div className="relative rounded-full bg-gradient-to-tr from-amber-300 via-violet-400 to-violet-500 p-[3px] shadow-[0_24px_50px_rgba(139,123,255,0.22)]">
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-black bg-[#0a0d12]">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt={t('settings.avatarAlt')}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="text-amber-200">
              <Camera size={40} />
            </div>
          )}
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          aria-label={t('settings.avatarEdit')}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full border border-amber-300/30 bg-black/55 opacity-0 transition-all duration-300 group-hover:opacity-100"
        >
          <Camera size={20} className="text-white" />
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white">{t('settings.avatarEdit')}</span>
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="dashboard-panel-strong w-full max-w-sm rounded-[32px] p-8">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-wide text-white">{t('settings.avatarTitle')}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label={t('common.close')}
                className="text-gray-400 transition-colors hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative mb-8 flex aspect-square w-full items-center justify-center overflow-hidden rounded-[28px] border border-white/6 bg-black/30">
              <canvas
                ref={canvasRef}
                className="h-auto max-w-full cursor-crosshair rounded-full shadow-[0_0_40px_rgba(139,123,255,0.2)]"
              />
              <div className="absolute inset-0 pointer-events-none rounded-full ring-1 ring-white/10" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-gray-400 transition-all hover:bg-white/5"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-400 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-[#120d05] transition-all hover:brightness-105 disabled:opacity-50"
              >
                {uploading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/25 border-t-black" />
                ) : (
                  <Check size={18} />
                )}
                {t('common.done')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
