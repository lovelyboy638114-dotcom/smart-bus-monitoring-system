import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import StudentIDCard from '../../components/StudentIDCard.tsx';
import { Loader2, ShieldAlert } from 'lucide-react';
import { API_BASE_URL } from '../../config';

const ChildIDCardPage = () => {
  const { parentSelfStudentId, students } = useApp();
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedStudent = students.find(s => s.id === parentSelfStudentId) || students[0] || {
    id: '',
    name: 'Student',
    rollNo: '',
    assignedBus: 'Bus 1',
    pickupStop: 'Gandhipuram Bus Stand',
    attendance: 'Not Checked In',
    parentContact: '',
    status: 'Waiting',
    avatarUrl: ''
  };

  useEffect(() => {
    if (!parentSelfStudentId) return;
    
    const fetchCard = async () => {
      setLoading(true);
      setError('');
      try {
        const username = localStorage.getItem('safebus_user_username') || 'parent@happyjourney.ai';
        const response = await fetch(`${API_BASE_URL}/api/v1/parent/student-id-card/${parentSelfStudentId}`, {
          headers: {
            'X-User-Role': 'parent',
            'X-User-Username': username
          }
        });
        const resJson = await response.json();
        
        if (response.ok && resJson.success) {
          setCardData(resJson.data);
        } else {
          setError(resJson.message || "Failed to retrieve this student's ID Card details.");
        }
      } catch (err) {
        setError('Network error occurred. Please verify backend connectivity.');
      } finally {
        setLoading(false);
      }
    };
    fetchCard();
  }, [parentSelfStudentId]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto h-[calc(100vh-4rem)] overflow-y-auto font-sans items-center justify-center">
      
      {/* Page header */}
      <div className="w-full text-left max-w-xl flex flex-wrap justify-between items-center gap-4">
        <div>
          <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-widest block leading-none">
            Family Safety Console
          </span>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide mt-1">Child Digital ID Badge</h2>
          <p className="text-xs text-slate-500 font-medium">Monitor or print the physical PVC identity card for your child:</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-wider">Loading digital badge...</span>
        </div>
      ) : error ? (
        <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col items-center text-center gap-3 text-rose-800 max-w-md shadow-sm">
          <ShieldAlert className="w-10 h-10 text-rose-600 animate-bounce" />
          <h4 className="text-sm font-black uppercase tracking-wide">Secure Access Error</h4>
          <p className="text-xs font-semibold leading-normal">{error}</p>
        </div>
      ) : cardData ? (
        <StudentIDCard studentData={cardData} />
      ) : null}

    </div>
  );
};

export default ChildIDCardPage;
