'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldAlert, Brain, Database, Network, TrendingUp } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }
  }
};

const Navbar = () => (
  <nav className="fixed top-0 w-full z-50 bg-slate-950/50 backdrop-blur-xl border-b border-white/5">
    <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          <ShieldAlert className="w-5 h-5 text-emerald-400" />
        </div>
        <span className="text-[15px] font-semibold tracking-widest text-white">SIF SENTINEL</span>
      </div>
      <div className="hidden lg:flex items-center gap-8 text-[13px] font-medium text-slate-400 tracking-wide">
        <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">How It Works</a>
        <a href="#intelligence" className="hover:text-emerald-400 transition-colors">Intelligence</a>
        <a href="#explainability" className="hover:text-emerald-400 transition-colors">Explainability</a>
      </div>
      <div>
        <Link href="/login" className="h-10 px-6 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[13px] font-medium flex items-center transition-all backdrop-blur-md">
          Sign In
        </Link>
      </div>
    </div>
  </nav>
);

const Hero = () => {
  return (
    <section className="relative min-h-[100vh] flex items-center justify-center pt-20 overflow-hidden bg-slate-950">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_50%)]"></div>
        <div className="absolute top-1/4 -left-1/4 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] pointer-events-none"></div>
      </div>

      <div className="max-w-[1000px] mx-auto px-6 text-center relative z-10 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[12px] font-medium text-emerald-400 tracking-wide uppercase">Enterprise Safety AI</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="text-[60px] md:text-[80px] lg:text-[96px] font-bold leading-[1.05] tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-slate-500 mb-8"
        >
          Prevent Fatalities<br/>Before They Happen.
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-[18px] md:text-[22px] text-slate-400 font-light leading-relaxed max-w-[600px] mb-12"
        >
          Transform unstructured safety narratives into deterministic, evidence-backed intelligence. The ultimate defense against Serious Injuries and Fatalities (SIF).
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        >
          <Link href="/login" className="h-14 px-8 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[16px] font-semibold flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:scale-105 transform group">
            Get Started
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const steps = [
    {
      icon: <Database className="w-6 h-6 text-emerald-400" />,
      title: "1. Ingest Messy Data",
      desc: "Connect seamlessly to existing EHS systems. We ingest unstructured safety reports, near-miss narratives, and hazard observations in real-time."
    },
    {
      icon: <Brain className="w-6 h-6 text-blue-400" />,
      title: "2. AI Precursor Extraction",
      desc: "Our NLP pipeline deterministic extracts barrier failures, specific activities, and context from noisy text, identifying hidden SIF precursors."
    },
    {
      icon: <Network className="w-6 h-6 text-purple-400" />,
      title: "3. Knowledge Graph Mapping",
      desc: "Extracted entities are mapped against a graph of organizational life-saving rules, determining precisely which critical safeguards failed."
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-amber-400" />,
      title: "4. Actionable Intelligence",
      desc: "Real-time risk scoring highlights critical interventions, providing HSE managers with explainable, deterministic evidence to act before incidents escalate."
    }
  ];

  return (
    <section id="how-it-works" className="py-32 bg-slate-950 relative z-10 border-t border-white/5">
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="text-center mb-20"
        >
          <motion.h2 variants={itemVariants} className="text-[40px] md:text-[56px] font-bold tracking-tight text-white mb-6">
            The Signal is Already There.
          </motion.h2>
          <motion.p variants={itemVariants} className="text-slate-400 text-[18px] max-w-[600px] mx-auto font-light leading-relaxed">
            SIF Sentinel processes your historical and live data through a rigorous 4-step intelligence pipeline to uncover hidden risks.
          </motion.p>
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {steps.map((step, idx) => (
            <motion.div 
              key={idx} 
              variants={itemVariants}
              whileHover={{ y: -10 }}
              className="glass-card p-8 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 shadow-inner relative z-10">
                {step.icon}
              </div>
              <h3 className="text-[20px] font-semibold text-white mb-4 relative z-10">{step.title}</h3>
              <p className="text-[15px] text-slate-400 leading-relaxed font-light relative z-10">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const Intelligence = () => {
  return (
    <section id="intelligence" className="py-32 bg-slate-900 relative z-10 border-t border-white/5">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
            className="flex-1"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span className="text-[12px] font-medium text-blue-400 tracking-wide uppercase">Real-Time Risk Scoring</span>
            </motion.div>
            <motion.h2 variants={itemVariants} className="text-[40px] md:text-[48px] font-bold tracking-tight text-white mb-6 leading-[1.1]">
              See the warning signs before the incident.
            </motion.h2>
            <motion.p variants={itemVariants} className="text-slate-400 text-[18px] font-light leading-relaxed mb-8">
              Traditional safety systems look at what has already happened. SIF Sentinel analyzes precursor signals in real-time to generate predictive risk scores, empowering proactive interventions.
            </motion.p>
            <motion.ul variants={containerVariants} className="space-y-4">
              {[
                "Instant NLP extraction of hazard context",
                "Automated mapping to Life-Saving Rules",
                "Dynamic prioritization of high-risk sites"
              ].map((text, idx) => (
                <motion.li key={idx} variants={itemVariants} className="flex items-center gap-3 text-slate-300">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <ArrowRight className="w-3 h-3 text-emerald-400" />
                  </div>
                  {text}
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
            className="flex-1 w-full"
          >
            <div className="glass-panel p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]"></div>
              <div className="relative z-10 space-y-4">
                {/* Mock UI for intelligence */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h4 className="text-white font-medium">Site Alpha-7</h4>
                    <p className="text-sm text-slate-400">High Risk Indicator Detected</p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 font-semibold text-sm">
                    94% SIF Risk
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5">
                  <p className="text-sm text-slate-300 mb-2 font-mono">
                    "Worker bypassed the lockout tagout procedure to clear the jammed conveyor..."
                  </p>
                  <div className="flex gap-2 mt-3">
                    <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20">Barrier Defeat</span>
                    <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20">LOTO Violation</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Explainability = () => {
  return (
    <section id="explainability" className="py-32 bg-slate-950 relative z-10 border-t border-white/5">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
            className="flex-1"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span className="text-[12px] font-medium text-purple-400 tracking-wide uppercase">No Black Boxes</span>
            </motion.div>
            <motion.h2 variants={itemVariants} className="text-[40px] md:text-[48px] font-bold tracking-tight text-white mb-6 leading-[1.1]">
              100% Explainable AI.
            </motion.h2>
            <motion.p variants={itemVariants} className="text-slate-400 text-[18px] font-light leading-relaxed mb-8">
              Trust is paramount in safety. Every risk score, every extracted precursor, and every AI-generated insight is fully traceable to the original source document and mapped securely via our Knowledge Graph.
            </motion.p>
            <motion.div variants={itemVariants}>
              <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-2 transition-colors">
                Explore the Knowledge Graph <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
            className="flex-1 w-full"
          >
            <div className="glass-panel p-8 relative overflow-hidden min-h-[300px] flex items-center justify-center">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]"></div>
              
              {/* Mock Graph nodes */}
              <div className="relative z-10 w-full max-w-[300px]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[2px] bg-white/10"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-[2px] bg-white/10"></div>
                
                <div className="relative flex flex-col items-center gap-12">
                  <div className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-medium text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)] z-10">
                    Incident Report #882
                  </div>
                  <div className="flex w-full justify-between z-10">
                    <div className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium text-sm shadow-xl">
                      LOTO Procedure
                    </div>
                    <div className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 font-medium text-sm shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                      Barrier Failed
                    </div>
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium text-sm shadow-xl z-10">
                    Electrical Hazard
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Intelligence />
      <Explainability />
      
      <footer className="py-12 border-t border-white/5 bg-slate-950 text-center flex flex-col items-center justify-center gap-6">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
          <ShieldAlert className="w-4 h-4 text-emerald-400" />
        </div>
        <span className="text-[12px] font-medium text-slate-500 uppercase tracking-widest">
          SIF SENTINEL &copy; 2026. Safety Intelligence Division.
        </span>
      </footer>
    </div>
  );
}
