import React, { useState } from 'react';
import { RotateCw, Download, Printer, ZoomIn, ZoomOut, Maximize2, ShieldAlert, Sparkles, Loader } from 'lucide-react';

interface StudentIDCardProps {
  studentData: {
    student_id: string;
    name: string;
    rollNo: string;
    class_name: string;
    admission_no: string;
    front_path: string | null;
    back_path: string | null;
    pdf_path: string | null;
    version: number;
    status: string;
    generated_at: string | null;
  };
  onRegenerate?: () => void;
  isAdmin?: boolean;
}

const StudentIDCard: React.FC<StudentIDCardProps> = ({ studentData, onRegenerate, isAdmin = false }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);

  const backendUrl = "http://localhost:5000";
  
  const cacheBuster = Date.now();
  const frontImage = studentData.front_path ? `${backendUrl}${studentData.front_path}?v=${studentData.version}&t=${cacheBuster}` : null;
  const backImage = studentData.back_path ? `${backendUrl}${studentData.back_path}?v=${studentData.version}&t=${cacheBuster}` : null;
  const pdfLink = studentData.pdf_path ? `${backendUrl}${studentData.pdf_path}?t=${cacheBuster}` : null;

  const handlePrint = () => {
    // Open a new print window with front/back styled images side-by-side or stacked
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Student ID Card - ${studentData.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 40px;
              background: #fff;
            }
            .card-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 40px;
              margin-top: 20px;
            }
            .card-img {
              width: 640px;
              height: 400px;
              border: 1px solid #ccc;
              border-radius: 12px;
              box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
              .card-img { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h2 class="no-print" style="color: #333;">Print Preview</h2>
          <p class="no-print" style="color: #666; font-size: 14px; margin-bottom: 30px;">Press Ctrl+P to print the ID Card layout pages.</p>
          <div class="card-container">
            ${frontImage ? `<img src="${frontImage}" class="card-img" />` : '<div class="card-img" style="display:flex;align-items:center;justify-content:center;">Front Image Missing</div>'}
            ${backImage ? `<img src="${backImage}" class="card-img" />` : '<div class="card-img" style="display:flex;align-items:center;justify-content:center;">Back Image Missing</div>'}
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className={`flex flex-col items-center gap-6 p-6 rounded-3xl border border-slate-200/50 bg-white/70 backdrop-blur-xl shadow-lg w-full max-w-2xl transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900/95 border-none p-12 text-white flex items-center justify-center' : ''}`}>
      
      {/* Dynamic Visual Controls Header */}
      <div className="flex justify-between items-center w-full border-b border-slate-100 pb-4">
        <div>
          <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest block leading-none">
            Secure Digital Credential
          </span>
          <h3 className={`text-md font-black uppercase tracking-wide mt-1.5 ${isFullscreen ? 'text-white' : 'text-slate-800'}`}>
            {studentData.name}'s ID Badge
          </h3>
        </div>
        <div className="flex gap-2.5">
          {/* Zoom controls */}
          <button 
            onClick={() => setZoomScale(prev => Math.max(0.7, prev - 0.15))}
            className="p-2 border border-slate-200 hover:bg-slate-55 rounded-xl transition-all hover:scale-105 active:scale-95 text-slate-500 hover:text-slate-800 bg-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-4.5 h-4.5" />
          </button>
          <button 
            onClick={() => setZoomScale(prev => Math.min(1.3, prev + 0.15))}
            className="p-2 border border-slate-200 hover:bg-slate-55 rounded-xl transition-all hover:scale-105 active:scale-95 text-slate-500 hover:text-slate-800 bg-white"
            title="Zoom In"
          >
            <ZoomIn className="w-4.5 h-4.5" />
          </button>
          
          {/* Flip triggers */}
          <button 
            onClick={() => setIsFlipped(!isFlipped)}
            className="p-2 border border-blue-200 hover:bg-blue-50 rounded-xl transition-all hover:scale-105 active:scale-95 text-blue-600 bg-white flex items-center gap-1.5 font-bold text-xs"
            title="Flip Card"
          >
            <RotateCw className="w-4.5 h-4.5" />
            <span>Flip Badge</span>
          </button>

          {/* Fullscreen Trigger */}
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 border border-slate-200 hover:bg-slate-55 rounded-xl transition-all hover:scale-105 active:scale-95 text-slate-500 hover:text-slate-800 bg-white"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* 3D PVC CARD CONTAINER */}
      <div 
        className="relative flex justify-center items-center py-6 select-none cursor-pointer"
        style={{ transform: `scale(${zoomScale})`, transition: 'transform 0.2s ease-out' }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Aspect ratio 1.6:1 (Width 640px height 400px maps to w-full max-w-[500px] h-[312px]) */}
        <div className="w-[500px] h-[312px] [perspective:1000px]">
          <div 
            className="relative w-full h-full duration-700 [transform-style:preserve-3d] shadow-2xl rounded-2xl border border-slate-200/40"
            style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
          >
            {/* FRONT SIDE */}
            <div className="absolute inset-0 w-full h-full rounded-2xl [backface-visibility:hidden] overflow-hidden bg-slate-50 flex items-center justify-center">
              {frontImage ? (
                <img 
                  src={frontImage} 
                  alt="ID Card Front" 
                  className="w-full h-full object-cover rounded-2xl"
                  loading="lazy"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 p-6 text-center">
                  <ShieldAlert className="w-10 h-10 text-slate-350 animate-bounce" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Digital front badge missing</span>
                </div>
              )}
            </div>

            {/* BACK SIDE */}
            <div className="absolute inset-0 w-full h-full rounded-2xl [backface-visibility:hidden] overflow-hidden bg-slate-50 flex items-center justify-center [transform:rotateY(180deg)]">
              {backImage ? (
                <img 
                  src={backImage} 
                  alt="ID Card Back" 
                  className="w-full h-full object-cover rounded-2xl"
                  loading="lazy"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 p-6 text-center">
                  <ShieldAlert className="w-10 h-10 text-slate-350 animate-bounce" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Digital back badge missing</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* METADATA INFO & ACTION BUTTONS */}
      <div className={`w-full flex flex-col gap-4 border-t border-slate-100 pt-4 ${isFullscreen ? 'text-slate-350' : 'text-slate-500'}`}>
        <div className="flex justify-between items-center text-[10px] font-semibold tracking-wide">
          <span>Card Version: <b className="font-extrabold text-blue-600">V{studentData.version}</b></span>
          <span>Status: <b className={`px-1.5 py-0.5 rounded font-black text-[9px] ${studentData.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>{studentData.status}</b></span>
          <span>Generated: <b className={isFullscreen ? 'text-white' : 'text-slate-700'}>{studentData.generated_at ? new Date(studentData.generated_at).toLocaleString() : 'N/A'}</b></span>
        </div>

        {/* Action Panel Buttons */}
        <div className="grid grid-cols-3 gap-3.5 w-full">
          {/* Download Front PNG */}
          {frontImage && (
            <a 
              href={frontImage}
              download={`${studentData.student_id}_front.png`}
              target="_blank"
              rel="noreferrer"
              className="py-3 px-4 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-xs transition-smooth flex items-center justify-center gap-2 shadow-sm text-slate-750 bg-white"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Badge PNG</span>
            </a>
          )}
          
          {/* Download PDF */}
          {pdfLink && (
            <a 
              href={pdfLink}
              download={`${studentData.student_id}.pdf`}
              target="_blank"
              rel="noreferrer"
              className="py-3 px-4 bg-[#081F4D] hover:bg-[#1E3A8A] text-white rounded-xl font-extrabold text-xs transition-smooth flex items-center justify-center gap-2 shadow-md shadow-blue-900/10"
            >
              <Download className="w-4 h-4 text-blue-200" />
              <span>Printable PDF</span>
            </a>
          )}

          {/* Browser Print Trigger */}
          <button 
            onClick={handlePrint}
            className="py-3 px-4 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-xs transition-smooth flex items-center justify-center gap-2 shadow-sm text-slate-750 bg-white"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Badge</span>
          </button>
        </div>

        {/* Administrator specific regeneration triggers */}
        {isAdmin && onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-black uppercase tracking-wider text-xs transition-smooth flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            {loading ? <Loader className="w-4.5 h-4.5 animate-spin" /> : <Sparkles className="w-4.5 h-4.5" />}
            <span>Regenerate Digital ID Card</span>
          </button>
        )}
      </div>

    </div>
  );
};

export default StudentIDCard;
