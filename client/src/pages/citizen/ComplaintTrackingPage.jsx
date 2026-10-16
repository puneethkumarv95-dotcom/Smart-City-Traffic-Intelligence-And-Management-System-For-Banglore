import React, { useState, useEffect } from 'react';
import incidentService from '../../services/incidentService';
import { getSocket } from '../../services/socket';
import Badge from '../../components/ui/Badge';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Star,
  MessageSquare,
  ShieldCheck,
  User,
  ArrowRight,
  RefreshCw,
  X
} from 'lucide-react';

export const ComplaintTrackingPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'resolved'
  const [selectedFeedbackIncident, setSelectedFeedbackIncident] = useState(null);
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [voteMessage, setVoteMessage] = useState(null);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const response = await incidentService.getIncidents({ limit: 50 });
      setIncidents(response.data || []);
    } catch (err) {
      console.error('Error fetching incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();

    // Listen to real-time events via Socket.IO
    const socket = getSocket();
    const handleStatusChanged = (updatedIncident) => {
      setIncidents((prev) =>
        prev.map((inc) => (inc._id === updatedIncident._id ? { ...inc, ...updatedIncident } : inc))
      );
    };

    const handleVoteUpdated = (voteData) => {
      setIncidents((prev) =>
        prev.map((inc) =>
          inc._id === voteData.id
            ? {
                ...inc,
                confirmVotesCount: voteData.confirmVotesCount,
                disputeVotesCount: voteData.disputeVotesCount,
                status: voteData.status
              }
            : inc
        )
      );
    };

    socket.on('incident:status_changed', handleStatusChanged);
    socket.on('incident:verified', handleStatusChanged);
    socket.on('incident:assigned', handleStatusChanged);
    socket.on('incident:vote_updated', handleVoteUpdated);

    return () => {
      socket.off('incident:status_changed', handleStatusChanged);
      socket.off('incident:verified', handleStatusChanged);
      socket.off('incident:assigned', handleStatusChanged);
      socket.off('incident:vote_updated', handleVoteUpdated);
    };
  }, []);

  const handleVote = async (incidentId, voteType) => {
    setVoteMessage(null);
    try {
      const res = await incidentService.voteIncident(incidentId, voteType);
      setVoteMessage({ text: `Your ${voteType} vote was registered!`, type: 'success' });
      // Update local count
      setIncidents((prev) =>
        prev.map((inc) =>
          inc._id === incidentId
            ? {
                ...inc,
                confirmVotesCount: res.data.confirmVotesCount,
                disputeVotesCount: res.data.disputeVotesCount
              }
            : inc
        )
      );
    } catch (err) {
      setVoteMessage({
        text: err.response?.data?.message || 'Vote failed or already recorded.',
        type: 'error'
      });
    }
    setTimeout(() => setVoteMessage(null), 3000);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFeedbackIncident) return;
    try {
      await incidentService.submitFeedback(selectedFeedbackIncident._id, rating, comments);
      setFeedbackSuccess(true);
      setTimeout(() => {
        setFeedbackSuccess(false);
        setSelectedFeedbackIncident(null);
        fetchIncidents();
      }, 1500);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit feedback.');
    }
  };

  const lifecycleStages = [
    { key: 'submitted', label: 'Submitted' },
    { key: 'under_review', label: 'Under Review' },
    { key: 'verified', label: 'Verified' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' }
  ];

  const getStageIndex = (status) => {
    const idx = lifecycleStages.findIndex((s) => s.key === status);
    return idx === -1 ? 0 : idx;
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (filter === 'active') return inc.status !== 'resolved' && inc.status !== 'rejected';
    if (filter === 'resolved') return inc.status === 'resolved';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-city-card border border-city-border rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="cyan" size="sm">COMPLAINT LIFECYCLE MONITOR</Badge>
            <span className="text-xs font-mono text-slate-400">Bengaluru Transit Authority</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Incident Tracking & Community Verification
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Track submitted road reports, view dispatch officer milestones, confirm hazards, and rate municipal repairs.
          </p>
        </div>

        <button
          onClick={fetchIncidents}
          className="px-4 py-2.5 bg-city-surface hover:bg-city-hover border border-city-border rounded-xl text-xs font-semibold text-slate-200 flex items-center gap-2 transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {voteMessage && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            voteMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{voteMessage.text}</span>
          <button onClick={() => setVoteMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-city-border/80 pb-3">
        {[
          { id: 'all', label: 'All Incidents' },
          { id: 'active', label: 'Active Corridors' },
          { id: 'resolved', label: 'Resolved & Closed' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === tab.id
                ? 'bg-electric text-white shadow-md shadow-electric/25'
                : 'text-slate-400 hover:text-white hover:bg-city-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Incidents Queue List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-electric border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono text-slate-400">Loading live incident records...</p>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="bg-city-card border border-city-border rounded-2xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Incidents in this Queue</h3>
          <p className="text-xs text-slate-400 mt-1">All road segments in this filter category are clear.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIncidents.map((incident) => {
            const currentStageIndex = getStageIndex(incident.status);
            const isRejected = incident.status === 'rejected';

            return (
              <div
                key={incident._id}
                className="bg-city-card border border-city-border/80 hover:border-slate-600/80 rounded-2xl p-6 shadow-lg transition-all"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant={incident.severity} size="sm">
                        {incident.severity}
                      </Badge>
                      <Badge variant="default" size="sm">
                        {incident.category?.replace('_', ' ')}
                      </Badge>
                      {incident.zone && (
                        <span className="text-[11px] font-mono text-slate-400">
                          Zone: {incident.zone.name || incident.zone.code}
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(incident.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-white">{incident.title}</h2>
                    <p className="text-xs font-mono text-electric-light mt-0.5">{incident.address}</p>
                  </div>

                  {/* Community Votes */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => handleVote(incident._id, 'confirm')}
                      className="px-3 py-1.5 rounded-xl bg-city-surface hover:bg-emerald-500/20 border border-city-border hover:border-emerald-500/40 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      title="Confirm this hazard exists"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{incident.confirmVotesCount || 0}</span>
                    </button>

                    <button
                      onClick={() => handleVote(incident._id, 'dispute')}
                      className="px-3 py-1.5 rounded-xl bg-city-surface hover:bg-rose-500/20 border border-city-border hover:border-rose-500/40 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      title="Dispute this report"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      <span>{incident.disputeVotesCount || 0}</span>
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed mb-6">
                  {incident.description}
                </p>

                {/* Media Thumbnails */}
                {incident.media && incident.media.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {incident.media.map((med, i) => (
                      <a
                        key={i}
                        href={med.url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-16 h-16 rounded-lg overflow-hidden border border-city-border bg-black/40 hover:opacity-80 transition-opacity"
                      >
                        <img src={med.url} alt="Attachment" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}

                {/* LIFECYCLE PROGRESS TIMELINE */}
                {!isRejected ? (
                  <div className="bg-city-surface/50 border border-city-border/60 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono uppercase text-slate-400">
                        Operational Workflow Progression
                      </span>
                      <span className="text-xs font-mono font-bold text-electric-light uppercase">
                        Current: {incident.status?.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-6 gap-1 relative">
                      {lifecycleStages.map((stage, idx) => {
                        const isCompleted = idx <= currentStageIndex;
                        const isCurrent = idx === currentStageIndex;

                        return (
                          <div key={stage.key} className="flex flex-col items-center text-center">
                            <div
                              className={`w-full h-1.5 rounded-full mb-2 transition-all ${
                                isCompleted
                                  ? idx === 5
                                    ? 'bg-emerald-500'
                                    : 'bg-electric'
                                  : 'bg-slate-800'
                              }`}
                            ></div>
                            <span
                              className={`text-[10px] font-mono leading-tight ${
                                isCurrent
                                  ? 'text-white font-bold'
                                  : isCompleted
                                  ? 'text-slate-300'
                                  : 'text-slate-400'
                              }`}
                            >
                              {stage.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs mb-4">
                    <p className="font-semibold">Report Rejected by Traffic Authority</p>
                    <p className="text-[11px] text-rose-400 mt-0.5">
                      Reason: {incident.rejectedBy?.reason || 'Duplicate or invalid observation.'}
                    </p>
                  </div>
                )}

                {/* Resolution / Feedback Trigger */}
                {incident.status === 'resolved' && (
                  <div className="pt-4 border-t border-city-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-slate-300">
                      <span className="text-emerald-400 font-semibold font-mono">RESOLVED: </span>
                      <span>{incident.resolutionDetails?.notes || 'Road hazard cleared by response unit.'}</span>
                    </div>

                    {incident.citizenFeedback?.rating ? (
                      <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>Rated {incident.citizenFeedback.rating}/5 stars</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedFeedbackIncident(incident)}
                        className="px-4 py-1.5 rounded-xl bg-electric/20 hover:bg-electric/30 border border-electric/40 text-electric-light text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-all"
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span>Rate Resolution</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Citizen Feedback Modal */}
      {selectedFeedbackIncident && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-city-card border border-city-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedFeedbackIncident(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">Rate Incident Resolution</h3>
            <p className="text-xs text-slate-400 mb-4">
              {selectedFeedbackIncident.title}
            </p>

            {feedbackSuccess ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-emerald-300 text-xs">
                Feedback submitted! Thank you for helping keep Bengaluru moving.
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase font-mono mb-2">
                    Resolution Satisfaction (1 to 5 Stars)
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => setRating(num)}
                        className="p-2 rounded-xl border border-city-border hover:border-amber-400 transition-colors"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            num <= rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-400'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase font-mono mb-1">
                    Comments or Public Works Feedback
                  </label>
                  <textarea
                    rows={3}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Was the repair satisfactory? Did traffic flow resume normally?"
                    className="w-full px-3 py-2 bg-city-surface border border-city-border rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-electric"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-electric hover:bg-electric-dark text-white rounded-xl text-xs font-bold shadow-lg transition-all"
                >
                  Submit Official Citizen Feedback
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintTrackingPage;
