import React, { useState, useEffect } from 'react';
import trafficService from '../../services/trafficService';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Calendar,
  Clock,
  Filter,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Layers,
  Building2,
  ShieldAlert,
  Flame
} from 'lucide-react';

const COLORS = ['#0ea5e9', '#06b6d4', '#f59e0b', '#f43f5e', '#a855f7', '#10b981', '#64748b'];

export const TrafficHistoryPage = () => {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedZone, setSelectedZone] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedZone) params.zone = selectedZone;

      const res = await trafficService.getHistory(params);
      setHistoryData(res.data);
    } catch (err) {
      console.error('Failed to load historical analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [startDate, endDate, selectedZone]);

  const hourlyChartData = historyData?.hourlyDistribution || [];
  const categoryData =
    historyData?.categoryBreakdown?.map((cat) => ({
      name: cat._id,
      count: cat.count
    })) || [];

  const zoneData =
    historyData?.zoneBreakdown?.map((z) => ({
      name: z.zoneName || z.zoneCode,
      code: z.zoneCode,
      count: z.count
    })) || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-city-card border border-city-border rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="cyan" size="sm">BENGALURU MUNICIPAL MOBILITY ARCHIVE</Badge>
            <span className="text-xs font-mono text-slate-400">Historical Incident & Peak-Hour Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Traffic History & Peak-Hour Patterns
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Analyze historical hazard patterns, hourly congestion peaks, road damage hotspots, and municipal closure duration across Bengaluru's transit zones.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="px-4 py-2.5 bg-city-surface hover:bg-city-hover border border-city-border rounded-xl text-xs font-semibold text-slate-200 flex items-center gap-2 self-start lg:self-auto transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-city-card border border-city-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Filter className="w-3.5 h-3.5 text-electric-light" />
            <span>Filters:</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] font-mono text-slate-400">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-electric"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] font-mono text-slate-400">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-electric"
            />
          </div>

          {(startDate || endDate || selectedZone) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSelectedZone('');
              }}
              className="text-xs text-rose-400 hover:text-rose-300 underline font-mono"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          Source: MongoDB Aggregation Pipelines
        </div>
      </div>

      {/* Aggregate Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Recorded Incidents"
          value={historyData?.totalIncidents || 0}
          subtitle="Filtered window events"
          icon={AlertTriangle}
          color="electric"
        />
        <StatCard
          title="Morning Peak Window"
          value="08:30 - 11:30"
          subtitle="Commute Bottleneck"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Evening Peak Window"
          value="17:00 - 21:00"
          subtitle="Return Transit Wave"
          icon={Flame}
          color="red"
        />
        <StatCard
          title="Official Closures"
          value={historyData?.totalClosures || 0}
          subtitle="Road diversions logged"
          icon={ShieldAlert}
          color="purple"
        />
      </div>

      {/* Chart 1: Hourly Distribution Bar Chart */}
      <div className="bg-city-card border border-city-border rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-electric-light" />
              <span>Hourly Incident Distribution (24-Hour Cycle)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Incident occurrence frequency segmented by hour of day (IST). Amber bars highlight peak commute intervals.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-electric"></span> Off-Peak
            </span>
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Peak Hours
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0b1120',
                  border: '1px solid #1e293b',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="incidentsCount" radius={[6, 6, 0, 0]}>
                {hourlyChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isPeakHour ? '#f59e0b' : '#0ea5e9'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2 & 3: Category Breakdown & Zone Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Pie Chart */}
        <div className="bg-city-card border border-city-border rounded-3xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Layers className="w-4 h-4 text-electric-light" />
            <span>Hazard Distribution by Category</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Proportion of potholes, accidents, signal failures, and waterlogging events.
          </p>

          <div className="h-64 w-full">
            {categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                No incidents recorded for selected filter criteria.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0b1120',
                      border: '1px solid #1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                    layout="horizontal"
                    verticalAlign="bottom"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Zone-based Breakdown Bar Chart */}
        <div className="bg-city-card border border-city-border rounded-3xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-electric-light" />
            <span>Incidents by Administrative City Zone</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Comparative analysis across Bengaluru corridors (Majestic, Hebbal, Silk Board, Whitefield).
          </p>

          <div className="h-64 w-full">
            {zoneData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                No zone-assigned incidents recorded for this window.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="code" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0b1120',
                      border: '1px solid #1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficHistoryPage;
