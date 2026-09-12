'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
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
import { AboutProject } from '@/components/landing/AboutProject';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

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

// ─── 3D Modal Background ─────────────────────────────────────────────────────

const AuthModal3DBackground = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.1;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 32, 32]} scale={2.5}>
      <MeshDistortMaterial
        color="#10b981"
        attach="material"
        distort={0.4}
        speed={1.5}
        roughness={0.2}
        transparent
        opacity={0.15}
        wireframe
      />
    </Sphere>
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
    >
      {/* Background click to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-xl bg-background/60 backdrop-blur-2xl border border-primary/20 rounded-3xl p-8 shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden"
      >
        {/* 3D Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
           <Canvas camera={{ position: [0, 0, 3] }}>
             <ambientLight intensity={0.5} />
             <directionalLight position={[2, 5, 2]} intensity={1} />
             <AuthModal3DBackground />
           </Canvas>
        </div>

        <div className="relative z-10 text-center mb-8">
          <h3 className="text-2xl font-light tracking-tight text-foreground mb-2">Select Role to Enter</h3>
          <p className="text-primary/80 text-sm font-mono tracking-widest uppercase">
            Enterprise Single Sign-On
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-3">
          {ROLES.map((role, idx) => (
            <button
              key={role.id}
              onClick={() => handleRoleLogin(role.id, role.email)}
              disabled={loadingRole !== null}
              className={`
                group relative flex items-center justify-between p-4 rounded-2xl text-left transition-all duration-300
                bg-background/40 border border-border/50 backdrop-blur-md overflow-hidden
                hover:bg-primary/10 hover:border-primary/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:scale-[1.02]
                ${loadingRole === role.id ? 'opacity-50 scale-95 cursor-not-allowed' : ''}
              `}
            >
              {loadingRole === role.id && (
                <div className="absolute inset-0 bg-primary/20 animate-pulse" />
              )}
              {/* Animated hover gradient */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
              
              <div className="flex items-center gap-4 z-10">
                <div className="w-10 h-10 rounded-full bg-background/50 border border-border/50 flex items-center justify-center group-hover:border-primary/50 group-hover:bg-primary/20 transition-all duration-300 shadow-inner">
                  <role.icon className={`w-4 h-4 transition-colors duration-300 ${loadingRole === role.id ? 'text-primary animate-spin' : 'text-muted-foreground group-hover:text-primary'}`} />
                </div>
                <div>
                  <p className="text-foreground font-medium tracking-wide group-hover:text-primary transition-colors">{role.name}</p>
                  <p className="text-[10px] text-primary/60 uppercase tracking-widest font-mono group-hover:text-primary/80 transition-colors">{role.id}</p>
                </div>
              </div>
              
              <div className="z-10 pr-2 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-primary/70 relative overflow-x-hidden flex flex-col">
      <AnimatedBackgroundChart />
      
      {/* Top Bar */}
      <div className="absolute top-0 w-full p-8 flex justify-between items-center z-50 pointer-events-none">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="SIF Sentinel Logo" width={40} height={40} className="w-10 h-10 object-contain" />
          <span className="text-[13px] font-semibold tracking-widest text-foreground uppercase">
            SIF Sentinel
          </span>
        </div>
        <div className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          Global Safety Command // Enterprise Edition
        </div>
      </div>

      {/* Main Content Centered */}
      <main className="min-h-screen flex items-center justify-center relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto flex flex-col">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-light tracking-tighter text-foreground mb-10 leading-[1.1]"
          >
            Predictive intelligence <br />
            for <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-500">human life.</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="max-w-2xl border-l-2 border-primary/30 pl-6 mb-16"
          >
            <p className="text-xl md:text-2xl text-muted-foreground font-light leading-relaxed">
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
              className="group relative h-16 px-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-semibold flex items-center justify-center transition-all duration-300 shadow-[0_0_40px_rgba(16,185,129,0.2)] hover:shadow-[0_0_60px_rgba(16,185,129,0.4)]"
            >
              Enter Command Center
              <motion.span
                className="ml-3 block w-2 h-2 rounded-full bg-primary-foreground"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            </button>
          </motion.div>
        </div>
      </main>

      <AboutProject />

      {/* Footer */}
      <footer className="w-full bg-card/50 py-12 border-t border-border text-center px-6 z-10 relative">
        <p className="text-muted-foreground text-xs md:text-sm max-w-4xl mx-auto font-mono uppercase tracking-[0.2em] leading-relaxed">
          Organizations generate warning signals before major events, but the signals are valuable only if they are identified, classified and acted upon.
        </p>
      </footer>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && <QuickAuthModal onClose={() => setShowAuthModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
