import React, { useEffect, useState } from 'react';
import StudentIDCard from '../../components/StudentIDCard.tsx';
import { Loader2, ShieldAlert } from 'lucide-react';
import { API_BASE_URL } from '../../config';

const StudentIDCardPage = () => {
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCard = async () => {
      try {
        const username = localStorage.getItem('safebus_user_username') || 'student@happyjourney.ai';
        const response = await fetch(`${API_BASE_URL}/api/v1/student/my-id-card`, {
          headers: {
            'X-User-Role': 'student',
            'X-User-Username': username
          }
        });
        const resJson = await response.json();
        
        if (response.ok && resJson.success) {
          setCardData(resJson.data);
        } else {
          setError(resJson.message || 'Failed to retrieve your student ID Card details.');
        }
      } catch (err) {
        setError('Network error occurred. Please verify backend connectivity.');
      } finally {
        setLoading(false);
      }
    };
    fetchCard();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto h-[calc(100vh-4rem)] overflow-y-auto font-sans items-center justify-center">
      
      {/* Page header */}
      <div className="w-full text-left max-w-xl">
        <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-widest block leading-none">
          Digital ID Wallet
        </span>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide mt-1">My School Identity Card</h2>
        <p className="text-xs text-slate-500 font-medium">View, print, or download your digital PVC identity card badge:</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-wider">Decrypting digital wallet...</span>
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

export default StudentIDCardPage;
