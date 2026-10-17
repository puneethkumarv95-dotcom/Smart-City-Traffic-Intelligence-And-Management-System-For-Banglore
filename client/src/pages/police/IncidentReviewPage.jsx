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
  X,
  Copy,
  Users,
  Briefcase,
  HelpCircle,
  MapPin
} from 'lucide-react';

export const IncidentReviewPage = () => {
  const { user } = useAuthStore();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [modalType, setModalType] = useState(null); // 'verify' | 'reject' | 'assign' | 'status' | 'duplicate' | 'request_info' | 'view'
  const [actionNotes, setActionNotes] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [duplicateTargetId, setDuplicateTargetId] = useState('');
  const [newStatus, setNewStatus] = useState('in_progress');
  const [submitting, setSubmitting] = useState(false);

  // Available officers with workload
  const [availableOfficers, setAvailableOfficers] = useState([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      if (categoryFilter) params.category = categoryFilter;
      const res = await incidentService.getIncidents(params);
      setIncidents(res.data || []);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficers = async () => {
    setLoadingOfficers(true);
    try {
      const res = await incidentService.getAvailableOfficers();
      setAvailableOfficers(res.data || []);
      if (res.data && res.data.length > 0) {
        setAssigneeId(res.data[0]._id);
      }
    } catch (e) {
      setAvailableOfficers([]);
    } finally {
      setLoadingOfficers(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchOfficers();

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
  }, [statusFilter, severityFilter, categoryFilter]);

  const handleOpenModal = (incident, type) => {
    setSelectedIncident(incident);
    setModalType(type);
    setActionNotes('');
    setSelectedPriority(incident.severity || 'medium');
    setDuplicateTargetId('');

    if (type === 'assign') {
      fetchOfficers();
    } else if (type === 'status') {
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
        await incidentService.verifyIncident(selectedIncident._id, actionNotes, selectedPriority);
      } else if (modalType === 'reject') {
        await incidentService.rejectIncident(selectedIncident._id, actionNotes);
      } else if (modalType === 'request_info') {
        await incidentService.requestAdditionalInfo(selectedIncident._id, actionNotes);
      } else if (modalType === 'assign') {
        await incidentService.assignIncident(selectedIncident._id, assigneeId, actionNotes);
      } else if (modalType === 'duplicate') {
        await incidentService.markDuplicate(selectedIncident._id, duplicateTargetId, actionNotes);
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
      {/* Header Banner */}
      <div className="bg-city-card border border-blue-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="primary" size="sm">TRAFFIC POLICE COMMAND OPERATIONS</Badge>
            <span className="text-xs font-mono text-slate-400">Triage Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Incident Review, Verification & Officer Assignment
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Triage citizen hazard queues, verify authenticity, balance officer patrol workloads, link duplicates, and oversee status transitions.
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
            <span className="font-mono">Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
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
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
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
        </div>

        <span className="text-xs font-mono text-slate-400">
          Showing {incidents.length} Records
        </span>
      </div>

      {/* Incidents Data Table */}
      <div className="bg-city-card border border-city-border rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-city-surface/50 border-b border-city-border text-slate-400 font-mono uppercase text-[11px]">
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Title & Address</th>
                <th className="py-3 px-4">Community Votes</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Unit</th>
                <th className="py-3 px-4 text-right">Triage Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-city-border/40">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-mono">
                    Loading incident triage stream...
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-mono">
                    No matching incidents found in queue.
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => (
                  <tr key={incident._id} className="hover:bg-city-surface/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-electric-light">
                      {incident.incidentId}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={incident.severity} size="sm">
                        {incident.severity}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {incident.category}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <p className="font-semibold text-slate-200 truncate">{incident.title}</p>
                      <p className="text-[11px] text-slate-400 truncate font-mono">{incident.address}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="text-emerald-400 font-semibold">{incident.confirmationsCount || 0} confirm</span>
                      {incident.disputesCount > 0 && (
                        <span className="text-rose-400 ml-2">({incident.disputesCount} disp)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          incident.status === 'verified'
                            ? 'primary'
                            : incident.status === 'resolved'
                            ? 'success'
                            : incident.status === 'rejected'
                            ? 'danger'
                            : incident.status === 'duplicate'
                            ? 'purple'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {incident.status?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {incident.assignedOfficer ? (
                        <span className="text-cyan-400 font-semibold">
                          {incident.assignedOfficer.name} ({incident.assignedOfficer.badgeNumber || 'Officer'})
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Triage action buttons */}
                      {['submitted', 'under_review', 'info_requested'].includes(incident.status) && (
                        <>
                          <button
                            onClick={() => handleOpenModal(incident, 'verify')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-[11px] transition-colors"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => handleOpenModal(incident, 'request_info')}
                            className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] transition-colors"
                            title="Request More Info"
                          >
                            <HelpCircle className="w-3.5 h-3.5 inline" />
                          </button>
                          <button
                            onClick={() => handleOpenModal(incident, 'reject')}
                            className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] transition-colors"
                            title="Reject Report"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {incident.status === 'verified' && (
                        <button
                          onClick={() => handleOpenModal(incident, 'assign')}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-[11px] transition-colors inline-flex items-center gap-1"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Assign Unit</span>
                        </button>
                      )}

                      {['assigned', 'in_progress'].includes(incident.status) && (
                        <>
                          <button
                            onClick={() => handleOpenModal(incident, 'status')}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold text-[11px] transition-colors"
                          >
                            Update Progress
                          </button>
                          <button
                            onClick={() => handleOpenModal(incident, 'assign')}
                            className="px-2 py-1 bg-city-surface hover:bg-city-hover border border-city-border text-slate-300 rounded-lg text-[11px] transition-colors"
                            title="Reassign Officer"
                          >
                            Reassign
                          </button>
                        </>
                      )}

                      {incident.status !== 'duplicate' && (
                        <button
                          onClick={() => handleOpenModal(incident, 'duplicate')}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] border border-slate-700 transition-colors"
                          title="Mark Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5 inline" />
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenModal(incident, 'view')}
                        className="px-2 py-1 bg-city-surface hover:bg-city-hover border border-city-border text-slate-300 rounded-lg text-[11px] transition-colors"
                        title="View Full File"
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

      {/* Action / Detail Modal Dialog */}
      {modalType && selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-city-card border border-city-border rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-6 right-6 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {modalType === 'view' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-electric-light">
                    {selectedIncident.incidentId}
                  </span>
                  <Badge variant={selectedIncident.severity} size="sm">
                    {selectedIncident.severity}
                  </Badge>
                  <Badge variant="default" size="sm">
                    {selectedIncident.category}
                  </Badge>
                  <Badge variant="cyan" size="sm">
                    {selectedIncident.status}
                  </Badge>
                </div>

                <h3 className="text-lg font-bold text-white">{selectedIncident.title}</h3>
                <p className="text-xs font-mono text-electric-light flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{selectedIncident.address}</span>
                </p>

                <div className="p-3.5 rounded-xl bg-city-surface/50 border border-city-border text-xs text-slate-200">
                  <p className="text-[10px] font-mono uppercase text-slate-400 mb-1">Observation Description:</p>
                  <p className="leading-relaxed">{selectedIncident.description}</p>
                </div>

                {/* Evidence */}
                {((selectedIncident.images && selectedIncident.images.length > 0) ||
                  (selectedIncident.videos && selectedIncident.videos.length > 0)) && (
                  <div>
                    <h4 className="text-xs font-mono uppercase text-slate-400 mb-2">Evidence Files:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedIncident.images?.map((img, idx) => (
                        <a
                          key={idx}
                          href={img.url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-20 h-20 rounded-xl overflow-hidden border border-city-border hover:opacity-80 transition-opacity"
                        >
                          <img src={img.url} alt="Evidence" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleActionSubmit} className="space-y-4">
                <h3 className="text-base font-bold text-white capitalize">
                  {modalType === 'verify' && 'Officer Verification'}
                  {modalType === 'reject' && 'Reject Incident Report'}
                  {modalType === 'request_info' && 'Request Additional Information'}
                  {modalType === 'assign' && 'Assign Field Patrol Unit'}
                  {modalType === 'duplicate' && 'Mark Incident as Duplicate'}
                  {modalType === 'status' && 'Update Incident Progress'}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedIncident.incidentId} • {selectedIncident.title}
                </p>

                {/* Verification Priority selection */}
                {modalType === 'verify' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                      Confirmed Priority Level
                    </label>
                    <select
                      value={selectedPriority}
                      onChange={(e) => setSelectedPriority(e.target.value)}
                      className="w-full px-3 py-2 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="low">Low (Minor Delay)</option>
                      <option value="medium">Medium (Moderate Congestion)</option>
                      <option value="high">High (Major Bottleneck)</option>
                      <option value="critical">Critical (Road Blocked / Life Hazard)</option>
                    </select>
                  </div>
                )}

                {/* Officer Workload Assignment Selection (Step 6) */}
                {modalType === 'assign' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                      Select Available Officer (Filtered by Zone Workload)
                    </label>
                    <select
                      required
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="w-full px-3 py-2 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {availableOfficers.map((off) => (
                        <option key={off._id} value={off._id}>
                          {off.name} ({off.badgeNumber || 'Officer'}) — Active Workload: {off.activeAssignmentsCount} assignments {off.assignedZone ? `[${off.assignedZone.code}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Duplicate Original Incident Target Selection */}
                {modalType === 'duplicate' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                      Select Original Primary Incident
                    </label>
                    <select
                      required
                      value={duplicateTargetId}
                      onChange={(e) => setDuplicateTargetId(e.target.value)}
                      className="w-full px-3 py-2 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select Target Primary Incident</option>
                      {incidents
                        .filter((inc) => inc._id !== selectedIncident._id && inc.status !== 'duplicate')
                        .map((inc) => (
                          <option key={inc._id} value={inc._id}>
                            {inc.incidentId} — {inc.title.slice(0, 45)}... ({inc.status})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Status Selection */}
                {modalType === 'status' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                      New Operational Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="in_progress">In Progress (Field Unit Working)</option>
                      <option value="resolved">Resolved (Road Hazard Cleared)</option>
                    </select>
                  </div>
                )}

                {/* Notes Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                    {modalType === 'reject'
                      ? 'Rejection Reason (Required)'
                      : modalType === 'request_info'
                      ? 'Information Required from Citizen (Required)'
                      : 'Operational Notes'}
                  </label>
                  <textarea
                    required={modalType === 'reject' || modalType === 'request_info'}
                    rows={3}
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder={
                      modalType === 'reject'
                        ? 'e.g. Field inspection confirmed road is clear.'
                        : modalType === 'request_info'
                        ? 'e.g. Please provide photo of nearest landmark or metro pillar number.'
                        : 'e.g. Unit deployed with barricades and asphalt mix...'
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
