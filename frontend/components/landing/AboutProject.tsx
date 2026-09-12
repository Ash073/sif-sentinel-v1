'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Icosahedron, Torus, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ShieldCheck, Server } from 'lucide-react';

const DataCore = () => {
  const groupRef = useRef<THREE.Group>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
      groupRef.current.rotation.z += delta * 0.1;
    }
    if (outerRingRef.current) {
      outerRingRef.current.rotation.x -= delta * 0.5;
      outerRingRef.current.rotation.y += delta * 0.2;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.x += delta * 0.8;
      innerRingRef.current.rotation.z -= delta * 0.3;
    }
  });

  return (
    <group ref={groupRef} scale={1.4}>
      {/* Central Core */}
      <Icosahedron args={[1, 2]}>
        <meshStandardMaterial color="#10b981" wireframe transparent opacity={0.4} />
      </Icosahedron>
      <Icosahedron args={[0.7, 3]}>
        <meshBasicMaterial color="#34d399" wireframe={false} transparent opacity={0.8} />
      </Icosahedron>

      {/* Data Rings */}
      <Torus ref={outerRingRef} args={[1.8, 0.02, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#059669" transparent opacity={0.6} />
      </Torus>
      <Torus ref={innerRingRef} args={[1.4, 0.015, 16, 100]} rotation={[0, Math.PI / 2, 0]}>
        <meshBasicMaterial color="#10b981" transparent opacity={0.8} />
      </Torus>
    </group>
  );
};

export const AboutProject = () => {
  return (
    <section className="relative w-full bg-slate-950 py-24 border-t border-white/5 overflow-hidden">
      {/* Background glow & Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">

        {/* Header */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-6">
              <Server className="w-4 h-4" />
              Enterprise Telemetry
            </div>
            <h2 className="text-4xl md:text-6xl font-light tracking-tight text-white mb-6">
              Beyond Compliance. <br className="hidden md:block" />
              <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
                True Prevention.
              </span>
            </h2>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
              Traditional safety systems react to incidents after they occur.
              SIF Sentinel uses advanced predictive modeling to identify hidden patterns
              in daily reports, intercepting severe incidents before they happen.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column: About Project Text */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative z-10 pr-0 lg:pr-12"
          >
            <div className="inline-flex items-center gap-2 mb-6">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold tracking-widest uppercase text-xs">About The Project</span>
            </div>
            <h3 className="text-3xl md:text-4xl font-light text-white mb-6 leading-tight">
              Shifting from Reactive to <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">Predictive</span> Safety
            </h3>
            <div className="space-y-5 text-slate-300 font-light leading-relaxed text-lg">
              <p>
                In high-risk industries, severe injuries are rarely isolated events. They are preceded by multiple "weak signals" or near misses buried within thousands of routine daily safety reports.
              </p>
              <p>
                <strong className="text-white font-medium">SIF Sentinel</strong> leverages advanced Machine Learning and NLP to actively analyze these unstructured reports. It connects the dots across your enterprise to identify leading indicators of a Serious Injury or Fatality (SIF) <em>before</em> the event occurs.
              </p>
              <p>
                The impact is profound: instead of investigating accidents after they happen, organizations can deploy targeted interventions based on data-driven foresight, fundamentally protecting human life.
              </p>
            </div>
          </motion.div>

          {/* Right Column: 3D Visualization */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative h-[450px] w-full flex items-center justify-center"
          >
            <div className="absolute inset-0 z-0">
              <Canvas camera={{ position: [0, 0, 4] }}>
                <ambientLight intensity={0.2} />
                <directionalLight position={[2, 5, 5]} intensity={1.5} />
                <pointLight position={[-2, -2, -2]} color="#059669" intensity={2} />
                <DataCore />
                <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.8} />
              </Canvas>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
};
