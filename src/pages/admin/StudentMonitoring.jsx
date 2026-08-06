import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Users, Phone, MapPin, CheckCircle, Clock, ChevronRight, X, Sparkles, 
  Plus, ShieldAlert, Key, Clipboard, Printer, Download, UserRoundPlus 
} from 'lucide-react';

const StudentMonitoring = () => {
  const { students, handleStudentBoarding, setStudents, buses } = useApp();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [regenLoading, setRegenLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Form registration state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    rollNo: '',
    class: '',
    section: 'A',
    gender: 'Male',
    dob: '',
    bloodGroup: '',
    address: '',
    medicalNotes: '',
    parentName: '',
    parentPhone: '',
    email: '',
    busId: ''
  });

  // Success credentials display overlay state
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const normalizeText = (text) => {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  };

  const getStudentPreviewEmail = () => {
    const normName = normalizeText(newStudent.name);
    const normRoll = normalizeText(newStudent.rollNo);
    if (!normName || !normRoll) return 'Will be generated...';
    return `${normName}${normRoll}.student@happyjourney.ai`;
  };

  const getStudentPreviewPassword = () => {
    const cleanedName = newStudent.name.replace(/[^a-zA-Z0-9]/g, '');
    const cleanedRoll = newStudent.rollNo.replace(/[^a-zA-Z0-9]/g, '');
    if (!cleanedName || !cleanedRoll) return 'Will be generated...';
    return `${cleanedName}@${cleanedRoll}`;
  };

  const getParentPreviewEmail = () => {
    const normParent = normalizeText(newStudent.parentName);
    const normRoll = normalizeText(newStudent.rollNo);
    if (!normParent || !normRoll) return 'Will be generated...';
    return `${normParent}${normRoll}.parent@happyjourney.ai`;
  };

  const getParentPreviewPassword = () => {
    const cleanedParent = newStudent.parentName.replace(/[^a-zA-Z0-9]/g, '');
    const cleanedRoll = newStudent.rollNo.replace(/[^a-zA-Z0-9]/g, '');
    if (!cleanedParent || !cleanedRoll) return 'Will be generated...';
    return `${cleanedParent}@${cleanedRoll}`;
  };

  const handleRegenerateIDCard = async (studentId) => {
    setRegenLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/v1/students/${studentId}/regenerate-id-card`, {
        method: 'POST',
        headers: {
          'X-User-Role': 'admin'
        }
      });
      const resJson = await response.json();
      if (response.ok && resJson.success) {
        setStudents(prev => prev.map(s => {
          if (s.id === studentId) {
            return {
              ...s,
              id_card_front_path: resJson.data.front_path,
              id_card_back_path: resJson.data.back_path,
              id_card_pdf_path: resJson.data.pdf_path,
              id_card_version: resJson.data.version,
              id_card_status: resJson.data.status
            };
          }
          return s;
        }));
        setSelectedStudent(prev => {
          if (prev && prev.id === studentId) {
            return {
              ...prev,
              id_card_front_path: resJson.data.front_path,
              id_card_back_path: resJson.data.back_path,
              id_card_pdf_path: resJson.data.pdf_path,
              id_card_version: resJson.data.version,
              id_card_status: resJson.data.status
            };
          }
          return prev;
        });
      } else {
        alert(resJson.message || 'Regeneration failed.');
      }
    } catch (err) {
      alert('Network error. Failed to reach backend API.');
    } finally {
      setRegenLoading(false);
    }
  };

  const handleResetPassword = async (username) => {
    if (!window.confirm(`Are you sure you want to reset password for ${username}?`)) return;
    setResetLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/v1/admin/accounts/${username}/reset-password`, {
        method: 'POST',
        headers: {
          'X-User-Role': 'admin'
        }
      });
      const resJson = await response.json();
      if (response.ok && resJson.success) {
        setCreatedCredentials({
          student_email: resJson.data.username,
          student_temp_pass: resJson.data.temp_password,
          student_pdf: resJson.data.pdf_path,
          isReset: true
        });
      } else {
        alert(resJson.message || 'Reset failed.');
      }
    } catch (err) {
      alert('Failed to reset credentials. Connect to the backend.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/v1/admin/register/student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'admin'
        },
        body: JSON.stringify({
          ...newStudent,
          parentName: newStudent.parentName,
          parentPhone: newStudent.parentPhone,
          parent_email: newStudent.email
        })
      });
      const resJson = await response.json();
      if (response.ok && resJson.success) {
        // Refresh local student lists
        const refreshResponse = await fetch('http://localhost:5000/api/students');
        const refreshedData = await refreshResponse.json();
        setStudents(refreshedData);
        
        setCreatedCredentials(resJson.data);
        setIsAddModalOpen(false);
        setNewStudent({
          name: '',
          rollNo: '',
          class: '',
          section: 'A',
          gender: 'Male',
          dob: '',
          bloodGroup: '',
          address: '',
          medicalNotes: '',
          parentName: '',
          parentPhone: '',
          email: '',
          busId: ''
        });
      } else {
        alert(resJson.message || 'Student registration failed.');
      }
    } catch (err) {
      alert('Failed to register student. Verification error.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleCopyClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Credentials copied to clipboard!');
  };

  const handlePrint = (creds) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Portal Access Credentials</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            h2 { color: #1d4ed8; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase; }
            .val { font-size: 16px; margin-top: 4px; font-family: monospace; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h2>Secure Portal Credentials Sheet</h2>
          <div class="section">
            <div class="label">Owner</div>
            <div class="val">${creds.student_email.split('@')[0]}</div>
          </div>
          <div class="section">
            <div class="label">Access Username / Email</div>
            <div class="val">${creds.student_email}</div>
          </div>
          <div class="section">
            <div class="label">Temporary Passphrase</div>
            <div class="val">${creds.student_temp_pass}</div>
          </div>
          ${creds.parent_email ? `
          <h2>Parent Portal Link Credentials</h2>
          <div class="section">
            <div class="label">Parent Email</div>
            <div class="val">${creds.parent_email}</div>
          </div>
          <div class="section">
            <div class="label">Temporary Passphrase</div>
            <div class="val">${creds.parent_temp_pass}</div>
          </div>
          ` : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadTxt = (creds) => {
    const content = `=== PORTAL REGISTRATION SUMMARY ===\nStudent Email: ${creds.student_email}\nStudent Temp Pass: ${creds.student_temp_pass}\n` +
      (creds.parent_email ? `Parent Email: ${creds.parent_email}\nParent Temp Pass: ${creds.parent_temp_pass}\n` : '');
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${creds.student_email}_credentials.txt`;
    link.click();
  };

  const getStatusBadge = (student) => {
    if (student.reachedHome) return <span className="px-2 py-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full uppercase">Home (Completed)</span>;
    if (student.boardedReturn) return <span className="px-2 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full uppercase animate-pulse">Transit Home</span>;
    if (student.reachedSchool) return <span className="px-2 py-0.5 text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full uppercase">At School</span>;
    if (student.boarded) return <span className="px-2 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full uppercase animate-pulse">Transit School</span>;
    if (student.status === 'BUS_PENDING') return <span className="px-2 py-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-full uppercase">Bus Pending</span>;
    return <span className="px-2 py-0.5 text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-full uppercase">Waiting</span>;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 h-[calc(100vh-4rem)] overflow-hidden font-sans">
      
      {/* Student Table Registry */}
      <div className="flex-1 bg-white border border-slate-100 rounded-2xl flex flex-col overflow-hidden shadow-soft">
        
        {/* Registry Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Student Transit Registry</h3>
            <p className="text-[10px] text-slate-400 font-medium">Monitor live boarding checklists and safety status reports:</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Enroll Student
            </button>
            <div className="flex items-center gap-1 bg-white border border-slate-200/80 px-2 py-1.5 rounded-xl text-[9px] font-bold text-slate-500">
              <Users className="w-3.5 h-3.5" />
              <span>Total Enrolled: {students.length}</span>
            </div>
          </div>
        </div>

        {/* Registry Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Roll No</th>
                <th className="py-4 px-6">Student Name</th>
                <th className="py-4 px-6">Class</th>
                <th className="py-4 px-6">Bus Assigned</th>
                <th className="py-4 px-6 text-center">Boarded</th>
                <th className="py-4 px-6 text-center">Reached School</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
              {students.map((student) => (
                <tr 
                  key={student.id} 
                  className={`hover:bg-slate-50/40 transition-smooth cursor-pointer ${selectedStudent?.id === student.id ? 'bg-blue-50/20' : ''}`}
                  onClick={() => setSelectedStudent(student)}
                >
                  <td className="py-3.5 px-6 font-mono text-slate-400">#{student.rollNo}</td>
                  <td className="py-3.5 px-6 text-slate-900">{student.name}</td>
                  <td className="py-3.5 px-6">{student.class}</td>
                  <td className="py-3.5 px-6 font-mono text-[10px] text-slate-550">{student.busId || "Not Assigned"}</td>
                  <td className="py-3.5 px-6 text-center">
                    <span className={`inline-block w-4 h-4 rounded-full ${student.boarded ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'} flex items-center justify-center mx-auto text-[9px]`}>
                      ✓
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-center">
                    <span className={`inline-block w-4 h-4 rounded-full ${student.reachedSchool ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'} flex items-center justify-center mx-auto text-[9px]`}>
                      ✓
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-center">{getStatusBadge(student)}</td>
                  <td className="py-3.5 px-6 text-right">
                    <ChevronRight className="w-4.5 h-4.5 text-slate-400 inline-block" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Student Detailed Drawer */}
      {selectedStudent && (
        <div className="w-full lg:w-96 bg-white border border-slate-100 rounded-2xl flex flex-col shrink-0 overflow-hidden shadow-soft relative animate-smooth">
          {/* Drawer Header */}
          <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Transit Details</h3>
            <button 
              onClick={() => setSelectedStudent(null)}
              className="p-1 rounded-lg hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-smooth"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Student Profile Card */}
          <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
            
            {/* Main Avatar Cards */}
            <div className="flex gap-4 items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-md font-black shadow-md shadow-blue-500/10">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 leading-tight">{selectedStudent.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Roll No: #{selectedStudent.rollNo} | Class {selectedStudent.class}</p>
                </div>
              </div>
              
              {selectedStudent.school_email && (
                <button
                  disabled={resetLoading}
                  onClick={() => handleResetPassword(selectedStudent.school_email)}
                  className="p-2 border border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-xl transition-smooth flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                  title="Reset Student Password"
                >
                  <Key className="w-3.5 h-3.5" /> Reset
                </button>
              )}
            </div>

            {/* Parent Info */}
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl flex flex-col gap-2">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Emergency Contact info</span>
              <h4 className="text-xs font-bold text-slate-800">{selectedStudent.parentName}</h4>
              <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-mono">{selectedStudent.parentPhone}</span>
              </p>
            </div>

            {/* Submitted Personal Details */}
            {(selectedStudent.bloodGroup || selectedStudent.address || selectedStudent.medicalNotes) ? (
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex flex-col gap-2">
                <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest leading-none block mb-1">Personal Details</span>
                {selectedStudent.bloodGroup && (
                  <div className="text-[10px] font-bold text-slate-700">
                    <span className="text-slate-400 font-semibold uppercase">Blood Group: </span>{selectedStudent.bloodGroup}
                  </div>
                )}
                {selectedStudent.address && (
                  <div className="text-[10px] font-bold text-slate-700">
                    <span className="text-slate-400 font-semibold uppercase">Address: </span>{selectedStudent.address}
                  </div>
                )}
                {selectedStudent.medicalNotes && (
                  <div className="text-[10px] font-bold text-slate-750">
                    <span className="text-slate-450 font-semibold uppercase block mb-0.5">Medical Conditions:</span>
                    <span className="text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 inline-block mt-0.5">{selectedStudent.medicalNotes}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl text-center text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">
                No personal details submitted
              </div>
            )}

            {/* Digital ID Card Preview & Regeneration Card */}
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl flex flex-col gap-3 text-left">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Digital ID Badge</span>
                <span className="text-[9px] font-black text-slate-400 font-mono">V{selectedStudent.id_card_version || 1} ({selectedStudent.id_card_status || 'ACTIVE'})</span>
              </div>
              
              {selectedStudent.id_card_front_path ? (
                <div className="relative group overflow-hidden rounded-lg border border-slate-200 aspect-[1.6/1] bg-white">
                  <img 
                    src={`http://localhost:5000${selectedStudent.id_card_front_path}?v=${selectedStudent.id_card_version || 1}`} 
                    alt="ID Badge Front Preview"
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a 
                      href={`http://localhost:5000${selectedStudent.id_card_pdf_path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 shadow-sm"
                    >
                      View PDF
                    </a>
                  </div>
                </div>
              ) : (
                <div className="py-6 border border-dashed border-slate-200 rounded-lg text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-white">
                  {selectedStudent.status === 'BUS_PENDING' ? "Awaiting Bus Assignment" : "No ID Card Generated"}
                </div>
              )}

              {selectedStudent.status !== 'BUS_PENDING' && (
                <button
                  disabled={regenLoading}
                  onClick={() => handleRegenerateIDCard(selectedStudent.id)}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-45 text-white rounded-lg font-black uppercase tracking-wider text-[10px] transition-smooth flex items-center justify-center gap-1 shadow-sm"
                >
                  {regenLoading ? 'Regenerating...' : 'Regenerate ID Card'}
                </button>
              )}
            </div>

            {/* Boarding timeline */}
            {selectedStudent.status !== 'BUS_PENDING' && (
              <div className="flex flex-col gap-4">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Daily Journey Timeline</span>
                
                <div className="relative border-l border-slate-200 pl-4 ml-2.5 flex flex-col gap-5 text-xs">
                  
                  {/* Step 1: Boarding */}
                  <div className="relative">
                    <span className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full border border-white ${selectedStudent.boarded ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <div>
                      <h5 className="font-bold text-slate-800 leading-none">Bus Boarding (Morning)</h5>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {selectedStudent.boarded ? `Boarded at ${selectedStudent.boardedTime}` : 'Awaiting bus arrival'}
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Reached School */}
                  <div className="relative">
                    <span className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full border border-white ${selectedStudent.reachedSchool ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <div>
                      <h5 className="font-bold text-slate-800 leading-none">School Drop Verification</h5>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {selectedStudent.reachedSchool ? 'Arrived safely at campus' : 'In transit'}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Boarded Return */}
                  <div className="relative">
                    <span className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full border border-white ${selectedStudent.boardedReturn ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <div>
                      <h5 className="font-bold text-slate-800 leading-none">Bus Boarding (Evening)</h5>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {selectedStudent.boardedReturn ? 'Boarded return bus' : 'Awaiting afternoon shift'}
                      </p>
                    </div>
                  </div>

                  {/* Step 4: Reached Home */}
                  <div className="relative">
                    <span className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full border border-white ${selectedStudent.reachedHome ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <div>
                      <h5 className="font-bold text-slate-800 leading-none">Home Drop Verification</h5>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {selectedStudent.reachedHome ? 'Dropped off safely' : 'Awaiting arrival'}
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Operator simulator overrides controls */}
            {selectedStudent.status !== 'BUS_PENDING' && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-widest block mb-2">Simulate Boarding Scans</span>
                
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <button
                    disabled={selectedStudent.boarded}
                    onClick={() => handleStudentBoarding(selectedStudent.id, 'boarded')}
                    className="py-2.5 bg-blue-600 disabled:opacity-40 hover:bg-blue-700 text-white rounded-lg font-bold transition-smooth uppercase tracking-wide flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Board Bus
                  </button>
                  <button
                    disabled={!selectedStudent.boarded || selectedStudent.reachedSchool}
                    onClick={() => handleStudentBoarding(selectedStudent.id, 'reachedSchool')}
                    className="py-2.5 bg-emerald-600 disabled:opacity-40 hover:bg-emerald-700 text-white rounded-lg font-bold transition-smooth uppercase tracking-wide flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" /> Arrive Campus
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Enroll Student Dialog Modal Overlay */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UserRoundPlus className="w-4 h-4 text-blue-600" /> Secure Student Enrollment
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Credentials will be generated automatically and audits logged.</p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 hover:bg-slate-200/50 rounded-lg text-slate-400 transition-smooth"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* Left Column: Personal details */}
              <div className="flex flex-col gap-4">
                <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">Student Information</span>
                
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-600">Full Name *</label>
                  <input 
                    type="text" 
                    required
                    value={newStudent.name} 
                    onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                    placeholder="e.g. Arjun Kumar"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-600">Roll Number *</label>
                    <input 
                      type="text" 
                      required
                      value={newStudent.rollNo} 
                      onChange={e => setNewStudent({...newStudent, rollNo: e.target.value})}
                      placeholder="e.g. R001"
                      className="border border-slate-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-600">Grade / Class *</label>
                    <input 
                      type="text" 
                      required
                      value={newStudent.class} 
                      onChange={e => setNewStudent({...newStudent, class: e.target.value})}
                      placeholder="e.g. Grade 10"
                      className="border border-slate-200 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-600">Section</label>
                    <input 
                      type="text" 
                      value={newStudent.section} 
                      onChange={e => setNewStudent({...newStudent, section: e.target.value})}
                      className="border border-slate-200 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="font-bold text-slate-600">Gender</label>
                    <select 
                      value={newStudent.gender}
                      onChange={e => setNewStudent({...newStudent, gender: e.target.value})}
                      className="border border-slate-200 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:border-blue-500"
                    >
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-600">Date of Birth</label>
                    <input 
                      type="date" 
                      value={newStudent.dob} 
                      onChange={e => setNewStudent({...newStudent, dob: e.target.value})}
                      className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-600">Blood Group</label>
                    <input 
                      type="text" 
                      placeholder="e.g. O+"
                      value={newStudent.bloodGroup} 
                      onChange={e => setNewStudent({...newStudent, bloodGroup: e.target.value})}
                      className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-600">Residence Address</label>
                  <input 
                    type="text" 
                    value={newStudent.address} 
                    onChange={e => setNewStudent({...newStudent, address: e.target.value})}
                    placeholder="Residential street, city"
                    className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>
              </div>

              {/* Right Column: Parent details & Transit */}
              <div className="flex flex-col gap-4">
                <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">Parent & Transit Details</span>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-600">Father / Guardian Name *</label>
                  <input 
                    type="text" 
                    required
                    value={newStudent.parentName} 
                    onChange={e => setNewStudent({...newStudent, parentName: e.target.value})}
                    placeholder="e.g. Suresh Kumar"
                    className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-600">Parent Phone *</label>
                    <input 
                      type="text" 
                      required
                      value={newStudent.parentPhone} 
                      onChange={e => setNewStudent({...newStudent, parentPhone: e.target.value})}
                      placeholder="e.g. +1-555-1234"
                      className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-600">Parent Email *</label>
                    <input 
                      type="email" 
                      required
                      value={newStudent.email} 
                      onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                      placeholder="parent@personal.com"
                      className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-600">Assign Bus Route (Optional)</label>
                  <select 
                    value={newStudent.busId}
                    onChange={e => setNewStudent({...newStudent, busId: e.target.value})}
                    className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="">No Bus Assigned (Pending)</option>
                    {buses.map(bus => (
                      <option key={bus.id} value={bus.id}>{bus.id} - {bus.route} (Driver: {bus.driver})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-600">Medical Warning Notes</label>
                  <textarea 
                    value={newStudent.medicalNotes} 
                    onChange={e => setNewStudent({...newStudent, medicalNotes: e.target.value})}
                    placeholder="Allergies, asthma, none, etc."
                    className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none h-16 resize-none"
                  />
                </div>

                {/* Credentials Preview Panel */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mt-2 flex flex-col gap-2.5">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block leading-none">
                    Security Credentials Preview
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-500 block">Student Email ID</span>
                      <code className="text-blue-700 font-mono font-bold block truncate">{getStudentPreviewEmail()}</code>
                      <span className="font-bold text-slate-500 block mt-1">Student Temp Pass</span>
                      <code className="text-slate-800 font-mono font-bold block">{getStudentPreviewPassword()}</code>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block">Parent Email ID</span>
                      <code className="text-emerald-700 font-mono font-bold block truncate">{getParentPreviewEmail()}</code>
                      <span className="font-bold text-slate-500 block mt-1">Parent Temp Pass</span>
                      <code className="text-slate-800 font-mono font-bold block">{getParentPreviewPassword()}</code>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2 justify-end">
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold uppercase"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={registerLoading}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-bold uppercase shadow-sm"
                  >
                    {registerLoading ? 'Provisioning...' : 'Complete Enrollment'}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Success Credentials Overlay Modal */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-lg flex flex-col overflow-hidden animate-smooth">
            <div className="p-5 bg-blue-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4" /> {createdCredentials.isReset ? "Password Reset Successful" : "Provisioning Credentials Successful"}
                </h3>
              </div>
              <button 
                onClick={() => setCreatedCredentials(null)}
                className="p-1 rounded-lg hover:bg-blue-700 text-white/80 transition-smooth"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 text-xs">
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold uppercase text-[10px] tracking-wider">Account Activated</h4>
                  <p className="font-semibold text-[11px] leading-normal mt-0.5">
                    {createdCredentials.isReset ? "New security credentials have been compiled successfully." : "Student and Parent login accounts have been provisioned in the central directory."}
                  </p>
                </div>
              </div>

              {/* Student credentials card */}
              <div className="p-4 border border-slate-150 rounded-xl flex flex-col gap-2 relative bg-slate-50/50">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block">{createdCredentials.isReset ? "Updated Account Credentials" : "Student Credentials"}</span>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Username / Email:</span>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="font-mono font-bold text-slate-800">{createdCredentials.student_email}</span>
                    <button 
                      onClick={() => handleCopyClipboard(createdCredentials.student_email)}
                      className="p-1 text-slate-400 hover:text-blue-600 transition-smooth"
                      title="Copy Username"
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Temporary Password:</span>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="font-mono font-black text-slate-900">{createdCredentials.student_temp_pass}</span>
                    <button 
                      onClick={() => handleCopyClipboard(createdCredentials.student_temp_pass)}
                      className="p-1 text-slate-400 hover:text-blue-600 transition-smooth"
                      title="Copy Password"
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Parent credentials card */}
              {createdCredentials.parent_email && (
                <div className="p-4 border border-slate-150 rounded-xl flex flex-col gap-2 relative bg-slate-50/50">
                  <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest block">Linked Parent Credentials</span>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Username / Email:</span>
                    <div className="flex justify-between items-center mt-0.5">
                      <span className="font-mono font-bold text-slate-800">{createdCredentials.parent_email}</span>
                      <button 
                        onClick={() => handleCopyClipboard(createdCredentials.parent_email)}
                        className="p-1 text-slate-400 hover:text-purple-600 transition-smooth"
                        title="Copy Username"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {createdCredentials.parent_reused ? (
                    <div className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-100 inline-block mt-0.5 uppercase tracking-wide">
                      Reusing Existing Account
                    </div>
                  ) : (
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Temporary Password:</span>
                      <div className="flex justify-between items-center mt-0.5">
                        <span className="font-mono font-black text-slate-900">{createdCredentials.parent_temp_pass}</span>
                        <button 
                          onClick={() => handleCopyClipboard(createdCredentials.parent_temp_pass)}
                          className="p-1 text-slate-400 hover:text-purple-600 transition-smooth"
                          title="Copy Password"
                        >
                          <Clipboard className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Document download triggers */}
              <div className="pt-2 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => handlePrint(createdCredentials)}
                  className="flex-1 py-2.5 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" /> Print
                </button>
                <button
                  onClick={() => handleDownloadTxt(createdCredentials)}
                  className="flex-1 py-2.5 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" /> TXT
                </button>
                {(createdCredentials.student_pdf || createdCredentials.pdf_path) && (
                  <a
                    href={`http://localhost:5000${createdCredentials.student_pdf || createdCredentials.pdf_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm text-center"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentMonitoring;
