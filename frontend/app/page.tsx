'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldAlert, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';

// --- Custom Hooks ---
function useScrollProgress(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      const totalScrollable = rect.height + windowHeight;
      const scrolled = windowHeight - rect.top;
      const rawProgress = scrolled / totalScrollable;
      
      setProgress(Math.max(0, Math.min(1, rawProgress)));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); 
    return () => window.removeEventListener('scroll', handleScroll);
  }, [ref]);

  return progress;
}

// --- Components ---

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);
  
  return (
    <nav className={`fixed top-0 w-full z-[100] transition-all duration-700 ${scrolled ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200 py-3 shadow-sm' : 'bg-transparent py-5 border-b border-transparent'}`}>
      <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-blue-900" />
          <span className="text-[14px] font-medium tracking-widest text-slate-900">SIF SENTINEL</span>
        </div>
        <div className="hidden lg:flex items-center gap-8 text-[13px] font-medium text-slate-600 tracking-wide">
          <a href="#how-it-works" className="hover:text-blue-900 transition-colors">How It Works</a>
          <a href="#intelligence" className="hover:text-blue-900 transition-colors">Intelligence</a>
          <a href="#explainability" className="hover:text-blue-900 transition-colors">Explainability</a>
          <a href="#impact" className="hover:text-blue-900 transition-colors">Impact</a>
        </div>
        <div className="flex items-center gap-5 text-[13px] font-medium">
          {user ? (
            <Link href="/dashboard" className="h-[38px] px-5 flex items-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-sm group">
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-blue-900 transition-colors">Login</Link>
              <Link href="/register" className="h-[38px] px-5 flex items-center gap-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white transition-all shadow-sm group">
                Get Started <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden bg-slate-50 border-b border-slate-200">
      {/* Official Government Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100 rounded-full blur-[120px] opacity-40"></div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
        
        {/* Left: Typography */}
        <div className="flex flex-col justify-center animate-[slideUp_0.8s_ease-out]">
          <div className="text-[12px] font-bold text-blue-900 tracking-[0.1em] uppercase mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-600"></span> Safety Intelligence
          </div>
          <h1 className="text-[56px] lg:text-[72px] font-medium leading-[1.05] tracking-tight text-slate-900 mb-6">
            Turn safety reports into<br/>early warnings.
          </h1>
          <p className="text-[17px] text-slate-600 font-light leading-relaxed max-w-[440px] mb-10">
            Convert unstructured safety narratives into deterministic, evidence-backed intelligence. Prevent serious injuries before they escalate.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="h-[46px] px-6 rounded-md bg-blue-900 hover:bg-blue-800 text-white text-[14px] font-medium flex items-center gap-2 group transition-all shadow-md">
              Explore Platform <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="#how-it-works" className="h-[46px] px-6 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-[14px] font-medium flex items-center transition-all shadow-sm">
              View how it works
            </a>
          </div>
        </div>

        {/* Right: Floating Visual Object (Official Style) */}
        <div className="hidden lg:flex items-center justify-center relative perspective-1000 animate-[fadeIn_1s_ease-out_0.3s_both]">
          <div className="relative w-full max-w-[480px] aspect-[4/5] transform-gpu rotate-y-[-5deg] animate-[float_6s_ease-in-out_infinite]">
            
            {/* Base Panel */}
            <div className="absolute inset-0 rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
              <div className="h-12 bg-slate-100 border-b border-slate-200 flex items-center px-4">
                 <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SIF Analysis Engine</div>
              </div>
              
              <div className="p-6 h-full flex flex-col gap-5">
                <div className="w-32 h-4 rounded bg-slate-200 mb-2"></div>
                <div className="space-y-2">
                  <div className="w-full h-2 rounded bg-slate-100"></div>
                  <div className="w-3/4 h-2 rounded bg-slate-100"></div>
                  <div className="w-5/6 h-2 rounded bg-slate-100"></div>
                </div>
                
                <div className="mt-6 flex gap-3">
                  <div className="w-1/2 rounded-lg bg-orange-50 border border-orange-200 p-4 flex flex-col justify-between">
                     <span className="text-[11px] font-bold text-orange-800 mb-2">SIF POTENTIAL</span>
                     <div className="text-2xl font-medium text-orange-600">HIGH</div>
                  </div>
                  <div className="w-1/2 rounded-lg bg-slate-50 border border-slate-200 p-4 flex flex-col justify-between">
                     <span className="text-[11px] font-bold text-slate-600 mb-2">RISK LEVEL</span>
                     <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden"><div className="w-[80%] h-full bg-blue-900"></div></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Overlay Card */}
            <div className="absolute -right-8 top-1/3 w-[220px] p-5 rounded-lg bg-white border border-red-200 shadow-[0_20px_40px_rgba(0,0,0,0.1)] transform-gpu translate-z-12 animate-[float_8s_ease-in-out_infinite_reverse]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Barrier Failure</span>
              </div>
              <div className="text-[13px] text-slate-700 leading-relaxed font-serif border-l-2 border-slate-200 pl-3 italic">
                &quot;Harness was completely detached from the anchor point.&quot;
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </section>
  );
};

const ScrollStory = () => {
  const containerRef = useRef<HTMLElement>(null);
  const progress = useScrollProgress(containerRef);
  
  const activeStep = Math.max(0, Math.min(6, Math.floor((progress - 0.2) * 10)));

  return (
    <section id="how-it-works" ref={containerRef} className="h-[400vh] relative bg-white border-b border-slate-200">
      <div className="sticky top-0 h-screen flex flex-col justify-center px-6 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 w-full">
          
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="text-[12px] font-bold text-blue-900 tracking-[0.1em] uppercase mb-6">Intelligence Extraction</div>
            <h2 className="text-[44px] md:text-[52px] font-display font-medium leading-[1.1] tracking-tight text-slate-900 mb-10">
              The signal is<br/>already there.
            </h2>
            <div className="p-8 border border-slate-200 bg-slate-50 rounded-xl shadow-sm relative overflow-hidden">
               <div className="absolute top-4 right-4 text-[10px] font-bold text-slate-400 uppercase">RAW INPUT</div>
               <p className="text-[16px] leading-[1.8] font-serif text-slate-700 transition-all duration-700">
                 &quot;Worker entered the <span className={`transition-colors duration-500 ${activeStep >= 1 ? 'font-medium text-slate-900 border-b-2 border-blue-900' : ''}`}>confined space</span> at unit 4. There was no <span className={`transition-colors duration-500 ${activeStep >= 3 ? 'text-red-700 bg-red-100 px-1 rounded font-medium' : ''}`}>verification of gas levels</span> prior to entry. A sudden <span className={`transition-colors duration-500 ${activeStep >= 2 ? 'text-orange-700 bg-orange-100 px-1 rounded' : ''}`}>fume accumulation</span> caused the worker to lose consciousness briefly.&quot;
               </p>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-center border-l border-slate-200 pl-8 lg:pl-16 relative">
            
            <div className="absolute left-[-1px] top-0 w-[2px] bg-blue-900 transition-all duration-500" style={{ height: `${(activeStep / 6) * 100}%` }}></div>

            <div className="space-y-10">
              {[
                { label: "Activity extracted", value: "Confined Space Entry" },
                { label: "Hazard identified", value: "Toxic Gas / Fumes" },
                { label: "Barrier failure detected", value: "Gas Testing & Clearance" },
                { label: "SIF potential assessed", value: "HIGH (Loss of Consciousness)" },
                { label: "Risk prioritized", value: "CRITICAL PRIORITY" },
                { label: "Intervention recommended", value: "Mandatory atmospheric monitoring interlock" }
              ].map((step, idx) => (
                <div key={idx} className={`transition-all duration-700 ${activeStep > idx ? 'opacity-40 translate-y-0' : activeStep === idx ? 'opacity-100 translate-y-0 scale-[1.02] origin-left' : 'opacity-0 translate-y-8'}`}>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Step 0{idx + 1}</div>
                  <div className="text-[13px] text-slate-500 mb-1">{step.label}</div>
                  <div className={`text-[18px] font-medium tracking-tight ${idx === 2 ? 'text-red-700' : idx === 3 || idx === 4 ? 'text-orange-700' : 'text-slate-900'}`}>
                    {step.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

const ExplainabilityInteractive = () => {
  const [hoveredFactor, setHoveredFactor] = useState<number | null>(null);

  const factors = [
    { id: 1, text: "Loss of consciousness", impact: "+2.4", source: "Text extraction", color: "orange" },
    { id: 2, text: "No gas verification", impact: "+1.8", source: "Rule violation", color: "orange" },
    { id: 3, text: "Routine maintenance", impact: "-0.5", source: "Context", color: "blue" }
  ];

  return (
    <section id="explainability" className="py-32 px-6 max-w-[1200px] mx-auto bg-white border-b border-slate-200">
      <div className="text-[12px] font-bold text-blue-900 tracking-[0.1em] uppercase mb-6">Explainability</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
        <div>
          <h2 className="text-[44px] md:text-[52px] font-display font-medium leading-[1.1] tracking-tight text-slate-900 mb-8">
            Every decision<br/>explained.
          </h2>
          <p className="text-[17px] text-slate-600 font-light leading-relaxed mb-12">
            Black-box AI is unacceptable in safety. SIF Sentinel uses Linear Model Feature Attribution and Deterministic Risk Factors to provide clear, auditable evidence for every prediction.
          </p>

          <div className="space-y-3">
            <div className="text-[11px] font-bold text-slate-500 mb-4 border-b border-slate-200 pb-2 uppercase tracking-widest">LINEAR MODEL FEATURE ATTRIBUTION</div>
            {factors.map((factor) => (
              <div 
                key={factor.id}
                onMouseEnter={() => setHoveredFactor(factor.id)}
                onMouseLeave={() => setHoveredFactor(null)}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-300 cursor-default
                  ${hoveredFactor === factor.id ? 'bg-slate-50 border-slate-300 shadow-sm' : 'bg-transparent border-transparent'}
                  ${hoveredFactor && hoveredFactor !== factor.id ? 'opacity-40' : 'opacity-100'}
                `}
              >
                <div className="text-[14px] font-medium text-slate-900 w-40">{factor.text}</div>
                <div className="flex-1 h-[4px] bg-slate-100 relative rounded-full overflow-hidden">
                  <div className={`absolute top-0 h-full transition-all duration-500 ${factor.color === 'orange' ? 'left-0 bg-orange-600' : 'right-0 bg-blue-600'}`} style={{ width: factor.id === 1 ? '80%' : factor.id === 2 ? '60%' : '30%' }}></div>
                </div>
                <div className={`text-[13px] font-mono w-12 text-right ${factor.color === 'orange' ? 'text-orange-700' : 'text-blue-700'}`}>{factor.impact}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center">
           <div className="p-8 border border-slate-200 bg-white shadow-lg rounded-xl relative">
             <div className="absolute top-4 left-4 text-[10px] font-bold text-slate-400 uppercase">EVIDENCE TRACE</div>
             <div className="mt-8 text-[15px] leading-[1.8] font-serif text-slate-700">
               &quot;The report clearly indicates <span className={`transition-all duration-300 ${hoveredFactor === 3 ? 'text-slate-900 font-bold bg-slate-100 px-1 rounded' : ''}`}>routine maintenance</span> was being performed. However, due to <span className={`transition-all duration-300 ${hoveredFactor === 2 ? 'text-orange-800 bg-orange-100 px-1 rounded' : ''}`}>no gas verification</span> being conducted, the worker experienced <span className={`transition-all duration-300 ${hoveredFactor === 1 ? 'text-red-800 bg-red-100 px-1 rounded font-bold' : ''}`}>loss of consciousness</span> inside the vessel.&quot;
             </div>
             
             {hoveredFactor && (
               <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500 animate-[fadeIn_0.3s_ease-out]">
                 <span>Source: {factors.find(f => f.id === hoveredFactor)?.source}</span>
                 <span className="text-slate-400">Confidence: 98%</span>
               </div>
             )}
           </div>
        </div>
      </div>
    </section>
  );
};

const ProductShowcase = () => {
  const containerRef = useRef<HTMLElement>(null);
  const progress = useScrollProgress(containerRef);
  
  const scale = 0.95 + (progress * 0.05);
  const rotateX = 10 - (progress * 10);
  const opacity = Math.min(1, progress * 2);

  return (
    <section ref={containerRef} className="h-[200vh] relative bg-slate-50 border-b border-slate-200">
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
        
        <div className="text-center mb-12 transition-opacity duration-500" style={{ opacity }}>
          <div className="text-[12px] font-bold text-blue-900 tracking-[0.1em] uppercase mb-4">Unified Intelligence</div>
          <h2 className="text-[32px] md:text-[44px] font-display font-medium tracking-tight text-slate-900">
            From raw data to human review.
          </h2>
        </div>

        <div 
          className="w-full max-w-[1000px] aspect-[16/9] border border-slate-300 rounded-xl bg-white shadow-2xl overflow-hidden relative perspective-1000"
          style={{ 
            transform: `scale(${scale}) rotateX(${rotateX}deg)`,
            opacity: opacity 
          }}
        >
          <div className="h-10 border-b border-slate-200 flex items-center px-4 gap-2 bg-slate-100">
             <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
             <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
             <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
             <div className="mx-auto h-5 w-1/3 bg-white border border-slate-200 rounded-md"></div>
          </div>
          
          <div className="p-8 h-full flex flex-col gap-6">
            <div className="flex justify-between items-end border-b border-slate-200 pb-4">
               <div>
                 <div className="w-32 h-6 bg-slate-200 rounded mb-2"></div>
                 <div className="w-64 h-3 bg-slate-100 rounded"></div>
               </div>
               <div className="w-24 h-8 bg-blue-900 rounded"></div>
            </div>
            <div className="grid grid-cols-3 gap-6 flex-1">
               <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-6 flex flex-col gap-4">
                 <div className="w-full h-40 bg-white border border-slate-200 rounded-md"></div>
                 <div className="w-full h-3 bg-slate-200 rounded-md mt-auto"></div>
                 <div className="w-3/4 h-3 bg-slate-200 rounded-md"></div>
               </div>
               <div className="col-span-1 flex flex-col gap-4">
                 <div className="h-24 rounded-lg border border-slate-200 bg-white shadow-sm"></div>
                 <div className="h-24 rounded-lg border border-red-200 bg-red-50"></div>
                 <div className="h-24 rounded-lg border border-slate-200 bg-white shadow-sm"></div>
               </div>
            </div>
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent opacity-50"></div>
        </div>

      </div>
    </section>
  );
};

const ImpactCTA = () => (
  <section id="impact" className="py-32 px-6 max-w-[1200px] mx-auto bg-white text-center">
    <div className="mb-32">
      <h2 className="text-[32px] md:text-[44px] font-display font-medium tracking-tight text-slate-900 mb-12">
        From safety reports<br/>to safer operations.
      </h2>
      <div className="flex flex-wrap justify-center gap-x-12 gap-y-8">
        <span className="text-[15px] font-medium text-slate-500 hover:text-blue-900 transition-colors cursor-default border-b-2 border-transparent hover:border-blue-900 pb-1">Earlier Detection</span>
        <span className="text-[15px] font-medium text-slate-500 hover:text-blue-900 transition-colors cursor-default border-b-2 border-transparent hover:border-blue-900 pb-1">Risk Prioritization</span>
        <span className="text-[15px] font-medium text-slate-500 hover:text-blue-900 transition-colors cursor-default border-b-2 border-transparent hover:border-blue-900 pb-1">Evidence-Based Decisions</span>
        <span className="text-[15px] font-medium text-slate-500 hover:text-blue-900 transition-colors cursor-default border-b-2 border-transparent hover:border-blue-900 pb-1">Human-Reviewed Action</span>
      </div>
    </div>

    <div className="py-20 border-t border-slate-200">
      <h2 className="text-[44px] md:text-[64px] font-display font-medium tracking-tight text-slate-900 mb-10">
        Detect earlier.<br/>
        Understand deeper.<br/>
        <span className="text-slate-400">Act before the incident.</span>
      </h2>
      <Link href="/dashboard" className="inline-flex h-[46px] px-8 rounded-md bg-blue-900 hover:bg-blue-800 text-white text-[14px] font-medium items-center gap-2 group transition-all shadow-md">
        Enter SIF SENTINEL <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  </section>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 scroll-smooth">
      <Navbar />
      <Hero />
      <ScrollStory />
      <ExplainabilityInteractive />
      <ProductShowcase />
      <ImpactCTA />
      
      <footer className="py-10 border-t border-slate-200 bg-slate-50 text-center flex flex-col items-center gap-4">
        <div className="w-4 h-4 rounded-full bg-slate-200"></div>
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          SIF SENTINEL &copy; 2026. Safety Intelligence Division.
        </span>
      </footer>
    </div>
  );
}
