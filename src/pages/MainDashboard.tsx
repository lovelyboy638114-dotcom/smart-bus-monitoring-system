import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.tsx';
import TopNavbar from '../components/TopNavbar.tsx';
import ErrorBoundary from '../components/ErrorBoundary';
import { useApp } from '../context/AppContext';

const MainDashboard: React.FC = () => {
  const { notifications } = useApp();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <TopNavbar 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          notificationCount={notifications.length}
          onNotificationClick={() => navigate('/admin/notifications')}
        />

        {/* Dynamic Pages Mountpoint */}
        <main className="flex-1 overflow-y-auto p-6 font-sans">
          <ErrorBoundary>
            <Outlet context={{ searchQuery, setSearchQuery }} />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default MainDashboard;
