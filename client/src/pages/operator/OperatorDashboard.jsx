import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import {
  Car,
  ParkingCircle,
  Clock,
  CheckCircle,
  Building2,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Sliders
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const OperatorDashboard = () => {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Operator Banner */}
      <div className="bg-city-card border border-emerald-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-emerald-500/10 blur-3xl pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="success" size="sm">BBMP SMART PARKING OPERATOR HUB</Badge>
            <span className="text-xs font-mono text-emerald-400">Badge: {user?.badgeNumber || 'BBMP-88'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Parking Operations Console — {user?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Managing Central Silk Board Multi-Level Transit Parking • Zone: <span className="text-emerald-300 font-mono">CSB-03</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/operator/slots"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
          >
            <Sliders className="w-4 h-4" />
            <span>Manage Slots</span>
          </Link>
        </div>
      </div>

      {/* Operator Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Facility Slots"
          value="450"
          subtitle="Levels 1 through 4"
          icon={Building2}
          color="cyan"
        />
        <StatCard
          title="Live Occupied Slots"
          value="342"
          subtitle="76% Capacity"
          icon={Car}
          color="amber"
          trend="High Vol"
        />
        <StatCard
          title="Available Slots"
          value="108"
          subtitle="Real-time open bays"
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Active App Bookings"
          value="29"
          subtitle="Citizen advance reservations"
          icon={Clock}
          color="electric"
        />
      </div>

      {/* Facility Floor Breakdown */}
      <div className="bg-city-card border border-city-border rounded-2xl p-6 shadow-xl">
        <h2 className="text-base font-bold text-white mb-4">Multi-Level Floor Occupancy Live Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-city-surface/50 border border-city-border">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-sm text-white">Floor L1 (EV & Premium)</span>
              <span className="text-xs font-mono text-emerald-400">85% Occupied</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: '85%' }}></div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">15 of 100 bays open</p>
          </div>

          <div className="p-4 rounded-xl bg-city-surface/50 border border-city-border">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-sm text-white">Floor L2 (Four Wheeler)</span>
              <span className="text-xs font-mono text-amber-400">92% Occupied</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: '92%' }}></div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">10 of 120 bays open</p>
          </div>

          <div className="p-4 rounded-xl bg-city-surface/50 border border-city-border">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-sm text-white">Floor L3 (General Four Wheeler)</span>
              <span className="text-xs font-mono text-emerald-400">60% Occupied</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: '60%' }}></div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">48 of 120 bays open</p>
          </div>

          <div className="p-4 rounded-xl bg-city-surface/50 border border-city-border">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-sm text-white">Floor L4 (Two Wheeler & Overflow)</span>
              <span className="text-xs font-mono text-emerald-400">68% Occupied</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: '68%' }}></div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">35 of 110 bays open</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorDashboard;

