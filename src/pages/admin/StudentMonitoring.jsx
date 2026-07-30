import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Users, Phone, MapPin, CheckCircle, Clock, ChevronRight, X, Sparkles } from 'lucide-react';

const StudentMonitoring = () => {
  const { students, handleStudentBoarding } = useApp();
  const [selectedStudent, setSelectedStudent] = useState(null);

  const getStatusBadge = (student) => {
    if (student.reachedHome) return <span className="px-2 py-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full uppercase">Home (Completed)</span>;
    if (student.boardedReturn) return <span className="px-2 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full uppercase animate-pulse">Transit Home</span>;
    if (student.reachedSchool) return <span className="px-2 py-0.5 text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full uppercase">At School</span>;
    if (student.boarded) return <span className="px-2 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full uppercase animate-pulse">Transit School</span>;
    return <span className="px-2 py-0.5 text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-full uppercase">Waiting</span>;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 h-[calc(100vh-4rem)] overflow-hidden">
      
      {/* Student Table Registry */}
      <div className="flex-1 bg-white border border-slate-100 rounded-2xl flex flex-col overflow-hidden shadow-soft">
        
        {/* Registry Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Student Transit Registry</h3>
            <p className="text-[10px] text-slate-400 font-medium">Monitor live boarding checklists and safety status reports:</p>
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200/80 px-2 py-1 rounded-xl text-[9px] font-bold text-slate-500">
            <Users className="w-3.5 h-3.5" />
            <span>Total Enrolled: {students.length}</span>
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
                  <td className="py-3.5 px-6 font-mono text-[10px] text-slate-500">{student.busId}</td>
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
            <div className="flex gap-4 items-center">
              <div className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-md shadow-blue-500/10">
                {selectedStudent.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 leading-tight">{selectedStudent.name}</h4>
                <p className="text-xs text-slate-400 font-bold uppercase mt-1">Roll No: #{selectedStudent.rollNo} | Class {selectedStudent.class}</p>
              </div>
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

            {/* Boarding timeline */}
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

            {/* Operator simulator overrides controls */}
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

          </div>
        </div>
      )}

    </div>
  );
};

export default StudentMonitoring;
