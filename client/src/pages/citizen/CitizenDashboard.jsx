import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import {
  MapPin,
  AlertTriangle,
  LifeBuoy,
  Car,
  Clock,
  CheckCircle2,
  Navigation,
  ArrowRight,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const CitizenDashboard = () => {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-city-card via-city-surface to-city-card border border-city-border rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-electric/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="cyan" size="sm">CITIZEN COMMUTER PORTAL</Badge>
              <span className="text-xs font-mono text-slate-400">Bengaluru Urban Grid</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome back, {user?.name || 'Commuter'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Report hazards, verify community road updates, view live corridor congestion, and navigate safely across the city.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/citizen/report"
              className="px-5 py-2.5 rounded-xl bg-electric hover:bg-electric-dark text-white text-xs font-semibold shadow-lg shadow-electric/25 transition-all flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-amber-300" />
              <span>Report Road Hazard</span>
            </Link>

            <Link
              to="/citizen/sos"
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 animate-pulse"
            >
              <LifeBuoy className="w-4 h-4" />
              <span>Emergency SOS</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Reports"
          value="4"
          subtitle="Submitted in your 5km radius"
          icon={AlertTriangle}
          color="amber"
          trend="+1 today"
        />
        <StatCard
          title="Community Verifications"
          value="18"
          subtitle="Citizen votes recorded"
          icon={ShieldCheck}
          color="cyan"
          trend="+5"
        />
        <StatCard
          title="Nearby Parking Spots"
          value="42"
          subtitle="Available within 2 km"
          icon={Car}
          color="green"
        />
        <StatCard
          title="Avg Route Clearance"
          value="24 min"
          subtitle="Majestic - Silk Board corridor"
          icon={Clock}
          color="electric"
        />
      </div>

      {/* Grid: Live Incidents & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Incidents Nearby */}
        <div className="lg:col-span-2 bg-city-card border border-city-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-city-border">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                <span>Verified Incidents in Your Vicinity</span>
              </h2>
              <p className="text-xs text-slate-400">Live community verified road hazards</p>
            </div>
            <Link
              to="/citizen/map"
              className="text-xs font-semibold text-electric-light hover:underline flex items-center gap-1"
            >
              <span>Open Live Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {/* Incident Item 1 */}
            <div className="p-4 rounded-xl bg-city-surface/50 border border-city-border/60 hover:border-slate-600 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="danger" size="sm">CRITICAL</Badge>
                    <Badge variant="default" size="sm">ACCIDENT</Badge>
                    <span className="text-[11px] font-mono text-slate-400">Hebbal Flyover (HEB-02)</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    Multi-vehicle collision blocking two central lanes
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Traffic Police unit deployed. Expect 25+ min delays towards Airport road.
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[11px] font-mono text-slate-400">8 mins ago</span>
                  <div className="mt-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      14 Confirmations
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Incident Item 2 */}
            <div className="p-4 rounded-xl bg-city-surface/50 border border-city-border/60 hover:border-slate-600 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="warning" size="sm">MEDIUM</Badge>
                    <Badge variant="default" size="sm">POTHOLE</Badge>
                    <span className="text-[11px] font-mono text-slate-400">Outer Ring Road (CSB-03)</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    Deep asphalt sinkhole near Silk Board service road
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Two-wheelers advised to exercise extreme caution near metro pillar 142.
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[11px] font-mono text-slate-400">32 mins ago</span>
                  <div className="mt-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      8 Confirmations
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Incident Item 3 */}
            <div className="p-4 rounded-xl bg-city-surface/50 border border-city-border/60 hover:border-slate-600 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="primary" size="sm">LOW</Badge>
                    <Badge variant="default" size="sm">SIGNAL FAILURE</Badge>
                    <span className="text-[11px] font-mono text-slate-400">Majestic (MAJ-01)</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    Signal blinking amber at Anand Rao Circle
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Traffic cop manually regulating junction flow.
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[11px] font-mono text-slate-400">1 hr ago</span>
                  <div className="mt-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      5 Confirmations
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quick Tools & Bengaluru Weather Warning */}
        <div className="space-y-6">
          <div className="bg-city-card border border-city-border rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-3">Quick Navigation Shortcuts</h3>
            <div className="space-y-2 text-xs">
              <Link
                to="/citizen/map"
                className="flex items-center justify-between p-3 rounded-xl bg-city-surface/60 hover:bg-city-hover transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-electric-light" />
                  <span className="text-slate-200">Interactive Traffic Map</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                to="/citizen/routes"
                className="flex items-center justify-between p-3 rounded-xl bg-city-surface/60 hover:bg-city-hover transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Navigation className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-200">Saved Daily Corridors</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                to="/citizen/parking"
                className="flex items-center justify-between p-3 rounded-xl bg-city-surface/60 hover:bg-city-hover transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Car className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-200">Smart Parking Reservations</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Monsoon Advisory</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              IMD alerts light to moderate showers in North & East Bengaluru. Slow down near Silk Board underpass and Hebbal flyover ramps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;

