import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import {
  Ambulance,
  Navigation,
  Compass,
  AlertTriangle,
  Clock,
  PhoneCall,
  Activity,
  HeartPulse,
  Radio,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const EmergencyDashboard = () => {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* EMS Dispatch Banner */}
      <div className="bg-city-card border border-rose-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-rose-500/10 blur-3xl pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="danger" size="sm">108 GVK EMERGENCY RESPONSE DISPATCH</Badge>
            <span className="text-xs font-mono text-rose-400">Unit: {user?.badgeNumber || 'EMS-KA-108'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Emergency Dispatch Console — {user?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Automated Green Corridor Priority Simulator & Multi-Hospital Dispatch Coordinator
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 animate-pulse">
            <HeartPulse className="w-4 h-4" />
            <span>Simulate Priority Siren Route</span>
          </button>
        </div>
      </div>

      {/* EMS Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Dispatches"
          value="3"
          subtitle="En route across city"
          icon={Ambulance}
          color="red"
          trend="Critical"
        />
        <StatCard
          title="Avg Priority Response"
          value="6.4 min"
          subtitle="With signal preemption"
          icon={Clock}
          color="electric"
          trend="-2.1m"
        />
        <StatCard
          title="Trauma Hospitals Online"
          value="8"
          subtitle="Manipal, Nimhans, Bowring..."
          icon={HeartPulse}
          color="green"
        />
        <StatCard
          title="Corridor Preemption"
          value="Active"
          subtitle="Silk Board to St. John's"
          icon={Navigation}
          color="cyan"
        />
      </div>

      {/* Active Emergency Dispatches */}
      <div className="bg-city-card border border-city-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-city-border mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Ambulance className="w-4 h-4 text-rose-400" />
              <span>Live Emergency Ambulance Deployments</span>
            </h2>
            <p className="text-xs text-slate-400">Priority routes calculated with live road incident avoidance</p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
            All Units Monitored
          </span>
        </div>

        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-city-surface/50 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center flex-shrink-0">
                <Ambulance className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="danger" size="sm">PRIORITY 1 - CARDIAC</Badge>
                  <span className="text-[11px] font-mono text-slate-400">Unit: AMB-04</span>
                </div>
                <h3 className="text-sm font-semibold text-white">
                  Hebbal Flyover Accident Scene → Baptist Hospital
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Suggested Corridor: Bellary Road Lower Ramp • ETA: <span className="text-emerald-400 font-mono font-bold">4 Mins</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors">
                Preempt Next 3 Signals
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyDashboard;

