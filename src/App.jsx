import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';

// Shell Layout components for parent, driver, student
import SidebarLegacy from './components/Sidebar.jsx';
import NavbarLegacy from './components/Navbar.jsx';
import ErrorBoundary from './components/ErrorBoundary';

// Public Portals
import LandingPage from './pages/LandingPage';
import LoginSelection from './pages/LoginSelection';
import SignUp from './pages/SignUp';
import NotFound from './pages/NotFound';
import PhoneGpsController from './pages/PhoneGpsController';

// Admin Shell & Views
import MainDashboard from './pages/MainDashboard.tsx';
import AdminDashboardTab from './pages/admin/AdminDashboardTab.tsx';
import AdminLiveTrackingTab from './pages/admin/AdminLiveTrackingTab.tsx';
import AdminRoutesTab from './pages/admin/AdminRoutesTab.tsx';
import StudentMonitoring from './pages/admin/StudentMonitoring';
import DriverAnalysis from './pages/admin/DriverAnalysis';
import AdminNotificationsTab from './pages/admin/AdminNotificationsTab.tsx';
import AdminReportsTab from './pages/admin/AdminReportsTab.tsx';
import EmergencyHistory from './pages/admin/EmergencyHistory.tsx';
import AdminSettingsTab from './pages/admin/AdminSettingsTab.tsx';

// Driver view components
import DriverDashboard from './pages/driver/DriverDashboard';
import DriverBoarding from './pages/driver/DriverBoarding';
import DriverSafety from './pages/driver/DriverSafety';

// Parent view components
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentTimeline from './pages/parent/ParentTimeline';

// Student view components
import StudentDashboard from './pages/student/StudentDashboard';
import StudentIDCardPage from './pages/student/StudentIDCardPage';

// Layout wrapper for Parent, Driver, Student dashboards (legacy sidebar/navbar)
const DashboardLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <SidebarLegacy />
      <div className="flex flex-col flex-1 overflow-hidden">
        <NavbarLegacy />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

// Generic Role-Based Protected Route Guard
const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user } = useApp();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role.toUpperCase();

  if (!allowedRoles.includes(role)) {
    // Redirect unauthorized access dynamically to their correct portal
    if (role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (role === 'DRIVER') return <Navigate to="/driver/dashboard" replace />;
    if (role === 'PARENT') return <Navigate to="/parent/dashboard" replace />;
    if (role === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
};

function App() {
  React.useEffect(() => {
    // Intercept accidental F7 Caret Browsing toggle in Chromium/Edge
    const handleKeyDown = (e) => {
      if (e.key === 'F7' || e.keyCode === 118) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public portals */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginSelection />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/gps-controller" element={<PhoneGpsController />} />
          <Route path="/bus-controller" element={<PhoneGpsController />} />
          <Route path="/admin-login" element={<Navigate to="/login" replace />} />

          {/* Admin routes group with full React Router client-side URL routing */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><MainDashboard /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardTab />} />
            <Route path="live-tracking" element={<AdminLiveTrackingTab />} />
            <Route path="routes" element={<AdminRoutesTab />} />
            <Route path="students" element={<StudentMonitoring />} />
            <Route path="students/:id" element={<StudentMonitoring />} />
            <Route path="drivers" element={<DriverAnalysis />} />
            <Route path="drivers/:id" element={<DriverAnalysis />} />
            <Route path="notifications" element={<AdminNotificationsTab />} />
            <Route path="reports" element={<AdminReportsTab />} />
            <Route path="emergency-history" element={<EmergencyHistory />} />
            <Route path="settings" element={<AdminSettingsTab />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Driver routes group */}
          <Route path="/driver" element={<ProtectedRoute allowedRoles={['DRIVER']}><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DriverDashboard />} />
            <Route path="boarding" element={<DriverBoarding />} />
            <Route path="safety" element={<DriverSafety />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Parent routes group */}
          <Route path="/parent" element={<ProtectedRoute allowedRoles={['PARENT']}><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ParentDashboard />} />
            <Route path="timeline" element={<ParentTimeline />} />
            <Route path="id-card" element={<Navigate to="/parent/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Student routes group */}
          <Route path="/student" element={<ProtectedRoute allowedRoles={['STUDENT']}><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="id-card" element={<StudentIDCardPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Default fallback for non-existent routes */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
