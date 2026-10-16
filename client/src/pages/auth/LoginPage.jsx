import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Activity,
  Shield,
  Ambulance,
  Car,
  User,
  Cpu,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      const destination = from || `/${result.user.role}`;
      navigate(destination, { replace: true });
    }
  };

  const handleDemoFill = async (demoEmail, demoRole) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    const result = await login(demoEmail, 'Password@123');
    if (result.success) {
      navigate(`/${demoRole}`, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-city-darkest text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative">
      {/* Background radial gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[400px] bg-electric/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Main Container */}
      <div className="max-w-md w-full relative z-10">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-electric/20 border border-electric/40 flex items-center justify-center text-electric-light shadow-lg shadow-electric/20">
              <Activity className="w-7 h-7 animate-pulse" />
            </div>
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Bengaluru Smart City Transit
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">
            Operational Security Login
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-city-card/90 backdrop-blur-xl border border-city-border rounded-2xl p-6 sm:p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Government / Citizen Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@smartcity.gov"
                  className="w-full pl-10 pr-4 py-2.5 bg-city-surface/70 border border-city-border rounded-xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-city-surface/70 border border-city-border rounded-xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-electric hover:bg-electric-dark disabled:opacity-50 shadow-lg shadow-electric/25 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Authenticate & Enter</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher Section */}
          <div className="mt-8 pt-6 border-t border-city-border/80">
            <p className="text-[11px] font-mono uppercase text-slate-400 text-center tracking-wider mb-3">
              One-Click Evaluator Demo Logins
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoFill('citizen@smartcity.gov', 'citizen')}
                className="p-2 rounded-xl bg-city-surface hover:bg-city-hover border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 flex items-center gap-2 transition-all"
              >
                <User className="w-3.5 h-3.5" />
                <span className="truncate">Citizen</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('police@smartcity.gov', 'police')}
                className="p-2 rounded-xl bg-city-surface hover:bg-city-hover border border-blue-500/30 hover:border-blue-400 text-blue-300 flex items-center gap-2 transition-all"
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="truncate">Traffic Police</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('emergency@smartcity.gov', 'emergency')}
                className="p-2 rounded-xl bg-city-surface hover:bg-city-hover border border-rose-500/30 hover:border-rose-400 text-rose-300 flex items-center gap-2 transition-all"
              >
                <Ambulance className="w-3.5 h-3.5" />
                <span className="truncate">Emergency EMS</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('operator@smartcity.gov', 'operator')}
                className="p-2 rounded-xl bg-city-surface hover:bg-city-hover border border-emerald-500/30 hover:border-emerald-400 text-emerald-300 flex items-center gap-2 transition-all"
              >
                <Car className="w-3.5 h-3.5" />
                <span className="truncate">Parking Operator</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleDemoFill('admin@smartcity.gov', 'admin')}
              className="w-full mt-2 p-2 rounded-xl bg-city-surface hover:bg-city-hover border border-purple-500/30 hover:border-purple-400 text-purple-300 text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Super Administrator</span>
            </button>
          </div>

          {/* Citizen Registration Link */}
          <div className="mt-6 text-center text-xs text-slate-400">
            <span>New Bengaluru resident? </span>
            <Link to="/register" className="text-electric-light hover:underline font-semibold">
              Register Citizen Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

