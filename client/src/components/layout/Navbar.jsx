import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import {
  Bell,
  Search,
  Globe,
  Radio,
  User,
  LogOut,
  ChevronDown,
  Clock,
  Menu
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuthStore();
  const { toggleMobileSidebar } = useUIStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }) + ' IST'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-city-dark/80 backdrop-blur-xl border-b border-city-border sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Menu Toggle + Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        {/* Mobile Hamburger Button */}
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-city-surface border border-city-border/60 transition-colors"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search intersections, incidents, parking..."
            className="w-full pl-9 pr-4 py-2 bg-city-surface/60 border border-city-border rounded-xl text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Network Status Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>BENGALURU GRID: LIVE</span>
        </div>

        {/* Live Clock */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 bg-city-surface/50 px-3 py-1.5 rounded-xl border border-city-border/60">
          <Clock className="w-3.5 h-3.5 text-electric-light" />
          <span>{currentTime}</span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setProfileOpen(false);
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-city-surface border border-transparent hover:border-city-border transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-city-card border border-city-border rounded-2xl shadow-2xl p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-city-border">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Live Incident Alerts
                </h4>
                <span className="text-[10px] bg-electric/20 text-electric-light px-2 py-0.5 rounded-full font-mono">
                  3 New
                </span>
              </div>
              <div className="py-2 space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-city-surface/60 hover:bg-city-hover cursor-pointer border border-city-border/40 transition-colors">
                  <p className="font-semibold text-slate-200">Hebbal Flyover Congestion</p>
                  <p className="text-[11px] text-slate-400">High volume bottleneck towards Airport corridor.</p>
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">2 mins ago</span>
                </div>
                <div className="p-2.5 rounded-xl bg-city-surface/60 hover:bg-city-hover cursor-pointer border border-city-border/40 transition-colors">
                  <p className="font-semibold text-slate-200">Silk Board Road Repair</p>
                  <p className="text-[11px] text-slate-400">Right lane diversion in effect towards HSR.</p>
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">14 mins ago</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2.5 p-1.5 pr-2 sm:pr-3 rounded-xl hover:bg-city-surface border border-transparent hover:border-city-border transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-electric-dark to-electric flex items-center justify-center text-white font-bold text-xs shadow-md">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-slate-200 leading-tight">
                {user?.name || 'Authorized User'}
              </p>
              <p className="text-[10px] font-mono text-electric-light uppercase tracking-wider">
                {user?.role}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-city-card border border-city-border rounded-2xl shadow-2xl p-2 z-50">
              <div className="px-3 py-2 border-b border-city-border mb-1">
                <p className="text-xs font-semibold text-white">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate font-mono">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-electric/20 text-electric-light">
                  Role: {user?.role}
                </span>
              </div>

              <a
                href={`/${user?.role}/profile`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-city-surface transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile Settings</span>
              </a>

              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
