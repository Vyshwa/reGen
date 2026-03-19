import { ShieldAlert } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(220,38,38,0.1),transparent)] pointer-events-none" />
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="mx-auto bg-red-500/10 w-24 h-24 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
          <ShieldAlert className="w-12 h-12 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tighter text-white">Maintenance Process Ongoing</h1>
          <p className="text-zinc-400 text-lg">We're performing some essential upgrades to improve your experience. Please check back later.</p>
        </div>
        <div className="pt-8 border-t border-zinc-800">
          <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Estimated Uptime: Shortly</p>
        </div>
      </div>
    </div>
  );
}
