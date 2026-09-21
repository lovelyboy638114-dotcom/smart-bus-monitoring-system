import React, { useState } from 'react';
import { RotateCw, Download, Printer, ZoomIn, ZoomOut, Maximize2, ShieldAlert, Sparkles, Loader, CheckCircle2, AlertOctagon, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface StudentIDCardProps {
  studentData: {
    student_id: string;
    name: string;
    rollNo: string;
    class_name: string;
    admission_no: string;
    bus_id?: string;
    blood_group?: string;
    parent_name?: string;
    parent_phone?: string;
    route_id?: string;
    address?: string;
    front_path: string | null;
    back_path: string | null;
    pdf_path: string | null;
    version: number;
    status: string;
    stage?: string;
    checksum?: string | null;
    file_size?: number | null;
    generated_at: string | null;
    failure_code?: string | null;
    failure_message?: string | null;
  };
  onRegenerate?: () => void;
  isAdmin?: boolean;
}

const StudentIDCard: React.FC<StudentIDCardProps> = ({ studentData, onRegenerate, isAdmin = false }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [frontLoadError, setFrontLoadError] = useState(false);
  const [backLoadError, setBackLoadError] = useState(false);

  const backendUrl = API_BASE_URL;
  
  const cacheBuster = studentData.version || 1;
  const frontImage = studentData.front_path ? (studentData.front_path.startsWith('http') ? studentData.front_path : `${backendUrl}${studentData.front_path}?v=${cacheBuster}`) : null;
  const backImage = studentData.back_path ? (studentData.back_path.startsWith('http') ? studentData.back_path : `${backendUrl}${studentData.back_path}?v=${cacheBuster}`) : null;
  const pdfLink = studentData.pdf_path ? (studentData.pdf_path.startsWith('http') ? studentData.pdf_path : `${backendUrl}${studentData.pdf_path}?v=${cacheBuster}`) : null;

  const handleDownloadPdf = async (e: React.MouseEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('safebus_token');
    try {
      const response = await fetch(`${backendUrl}/api/v1/students/${studentData.student_id}/id-card/download`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${studentData.student_id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to download PDF card. Secure access denied.');
      }
    } catch (err) {
      alert('Network error occurred during file download.');
    }
  };

  const handlePrint = () => {
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

  const handleTriggerRegeneration = async () => {
    if (!onRegenerate) return;
    setLoading(true);
    try {
      await onRegenerate();
    } finally {
      setLoading(false);
    }
  };

  // Define generation pipeline stages
  const stages = [
    { key: 'QUEUED', label: 'Queued' },
    { key: 'GENERATING_QR', label: 'QR Image' },
    { key: 'GENERATING_FRONT', label: 'Front Card' },
    { key: 'GENERATING_BACK', label: 'Back Card' },
    { key: 'GENERATING_PDF', label: 'PDF Bind' },
    { key: 'VERIFYING', label: 'Checksum verification' }
  ];

  const currentStage = studentData.stage || 'QUEUED';
  const isFailed = studentData.status === 'FAILED' || currentStage === 'FAILED';
  const isProcessing = studentData.status === 'PROCESSING' || studentData.status === 'REGENERATING' || studentData.status === 'PENDING';
  const isGenerated = studentData.status === 'GENERATED' || currentStage === 'COMPLETED';

  let currentStageIndex = stages.findIndex(s => s.key === currentStage);
  if (currentStageIndex === -1 && isGenerated) {
    currentStageIndex = stages.length; // completed
  }

  let progressPercent = 0;
  switch (currentStage) {
    case 'QUEUED': progressPercent = 10; break;
    case 'GENERATING_QR': progressPercent = 30; break;
    case 'GENERATING_FRONT': progressPercent = 50; break;
    case 'GENERATING_BACK': progressPercent = 70; break;
    case 'GENERATING_PDF': progressPercent = 85; break;
    case 'VERIFYING': progressPercent = 95; break;
    case 'COMPLETED': progressPercent = 100; break;
    default: progressPercent = 0;
  }

  return (
    <div className={`flex flex-col items-center gap-6 p-6 rounded-3xl border border-slate-200/50 bg-white/70 backdrop-blur-xl shadow-lg w-full max-w-2xl transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900/97 border-none p-12 text-white flex items-center justify-center' : ''}`}>
      
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
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all hover:scale-105 active:scale-95 text-slate-500 hover:text-slate-800 bg-white"
            title="Zoom Out"
            disabled={!isGenerated}
          >
            <ZoomOut className="w-4.5 h-4.5" />
          </button>
          <button 
            onClick={() => setZoomScale(prev => Math.min(1.3, prev + 0.15))}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all hover:scale-105 active:scale-95 text-slate-500 hover:text-slate-800 bg-white"
            title="Zoom In"
            disabled={!isGenerated}
          >
            <ZoomIn className="w-4.5 h-4.5" />
          </button>
          
          {/* Flip triggers */}
          <button 
            onClick={() => setIsFlipped(!isFlipped)}
            className="p-2 border border-blue-200 hover:bg-blue-50 rounded-xl transition-all hover:scale-105 active:scale-95 text-blue-600 bg-white flex items-center gap-1.5 font-bold text-xs"
            title="Flip Card"
            disabled={!isGenerated}
          >
            <RotateCw className="w-4.5 h-4.5" />
            <span>Flip</span>
          </button>

          {/* Fullscreen Trigger */}
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all hover:scale-105 active:scale-95 text-slate-500 hover:text-slate-800 bg-white"
            title="Toggle Fullscreen"
            disabled={!isGenerated}
          >
            <Maximize2 className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Render states dynamically */}
      {isProcessing && (
        <div className="w-full py-8 px-4 flex flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <Loader className="w-14 h-14 text-blue-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-blue-700">
              {progressPercent}%
            </div>
          </div>
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">Generating ID Credentials</h4>
          <p className="text-xs text-slate-500 mb-6 max-w-sm">Please wait while our background pipeline draws the custom templates, verifies checksums, and compiles PDF assets...</p>
          
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 mb-8 overflow-hidden">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {/* Stepper Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
            {stages.map((stage, idx) => {
              const completed = idx < currentStageIndex;
              const active = idx === currentStageIndex;
              return (
                <div 
                  key={stage.key} 
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    completed ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' :
                    active ? 'bg-blue-50/50 border-blue-100 text-blue-800 ring-2 ring-blue-500/10' :
                    'bg-slate-50/50 border-slate-100 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider">Step {idx + 1}</span>
                    {completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-650" />
                    ) : active ? (
                      <Loader className="w-3.5 h-3.5 text-blue-650 animate-spin" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                    )}
                  </div>
                  <span className="text-xs font-bold leading-none block">{stage.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isFailed && (
        <div className="w-full py-6 px-4 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 bg-red-55 rounded-full flex items-center justify-center mb-4">
            <AlertOctagon className="w-8 h-8 text-red-600" />
          </div>
          <h4 className="text-sm font-black text-red-800 uppercase tracking-wider mb-2">Generation Failure</h4>
          <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl max-w-md mb-6 w-full text-left">
            <span className="text-[10px] font-extrabold text-red-600 uppercase block mb-1">
              Error Code: {studentData.failure_code || 'UNKNOWN'}
            </span>
            <p className="text-xs font-semibold text-slate-700 leading-relaxed">
              {studentData.failure_message || 'The system could not compile your ID Badge due to a background error. Please contact school administration.'}
            </p>
          </div>
          {onRegenerate && (
            <button
              onClick={handleTriggerRegeneration}
              disabled={loading}
              className="py-3 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-wider text-xs transition-smooth flex items-center justify-center gap-2 shadow-md shadow-red-900/10 disabled:opacity-50"
            >
              {loading ? <Loader className="w-4.5 h-4.5 animate-spin" /> : <RefreshCw className="w-4.5 h-4.5" />}
              <span>Retry Card Generation</span>
            </button>
          )}
        </div>
      )}

      {isGenerated && (
        <>
          {/* 3D PVC CARD CONTAINER */}
          <div 
            className="relative flex justify-center items-center py-6 select-none cursor-pointer"
            style={{ transform: `scale(${zoomScale})`, transition: 'transform 0.2s ease-out' }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className="w-[500px] h-[312px] [perspective:1000px]">
              <div 
                className="relative w-full h-full duration-700 [transform-style:preserve-3d] shadow-2xl rounded-2xl border border-slate-200/40"
                style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
              >
                {/* FRONT SIDE */}
                <div className="absolute inset-0 w-full h-full rounded-2xl [backface-visibility:hidden] overflow-hidden bg-slate-50 flex items-center justify-center">
                  {frontImage && !frontLoadError ? (
                    <img 
                      src={frontImage} 
                      alt="ID Card Front" 
                      className="w-full h-full object-cover rounded-2xl"
                      loading="eager"
                      onError={() => setFrontLoadError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-5 rounded-2xl flex flex-col justify-between border border-blue-500/30 shadow-inner select-none">
                      {/* Top Header */}
                      <div className="flex justify-between items-center border-b border-blue-500/20 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
                            <span className="text-white text-xs font-black tracking-tighter">SB</span>
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black tracking-widest text-blue-300 uppercase leading-none">SafeBus Shield Academy</h4>
                            <span className="text-[8px] font-bold text-slate-400 tracking-wider block mt-0.5">SMART TRANSIT IDENTITY PASS</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Active Pass
                        </span>
                      </div>

                      {/* Main Identity Row */}
                      <div className="flex items-center justify-between gap-4 py-1">
                        {/* Avatar / Initials */}
                        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                          <div className="w-20 h-20 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center shadow-lg border-2 border-white/20">
                            <span className="text-xl font-black text-white tracking-wider">
                              {(studentData.name || 'SB').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[8px] font-black text-blue-300 uppercase tracking-widest">
                            {studentData.student_id}
                          </span>
                        </div>

                        {/* Student Details Fields */}
                        <div className="flex-1 flex flex-col gap-1 text-left">
                          <div>
                            <h3 className="text-sm font-black text-white leading-tight uppercase tracking-wide truncate">
                              {studentData.name}
                            </h3>
                            <span className="text-[9px] font-extrabold text-blue-400">
                              Roll No: #{studentData.rollNo}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 text-[9px]">
                            <div>
                              <span className="text-slate-400 text-[8px] block uppercase font-bold">Grade / Class</span>
                              <span className="font-extrabold text-white">{studentData.class_name || 'Grade 10'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[8px] block uppercase font-bold">Blood Group</span>
                              <span className="font-extrabold text-rose-300">{studentData.blood_group || 'B+'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[8px] block uppercase font-bold">Assigned Bus</span>
                              <span className="font-extrabold text-amber-300">{studentData.bus_id || 'TN38AB1234'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[8px] block uppercase font-bold">Route ID</span>
                              <span className="font-extrabold text-blue-200">{studentData.route_id || 'R-01'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Scannable Dynamic QR Code */}
                        <div className="flex-shrink-0 p-1.5 bg-white rounded-xl shadow-md flex flex-col items-center">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${encodeURIComponent(
                              `=== SafeBus Shield ===\nID: ${studentData.student_id}\nName: ${studentData.name}\nRoll: ${studentData.rollNo}\nBus: ${studentData.bus_id || 'TN38AB1234'}`
                            )}`}
                            alt="Student QR"
                            className="w-[72px] h-[72px]"
                          />
                          <span className="text-[7px] font-black text-slate-800 tracking-tighter mt-0.5 uppercase">Scan to Board</span>
                        </div>
                      </div>

                      {/* Card Footer Bar */}
                      <div className="flex justify-between items-center border-t border-blue-500/20 pt-2 text-[8px] text-slate-400 font-bold">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Encrypted RFID / Barcode Validated
                        </span>
                        <span className="text-blue-300 font-mono">Academic Year 2026-2027</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* BACK SIDE */}
                <div className="absolute inset-0 w-full h-full rounded-2xl [backface-visibility:hidden] overflow-hidden bg-slate-50 flex items-center justify-center [transform:rotateY(180deg)]">
                  {backImage && !backLoadError ? (
                    <img 
                      src={backImage} 
                      alt="ID Card Back" 
                      className="w-full h-full object-cover rounded-2xl"
                      loading="eager"
                      onError={() => setBackLoadError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white p-5 rounded-2xl flex flex-col justify-between border border-blue-500/30 shadow-inner select-none">
                      {/* Top Header */}
                      <div className="border-b border-blue-500/20 pb-2">
                        <h4 className="text-[10px] font-black tracking-widest text-blue-300 uppercase">Emergency Contact & Transport Guidelines</h4>
                      </div>

                      {/* Information Grid */}
                      <div className="grid grid-cols-2 gap-3 text-left py-2">
                        <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                          <span className="text-[8px] font-bold text-slate-400 uppercase block">Parent / Guardian</span>
                          <span className="text-xs font-black text-white block mt-0.5">{studentData.parent_name || 'Guardian'}</span>
                          <span className="text-[10px] font-mono text-emerald-300 font-bold mt-0.5 block">{studentData.parent_phone || 'N/A'}</span>
                        </div>

                        <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                          <span className="text-[8px] font-bold text-slate-400 uppercase block">Emergency SOS Hotline</span>
                          <span className="text-xs font-black text-amber-300 block mt-0.5">1800-SAFE-BUS</span>
                          <span className="text-[9px] text-slate-300 block mt-0.5">24/7 Operations Control</span>
                        </div>

                        <div className="col-span-2 bg-white/5 p-2.5 rounded-xl border border-white/5">
                          <span className="text-[8px] font-bold text-slate-400 uppercase block">Authorized Pickup Zone</span>
                          <span className="text-[11px] font-bold text-blue-200 block mt-0.5">{studentData.address || 'Designated Campus Stop'}</span>
                        </div>
                      </div>

                      {/* Disclaimer & Barcode */}
                      <div className="border-t border-blue-500/20 pt-2 flex justify-between items-center text-[7.5px] text-slate-400 font-semibold">
                        <p className="max-w-[280px] leading-tight">
                          Property of SafeBus Shield. Must be presented to the bus sensor upon boarding and alighting.
                        </p>
                        <span className="font-mono text-blue-300 font-black">SEC-ID-{studentData.student_id}-V{studentData.version}</span>
                      </div>
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
              <span>Status: <b className={`px-1.5 py-0.5 rounded font-black text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100`}>GENERATED</b></span>
              <span>Generated: <b className={isFullscreen ? 'text-white' : 'text-slate-700'}>{studentData.generated_at ? new Date(studentData.generated_at).toLocaleString() : 'N/A'}</b></span>
            </div>

            {/* Action Panel Buttons */}
            <div className="grid grid-cols-3 gap-3.5 w-full">
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
              
              {pdfLink && (
                <button 
                  onClick={handleDownloadPdf}
                  className="py-3 px-4 bg-[#081F4D] hover:bg-[#1E3A8A] text-white rounded-xl font-extrabold text-xs transition-smooth flex items-center justify-center gap-2 shadow-md shadow-blue-900/10"
                >
                  <Download className="w-4 h-4 text-blue-200" />
                  <span>Download PDF</span>
                </button>
              )}

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
                onClick={handleTriggerRegeneration}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-black uppercase tracking-wider text-xs transition-smooth flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {loading ? <Loader className="w-4.5 h-4.5 animate-spin" /> : <Sparkles className="w-4.5 h-4.5" />}
                <span>Regenerate Digital ID Card</span>
              </button>
            )}
          </div>
        </>
      )}

    </div>
  );
};

export default StudentIDCard;
