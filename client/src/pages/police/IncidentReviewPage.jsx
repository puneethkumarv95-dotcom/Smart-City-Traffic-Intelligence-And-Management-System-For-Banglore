import React, { useState, useEffect } from 'react';
import incidentService from '../../services/incidentService';
import { getSocket } from '../../services/socket';
import { useAuthStore } from '../../store/useAuthStore';
import Badge from '../../components/ui/Badge';
import {
  Shield,
  Radio,
  CheckCircle,
  XCircle,
  UserCheck,
  Clock,
  Filter,
  RefreshCw,
  Eye,
  AlertTriangle,
  Send,
  X
} from 'lucide-react';

export const IncidentReviewPage = () => {
  const { user } = useAuthStore();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [modalType, setModalType] = useState(null); // 'verify' | 'reject' | 'assign' | 'status' | 'view'
  const [actionNotes, setActionNotes] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [newStatus, setNewStatus] = useState('in_progress');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      const res = await incidentService.getIncidents(params);
      setIncidents(res.data || []);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();

    const socket = getSocket();
    const handleNew = (newInc) => {
      setIncidents((prev) => [newInc, ...prev]);
    };
    const handleUpdate = (upd) => {
      setIncidents((prev) =>
        prev.map((inc) => (inc._id === upd._id ? { ...inc, ...upd } : inc))
      );
    };

    socket.on('incident:new', handleNew);
    socket.on('incident:police_alert', fetchIncidents);
    socket.on('incident:verified', handleUpdate);
    socket.on('incident:assigned', handleUpdate);
    socket.on('incident:status_changed', handleUpdate);

    return () => {
      socket.off('incident:new', handleNew);
      socket.off('incident:police_alert', fetchIncidents);
      socket.off('incident:verified', handleUpdate);
      socket.off('incident:assigned', handleUpdate);
      socket.off('incident:status_changed', handleUpdate);
    };
  }, [statusFilter, severityFilter]);

  const handleOpenModal = (incident, type) => {
    setSelectedIncident(incident);
    setModalType(type);
    setActionNotes('');
    setAssigneeId(user?.id || '');
    if (type === 'status') {
      setNewStatus(incident.status === 'assigned' ? 'in_progress' : 'resolved');
    }
  };

  const handleCloseModal = () => {
    setSelectedIncident(null);
    setModalType(null);
    setActionNotes('');
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIncident) return;
    setSubmitting(true);

    try {
      if (modalType === 'verify') {
        await incidentService.verifyIncident(selectedIncident._id, actionNotes);
      } else if (modalType === 'reject') {
        await incidentService.rejectIncident(selectedIncident._id, actionNotes);
      } else if (modalType === 'assign') {
        await incidentService.assignIncident(selectedIncident._id, assigneeId, actionNotes);
      } else if (modalType === 'status') {
        await incidentService.updateIncidentStatus(selectedIncident._id, newStatus, actionNotes);
      }
      setSubmitting(false);
      handleCloseModal();
      fetchIncidents();
    } catch (err) {
      setSubmitting(false);
      alert(err.response?.data?.message || 'Operation failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-city-card border border-blue-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="primary" size="sm">TRAFFIC POLICE INCIDENT VERIFICATION</Badge>
            <span className="text-xs font-mono text-slate-400">Triage Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Incident Review & Dispatch Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Validate citizen reports, dispatch field traffic units, announce diversions, and monitor resolution timelines.
          </p>
        </div>

        <button
          onClick={fetchIncidents}
          className="px-4 py-2.5 bg-city-surface hover:bg-city-hover border border-city-border rounded-xl text-xs font-semibold text-slate-200 flex items-center gap-2 self-start md:self-auto transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-city-card border border-city-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-electric-light" />
            <span className="font-mono">Filter Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
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
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <span className="text-xs font-mono text-slate-400">
          Showing {incidents.length} Records
        </span>
      </div>

      {/* Incidents Table */}
      <div className="bg-city-card border border-city-border rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-city-surface/50 border-b border-city-border text-slate-400 font-mono uppercase text-[11px]">
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Title & Address</th>
                <th className="py-3 px-4">Votes</th>
                <th className="py-3 px-4">Reported</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4 text-right">Officer Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-city-border/40">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-mono">
                    Loading incident triage stream...
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-mono">
                    No matching incidents found in queue.
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => (
                  <tr key={incident._id} className="hover:bg-city-surface/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <Badge variant={incident.severity} size="sm">
                        {incident.severity}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white uppercase font-mono text-[11px]">
                      {incident.category?.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <p className="font-semibold text-slate-200 truncate">{incident.title}</p>
                      <p className="text-[11px] text-slate-400 truncate font-mono">{incident.address}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="text-emerald-400">{incident.confirmVotesCount || 0} confirm</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={incident.status === 'verified' ? 'primary' : incident.status === 'resolved' ? 'success' : incident.status === 'rejected' ? 'danger' : 'warning'} size="sm">
                        {incident.status?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {incident.status === 'submitted' || incident.status === 'under_review' ? (
                        <>
                          <button
                            onClick={() => handleOpenModal(incident, 'verify')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-[11px] transition-colors"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => handleOpenModal(incident, 'reject')}
                            className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 rounded-lg font-semibold text-[11px] transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      ) : null}

                      {incident.status === 'verified' ? (
                        <button
                          onClick={() => handleOpenModal(incident, 'assign')}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-[11px] transition-colors"
                        >
                          Assign Unit
                        </button>
                      ) : null}

                      {incident.status === 'assigned' || incident.status === 'in_progress' ? (
                        <button
                          onClick={() => handleOpenModal(incident, 'status')}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold text-[11px] transition-colors"
                        >
                          Update Status
                        </button>
                      ) : null}

                      <button
                        onClick={() => handleOpenModal(incident, 'view')}
                        className="px-2 py-1 bg-city-surface hover:bg-city-hover border border-city-border text-slate-300 rounded-lg text-[11px] transition-colors"
                        title="View Full Incident File"
                      >
                        <Eye className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog */}
      {modalType && selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-city-card border border-city-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {modalType === 'view' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={selectedIncident.severity} size="sm">
                    {selectedIncident.severity}
                  </Badge>
                  <Badge variant="default" size="sm">
                    {selectedIncident.category}
                  </Badge>
                  <span className="text-xs font-mono text-slate-400">
                    Status: {selectedIncident.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white">{selectedIncident.title}</h3>
                <p className="text-xs font-mono text-electric-light">{selectedIncident.address}</p>
                <p className="text-xs text-slate-300 leading-relaxed bg-city-surface/50 p-3 rounded-xl border border-city-border">
                  {selectedIncident.description}
                </p>

                {/* Media */}
                {selectedIncident.media && selectedIncident.media.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 mb-2">Evidence Files:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedIncident.media.map((med, idx) => (
                        <a
                          key={idx}
                          href={med.url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-20 h-20 rounded-xl overflow-hidden border border-city-border hover:opacity-80 transition-opacity"
                        >
                          <img src={med.url} alt="Evidence" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status History */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-2">Audit History Timeline:</h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedIncident.statusHistory?.map((hist, i) => (
                      <div key={i} className="text-[11px] p-2 bg-city-surface/40 rounded-lg border border-city-border/40">
                        <span className="font-semibold text-white uppercase font-mono">{hist.status}</span>
                        <span className="text-slate-400 ml-2 font-mono">
                          by {hist.changedByName} ({hist.actorRole})
                        </span>
                        {hist.notes && <p className="text-slate-300 text-[10px] mt-0.5">{hist.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleActionSubmit} className="space-y-4">
                <h3 className="text-base font-bold text-white capitalize">
                  {modalType === 'verify' && 'Confirm & Verify Incident'}
                  {modalType === 'reject' && 'Reject Invalid Report'}
                  {modalType === 'assign' && 'Assign Field Response Team'}
                  {modalType === 'status' && 'Update Incident Progress'}
                </h3>
                <p className="text-xs text-slate-400">{selectedIncident.title}</p>

                {modalType === 'status' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      New Operational Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="in_progress">In Progress (Field Unit Working)</option>
                      <option value="resolved">Resolved (Hazard Cleared)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {modalType === 'reject' ? 'Rejection Reason (Required)' : 'Officer Field Notes'}
                  </label>
                  <textarea
                    required={modalType === 'reject'}
                    rows={3}
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder={
                      modalType === 'reject'
                        ? 'e.g. False alarm; road inspection confirmed no obstruction.'
                        : 'e.g. Unit 4 deployed with road cones and asphalt crew...'
                    }
                    className="w-full px-3 py-2 bg-city-surface border border-city-border rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-city-surface hover:bg-city-hover text-slate-300 rounded-xl text-xs font-semibold border border-city-border"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    {submitting ? 'Updating...' : 'Commit Operational Update'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentReviewPage;
