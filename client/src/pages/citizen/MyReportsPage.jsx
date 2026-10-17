import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import incidentService from '../../services/incidentService';
import { getSocket } from '../../services/socket';
import Badge from '../../components/ui/Badge';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Calendar,
  MapPin,
  RefreshCw,
  Plus,
  X,
  User,
  ShieldCheck
} from 'lucide-react';

export const MyReportsPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [historyTimeline, setHistoryTimeline] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchMyReports = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;

      const res = await incidentService.getMyIncidents(params);
      setIncidents(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to load my reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyReports();

    const socket = getSocket();
    const handleUpdate = () => {
      fetchMyReports();
    };

    socket.on('incident:status_changed', handleUpdate);
    socket.on('incident:assigned', handleUpdate);
    socket.on('incident:verified', handleUpdate);

    return () => {
      socket.off('incident:status_changed', handleUpdate);
      socket.off('incident:assigned', handleUpdate);
      socket.off('incident:verified', handleUpdate);
    };
  }, [page, statusFilter, severityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchMyReports();
  };

  const handleOpenDetail = async (incident) => {
    setSelectedIncident(incident);
    setLoadingHistory(true);
    try {
      const res = await incidentService.getIncidentHistory(incident._id);
      setHistoryTimeline(res.data || []);
    } catch (e) {
      setHistoryTimeline([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-city-card border border-city-border rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="cyan" size="sm">CITIZEN PERSONAL CONSOLE</Badge>
            <span className="text-xs font-mono text-slate-400">Private Submitted Log</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            My Incident Reports & Tracking
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Track real-time progress on your reported road issues, see which officer is assigned, and review official municipal resolutions.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <Link
            to="/citizen/report"
            className="px-4 py-2.5 bg-electric hover:bg-electric-dark text-white rounded-xl text-xs font-semibold shadow-lg shadow-electric/25 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Report New Issue</span>
          </Link>
          <button
            onClick={fetchMyReports}
            className="p-2.5 bg-city-surface hover:bg-city-hover border border-city-border rounded-xl text-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-city-card border border-city-border rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, title, address..."
            className="w-full pl-9 pr-4 py-2 bg-city-surface/70 border border-city-border rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-electric transition-all"
          />
        </form>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-electric"
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="verified">Verified</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-electric"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-city-card border border-city-border rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-city-surface/50 border-b border-city-border text-slate-400 font-mono uppercase text-[11px]">
                <th className="py-3.5 px-4">Incident ID</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Title & Address</th>
                <th className="py-3.5 px-4">Severity</th>
                <th className="py-3.5 px-4">Date Reported</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Assigned Unit</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-city-border/40">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-mono">
                    Loading your reports...
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <p className="font-semibold text-white">No reports found.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      You haven't submitted any incidents matching this criteria yet.
                    </p>
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr key={inc._id} className="hover:bg-city-surface/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-electric-light">
                      {inc.incidentId}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      {inc.category}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <p className="font-semibold text-white truncate">{inc.title}</p>
                      <p className="text-[11px] text-slate-400 font-mono truncate">{inc.address}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={inc.severity} size="sm">
                        {inc.severity}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {new Date(inc.createdAt).toLocaleDateString()}
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
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {inc.assignedOfficer ? (
                        <span className="text-cyan-400 font-medium">
                          {inc.assignedOfficer.name} ({inc.assignedOfficer.badgeNumber || 'Officer'})
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(inc)}
                        className="px-3 py-1 bg-city-surface hover:bg-city-hover border border-city-border text-slate-200 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-electric-light" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-city-border/60 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} reports)
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

      {/* Detail & Evidence Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-city-card border border-city-border rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setSelectedIncident(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-electric-light">
                {selectedIncident.incidentId}
              </span>
              <Badge variant={selectedIncident.severity} size="sm">
                {selectedIncident.severity}
              </Badge>
              <Badge variant="default" size="sm">
                {selectedIncident.category}
              </Badge>
            </div>

            <h2 className="text-xl font-bold text-white mb-1">{selectedIncident.title}</h2>
            <p className="text-xs font-mono text-slate-400 mb-6 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-electric-light" />
              <span>{selectedIncident.address}</span>
            </p>

            {/* Description */}
            <div className="p-4 rounded-2xl bg-city-surface/50 border border-city-border/60 mb-6">
              <h3 className="text-xs font-mono uppercase text-slate-400 mb-1">Detailed Description</h3>
              <p className="text-xs text-slate-200 leading-relaxed">{selectedIncident.description}</p>
            </div>

            {/* Evidence Gallery */}
            {((selectedIncident.images && selectedIncident.images.length > 0) ||
              (selectedIncident.videos && selectedIncident.videos.length > 0)) && (
              <div className="mb-6">
                <h3 className="text-xs font-mono uppercase text-slate-400 mb-3">Evidence Media</h3>
                <div className="flex flex-wrap gap-3">
                  {selectedIncident.images?.map((img, i) => (
                    <a
                      key={i}
                      href={img.url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-24 h-24 rounded-xl overflow-hidden border border-city-border hover:opacity-80 transition-opacity"
                    >
                      <img src={img.url} alt="Evidence" className="w-full h-full object-cover" />
                    </a>
                  ))}
                  {selectedIncident.videos?.map((vid, i) => (
                    <a
                      key={i}
                      href={vid.url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-24 h-24 rounded-xl overflow-hidden border border-city-border bg-black flex items-center justify-center text-xs text-electric-light font-mono"
                    >
                      Watch Video
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned Unit Details */}
            {selectedIncident.assignedOfficer && (
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 mb-6 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase text-blue-400 font-semibold">
                    Assigned Response Officer
                  </span>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {selectedIncident.assignedOfficer.name}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    Badge: {selectedIncident.assignedOfficer.badgeNumber || 'Traffic Officer'} • {selectedIncident.assignedOfficer.department}
                  </p>
                </div>
                <ShieldCheck className="w-8 h-8 text-blue-400" />
              </div>
            )}

            {/* Status History Timeline */}
            <div>
              <h3 className="text-xs font-mono uppercase text-slate-400 mb-3">Lifecycle Audit Trail</h3>
              {loadingHistory ? (
                <p className="text-xs font-mono text-slate-400">Loading timeline...</p>
              ) : historyTimeline.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No historical transitions recorded yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {historyTimeline.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-city-surface/40 border border-city-border/40 flex items-start justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white uppercase font-mono">{item.newStatus}</span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            by {item.changedByName} ({item.actorRole})
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-slate-300 text-[11px] mt-1">{item.notes}</p>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap ml-2">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyReportsPage;
