import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { QrCode, CheckSquare, Sparkles, HeartHandshake, Home, ShieldAlert, Loader2 } from 'lucide-react';
import StudentIDCard from '../../components/StudentIDCard';
import { API_BASE_URL } from '../../config';

const StudentDashboard = () => {
  const { students, updateStudentProfile } = useApp();

  const loggedInUser = (localStorage.getItem('safebus_user_username') || '').toLowerCase().trim();

  // Find the authenticated student accurately
  const student = useMemo(() => {
    if (!students || students.length === 0) return null;

    // 1. Direct match on school_email
    const byEmail = students.find(s => {
      const sEmail = (s.school_email || s.schoolEmail || '').toLowerCase().trim();
      return sEmail && sEmail === loggedInUser;
    });
    if (byEmail) return byEmail;

    // 2. Match by student ID or roll number
    const byId = students.find(s => (s.id || '').toLowerCase().trim() === loggedInUser);
    if (byId) return byId;

    const byRoll = students.find(s => (s.rollNo || s.roll_no || '').toLowerCase().trim() === loggedInUser);
    if (byRoll) return byRoll;

    // 3. Username prefix / name substring match
    const userClean = loggedInUser.split('@')[0].replace(/[^a-z0-9]/g, '');
    const byName = students.find(s => {
      const sIdClean = (s.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const sRollClean = (s.rollNo || s.roll_no || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const sNameClean = (s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const firstName = (s.name || '').split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

      if (sIdClean && userClean.includes(sIdClean)) return true;
      if (sRollClean && userClean.includes(sRollClean)) return true;
      if (sNameClean && (userClean.includes(sNameClean) || sNameClean.includes(userClean))) return true;
      if (firstName && userClean.includes(firstName)) return true;
      return false;
    });
    if (byName) return byName;

    return students[0];
  }, [students, loggedInUser]);

  // Live ID Card state
  const [liveCardData, setLiveCardData] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Fetch live ID card details and trigger background generation if needed
  const fetchCardDetails = async (stId) => {
    const targetId = stId || student?.id;
    if (!targetId) return;
    try {
      const token = localStorage.getItem('safebus_token');
      const headers = { 'Authorization': token ? `Bearer ${token}` : '' };

      let res = await fetch(`${API_BASE_URL}/api/v1/student/my-id-card`, { headers });
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/api/v1/students/${targetId}/id-card`, { headers });
      }
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.data) {
          setLiveCardData(json.data);
        }
      }
    } catch (err) {
      console.error("[StudentDashboard] Failed to fetch ID card:", err);
    }
  };

  useEffect(() => {
    if (student?.id) {
      fetchCardDetails(student.id);
    }
  }, [student?.id]);

  const handleRegenerate = async () => {
    if (!student?.id) return;
    setIsRegenerating(true);
    try {
      const token = localStorage.getItem('safebus_token');
      await fetch(`${API_BASE_URL}/api/v1/students/${student.id}/regenerate-id-card`, {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      // Short delay then refresh card details
      setTimeout(() => fetchCardDetails(student.id), 1200);
    } catch (err) {
      console.error("[StudentDashboard] Failed to regenerate ID card:", err);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Profile forms states
  const [bloodGroup, setBloodGroup] = useState('');
  const [address, setAddress] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [success, setSuccess] = useState(false);

  const activeCardStatus = liveCardData?.status || student?.idCardStatus || student?.id_card_status || 'GENERATED';
  const activeCardStage = liveCardData?.stage || student?.idCardGenerationStage || student?.id_card_generation_stage || 'COMPLETED';

  const idCardData = student ? {
    student_id: student.id,
    name: student.name,
    rollNo: student.rollNo,
    class_name: student.className || student.class || 'Grade 10',
    admission_no: student.admissionNo || student.rollNo || 'N/A',
    front_path: liveCardData?.front_path || student.idCardFrontPath || student.id_card_front_path || null,
    back_path: liveCardData?.back_path || student.idCardBackPath || student.id_card_back_path || null,
    pdf_path: liveCardData?.pdf_path || student.idCardPdfPath || student.id_card_pdf_path || null,
    version: liveCardData?.version || student.idCardVersion || student.id_card_version || 1,
    status: activeCardStatus,
    stage: activeCardStage,
    generated_at: liveCardData?.generated_at || student.idCardGeneratedAt || student.id_card_generated_at || null,
    failure_code: liveCardData?.failure_code || student.idCardFailureCode || student.id_card_failure_code || null,
    failure_message: liveCardData?.failure_message || student.idCardFailureMessage || student.id_card_failure_message || null,
  } : null;

  // Sync state with dynamic student loaded from context API
  useEffect(() => {
    if (student) {
      setBloodGroup(student.bloodGroup || '');
      setAddress(student.address || '');
      setMedicalNotes(student.medicalNotes || '');
    }
  }, [student]);

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    if (!student?.id) return;
    updateStudentProfile(student.id, {
      bloodGroup,
      address,
      medicalNotes
    });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-bold">Loading student profile...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto h-[calc(100vh-4rem)] overflow-y-auto font-sans">
      
      {/* View Header */}
      <div>
        <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-widest block leading-none">
          Pupil Console
        </span>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide mt-1">Student Dashboard</h2>
        <p className="text-xs text-slate-500 font-medium">Verify your check-in QR Code and manage your profile details:</p>
      </div>

      {/* QR Boarding Badge Card */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-soft flex flex-col items-center text-center">
        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-4">
          Encrypted Boarding Pass
        </span>
        
        {/* Real Dynamic QR Boarding pass */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-md relative group min-h-[150px]">
          {student.id ? (
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                `=== SafeBus AI - Student ID ===\nID: ${student.id}\nName: ${student.name}\nRoll No: ${student.rollNo}\nClass: ${student.class || 'Grade 10'}\nStatus: ACTIVE`
              )}`} 
              alt="Boarding Pass QR"
              className="w-36 h-36"
            />
          ) : (
            <div className="w-36 h-36 flex items-center justify-center text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Generating pass...
            </div>
          )}
        </div>

        <h4 className="text-sm font-black text-slate-800 mt-4 leading-none">{student.name}</h4>
        <span className="text-[10px] text-slate-500 font-bold uppercase mt-1.5 tracking-wider">
          Roll No: #{student.rollNo} | Class {student.class || 'Grade 10'}
        </span>
      </div>

      {/* Dynamic Digital PVC ID Card Badge Wallet */}
      {idCardData && (
        <div className="flex justify-center w-full">
          <StudentIDCard studentData={idCardData} onRegenerate={handleRegenerate} />
        </div>
      )}
      
      {/* Route & Stop Details Card */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-soft">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4">Transportation Details</h3>
        
        <div className="flex flex-col gap-3.5 text-xs font-semibold text-slate-700">
          <div className="flex justify-between">
            <span className="text-slate-500">Assigned Bus:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
              student.status === 'BUS_PENDING' || student.assignedBus === 'BUS_PENDING'
                ? 'bg-amber-50 text-amber-700 border-amber-100'
                : 'bg-blue-50 text-blue-700 border-blue-150 font-bold'
            }`}>
              {student.status === 'BUS_PENDING' || student.assignedBus === 'BUS_PENDING' ? 'PENDING' : student.assignedBus}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Pickup Stop:</span>
            <span className="font-bold text-slate-800">
              {student.status === 'BUS_PENDING' || student.assignedBus === 'BUS_PENDING' ? 'PENDING (Calculating)' : student.pickupStop}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Pickup Distance:</span>
            <span className="font-bold text-indigo-600 font-mono">
              {student.pickup_distance !== undefined && student.pickup_distance !== null
                ? `${Math.round(student.pickup_distance)} meters`
                : 'Manual Assignment / Pending'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Assignment Method:</span>
            <span className="font-bold text-slate-600 uppercase text-[9.5px]">
              {student.assignment_status || 'MANUAL'}
            </span>
          </div>
        </div>
      </div>

      {/* Daily Boarding Status Card */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-soft">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4">Boarding status</h3>
        
        <div className="flex flex-col gap-3 text-xs font-semibold text-slate-700">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-150">
            <span className="text-slate-500">Morning Bus Boarding</span>
            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${student.boarded ? 'bg-emerald-50 text-emerald-600 border border-emerald-150' : 'bg-slate-200 text-slate-500'}`}>
              {student.boarded ? 'Boarded' : 'Awaiting Check-in'}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-150 border-t border-slate-100/60 pt-2.5">
            <span className="text-slate-500">School Entrance Check-in</span>
            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${student.reachedSchool ? 'bg-emerald-50 text-emerald-600 border border-emerald-150' : 'bg-slate-200 text-slate-500'}`}>
              {student.reachedSchool ? 'Arrived' : 'Awaiting Check-in'}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Details Submission Form (Viewed by Admin) */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-soft">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4">Submit Personal Details (Viewed by Admin)</h3>
        
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-850 text-xs font-bold rounded-xl flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-emerald-600 animate-bounce" />
            <span>Profile details saved and dispatched to Admin desk!</span>
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4 text-xs font-semibold text-slate-700">
          <div>
            <label className="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest block mb-1">Blood Group</label>
            <input 
              type="text" 
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              placeholder="e.g. O+ve"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-blue-500 transition-smooth"
            />
          </div>

          <div>
            <label className="text-[9px] font-extrabold text-slate-455 uppercase tracking-widest block mb-1">Residential Address</label>
            <input 
              type="text" 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 12, Anna Salai, Chennai"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-blue-500 transition-smooth"
            />
          </div>

          <div>
            <label className="text-[9px] font-extrabold text-slate-455 uppercase tracking-widest block mb-1">Medical Notes / Allergies</label>
            <textarea 
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="e.g. Penicillin allergy, wears inhaler"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-blue-500 min-h-[70px] transition-smooth"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-smooth uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-4 h-4" /> Save & Send details to Admin
          </button>
        </form>
      </div>

    </div>
  );
};

export default StudentDashboard;
