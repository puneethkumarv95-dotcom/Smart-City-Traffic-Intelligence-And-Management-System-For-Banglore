import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import RoleGuard from './components/common/RoleGuard';
import DashboardLayout from './components/layout/DashboardLayout';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Portal Overview Pages
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import PoliceDashboard from './pages/police/PoliceDashboard';
import EmergencyDashboard from './pages/emergency/EmergencyDashboard';
import OperatorDashboard from './pages/operator/OperatorDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

// Phase 2 Modules
import ReportIncidentPage from './pages/citizen/ReportIncidentPage';
import MyReportsPage from './pages/citizen/MyReportsPage';
import ComplaintTrackingPage from './pages/citizen/ComplaintTrackingPage';
import IncidentReviewPage from './pages/police/IncidentReviewPage';
import AdminIncidentManagement from './pages/admin/AdminIncidentManagement';

export function App() {
  const { fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* 1. Citizen Portal Layout & Routes */}
        <Route
          path="/citizen"
          element={
            <RoleGuard allowedRoles={['citizen', 'admin']}>
              <DashboardLayout />
            </RoleGuard>
          }
        >
          <Route index element={<CitizenDashboard />} />
          <Route path="report" element={<ReportIncidentPage />} />
          <Route path="my-reports" element={<MyReportsPage />} />
          <Route path="complaints" element={<ComplaintTrackingPage />} />
          <Route path="map" element={<CitizenDashboard />} />
          <Route path="routes" element={<CitizenDashboard />} />
          <Route path="parking" element={<CitizenDashboard />} />
          <Route path="sos" element={<CitizenDashboard />} />
          <Route path="profile" element={<CitizenDashboard />} />
        </Route>

        {/* 2. Traffic Police Portal Layout & Routes */}
        <Route
          path="/police"
          element={
            <RoleGuard allowedRoles={['police', 'admin']}>
              <DashboardLayout />
            </RoleGuard>
          }
        >
          <Route index element={<PoliceDashboard />} />
          <Route path="queue" element={<IncidentReviewPage />} />
          <Route path="incidents" element={<IncidentReviewPage />} />
          <Route path="closures" element={<PoliceDashboard />} />
          <Route path="zones" element={<PoliceDashboard />} />
          <Route path="advisories" element={<PoliceDashboard />} />
          <Route path="shifts" element={<PoliceDashboard />} />
        </Route>

        {/* 3. Emergency Responder Portal Layout & Routes */}
        <Route
          path="/emergency"
          element={
            <RoleGuard allowedRoles={['emergency', 'admin']}>
              <DashboardLayout />
            </RoleGuard>
          }
        >
          <Route index element={<EmergencyDashboard />} />
          <Route path="active" element={<EmergencyDashboard />} />
          <Route path="routing" element={<EmergencyDashboard />} />
          <Route path="coordination" element={<EmergencyDashboard />} />
        </Route>

        {/* 4. Parking Operator Portal Layout & Routes */}
        <Route
          path="/operator"
          element={
            <RoleGuard allowedRoles={['operator', 'admin']}>
              <DashboardLayout />
            </RoleGuard>
          }
        >
          <Route index element={<OperatorDashboard />} />
          <Route path="slots" element={<OperatorDashboard />} />
          <Route path="reservations" element={<OperatorDashboard />} />
          <Route path="analytics" element={<OperatorDashboard />} />
        </Route>

        {/* 5. Super Administrator Portal Layout & Routes */}
        <Route
          path="/admin"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <DashboardLayout />
            </RoleGuard>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="incidents" element={<AdminIncidentManagement />} />
          <Route path="users" element={<AdminDashboard />} />
          <Route path="approvals" element={<AdminDashboard />} />
          <Route path="zones" element={<AdminDashboard />} />
          <Route path="audit-logs" element={<AdminDashboard />} />
          <Route path="settings" element={<AdminDashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
