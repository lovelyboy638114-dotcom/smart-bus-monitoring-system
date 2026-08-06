import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';

// Shell Layout components for parent, driver, student
import SidebarLegacy from './components/Sidebar.jsx';
import NavbarLegacy from './components/Navbar.jsx';

// Pages
import LandingPage from './pages/LandingPage';
import LoginSelection from './pages/LoginSelection';
import SignUp from './pages/SignUp';
import AdminLogin from './pages/AdminLogin';

// Pages Admin
import MainDashboard from './pages/MainDashboard.tsx';

// Driver view components
import DriverDashboard from './pages/driver/DriverDashboard';
import DriverBoarding from './pages/driver/DriverBoarding';
import DriverSafety from './pages/driver/DriverSafety';

// Parent view components
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentTimeline from './pages/parent/ParentTimeline';
import ChildIDCardPage from './pages/parent/ChildIDCardPage';

// Student view components
import StudentDashboard from './pages/student/StudentDashboard';
import StudentIDCardPage from './pages/student/StudentIDCardPage';

// Layout wrapper for Parent, Driver, Student dashboards (legacy sidebar/navbar)
const DashboardLayout = () => {
  const { userRole } = useApp();

  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <SidebarLegacy />
      <div className="flex flex-col flex-1 overflow-hidden">
        <NavbarLegacy />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Admin route guard to render the high-fidelity MainDashboard directly
const AdminGuard = () => {
  const { userRole } = useApp();

  if (userRole !== 'admin') {
    return <Navigate to="/admin-login" replace />;
  }

  return <MainDashboard />;
};

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public portals */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginSelection />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/admin-login" element={<AdminLogin />} />

          {/* Admin routes (Main TSX Telematics Dashboard) */}
          <Route path="/admin" element={<AdminGuard />} />
          <Route path="/admin/dashboard" element={<AdminGuard />} />

          {/* Driver routes group */}
          <Route path="/driver" element={<DashboardLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DriverDashboard />} />
            <Route path="boarding" element={<DriverBoarding />} />
            <Route path="safety" element={<DriverSafety />} />
          </Route>

          {/* Parent routes group */}
          <Route path="/parent" element={<DashboardLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ParentDashboard />} />
            <Route path="timeline" element={<ParentTimeline />} />
            <Route path="id-card" element={<ChildIDCardPage />} />
          </Route>

          {/* Student routes group */}
          <Route path="/student" element={<DashboardLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="id-card" element={<StudentIDCardPage />} />
          </Route>

          {/* Default redirect fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
