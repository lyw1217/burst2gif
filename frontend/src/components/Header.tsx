import React from 'react';
import { Film, ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 py-3 sm:px-6 sm:py-4 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl shadow-md shadow-indigo-500/25 text-white shrink-0">
            <Film className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Burst2Gif
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              연사 사진을 브라우저에서 서버 업로드 없이 바로 고화질 GIF로 변환
            </p>
          </div>
        </div>

        {/* Privacy Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-emerald-950/40 border border-emerald-500/30 rounded-full sm:rounded-xl text-emerald-300 text-[11px] sm:text-xs font-medium shadow-sm shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
          <span>서버 업로드 없는 100% 로컬 변환</span>
        </div>
      </div>
    </header>
  );
};
