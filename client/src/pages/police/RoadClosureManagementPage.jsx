import React, { useState, useEffect } from 'react';
import trafficService from '../../services/trafficService';
import { getSocket } from '../../services/socket';
import LocationPicker from '../../components/map/LocationPicker';
import Badge from '../../components/ui/Badge';
import {
  Construction,
  Shield,
  Plus,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  Radio,
  RefreshCw,
  X,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export const RoadClosureManagementPage = () => {
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingClosure, setEditingClosure] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [roadName, setRoadName] = useState('');
  const [reason, setReason] = useState('');
  const [diversionInstructions, setDiversionInstructions] = useState('');
  const [address, setAddress] = useState('Central Silk Board Junction, Outer Ring Road');
  const [latitude, setLatitude] = useState(12.9177);
  const [longitude, setLongitude] = useState(77.6238);
  const [severity, setSeverity] = useState('full');
  const [endTime, setEndTime] = useState(
    new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );

  const fetchClosures = async () => {
    setLoading(true);
    try {
      const res = await trafficService.getClosures();
      setClosures(res.data || []);
    } catch (err) {
      console.error('Failed to load road closures:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosures();

    const socket = getSocket();
    const handleNew = (c) => setClosures((prev) => [c, ...prev]);
    const handleUpd = (c) => setClosures((prev) => prev.map((x) => (x._id === c._id ? c : x)));
    const handleRem = ({ id }) => setClosures((prev) => prev.filter((x) => x._id !== id));

    socket.on('closure:created', handleNew);
    socket.on('closure:updated', handleUpd);
    socket.on('closure:removed', handleRem);

    return () => {
      socket.off('closure:created', handleNew);
      socket.off('closure:updated', handleUpd);
      socket.off('closure:removed', handleRem);
    };
  }, []);

  const handleOpenCreateModal = () => {
    setEditingClosure(null);
    setTitle('');
    setRoadName('');
    setReason('');
    setDiversionInstructions('');
    setAddress('Central Silk Board Junction, Outer Ring Road');
    setLatitude(12.9177);
    setLongitude(77.6238);
    setSeverity('full');
    setEndTime(new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16));
    setModalOpen(true);
  };

  const handleOpenEditModal = (cls) => {
    setEditingClosure(cls);
    setTitle(cls.title);
    setRoadName(cls.roadName);
    setReason(cls.reason);
    setDiversionInstructions(cls.diversionInstructions);
    setAddress(cls.address);
    setLatitude(cls.location?.coordinates?.[1] || 12.9177);
    setLongitude(cls.location?.coordinates?.[0] || 77.6238);
    setSeverity(cls.severity || 'full');
    setEndTime(new Date(cls.endTime).toISOString().slice(0, 16));
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingClosure) {
        await trafficService.updateClosure(editingClosure._id, {
          title,
          diversionInstructions,
          endTime: new Date(endTime).toISOString(),
          severity
        });
      } else {
        await trafficService.createClosure({
          title,
          roadName,
          reason,
          diversionInstructions,
          latitude,
          longitude,
          address,
          endTime: new Date(endTime).toISOString(),
          severity
        });
      }
      setSubmitting(false);
      setModalOpen(false);
      fetchClosures();
    } catch (err) {
      setSubmitting(false);
      alert(err.response?.data?.message || 'Failed to submit road closure notice.');
    }
  };

  const handleToggleActive = async (cls) => {
    try {
      await trafficService.updateClosure(cls._id, {
        isActive: !cls.isActive
      });
      fetchClosures();
    } catch (err) {
      alert('Failed to update closure status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this official road closure notice?')) return;
    try {
      await trafficService.deleteClosure(id);
      fetchClosures();
    } catch (err) {
      alert('Failed to delete road closure.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-city-card border border-rose-500/30 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="rose" size="sm">TRAFFIC POLICE COMMAND AUTHORITY</Badge>
            <span className="text-xs font-mono text-slate-400">Road Closures & Official Diversions</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Road Closure & Diversion Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Publish official road closures, construction zones, and diversion advisories. Instantly synced to citizen live maps and routing navigation.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-auto">
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Road Closure</span>
          </button>

          <button
            onClick={fetchClosures}
            className="p-2.5 bg-city-surface hover:bg-city-hover border border-city-border rounded-xl text-slate-300 hover:text-white transition-colors"
            title="Refresh Closures"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Closures Table */}
      <div className="bg-city-card border border-city-border rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-city-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
            <Construction className="w-4 h-4 text-rose-400" />
            <span>Active Road Closure Notices ({closures.length})</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Real-time Broadcast: Socket.IO Channel
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-slate-400">
            Loading road closures database...
          </div>
        ) : closures.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 italic">
            No road closures currently published.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-city-surface/50 font-mono text-[11px] text-slate-400 uppercase border-b border-city-border">
                <tr>
                  <th className="py-3 px-4">Closure ID</th>
                  <th className="py-3 px-4">Road & Location</th>
                  <th className="py-3 px-4">Reason & Diversion</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Valid Until</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-city-border/40 font-mono">
                {closures.map((cls) => (
                  <tr key={cls._id} className="hover:bg-city-surface/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-rose-400">{cls.closureId}</td>
                    <td className="py-3.5 px-4 font-sans max-w-xs">
                      <p className="font-bold text-white text-xs">{cls.title}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{cls.roadName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{cls.address}</p>
                    </td>
                    <td className="py-3.5 px-4 font-sans max-w-xs">
                      <p className="text-slate-300 text-xs">
                        <strong>Reason:</strong> {cls.reason}
                      </p>
                      <p className="text-[11px] text-amber-400/90 mt-1">
                        <strong>Diversion:</strong> {cls.diversionInstructions}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          cls.severity === 'emergency'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : cls.severity === 'full'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {cls.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(cls.endTime).toLocaleDateString()}{' '}
                      {new Date(cls.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(cls)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                          cls.isActive
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {cls.isActive ? '● Active' : '○ Inactive'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(cls)}
                          className="p-1.5 rounded-lg bg-city-surface hover:bg-city-hover text-slate-300 hover:text-white transition-colors"
                          title="Edit Closure"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cls._id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                          title="Delete Notice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create or Edit Road Closure */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-city-card border border-city-border rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Construction className="w-5 h-5 text-rose-400" />
              <span>{editingClosure ? 'Edit Road Closure Notice' : 'Publish Official Road Closure'}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Official closures will be broadcast immediately to all active citizen map sessions.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                  Closure Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Silk Board Metro Interchange Pier Erection"
                  className="w-full px-3 py-2 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                    Road / Corridor Name
                  </label>
                  <input
                    type="text"
                    required
                    value={roadName}
                    onChange={(e) => setRoadName(e.target.value)}
                    placeholder="Outer Ring Road Slip Road"
                    className="w-full px-3 py-2 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                    Severity
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full px-3 py-2 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="full">Full Closure (All lanes blocked)</option>
                    <option value="partial">Partial Closure (Single lane blocked)</option>
                    <option value="emergency">Emergency / Structural Life Safety</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                  Reason for Closure
                </label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Heavy crane positioning and pier beam girder erection..."
                  className="w-full px-3 py-2 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                  Diversion Instructions (Mandatory for Motorists)
                </label>
                <textarea
                  required
                  rows={2}
                  value={diversionInstructions}
                  onChange={(e) => setDiversionInstructions(e.target.value)}
                  placeholder="Light motor vehicles diverted via 14th Main HSR Layout Sector 4..."
                  className="w-full px-3 py-2 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Location Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                  Pin Closure Location on Map
                </label>
                <LocationPicker
                  latitude={latitude}
                  longitude={longitude}
                  onLocationChange={(lat, lng) => {
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                  onAddressDetected={(addr) => setAddress(addr)}
                  pinColor="#ef4444"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                    Address / Landmark
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                    Estimated End Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-city-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-lg transition-all"
                >
                  {submitting ? 'Publishing...' : editingClosure ? 'Update Closure' : 'Broadcast Closure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoadClosureManagementPage;

