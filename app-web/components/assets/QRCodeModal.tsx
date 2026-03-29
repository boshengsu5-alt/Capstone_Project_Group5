'use client';

import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Download, ShieldCheck, Printer } from 'lucide-react';

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

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = 40;
    const qrSize = 300;
    const labelWidth = qrSize + padding * 2;
    const labelHeight = 500;

    canvas.width = labelWidth;
    canvas.height = labelHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, labelWidth, labelHeight);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, labelWidth - 10, labelHeight - 10);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    
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

    const qrCanvas = qrRef.current;
    ctx.drawImage(qrCanvas, padding, 140, qrSize, qrSize);

    ctx.fillStyle = '#64748b';
    ctx.font = '16px monospace';
    ctx.fillText(asset.serial_number || asset.qr_code || 'N/A', labelWidth / 2, 470);

    ctx.fillStyle = '#a855f7';
    ctx.font = 'italic bold 12px sans-serif';
    ctx.fillText('UniGear IT Asset', labelWidth / 2, 490);

    const link = document.createElement('a');
    link.download = `Label_${asset.qr_code || asset.name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Print-only Style */}
      <style jsx global>{`
        @media print {
          /* Hide everything by default */
          body * {
            visibility: hidden !important;
          }
          /* Only show the print label and its children */
          .printable-label, .printable-label * {
            visibility: visible !important;
          }
          /* Position the label at the top-left for the printer */
          .printable-label {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 50mm !important;
            height: 30mm !important;
            background: white !important;
            margin: 0 !important;
            padding: 2mm !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: space-between !important;
            border: 1px solid #000 !important;
            box-sizing: border-box !important;
          }
          /* Reset page margins for the label printer */
          @page {
            size: 50mm 30mm;
            margin: 0;
          }
        }
      `}</style>

      {/* Backdrop (Hidden on print) */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity no-print"
        onClick={onClose}
      />

      {/* Modal Container (Hidden on print) */}
      <div className="relative w-full max-w-md bg-gray-900/90 border border-purple-500/30 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(139,92,246,0.3)] backdrop-blur-2xl animate-in zoom-in-95 duration-300 no-print">
        
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

        {/* Content Section (On-screen Preview) */}
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
            <div className="absolute inset-0 rounded-2xl border border-purple-500/10 pointer-events-none" />
          </div>

          <p className="mt-6 text-xs text-gray-500 italic">
            Ready for labels? Click print to output directly to your printer.
          </p>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 pt-0 flex flex-col gap-3">
          <button
            onClick={handlePrint}
            disabled={!asset.qr_code}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Printer className="w-5 h-5" />
            Print Label (50x30mm)
          </button>
          <button
            onClick={handleDownload}
            disabled={!asset.qr_code}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-semibold rounded-2xl border border-white/10 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download PNG
          </button>
        </div>
      </div>

      {/* HIDDEN PRINTABLE LABEL - Triggered by window.print() */}
      <div className="printable-label hidden print:flex flex-row items-center gap-2 p-1 border-[0.5px] border-gray-200 print:border-none print:p-0">
        {/* Left: QR Code (Occupies most of the height) */}
        <div className="h-full flex items-center justify-center pl-1">
          {asset.qr_code && (
            <QRCodeCanvas
              value={asset.qr_code}
              size={94} // Approx 25mm on paper at 96dpi (fits well in 30mm height)
              level="H"
              includeMargin={false}
            />
          )}
        </div>

        {/* Right: Asset Details (Vertical stack) */}
        <div className="flex-1 flex flex-col justify-between h-full py-1 pr-1 border-l border-black/5 pl-2 overflow-hidden">
          <div className="flex flex-col gap-0.5">
            <div className="text-[6pt] font-black italic uppercase text-indigo-700 tracking-wider">
              UniGear IT
            </div>
            <div className="text-[10pt] font-extrabold text-black leading-tight line-clamp-2 break-words">
              {asset.name}
            </div>
          </div>
          
          <div className="flex flex-col gap-0.5 mt-auto">
            <div className="text-[6pt] font-mono font-bold text-gray-500 uppercase tracking-tighter truncate bg-gray-50 px-1 border border-black/5 rounded-sm">
              SN: {asset.serial_number || asset.qr_code || 'N/A'}
            </div>
            <div className="text-[4.5pt] font-medium text-gray-400 text-right italic">
              {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
