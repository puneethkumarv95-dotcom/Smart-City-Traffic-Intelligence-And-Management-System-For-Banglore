import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Shield,
  Ambulance,
  Car,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Radio,
  Cpu
} from 'lucide-react';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-city-darkest text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="h-20 border-b border-city-border/80 px-6 lg:px-12 flex items-center justify-between glass-panel sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-electric/20 border border-electric/40 flex items-center justify-center text-electric-light">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-wider text-white">SCTIMS</span>
            <span className="ml-2 text-xs font-mono uppercase text-electric-light bg-electric/15 px-2 py-0.5 rounded-full border border-electric/30">
              Bengaluru Node
            </span>
            <p className="text-[11px] text-slate-400">Smart City Traffic Intelligence & Management System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-electric hover:bg-electric-dark shadow-lg shadow-electric/25 transition-all flex items-center gap-2"
          >
            <span>Access Operations Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-electric/10 blur-[130px] rounded-full pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-electric/10 border border-electric/30 text-electric-light text-xs font-mono mb-6">
          <span className="w-2 h-2 rounded-full bg-electric animate-ping"></span>
          <span>ENTERPRISE URBAN MOBILITY PLATFORM • 42 REAL-TIME CAPABILITIES</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl leading-tight">
          Intelligent Real-Time Traffic & Emergency Dispatch for{' '}
          <span className="bg-gradient-to-r from-electric-light via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Bengaluru Smart City
          </span>
        </h1>

        <p className="mt-6 text-slate-300 max-w-2xl text-base sm:text-lg leading-relaxed">
          Unified operational platform connecting citizens, traffic police, emergency ambulances, and parking operators. Powered by GeoJSON geospatial analytics, computer vision vehicle telemetry, and automated incident response workflows.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/login"
            className="px-8 py-3.5 rounded-xl font-semibold text-sm text-white bg-electric hover:bg-electric-dark shadow-xl shadow-electric/30 transition-all flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            <span>Launch Operator Console</span>
          </Link>

          <Link
            to="/register"
            className="px-8 py-3.5 rounded-xl font-semibold text-sm text-slate-200 bg-city-card hover:bg-city-hover border border-city-border transition-all flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Register as Citizen</span>
          </Link>
        </div>

        {/* Live Network Snapshot Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 w-full max-w-5xl">
          <div className="bg-city-card/80 border border-city-border p-5 rounded-2xl text-left">
            <span className="text-xs text-slate-400 font-mono">BENGALURU ZONES</span>
            <p className="text-2xl font-bold font-mono text-white mt-1">6 Monitored</p>
            <p className="text-[11px] text-emerald-400 mt-2">Hebbal, Silk Board, Whitefield...</p>
          </div>
          <div className="bg-city-card/80 border border-city-border p-5 rounded-2xl text-left">
            <span className="text-xs text-slate-400 font-mono">DISPATCH SLA</span>
            <p className="text-2xl font-bold font-mono text-white mt-1">&lt; 4.2 Mins</p>
            <p className="text-[11px] text-electric-light mt-2">Automated Incident Escalation</p>
          </div>
          <div className="bg-city-card/80 border border-city-border p-5 rounded-2xl text-left">
            <span className="text-xs text-slate-400 font-mono">SMART PARKING</span>
            <p className="text-2xl font-bold font-mono text-white mt-1">1,420 Slots</p>
            <p className="text-[11px] text-emerald-400 mt-2">Real-Time Occupancy Telemetry</p>
          </div>
          <div className="bg-city-card/80 border border-city-border p-5 rounded-2xl text-left">
            <span className="text-xs text-slate-400 font-mono">AI CONGESTION MODEL</span>
            <p className="text-2xl font-bold font-mono text-white mt-1">94.8% Conf.</p>
            <p className="text-[11px] text-purple-400 mt-2">FastAPI Microservice Engine</p>
          </div>
        </div>
      </section>

      {/* 5 Distinct Roles Section */}
      <section className="py-16 px-6 lg:px-12 bg-city-dark/60 border-t border-city-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Five Dedicated Operational Portals
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Role-Based Access Control enforcing least privilege across municipal stakeholders
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {/* Citizen */}
            <div className="bg-city-card border border-city-border hover:border-cyan-500/50 p-6 rounded-2xl flex flex-col justify-between transition-all">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Citizen</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Report potholes and hazards with GPS, upload media, vote to confirm incidents, view live congestion map, and request parking.
                </p>
              </div>
              <Link to="/login" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                <span>Citizen Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Traffic Police */}
            <div className="bg-city-card border border-city-border hover:border-blue-500/50 p-6 rounded-2xl flex flex-col justify-between transition-all">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Traffic Police</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Live command center, incident verification & team assignment, road closure advisories, priority triage queue, and shift monitoring.
                </p>
              </div>
              <Link to="/login" className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                <span>Police Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Emergency Responder */}
            <div className="bg-city-card border border-city-border hover:border-rose-500/50 p-6 rounded-2xl flex flex-col justify-between transition-all">
              <div>
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
                  <Ambulance className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Emergency Responder</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  108 GVK dispatch interface, priority corridor green routing simulation, live route clearance, and hospital coordination.
                </p>
              </div>
              <Link to="/login" className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1">
                <span>Dispatch Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Parking Operator */}
            <div className="bg-city-card border border-city-border hover:border-emerald-500/50 p-6 rounded-2xl flex flex-col justify-between transition-all">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4">
                  <Car className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Parking Operator</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Multi-level parking facility management, live slot availability sensors, commuter reservations, and hourly turnover analytics.
                </p>
              </div>
              <Link to="/login" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                <span>Operator Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Super Admin */}
            <div className="bg-city-card border border-city-border hover:border-purple-500/50 p-6 rounded-2xl flex flex-col justify-between transition-all">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-4">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Super Admin</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  System audit log inspector, officer authorization approvals, zone boundary configuration, category schemas, and global settings.
                </p>
              </div>
              <Link to="/login" className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1">
                <span>Admin Suite</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

