import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { QrCode, CheckSquare, Sparkles, HeartHandshake, Home, ShieldAlert } from 'lucide-react';

const StudentDashboard = () => {
  const { students, studentSelfId, updateStudentProfile } = useApp();

  const student = students.find((s) => s.id === studentSelfId) || students[0];

  // Profile forms states
  const [bloodGroup, setBloodGroup] = useState(student.bloodGroup || '');
  const [address, setAddress] = useState(student.address || '');
  const [medicalNotes, setMedicalNotes] = useState(student.medicalNotes || '');
  const [success, setSuccess] = useState(false);

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateStudentProfile(student.id, {
      bloodGroup,
      address,
      medicalNotes
    });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

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
        <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-md relative group">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${student.id}`} 
            alt="Boarding Pass QR"
            className="w-36 h-36"
          />
        </div>

        <h4 className="text-sm font-black text-slate-800 mt-4 leading-none">{student.name}</h4>
        <span className="text-[10px] text-slate-500 font-bold uppercase mt-1.5 tracking-wider">
          Roll No: #{student.rollNo} | Class {student.class}
        </span>
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
