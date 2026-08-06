import React from 'react';
import { useApp } from '../../context/AppContext';
import { Calendar, CheckSquare, Clock, MapPin, Award } from 'lucide-react';

const ParentTimeline = () => {
  const { students, parentSelfStudentId } = useApp();

  const student = students.find((s) => s.id === parentSelfStudentId) || students[0] || {
    id: '',
    name: 'Student',
    rollNo: '',
    assignedBus: 'Bus 1',
    pickupStop: 'Gandhipuram Bus Stand',
    attendance: 'Not Checked In',
    parentContact: '',
    status: 'Waiting',
    avatarUrl: '',
    boarded: false,
    reachedSchool: false,
    boardedReturn: false,
    reachedHome: false
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto h-[calc(100vh-4rem)] overflow-y-auto font-sans">
      
      {/* View Header */}
      <div>
        <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-widest block leading-none">
          Activity Logs
        </span>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide mt-1">Journey Timeline</h2>
        <p className="text-xs text-slate-500 font-medium">Verify your child's boarding timeline check-in events history:</p>
      </div>

      {/* Attendance Stats Overview */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-soft flex items-center justify-between gap-6">
        <div>
          <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
            Month-to-Date Attendance
          </span>
          <h3 className="text-base font-black text-slate-850">Pupil Attendance Rate</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">Monthly academic verification compliance.</p>
          
          <div className="mt-3.5 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-extrabold uppercase text-emerald-600">Total days present: 18 / 19</span>
          </div>
        </div>

        <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="32" cy="32" r="28" fill="none" className="stroke-slate-100 stroke-[4]" />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              className="stroke-[5] stroke-emerald-500"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - 0.947)}`}
            />
          </svg>
          <span className="absolute text-xs font-black text-slate-800">94.7%</span>
        </div>
      </div>

      {/* Active Daily Timeline */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-soft">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-5">Today's Journey Timeline</h3>
        
        <div className="relative border-l border-slate-200 pl-4 ml-2.5 flex flex-col gap-6 text-xs">
          
          {/* Step 1 */}
          <div className="relative">
            <span className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full border border-white ${student.boarded ? 'bg-emerald-500' : 'bg-slate-350'}`} />
            <div>
              <h5 className="font-bold text-slate-850 leading-none">Morning Bus Boarding Check-in</h5>
              <p className="text-[10px] text-slate-500 mt-1">
                {student.boarded 
                  ? `QR scanned successfully at ${student.boardedTime}` 
                  : 'Awaiting student check-in boarding'}
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <span className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full border border-white ${student.reachedSchool ? 'bg-emerald-500' : 'bg-slate-350'}`} />
            <div>
              <h5 className="font-bold text-slate-850 leading-none">School Entrance Drop-off Verification</h5>
              <p className="text-[10px] text-slate-500 mt-1">
                {student.reachedSchool 
                  ? 'Face Recognition verified arrival at campus entrance.' 
                  : 'Bus in transit to school campus.'}
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <span className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full border border-white ${student.boardedReturn ? 'bg-emerald-500' : 'bg-slate-350'}`} />
            <div>
              <h5 className="font-bold text-slate-850 leading-none">Afternoon Bus Boarding Check-in</h5>
              <p className="text-[10px] text-slate-500 mt-1">
                {student.boardedReturn 
                  ? 'QR check-in completed boarding return trip.' 
                  : 'Awaiting afternoon shift departure.'}
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative">
            <span className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full border border-white ${student.reachedHome ? 'bg-emerald-500' : 'bg-slate-350'}`} />
            <div>
              <h5 className="font-bold text-slate-850 leading-none">Home Drop-off Verification</h5>
              <p className="text-[10px] text-slate-500 mt-1">
                {student.reachedHome 
                  ? 'Pupil checked-out safely at home stop coordinates.' 
                  : 'Awaiting journey completion.'}
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default ParentTimeline;
