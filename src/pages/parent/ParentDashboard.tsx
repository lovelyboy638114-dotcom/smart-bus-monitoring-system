import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import LeafletMap from '../../components/LeafletMap.tsx';
import StudentIDCard from '../../components/StudentIDCard.tsx';
import { 
  Navigation, Compass, AlertTriangle, Send, BellRing, 
  CheckCircle, UserCheck, ShieldAlert, X, ChevronRight, Bus
} from 'lucide-react';

// Haversine formula to compute distance in km
const getDistanceKm = (c1: { lat: number; lng: number }, c2: { lat: number; lng: number }): number => {
  const R = 6371; 
  const dLat = (c2.lat - c1.lat) * Math.PI / 180;
  const dLng = (c2.lng - c1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(c1.lat * Math.PI / 180) * Math.cos(c2.lat * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const ParentDashboard: React.FC = () => {
  const { 
    students, 
    buses, 
    notifications,
    simTime,
    parentSelfStudentId, 
    setParentSelfStudentId,
    sendDriverMessage, 
    submitComplaint 
  } = useApp();

  const [success, setSuccess] = useState('');
  
  // Announcement fields
  const [attendanceStatus, setAttendanceStatus] = useState<'coming' | 'absent'>('coming');
  const [attendanceNote, setAttendanceNote] = useState('');

  // Chatbot State
  const [isBotOpen, setIsBotOpen] = useState(false);
  const [botMessages, setBotMessages] = useState([
    { sender: 'bot', text: 'Hello! I am your SafeBus AI Assistant. Do you have a complaint regarding your driver? Please describe it below, and I will report it to the administrator immediately.' }
  ]);
  const [botInput, setBotInput] = useState('');

  const parentId = localStorage.getItem('safebus_parent_id');
  const parentPhone = localStorage.getItem('safebus_user_phone');
  
  const myChildren = students.filter(s => {
    if (parentId && s.parentId === Number(parentId)) return true;
    if (parentPhone && s.parentContact && s.parentContact.replace(/\s+/g, '') === parentPhone.replace(/\s+/g, '')) return true;
    return false;
  });

  React.useEffect(() => {
    if (!parentSelfStudentId && myChildren.length > 0) {
      setParentSelfStudentId(myChildren[0].id);
    }
  }, [parentSelfStudentId, myChildren, setParentSelfStudentId]);

  // Selected Student Profile
  const student = myChildren.find((s) => s.id === parentSelfStudentId) || myChildren[0];
  
  const idCardData = student ? {
    student_id: student.id,
    name: student.name,
    rollNo: student.rollNo,
    class_name: student.class || 'Grade 10',
    admission_no: student.rollNo || student.id,
    front_path: student.id_card_front_path || null,
    back_path: student.id_card_back_path || null,
    pdf_path: student.id_card_pdf_path || null,
    version: student.id_card_version || 1,
    status: student.id_card_status || 'ACTIVE',
    generated_at: student.assigned_at ? new Date(student.assigned_at).toISOString() : null
  } : null;

  const bus = student ? (buses.find((b) => b.id === student.assignedBus || b.id === (student.assignedBus === "Bus 1" ? "TN38AB1234" : student.assignedBus === "Bus 2" ? "TN38CD5678" : "TN38EP9012")) || buses[0]) : null;
  const busVal = bus || {
    id: 'Bus 1',
    name: 'Bus 1',
    routeNumber: 'R-01 (North Loop)',
    status: 'Stopped',
    speed: 0,
    eta: '--',
    battery: 92,
    currentStopIndex: 0,
    path: [{ lat: 11.0168, lng: 76.9558 }],
    stops: [{ name: 'Gandhipuram Bus Stand', lat: 11.0168, lng: 76.9558 }],
    color: '#2563eb',
    students: []
  };

  // Calculate live distance to stop (checks live tracking coordinate currentLocation first)
  const busPos = busVal.currentLocation || busVal.path[busVal.currentStopIndex] || busVal.stops[0];
  const stopItem = student ? (busVal.stops.find(s => s.name === student.pickupStop) || busVal.stops[0]) : busVal.stops[0];
  const distanceAway = getDistanceKm(busPos, { lat: stopItem.lat, lng: stopItem.lng });

  // Calculate dynamic next stop name
  const nextStopIdx = Math.min(busVal.stops.length - 1, Math.ceil(busVal.currentStopIndex / 40));
  const nextStopName = busVal.stops[nextStopIdx]?.name || "Destination School";

  // Calculate dynamic ETA based on speed and distance away
  const calculateDynamicETA = () => {
    if (busVal.status !== 'Running') return "Awaiting start";
    if (busVal.speed <= 0) return "Delayed (Stopped)";
    const mins = Math.round((distanceAway / busVal.speed) * 60);
    if (mins <= 1) return "Arriving now";
    return busVal.status === 'Delayed' ? `${mins} mins (Delayed)` : `${mins} mins`;
  };
  const dynamicETA = calculateDynamicETA();

  // Filter logs relevant to this student's bus
  const relevantNotifications = student ? notifications.filter(n => 
    n.message.includes(busVal.id) || n.message.includes(student.name) || n.message.includes(student.pickupStop)
  ) : [];

  const handleSendDriverMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    
    const statusLabel = attendanceStatus === 'coming' ? '🟢 COMING' : '🔴 ABSENT (Do not wait)';
    const textMsg = `[${statusLabel}] ${attendanceNote || 'No additional note.'}`;
    
    sendDriverMessage(student.id, student.name, attendanceStatus, textMsg);
    
    setSuccess(`Status update successfully sent to Driver ${bus.driverName}!`);
    setAttendanceNote('');
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleSendBotMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!botInput.trim()) return;

    const userText = botInput.trim();
    setBotMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setBotInput('');

    // Log complaint
    submitComplaint(
      "Parent Profile",
      student.name,
      bus.driverName,
      bus.id,
      userText
    );

    setTimeout(() => {
      setBotMessages(prev => [
        ...prev,
        { 
          sender: 'bot', 
          text: `Thank you. I have registered your complaint against Driver ${busVal.driverName} (Bus ${busVal.id}). Reference ID: #SB-COMP-${Math.floor(Math.random() * 900) + 100}` 
        }
      ]);
    }, 800);
  };

  if (myChildren.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto h-[calc(100vh-4rem)] overflow-y-auto font-sans items-center justify-center text-center">
        <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-lg max-w-md">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">No Linked Students Found</h3>
          <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
            We could not locate any active pupil profiles linked to your parent credentials. Please contact Karpagam College of Engineering administration to link your phone/email to your child's student registry.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto h-[calc(100vh-4rem)] overflow-y-auto font-sans relative">
      
      {/* Selector to switch pupil profiles to test all 3 buses */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="text-left">
          <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-widest block leading-none">
            Demo Portal Configuration
          </span>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mt-1">Select Pupil Profile</h3>
        </div>
        <div className="flex gap-2">
          {myChildren.map(s => (
            <button
              key={s.id}
              onClick={() => setParentSelfStudentId(s.id)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
                parentSelfStudentId === s.id
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s.name} ({s.assignedBus})
            </button>
          ))}
        </div>
      </div>

      {/* Main Details and Live Map */}
      {student && (student.status === 'BUS_PENDING' || student.assignedBus === 'BUS_PENDING' || student.assignment_status === 'BUS_PENDING') && (
        <div className="bg-amber-50 border border-amber-250/70 p-4 rounded-2xl flex items-start gap-3 text-left mb-2 shadow-soft">
          <div className="p-2 bg-amber-100 rounded-xl text-amber-800 font-black text-xs">⚠️</div>
          <div>
            <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">Bus Assignment Pending Verification</h4>
            <p className="text-[10.5px] text-amber-800/90 font-bold mt-1 leading-relaxed">
              SafeBus AI is finalizing the transportation schedule for {student.name}. The automatic geocoding system has matched or placed the account in review due to distance checks or bus capacity limits. The administration has been notified to complete the assignment manually.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Student Transit telemetry */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-left">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Pupil Status</span>
            <div className="flex items-center gap-3 mt-2">
              <img src={student.avatarUrl} alt={student.name} className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100" />
              <div>
                <h4 className="text-sm font-black text-slate-900 leading-none">{student.name}</h4>
                <span className="text-[9px] text-slate-500 font-bold block mt-1">ID: {student.id}</span>
              </div>
            </div>

            <div className="mt-4 space-y-3.5 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-650">
              <div className="flex justify-between">
                <span>Student Name:</span>
                <span className="font-bold text-slate-850">{student.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Bus Number:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  student.assignedBus === 'BUS_PENDING' || student.status === 'BUS_PENDING'
                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                    : 'text-slate-850 font-bold'
                }`}>
                  {student.assignedBus === 'BUS_PENDING' || student.status === 'BUS_PENDING' ? 'PENDING' : student.assignedBus}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Next Stop:</span>
                <span className="font-bold text-blue-600 truncate max-w-[150px]">
                  {student.assignedBus === 'BUS_PENDING' || student.status === 'BUS_PENDING' ? 'PENDING' : nextStopName}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pickup Stop:</span>
                <span className="font-bold text-slate-850 truncate max-w-[150px]">
                  {student.assignedBus === 'BUS_PENDING' || student.status === 'BUS_PENDING' ? 'PENDING (Calculating)' : student.pickupStop}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Stop Distance to Home:</span>
                <span className="font-bold text-indigo-600 font-mono">
                  {student.pickup_distance !== undefined && student.pickup_distance !== null
                    ? `${Math.round(student.pickup_distance)} meters`
                    : 'Manual / Pending'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Distance to Stop:</span>
                <span className="font-bold text-slate-850 font-mono">
                  {bus && bus.status === 'Running' && student.status !== 'BUS_PENDING' ? `${distanceAway.toFixed(2)} km` : '--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Current Location:</span>
                <span className="font-bold text-slate-850 font-mono text-[10px]">
                  {bus && bus.status === 'Running' && student.status !== 'BUS_PENDING'
                    ? `${busPos.lat.toFixed(4)}° N, ${busPos.lng.toFixed(4)}° E` 
                    : 'Depot'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Speed:</span>
                <span className="font-bold text-slate-850 font-mono">
                  {bus && bus.status === 'Running' && student.status !== 'BUS_PENDING' ? `${bus.speed} km/h` : '0 km/h'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ETA to Stop:</span>
                <span className="font-bold text-emerald-600 font-mono">
                  {student.status === 'BUS_PENDING' ? 'Pending assignment' : dynamicETA}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Bus Status:</span>
                <span className={`px-2 py-0.5 text-[8.5px] font-black uppercase rounded ${
                  bus && bus.status === 'Running' && student.status !== 'BUS_PENDING'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : bus && bus.status === 'Delayed' && student.status !== 'BUS_PENDING'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {student.status === 'BUS_PENDING' ? 'PENDING' : (bus ? bus.status : 'Stopped')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="font-bold text-slate-500 font-mono">{simTime}</span>
              </div>
              <div className="flex justify-between">
                <span>Boarding Status:</span>
                <span className={`px-2 py-0.5 text-[8.5px] font-black uppercase rounded ${
                  student.status === 'On Board'
                    ? 'bg-amber-100 text-amber-800 animate-pulse'
                    : student.status === 'Dropped'
                    ? 'bg-emerald-100 text-emerald-800'
                    : student.status === 'BUS_PENDING'
                    ? 'bg-amber-50 text-amber-705 border border-amber-200'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {student.status}
                </span>
              </div>
            </div>
          </div>

          {/* Boarding Pass QR Card */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4">
              Pupil Boarding pass QR
            </span>
            <div className="p-4 bg-white border border-slate-150 rounded-2xl inline-block shadow-sm">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(
                  `=== SafeBus AI - Student ID ===\nID: ${student.id}\nName: ${student.name}\nRoll No: ${student.rollNo}\nClass: ${student.class || 'Grade 10'}\nStatus: ACTIVE`
                )}`} 
                alt="Pupil Pass QR"
                className="w-32 h-32"
              />
            </div>
            <p className="text-[10px] text-slate-450 font-medium leading-normal mt-3">
              Scan this boarding pass at the bus reader to check-in.
            </p>
          </div>

          {/* Quick skip announcement panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4 text-left">
            <div>
              <span className="text-[8px] font-extrabold text-blue-500 uppercase tracking-widest block mb-0.5">Alert Driver</span>
              <h4 className="text-xs font-black text-slate-805">Attendance Announcements</h4>
            </div>

            <form onSubmit={handleSendDriverMessage} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => setAttendanceStatus('coming')}
                  className={`py-2 font-bold rounded-lg border transition-all ${
                    attendanceStatus === 'coming'
                      ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  🟢 Coming Today
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceStatus('absent')}
                  className={`py-2 font-bold rounded-lg border transition-all ${
                    attendanceStatus === 'absent'
                      ? 'bg-rose-50 border-rose-250 text-rose-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  🔴 Absent (Skip)
                </button>
              </div>

              <input
                type="text"
                value={attendanceNote}
                onChange={(e) => setAttendanceNote(e.target.value)}
                placeholder="Message (e.g. Please wait 1 min)"
                className="w-full px-2.5 py-2 bg-slate-50 text-slate-800 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:outline-none transition-smooth"
              />

              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <Send className="w-3 h-3" />
                <span>Send Note</span>
              </button>
            </form>
          </div>

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}
        </div>

        {/* Right column: Interactive Map and Notification feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="h-[300px]">
            <LeafletMap buses={buses} selectedBusId={bus.id} />
          </div>

          {/* Child ID Badge Card */}
          {idCardData && (
            <div className="flex justify-center bg-white border border-slate-200 p-4 rounded-2xl shadow-sm overflow-hidden">
              <StudentIDCard studentData={idCardData} />
            </div>
          )}

          {/* Student Notifications History panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-left flex flex-col min-h-[180px]">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200/60 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Transit Alerts Feed</h3>
            </div>
            
            <div className="p-4 space-y-2.5 max-h-[160px] overflow-y-auto">
              {relevantNotifications.length === 0 ? (
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center py-6">
                  No alerts received for this route yet.
                </p>
              ) : (
                relevantNotifications.map((notif) => (
                  <div key={notif.id} className="p-2.5 border border-slate-100 bg-slate-50/50 rounded-xl flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{notif.message}</span>
                    <span className="text-[9px] font-mono text-slate-400 font-bold shrink-0">{notif.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* FLOATING COMPLAINT CHATBOT WIDGET */}
      <div className="fixed bottom-6 right-6 z-50 font-sans flex flex-col items-end">
        {isBotOpen ? (
          <div className="w-80 h-96 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col transition-all duration-300 transform scale-100 origin-bottom-right">
            <div className="bg-[#081F4D] text-white p-3.5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4.5 h-4.5 text-blue-300 animate-pulse" />
                <h4 className="text-xs font-black tracking-wide leading-none">SafeBus Safety Bot</h4>
              </div>
              <button onClick={() => setIsBotOpen(false)} className="text-slate-350 hover:text-white transition-smooth">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto bg-slate-50 flex flex-col gap-2 text-[11px] font-medium text-slate-700">
              {botMessages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`max-w-[80%] p-2 rounded-xl leading-normal ${
                    msg.sender === 'bot' 
                      ? 'bg-white text-slate-805 border border-slate-200/50 self-start rounded-tl-none' 
                      : 'bg-blue-600 text-white self-end rounded-tr-none font-semibold'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendBotMessage} className="p-2 border-t border-slate-200 bg-white flex gap-2 items-center">
              <input
                type="text"
                required
                value={botInput}
                onChange={(e) => setBotInput(e.target.value)}
                placeholder="Log driver complaint..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none transition-smooth"
              />
              <button type="submit" className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center shrink-0">
                <ChevronRight className="w-4.5 h-4.5" />
              </button>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setIsBotOpen(true)}
            className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-smooth hover:scale-105"
          >
            <ShieldAlert className="w-5 h-5" />
          </button>
        )}
      </div>

    </div>
  );
};

export default ParentDashboard;
