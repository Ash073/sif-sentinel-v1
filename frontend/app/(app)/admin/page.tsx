import React from 'react';
import { Settings, Lock } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 relative">
        <Settings className="w-10 h-10 text-slate-400" />
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-slate-950">
          <Lock className="w-4 h-4 text-slate-950" />
        </div>
      </div>
      <h1 className="text-3xl font-bold text-white mb-4">Admin Settings Locked</h1>
      <p className="text-slate-400 max-w-md mx-auto text-lg">
        The administration panel is restricted during this live demonstration to prevent unintended configuration changes to the SIF Sentinel environment.
      </p>
    </div>
  );
}
