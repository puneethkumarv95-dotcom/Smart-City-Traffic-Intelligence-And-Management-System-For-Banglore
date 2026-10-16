import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import {
  Shield,
  Radio,
  Sliders,
  AlertTriangle,
  Clock,
  CheckCircle,
  Users,
  Eye,
  MapPin,
  Flame,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const PoliceDashboard = () => {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Officer Header */}
      <div className="bg-city-card border border-blue-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-blue-500/10 blur-3xl pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="primary" size="sm">BENGALURU TRAFFIC POLICE COMMAND CENTER</Badge>
            <span className="text-xs font-mono text-blue-400">Badge: {user?.badgeNumber || 'BTP-4029'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Command Center Console — {user?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Zone Assigned: <span className="text-blue-300 font-semibold font-mono">Majestic Central (MAJ-01)</span> • Active Shift: <span className="text-emerald-400 font-mono">08:00 - 16:00 IST</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/police/queue"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Priority Triage Queue</span>
          </Link>
          <Link
            to="/police/closures"
            className="px-5 py-2.5 rounded-xl bg-city-surface hover:bg-city-hover border border-city-border text-slate-200 text-xs font-semibold transition-all flex items-center gap-2"
          >
            <Sliders className="w-4 h-4 text-electric-light" />
            <span>Road Closures</span>
          </Link>
        </div>
      </div>

      {/* Police Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Verification"
          value="7"
          subtitle="Awaiting officer validation"
          icon={Radio}
          color="amber"
          trend="+3 new"
        />
        <StatCard
          title="Critical Active Hazards"
          value="2"
          subtitle="Hebbal & Silk Board"
          icon={Flame}
          color="red"
          trend="Escalated"
        />
        <StatCard
          title="On-Duty Patrol Units"
          value="14"
          subtitle="Spread across 6 zones"
          icon={Users}
          color="cyan"
        />
        <StatCard
          title="Active Diversions"
          value="3"
          subtitle="Metro construction corridors"
          icon={Sliders}
          color="purple"
        />
      </div>

      {/* Priority Incident Table */}
      <div className="bg-city-card border border-city-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-city-border mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-400" />
              <span>Officer Verification & Action Queue</span>
            </h2>
            <p className="text-xs text-slate-400">Citizen reports ranked by algorithmic severity and community confidence</p>
          </div>
          <Link
            to="/police/incidents"
            className="text-xs font-semibold text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>View All (23)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-city-border text-slate-400 font-mono uppercase text-[11px]">
                <th className="pb-3 px-3">Severity</th>
                <th className="pb-3 px-3">Category</th>
                <th className="pb-3 px-3">Location & Zone</th>
                <th className="pb-3 px-3">Citizen Votes</th>
                <th className="pb-3 px-3">Reported Time</th>
                <th className="pb-3 px-3">Current Status</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-city-border/40">
              <tr className="hover:bg-city-surface/40 transition-colors">
                <td className="py-3.5 px-3">
                  <Badge variant="danger" size="sm">CRITICAL</Badge>
                </td>
                <td className="py-3.5 px-3 font-semibold text-white">Road Accident</td>
                <td className="py-3.5 px-3">
                  <p className="text-slate-200">Hebbal Flyover Inbound</p>
                  <p className="text-[10px] font-mono text-slate-400">Zone: HEB-02</p>
                </td>
                <td className="py-3.5 px-3 font-mono text-emerald-400">14 Confirmations</td>
                <td className="py-3.5 px-3 font-mono text-slate-400">8m ago</td>
                <td className="py-3.5 px-3">
                  <Badge variant="warning" size="sm">UNDER REVIEW</Badge>
                </td>
                <td className="py-3.5 px-3 text-right space-x-2">
                  <button className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-[11px] transition-colors">
                    Verify
                  </button>
                  <button className="px-3 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded-lg font-semibold text-[11px] border border-rose-500/30 transition-colors">
                    Reject
                  </button>
                </td>
              </tr>

              <tr className="hover:bg-city-surface/40 transition-colors">
                <td className="py-3.5 px-3">
                  <Badge variant="warning" size="sm">MEDIUM</Badge>
                </td>
                <td className="py-3.5 px-3 font-semibold text-white">Severe Pothole</td>
                <td className="py-3.5 px-3">
                  <p className="text-slate-200">Silk Board Junction Flyover Ramp</p>
                  <p className="text-[10px] font-mono text-slate-400">Zone: CSB-03</p>
                </td>
                <td className="py-3.5 px-3 font-mono text-emerald-400">8 Confirmations</td>
                <td className="py-3.5 px-3 font-mono text-slate-400">32m ago</td>
                <td className="py-3.5 px-3">
                  <Badge variant="primary" size="sm">VERIFIED</Badge>
                </td>
                <td className="py-3.5 px-3 text-right space-x-2">
                  <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-[11px] transition-colors">
                    Assign Patrol
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PoliceDashboard;

