'use client';

import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Download, ShieldCheck } from 'lucide-react';

interface QRCodeModalProps {
  asset: {
    name: string;
    qr_code: string | null;
    serial_number?: string | null;
  };
  onClose: () => void;
}

export default function QRCodeModal({ asset, onClose }: QRCodeModalProps) {
  const qrRef = useRef<HTMLCanvasElement>(null);

  const handleDownload = () => {
    if (!qrRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Design dimensions for the "Smart Label"
    // We want a vertical label: [Name] \n [QR Code] \n [ID]
    const padding = 40;
    const qrSize = 300;
    const labelWidth = qrSize + padding * 2;
    const labelHeight = 500; // Adjusted for text and QR

    canvas.width = labelWidth;
    canvas.height = labelHeight;

    // Background - Clean White for printing
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, labelWidth, labelHeight);

    // Border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, labelWidth - 10, labelHeight - 10);

    // Asset Name
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    
    // Wrap text if name is too long
    const words = asset.name.split(' ');
    let line = '';
    let y = 60;
    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = ctx.measureText(testLine);
      if (metrics.width > qrSize && n > 0) {
        ctx.fillText(line.trim(), labelWidth / 2, y);
        line = words[n] + ' ';
        y += 30;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), labelWidth / 2, y);

    // Draw QR Code
    const qrCanvas = qrRef.current;
    ctx.drawImage(qrCanvas, padding, 140, qrSize, qrSize);

    // Asset ID / QR Value
    ctx.fillStyle = '#64748b';
    ctx.font = '16px monospace';
    ctx.fillText(asset.serial_number || asset.qr_code || 'N/A', labelWidth / 2, 470);

    // Branding / Logo placeholder small
    ctx.fillStyle = '#a855f7';
    ctx.font = 'italic bold 12px sans-serif';
    ctx.fillText('UniGear IT Asset', labelWidth / 2, 490);

    // Trigger Download
    const link = document.createElement('a');
    link.download = `Label_${asset.qr_code || asset.name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-gray-900/90 border border-purple-500/30 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(139,92,246,0.3)] backdrop-blur-2xl animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Asset Smart Tag</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center text-center">
          <div className="mb-6">
            <h4 className="text-xl font-bold text-white mb-2">{asset.name}</h4>
            <p className="text-sm font-mono text-gray-400 uppercase tracking-wider bg-white/5 px-3 py-1 rounded-full border border-white/10">
              {asset.serial_number || asset.qr_code || 'N/A'}
            </p>
          </div>

          <div className="relative p-6 bg-white rounded-2xl shadow-inner group">
            {asset.qr_code ? (
              <QRCodeCanvas
                ref={qrRef}
                value={asset.qr_code}
                size={240}
                level="H"
                includeMargin={false}
                className="relative z-10"
              />
            ) : (
              <div className="w-[240px] h-[240px] flex items-center justify-center text-gray-400 italic">
                No QR Data
              </div>
            )}
            {/* Inner glow effect for QR container */}
            <div className="absolute inset-0 rounded-2xl border border-purple-500/10 pointer-events-none" />
          </div>

          <p className="mt-6 text-xs text-gray-500 italic">
            Scan with any QR reader to identify this asset in the system.
          </p>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 pt-0">
          <button
            onClick={handleDownload}
            disabled={!asset.qr_code}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold rounded-2xl shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all active:scale-[0.98] group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
            Download Smart Tag
          </button>
        </div>
      </div>
    </div>
  );
}
