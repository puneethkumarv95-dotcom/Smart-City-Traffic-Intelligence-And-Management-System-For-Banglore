import React, { useState, useEffect } from 'react';
import incidentService from '../../services/incidentService';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Flame,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Calendar,
  Eye,
  Shield,
  Layers,
  X
} from 'lucide-react';

export const AdminIncidentManagement = () => {
  const [statistics, setStatistics] = useState({
    totalReports: 0,
    pendingReports: 0,
    verifiedReports: 0,
    criticalIncidents: 0,
    resolvedReports: 0,
    rejectedReports: 0,
    categoryBreakdown: [],
    zoneBreakdown: []
  });

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await incidentService.getAdminStatistics();
      if (res.data) {
        setStatistics(res.data);
      }
    } catch (e) {
      console.error('Failed to load admin statistics:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await incidentService.getIncidents(params);
      setIncidents(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (e) {
      console.error('Failed to load admin incidents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [page, statusFilter, severityFilter, categoryFilter, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchIncidents();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setSeverityFilter('');
    setCategoryFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-city-card border border-purple-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="purple" size="sm">MUNICIPAL TRANSIT DIRECTORATE</Badge>
            <span className="text-xs font-mono text-purple-400">Chief Executive Oversight</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Comprehensive City Incident Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Live telemetry from Bengaluru roads. All counts and distributions are computed dynamically via MongoDB aggregation.
          </p>
        </div>

        <button
          onClick={() => {
            fetchStats();
            fetchIncidents();
          }}
          className="px-4 py-2.5 bg-city-surface hover:bg-city-hover border border-city-border rounded-xl text-xs font-semibold text-slate-200 flex items-center gap-2 self-start md:self-auto transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingStats ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Real-time MongoDB Statistics Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total Reports"
          value={statistics.totalReports}
          subtitle="All recorded events"
          icon={FileText}
          color="electric"
        />
        <StatCard
          title="Pending Queue"
          value={statistics.pendingReports}
          subtitle="Submitted / Review"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Verified"
          value={statistics.verifiedReports}
          subtitle="Police authenticated"
          icon={CheckCircle}
          color="cyan"
        />
        <StatCard
          title="Critical Active"
          value={statistics.criticalIncidents}
          subtitle="Immediate dispatch"
          icon={Flame}
          color="red"
        />
        <StatCard
          title="Resolved"
          value={statistics.resolvedReports}
          subtitle="Hazard cleared"
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Rejected"
          value={statistics.rejectedReports}
          subtitle="False alarms"
          icon={XCircle}
          color="purple"
        />
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="bg-city-card border border-city-border rounded-2xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by incident ID, title, address, description..."
              className="w-full pl-9 pr-4 py-2 bg-city-surface/70 border border-city-border rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition-all"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="info_requested">Info Requested</option>
              <option value="verified">Verified</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
              <option value="duplicate">Duplicate</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">All Categories</option>
              <option value="Road Accident">Road Accident</option>
              <option value="Pothole">Pothole</option>
              <option value="Traffic Congestion">Traffic Congestion</option>
              <option value="Road Flooding">Road Flooding</option>
              <option value="Broken Traffic Signal">Broken Traffic Signal</option>
              <option value="Illegal Parking">Illegal Parking</option>
              <option value="Road Damage">Road Damage</option>
            </select>

            {(search || statusFilter || severityFilter || categoryFilter || startDate || endDate) && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold border border-rose-500/30 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Date range filter */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-city-border/60 text-xs text-slate-400 font-mono">
          <Calendar className="w-3.5 h-3.5 text-purple-400" />
          <span>Date Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="px-2 py-1 bg-city-surface border border-city-border rounded-lg text-slate-200"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="px-2 py-1 bg-city-surface border border-city-border rounded-lg text-slate-200"
          />
        </div>
      </div>

      {/* Admin Incidents Data Table */}
      <div className="bg-city-card border border-city-border rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-city-surface/50 border-b border-city-border text-slate-400 font-mono uppercase text-[11px]">
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Title & Address</th>
                <th className="py-3 px-4">Zone</th>
                <th className="py-3 px-4">Reported By</th>
                <th className="py-3 px-4">Assigned Officer</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-city-border/40">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-mono">
                    Aggregating incident database records...
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-mono">
                    No incidents matching current administrative filter.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr key={inc._id} className="hover:bg-city-surface/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-electric-light">
                      {inc.incidentId}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {inc.category}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={inc.severity} size="sm">
                        {inc.severity}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <p className="font-semibold text-slate-200 truncate">{inc.title}</p>
                      <p className="text-[11px] text-slate-400 truncate font-mono">{inc.address}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {inc.zone?.code || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {inc.isAnonymous ? (
                        <span className="text-slate-400 italic">Anonymous Citizen</span>
                      ) : (
                        <span>{inc.reportedBy?.name || 'Citizen'}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {inc.assignedOfficer ? (
                        <span className="text-cyan-400 font-medium">
                          {inc.assignedOfficer.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          inc.status === 'resolved'
                            ? 'success'
                            : inc.status === 'verified'
                            ? 'primary'
                            : inc.status === 'rejected'
                            ? 'danger'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {inc.status?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedIncident(inc)}
                        className="px-2.5 py-1 bg-city-surface hover:bg-city-hover border border-city-border text-slate-200 rounded-lg text-[11px] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 inline mr-1 text-purple-400" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-city-border/60 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total records)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-city-surface border border-city-border rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-city-surface border border-city-border rounded-lg disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Admin Inspector Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-city-card border border-city-border rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedIncident(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-purple-400">
                {selectedIncident.incidentId}
              </span>
              <Badge variant={selectedIncident.severity} size="sm">
                {selectedIncident.severity}
              </Badge>
              <Badge variant="cyan" size="sm">
                {selectedIncident.status}
              </Badge>
            </div>

            <h2 className="text-xl font-bold text-white mb-1">{selectedIncident.title}</h2>
            <p className="text-xs font-mono text-slate-400 mb-4">{selectedIncident.address}</p>

            <div className="p-4 rounded-xl bg-city-surface/50 border border-city-border/60 text-xs text-slate-200 mb-4">
              <p className="text-[10px] font-mono uppercase text-slate-400 mb-1">Observation Summary:</p>
              <p className="leading-relaxed">{selectedIncident.description}</p>
            </div>

            {selectedIncident.resolutionNotes && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 mb-4">
                <p className="font-bold font-mono uppercase mb-0.5">Resolution Notes:</p>
                <p>{selectedIncident.resolutionNotes}</p>
              </div>
            )}

            {selectedIncident.assignedOfficer && (
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 mb-4 font-mono">
                Assigned Unit: {selectedIncident.assignedOfficer.name} ({selectedIncident.assignedOfficer.badgeNumber || 'Officer'}) • {selectedIncident.assignedOfficer.department}
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-5 py-2 bg-city-surface hover:bg-city-hover border border-city-border text-white text-xs font-bold rounded-xl"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminIncidentManagement;

