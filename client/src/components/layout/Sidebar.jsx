import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import {
  Activity,
  MapPin,
  AlertTriangle,
  FileText,
  Bookmark,
  Car,
  LifeBuoy,
  User,
  Shield,
  Layers,
  Radio,
  Sliders,
  Calendar,
  Ambulance,
  Navigation,
  Compass,
  ParkingCircle,
  Clock,
  CheckCircle,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  X
} from 'lucide-react';

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    setMobileSidebarOpen(false);
    navigate('/login');
  };

  const handleLinkClick = () => {
    // Automatically close mobile drawer when user navigates
    if (mobileSidebarOpen) {
      setMobileSidebarOpen(false);
    }
  };

  const roleConfigs = {
    citizen: {
      roleTitle: 'Citizen Commuter',
      badgeColor: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10',
      icon: User,
      navItems: [
        { label: 'City Dashboard', path: '/citizen', icon: Activity, exact: true },
        { label: 'Live Traffic Map', path: '/citizen/map', icon: MapPin },
        { label: 'Report Incident', path: '/citizen/report', icon: AlertTriangle },
        { label: 'My Reports', path: '/citizen/my-reports', icon: FileText },
        { label: 'Community Feed', path: '/citizen/complaints', icon: Layers },
        { label: 'Saved Routes', path: '/citizen/routes', icon: Bookmark },
        { label: 'Smart Parking', path: '/citizen/parking', icon: Car },
        { label: 'Emergency SOS', path: '/citizen/sos', icon: LifeBuoy, highlight: true },
        { label: 'My Profile', path: '/citizen/profile', icon: User }
      ]
    },
    police: {
      roleTitle: 'Traffic Police',
      badgeColor: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
      icon: Shield,
      navItems: [
        { label: 'Command Center', path: '/police', icon: Activity, exact: true },
        { label: 'Priority Queue', path: '/police/queue', icon: Radio },
        { label: 'Incident Review', path: '/police/incidents', icon: AlertTriangle },
        { label: 'Road Closures', path: '/police/closures', icon: Sliders },
        { label: 'Zone Monitoring', path: '/police/zones', icon: Layers },
        { label: 'Traffic Advisories', path: '/police/advisories', icon: FileText },
        { label: 'Officer Shifts', path: '/police/shifts', icon: Calendar }
      ]
    },
    emergency: {
      roleTitle: 'Emergency Responder',
      badgeColor: 'border-rose-500/30 text-rose-400 bg-rose-500/10',
      icon: Ambulance,
      navItems: [
        { label: 'Dispatch Console', path: '/emergency', icon: Activity, exact: true },
        { label: 'Active Dispatches', path: '/emergency/active', icon: Ambulance },
        { label: 'Priority Routing', path: '/emergency/routing', icon: Navigation },
        { label: 'Corridor Safety', path: '/emergency/coordination', icon: Compass }
      ]
    },
    operator: {
      roleTitle: 'Parking Operator',
      badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
      icon: ParkingCircle,
      navItems: [
        { label: 'Facility Console', path: '/operator', icon: Activity, exact: true },
        { label: 'Slot Occupancy', path: '/operator/slots', icon: ParkingCircle },
        { label: 'Reservations', path: '/operator/reservations', icon: CheckCircle },
        { label: 'Hourly Analytics', path: '/operator/analytics', icon: Clock }
      ]
    },
    admin: {
      roleTitle: 'Super Administrator',
      badgeColor: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
      icon: Shield,
      navItems: [
        { label: 'City Operations', path: '/admin', icon: Activity, exact: true },
        { label: 'Incident Records', path: '/admin/incidents', icon: AlertTriangle },
        { label: 'User Management', path: '/admin/users', icon: Users },
        { label: 'Officer Approvals', path: '/admin/approvals', icon: CheckCircle },
        { label: 'Traffic Zones', path: '/admin/zones', icon: Building2 },
        { label: 'Security Audit Logs', path: '/admin/audit-logs', icon: FileText },
        { label: 'System Settings', path: '/admin/settings', icon: Settings }
      ]
    }
  };

  const currentConfig = roleConfigs[user?.role] || roleConfigs.citizen;
  const RoleIcon = currentConfig.icon;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 bg-city-dark/95 backdrop-blur-xl border-r border-city-border flex flex-col transition-all duration-300 ${
          mobileSidebarOpen
            ? 'translate-x-0 w-64'
            : '-translate-x-full md:translate-x-0 ' + (collapsed ? 'md:w-20' : 'md:w-64')
        }`}
      >
        {/* Brand & System Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-city-border">
          {(!collapsed || mobileSidebarOpen) && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-electric/20 border border-electric/40 flex items-center justify-center text-electric-light flex-shrink-0">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div className="truncate">
                <h1 className="font-bold text-sm tracking-wide text-white leading-tight">
                  SCTIMS
                </h1>
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                  Bengaluru Transit
                </p>
              </div>
            </div>
          )}

          {collapsed && !mobileSidebarOpen && (
            <div className="w-full flex justify-center">
              <div className="w-10 h-10 rounded-xl bg-electric/20 border border-electric/40 flex items-center justify-center text-electric-light">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          )}

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`hidden md:block p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-city-surface transition-colors ${
              collapsed ? 'hidden' : 'block'
            }`}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-city-surface transition-colors"
            title="Close Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Pill Banner */}
        {(!collapsed || mobileSidebarOpen) ? (
          <div className="px-4 py-3 border-b border-city-border/60 bg-city-surface/30">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg border ${currentConfig.badgeColor}`}>
                <RoleIcon className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {currentConfig.roleTitle}
                </p>
                <p className="text-[11px] text-slate-400 font-mono truncate">
                  {user?.name?.split(' ')[0] || 'User'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 border-b border-city-border/60 flex justify-center">
            <div className={`p-2 rounded-lg border ${currentConfig.badgeColor}`} title={currentConfig.roleTitle}>
              <RoleIcon className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {currentConfig.navItems.map((item) => {
            const ItemIcon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? item.highlight
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                        : 'bg-electric text-white shadow-lg shadow-electric/25'
                      : item.highlight
                      ? 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-city-surface/70'
                  } ${collapsed && !mobileSidebarOpen ? 'justify-center px-0' : ''}`
                }
                title={collapsed && !mobileSidebarOpen ? item.label : undefined}
              >
                <ItemIcon className={`w-4 h-4 flex-shrink-0 ${item.highlight ? 'animate-pulse' : ''}`} />
                {(!collapsed || mobileSidebarOpen) && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse Toggle for Mini Mode (Desktop only) */}
        {collapsed && !mobileSidebarOpen && (
          <div className="hidden md:flex p-3 border-t border-city-border justify-center">
            <button
              onClick={() => setCollapsed(false)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-city-surface transition-colors"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* User Footer / Quick Logout */}
        <div className="p-3 border-t border-city-border bg-city-darkest/40">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ${
              collapsed && !mobileSidebarOpen ? 'justify-center px-0' : ''
            }`}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {(!collapsed || mobileSidebarOpen) && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
