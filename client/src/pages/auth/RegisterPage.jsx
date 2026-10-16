import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Activity,
  User,
  Mail,
  Lock,
  Phone,
  Globe,
  Compass,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    preferredLanguage: 'en',
    notificationRadiusKm: 5
  });

  const { register, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await register({
      ...formData,
      notificationRadiusKm: Number(formData.notificationRadiusKm)
    });

    if (result.success) {
      navigate('/citizen', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-city-darkest text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[400px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
              <Activity className="w-7 h-7" />
            </div>
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Citizen Registration
          </h1>
          <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">
            Bengaluru Smart Mobility Grid
          </p>
        </div>

        <div className="bg-city-card/90 backdrop-blur-xl border border-city-border rounded-2xl p-6 sm:p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Kavitha Reddy"
                  className="w-full pl-10 pr-4 py-2 bg-city-surface/70 border border-city-border rounded-xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="kavitha@example.com"
                  className="w-full pl-10 pr-4 py-2 bg-city-surface/70 border border-city-border rounded-xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Password (min 6 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2 bg-city-surface/70 border border-city-border rounded-xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98450 12345"
                  className="w-full pl-10 pr-4 py-2 bg-city-surface/70 border border-city-border rounded-xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Preferred Language
                </label>
                <select
                  value={formData.preferredLanguage}
                  onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                  className="w-full px-3 py-2 bg-city-surface/70 border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-all"
                >
                  <option value="en">English (default)</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Alert Radius
                </label>
                <select
                  value={formData.notificationRadiusKm}
                  onChange={(e) => setFormData({ ...formData, notificationRadiusKm: e.target.value })}
                  className="w-full px-3 py-2 bg-city-surface/70 border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-all"
                >
                  <option value={3}>3 km</option>
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                </select>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              * Official Police, EMS, and Operator accounts must be provisioned via Administrator verification.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 shadow-lg shadow-cyan-600/25 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Create Citizen Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            <span>Already registered? </span>
            <Link to="/login" className="text-cyan-400 hover:underline font-semibold">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

