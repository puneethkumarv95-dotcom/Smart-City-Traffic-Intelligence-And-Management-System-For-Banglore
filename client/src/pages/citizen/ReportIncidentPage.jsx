import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import incidentService from '../../services/incidentService';
import LocationPicker from '../../components/map/LocationPicker';
import Badge from '../../components/ui/Badge';
import {
  AlertTriangle,
  MapPin,
  Camera,
  Upload,
  CheckCircle,
  X,
  Shield,
  EyeOff,
  Navigation,
  ArrowRight,
  Info,
  Layers,
  Copy,
  ThumbsUp
} from 'lucide-react';

export const ReportIncidentPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Form states
  const [category, setCategory] = useState('Pothole');
  const [severity, setSeverity] = useState('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  // Duplicate candidates state
  const [duplicates, setDuplicates] = useState([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [acknowledgedDuplicates, setAcknowledgedDuplicates] = useState(false);

  const categories = [
    { id: 'Road Accident', label: 'Road Accident', icon: '🚨' },
    { id: 'Pothole', label: 'Pothole / Crater', icon: '🕳️' },
    { id: 'Traffic Congestion', label: 'Traffic Congestion', icon: '🚗' },
    { id: 'Road Flooding', label: 'Road Flooding', icon: '🌊' },
    { id: 'Broken Traffic Signal', label: 'Broken Traffic Signal', icon: '🚦' },
    { id: 'Road Closure', label: 'Road Closure', icon: '🚧' },
    { id: 'Illegal Parking', label: 'Illegal Parking', icon: '⛔' },
    { id: 'Road Damage', label: 'Road Damage', icon: '⚠️' },
    { id: 'Other', label: 'Other Hazard', icon: '📍' }
  ];

  const presets = [
    { name: 'Majestic Central', lat: 12.9767, lng: 77.5713, addr: 'Kempegowda Bus Station, Majestic' },
    { name: 'Hebbal Flyover', lat: 13.0358, lng: 77.597, addr: 'Hebbal Flyover Junction, Outer Ring Road' },
    { name: 'Central Silk Board', lat: 12.9177, lng: 77.6238, addr: 'Hosur Road, Central Silk Board Junction' },
    { name: 'Whitefield', lat: 12.9698, lng: 77.75, addr: 'Hope Farm Junction, Whitefield' },
    { name: 'Electronic City', lat: 12.8452, lng: 77.6602, addr: 'Electronic City Tollgate Terminus' }
  ];

  // Check for potential duplicate reports
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (latitude && longitude && category) {
        setCheckingDuplicates(true);
        try {
          const res = await incidentService.checkDuplicates({
            category,
            latitude,
            longitude,
            title,
            description,
            radiusMeters: 1200
          });
          setDuplicates(res.data || []);
        } catch (e) {
          // Ignore background duplicate check errors
        } finally {
          setCheckingDuplicates(false);
        }
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [category, latitude, longitude, title]);

  const handleLocationChange = (lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
    setAcknowledgedDuplicates(false);
  };

  const handleAddressDetected = (detectedAddress) => {
    if (!address) {
      setAddress(detectedAddress);
    }
  };

  const handleApplyPreset = (preset) => {
    setLatitude(preset.lat);
    setLongitude(preset.lng);
    setAddress(preset.addr);
    setAcknowledgedDuplicates(false);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + mediaFiles.length > 5) {
      setError('You can upload a maximum of 5 evidence files.');
      return;
    }

    // Validate size and mime
    for (const f of files) {
      if (f.size > 15 * 1024 * 1024) {
        setError(`File "${f.name}" exceeds 15MB limit.`);
        return;
      }
    }

    const newFiles = [...mediaFiles, ...files];
    setMediaFiles(newFiles);

    const newPreviews = files.map((file) => ({
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file)
    }));
    setPreviews([...previews, ...newPreviews]);
  };

  const handleRemoveFile = (index) => {
    const updatedFiles = mediaFiles.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setMediaFiles(updatedFiles);
    setPreviews(updatedPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('severity', severity);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('address', address);
      formData.append('city', 'Bengaluru');
      formData.append('isAnonymous', isAnonymous);

      mediaFiles.forEach((file) => {
        formData.append('media', file);
      });

      const response = await incidentService.reportIncident(formData);
      setLoading(false);
      setSuccess(true);

      setTimeout(() => {
        navigate('/citizen/my-reports');
      }, 1500);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Failed to submit report. Please verify inputs.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-city-card border border-city-border rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-electric/10 blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-2 mb-2">
          <Badge variant="cyan" size="sm">CITIZEN ROAD SAFETY NETWORK</Badge>
          <span className="text-xs font-mono text-slate-400">Bengaluru Municipal Operations</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Report Traffic Hazard or Road Incident
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
          Geo-tag potholes, collisions, or flooding. Automatically matches nearby duplicate reports and alerts Traffic Police response teams.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Incident Submitted Successfully!</p>
            <p className="text-xs text-emerald-400/80">Directing to your private reports log...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* DUPLICATE WARNING ACCORDION */}
      {duplicates.length > 0 && !acknowledgedDuplicates && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-white">
                  Potential Existing Reports Detected Nearby ({duplicates.length})
                </h3>
                <p className="text-xs text-amber-300/80">
                  A similar incident was recently reported near your selected location. Please check if your hazard is already logged:
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAcknowledgedDuplicates(true)}
              className="text-xs font-semibold px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-xl border border-amber-500/40"
            >
              Proceed Anyway
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
            {duplicates.slice(0, 2).map((dup, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-city-dark/80 border border-amber-500/20 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] text-amber-400">
                      {dup.incident.incidentId} • {dup.confidence}% Match
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">~{dup.distanceMeters}m away</span>
                  </div>
                  <h4 className="font-semibold text-xs text-white truncate">{dup.incident.title}</h4>
                  <p className="text-[11px] text-slate-400 truncate">{dup.incident.address}</p>
                </div>
                <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                  <span className="text-slate-400">Status: {dup.incident.status}</span>
                  <button
                    type="button"
                    onClick={() => navigate('/citizen/complaints')}
                    className="text-electric-light hover:underline font-semibold"
                  >
                    View & Confirm
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Category Selection */}
        <div className="bg-city-card border border-city-border rounded-2xl p-6">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            1. Select Incident Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {categories.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                  category === cat.id
                    ? 'bg-electric/15 border-electric text-white shadow-lg shadow-electric/15'
                    : 'bg-city-surface/50 border-city-border hover:bg-city-hover text-slate-300'
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs font-semibold truncate">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Severity Level */}
        <div className="bg-city-card border border-city-border rounded-2xl p-6">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            2. Estimated Severity Level
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'low', label: 'Low', desc: 'Minor delay or annoyance', color: 'border-emerald-500/40 text-emerald-400' },
              { id: 'medium', label: 'Medium', desc: 'Lane slow-down', color: 'border-amber-500/40 text-amber-400' },
              { id: 'high', label: 'High', desc: 'Major corridor blockage', color: 'border-orange-500/40 text-orange-400' },
              { id: 'critical', label: 'Critical', desc: 'Life hazard or road impassable', color: 'border-rose-500/40 text-rose-400' }
            ].map((sev) => (
              <button
                type="button"
                key={sev.id}
                onClick={() => setSeverity(sev.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  severity === sev.id
                    ? 'bg-city-surface border-white text-white ring-2 ring-white/20'
                    : `bg-city-surface/40 ${sev.color} hover:bg-city-hover`
                }`}
              >
                <span className="block text-xs font-bold uppercase font-mono">{sev.label}</span>
                <span className="text-[11px] text-slate-400">{sev.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Location Selection */}
        <div className="bg-city-card border border-city-border rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                3. Precise Location Selection
              </label>
              <p className="text-xs text-slate-400">Click on the map or drag the pin to set the exact incident spot</p>
            </div>
            {/* Quick junction presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-mono text-slate-400 flex-shrink-0">Presets:</span>
              {presets.map((p) => (
                <button
                  type="button"
                  key={p.name}
                  onClick={() => handleApplyPreset(p)}
                  className="px-2 py-1 rounded-lg bg-city-surface hover:bg-city-hover border border-city-border text-[11px] text-slate-300 flex-shrink-0 transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onLocationChange={handleLocationChange}
            onAddressDetected={handleAddressDetected}
            pinColor={severity === 'critical' ? '#ef4444' : '#0ea5e9'}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Street Address / Landmark
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Outer Ring Road, Near Hebbal Flyover Inbound Ramp"
              className="w-full px-4 py-2.5 bg-city-surface/70 border border-city-border rounded-xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-electric transition-all"
            />
          </div>
        </div>

        {/* Step 4: Title & Description */}
        <div className="bg-city-card border border-city-border rounded-2xl p-6 space-y-4">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            4. Incident Details
          </label>

          <div>
            <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1 font-mono">
              Incident Summary Title
            </label>
            <input
              type="text"
              required
              minLength={5}
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 3-foot deep pothole causing vehicle tire punctures"
              className="w-full px-4 py-2.5 bg-city-surface/70 border border-city-border rounded-xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-electric transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1 font-mono">
              Detailed Description & Commuter Advice
            </label>
            <textarea
              required
              minLength={10}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe lane affected, damage type, vehicle categories at risk, and suggested detour..."
              className="w-full px-4 py-2.5 bg-city-surface/70 border border-city-border rounded-xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-electric transition-all"
            />
          </div>
        </div>

        {/* Step 5: Photo / Media Attachments */}
        <div className="bg-city-card border border-city-border rounded-2xl p-6 space-y-3">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            5. Evidence Media (Optional, Max 5 Photos or Short Videos)
          </label>

          <div className="flex flex-wrap gap-3">
            {previews.map((preview, index) => (
              <div
                key={index}
                className="relative w-24 h-24 rounded-xl overflow-hidden border border-city-border bg-black/50 group"
              >
                {preview.type.startsWith('video/') ? (
                  <video src={preview.url} className="w-full h-full object-cover" />
                ) : (
                  <img src={preview.url} alt="Evidence" className="w-full h-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded-full transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {previews.length < 5 && (
              <label className="w-24 h-24 rounded-xl border-2 border-dashed border-city-border hover:border-electric flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-white transition-all bg-city-surface/30">
                <Camera className="w-5 h-5 mb-1 text-electric-light" />
                <span className="text-[10px] font-mono">Upload</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Step 6: Anonymity Toggle */}
        <div className="bg-city-card border border-city-border rounded-2xl p-6 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Report Anonymously</p>
              <p className="text-xs text-slate-400">
                Hides your name and contact details from the public list and officer view.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-5 h-5 rounded border-city-border bg-city-surface text-electric focus:ring-electric"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 px-6 rounded-2xl text-sm font-bold text-white bg-electric hover:bg-electric-dark disabled:opacity-50 shadow-xl shadow-electric/25 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <span>Submit Road Hazard Report</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ReportIncidentPage;
