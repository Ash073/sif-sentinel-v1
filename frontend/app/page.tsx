'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  TerminalSquare,
  Activity,
  Search,
  Eye,
  Briefcase,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/components/providers/AuthProvider';

// ─── Dummy Data Generator for Background Chart ───────────────────────────────

const generateInitialData = () => {
  return Array.from({ length: 50 }, (_, i) => ({
    time: i,
    risk: 30 + Math.random() * 20 + Math.sin(i / 3) * 10,
  }));
};

const AnimatedBackgroundChart = () => {
  const [data, setData] = useState(generateInitialData());

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        const newData = [...prev.slice(1)];
        const lastTime = newData[newData.length - 1].time;
        newData.push({
          time: lastTime + 1,
          risk: 30 + Math.random() * 20 + Math.sin(lastTime / 3) * 10,
        });
        return newData;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-[0.15]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="risk"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRisk)"
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="linear"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Quick Auth Roles ────────────────────────────────────────────────────────

const ROLES = [
  { id: 'ADMIN', name: 'System Admin', icon: TerminalSquare, email: 'admin@sifsentinel.com' },
  { id: 'HSE_MANAGER', name: 'HSE Manager', icon: Briefcase, email: 'manager@sifsentinel.com' },
  { id: 'HSE_ANALYST', name: 'Safety Analyst', icon: Activity, email: 'analyst@sifsentinel.com' },
  { id: 'REVIEWER', name: 'Field Reviewer', icon: Search, email: 'reviewer@sifsentinel.com' },
  { id: 'VIEWER', name: 'Site Viewer', icon: Eye, email: 'viewer@sifsentinel.com' },
];

const QuickAuthModal = ({ onClose }: { onClose: () => void }) => {
  const router = useRouter();
  const { login } = useAuth();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  const handleRoleLogin = async (roleId: string, email: string) => {
    setLoadingRole(roleId);
    try {
      const res = await authService.login(email, 'Sentinel2026!');
      await login(res.access_token);
      router.push('/dashboard');
    } catch (error) {
      console.error('Authentication failed:', error);
      setLoadingRole(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4"
    >
      {/* Background click to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-xl bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
      >
        <div className="text-center mb-8">
          <h3 className="text-2xl font-light tracking-tight text-white mb-2">Select Role to Enter</h3>
          <p className="text-slate-400 text-sm font-light">
            Enterprise Single Sign-On
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ROLES.map((role, idx) => (
            <button
              key={role.id}
              onClick={() => handleRoleLogin(role.id, role.email)}
              disabled={loadingRole !== null}
              className={`
                group relative flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-300
                bg-white/5 border border-white/5 backdrop-blur-md overflow-hidden
                hover:bg-white/10 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]
                ${idx === ROLES.length - 1 && ROLES.length % 2 !== 0 ? 'md:col-span-2' : ''}
                ${loadingRole === role.id ? 'opacity-50 scale-95 cursor-not-allowed' : ''}
              `}
            >
              {loadingRole === role.id && (
                <div className="absolute inset-0 bg-emerald-500/20 animate-pulse" />
              )}
              <div className="w-12 h-12 rounded-xl bg-slate-950/50 border border-white/10 flex items-center justify-center group-hover:border-emerald-500/30 transition-colors z-10">
                <role.icon className={`w-5 h-5 ${loadingRole === role.id ? 'text-emerald-400 animate-spin' : 'text-slate-300 group-hover:text-emerald-400'}`} />
              </div>
              <div className="z-10">
                <p className="text-white font-medium tracking-wide">{role.name}</p>
                <p className="text-[11px] text-slate-500 uppercase tracking-widest">{role.id}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Main Landing Page ───────────────────────────────────────────────────────

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 relative overflow-hidden flex flex-col">
      <AnimatedBackgroundChart />
      
      {/* Top Bar */}
      <div className="absolute top-0 w-full p-8 flex justify-between items-center z-50 pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <ShieldAlert className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-[13px] font-semibold tracking-widest text-white uppercase">
            SIF Sentinel
          </span>
        </div>
        <div className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
          Global Safety Command // Enterprise Edition
        </div>
      </div>

      {/* Main Content Centered */}
      <main className="flex-1 flex items-center justify-center relative z-10 px-6">
        <div className="max-w-4xl mx-auto flex flex-col">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-light tracking-tighter text-white mb-10 leading-[1.1]"
          >
            Predictive intelligence <br />
            for <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-600">human life.</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="max-w-2xl border-l-2 border-emerald-500/30 pl-6 mb-16"
          >
            <p className="text-xl md:text-2xl text-slate-300 font-light leading-relaxed">
              A Serious Injury or Fatality (SIF) is not a statistic. By isolating "Near Miss" precursors hidden within thousands of daily safety reports, this engine shifts safety protocols from reactive to predictive.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <button
              onClick={() => setShowAuthModal(true)}
              className="group relative h-16 px-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-lg font-semibold flex items-center justify-center transition-all duration-300 shadow-[0_0_40px_rgba(16,185,129,0.2)] hover:shadow-[0_0_60px_rgba(16,185,129,0.4)]"
            >
              Enter Command Center
              <motion.span
                className="ml-3 block w-2 h-2 rounded-full bg-slate-950"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            </button>
          </motion.div>
        </div>
      </main>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && <QuickAuthModal onClose={() => setShowAuthModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
