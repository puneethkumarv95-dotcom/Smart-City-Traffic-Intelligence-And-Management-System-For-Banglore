import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import {
  Shield,
  Users,
  Building2,
  FileText,
  Settings,
  Cpu,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Activity,
  Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboard = () => {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Super Admin Banner */}
      <div className="bg-city-card border border-purple-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-purple-500/10 blur-3xl pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="purple" size="sm">MUNICIPAL SMART MOBILITY DIRECTORATE</Badge>
            <span className="text-xs font-mono text-purple-400">Chief Executive Oversight</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Super Administrator Operations — {user?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Global governance, RBAC clearance approvals, city zone boundaries & security audit trail
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/users"
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span>Manage Access & Roles</span>
          </Link>
          <Link
            to="/admin/audit-logs"
            className="px-5 py-2.5 rounded-xl bg-city-surface hover:bg-city-hover border border-city-border text-slate-200 text-xs font-semibold transition-all flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-purple-300" />
            <span>Audit Logs</span>
          </Link>
        </div>
      </div>

      {/* Admin Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active System Users"
          value="1,842"
          subtitle="Citizens, Police & EMS"
          icon={Users}
          color="purple"
          trend="+12 today"
        />
        <StatCard
          title="Monitored Zones"
          value="6"
          subtitle="Bengaluru GeoJSON grids"
          icon={Building2}
          color="cyan"
        />
        <StatCard
          title="Officer Approvals Pending"
          value="2"
          subtitle="Police & EMS credential requests"
          icon={CheckCircle}
          color="amber"
          trend="Review req."
        />
        <StatCard
          title="Audit Log Events"
          value="4,980"
          subtitle="Logged with IP & timestamp"
          icon={FileText}
          color="electric"
        />
      </div>

      {/* Zone Performance & Security Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Bengaluru Zones Summary */}
        <div className="lg:col-span-2 bg-city-card border border-city-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-city-border mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>Configured Bengaluru City Zones & Congestion Index</span>
              </h2>
              <p className="text-xs text-slate-400">GeoJSON 2dsphere monitored municipal districts</p>
            </div>
            <Link
              to="/admin/zones"
              className="text-xs font-semibold text-purple-400 hover:underline flex items-center gap-1"
            >
              <span>Manage Boundaries</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-city-surface/50 border border-city-border/60 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-slate-400">MAJ-01</span>
                <h4 className="text-sm font-semibold text-white">Majestic Central Transport Hub</h4>
                <p className="text-[11px] text-slate-400">Kempegowda Bus Station & Railway Corridor</p>
              </div>
              <div className="text-right">
                <Badge variant="danger" size="sm">SEVERE CONGESTION</Badge>
                <p className="text-[10px] text-slate-400 font-mono mt-1">4 Officers Assigned</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-city-surface/50 border border-city-border/60 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-slate-400">HEB-02</span>
                <h4 className="text-sm font-semibold text-white">Hebbal Flyover Junction</h4>
                <p className="text-[11px] text-slate-400">Airport Road & Outer Ring Road Interchange</p>
              </div>
              <div className="text-right">
                <Badge variant="danger" size="sm">HIGH CONGESTION</Badge>
                <p className="text-[10px] text-slate-400 font-mono mt-1">3 Officers Assigned</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-city-surface/50 border border-city-border/60 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-slate-400">CSB-03</span>
                <h4 className="text-sm font-semibold text-white">Central Silk Board Corridor</h4>
                <p className="text-[11px] text-slate-400">Hosur Road, BTM & HSR Layout Hub</p>
              </div>
              <div className="text-right">
                <Badge variant="danger" size="sm">SEVERE CONGESTION</Badge>
                <p className="text-[10px] text-slate-400 font-mono mt-1">5 Officers Assigned</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-city-surface/50 border border-city-border/60 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-slate-400">WTF-04</span>
                <h4 className="text-sm font-semibold text-white">Whitefield IT Corridor</h4>
                <p className="text-[11px] text-slate-400">ITPB, Hope Farm & Kadugodi</p>
              </div>
              <div className="text-right">
                <Badge variant="warning" size="sm">MODERATE CONGESTION</Badge>
                <p className="text-[10px] text-slate-400 font-mono mt-1">3 Officers Assigned</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Security Audit Logs Stream */}
        <div className="bg-city-card border border-city-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-city-border mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Real-Time Audit Stream</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              IMMUTABLE
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-city-surface/60 border border-city-border/40">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-200">AUTH_LOGIN</span>
                <span className="text-[10px] font-mono text-slate-400">1m ago</span>
              </div>
              <p className="text-slate-400 text-[11px]">Actor: police@smartcity.gov</p>
              <p className="text-slate-400 text-[10px] font-mono">IP: 127.0.0.1 • Role: police</p>
            </div>

            <div className="p-3 rounded-xl bg-city-surface/60 border border-city-border/40">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-200">USER_REGISTERED</span>
                <span className="text-[10px] font-mono text-slate-400">14m ago</span>
              </div>
              <p className="text-slate-400 text-[11px]">Citizen account auto-provisioned</p>
              <p className="text-slate-400 text-[10px] font-mono">IP: 127.0.0.1 • Role: citizen</p>
            </div>

            <div className="p-3 rounded-xl bg-city-surface/60 border border-city-border/40">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-200">DATABASE_SEEDED</span>
                <span className="text-[10px] font-mono text-slate-400">30m ago</span>
              </div>
              <p className="text-slate-400 text-[11px]">Bengaluru 6 zones initialized</p>
              <p className="text-slate-400 text-[10px] font-mono">Actor: System</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

