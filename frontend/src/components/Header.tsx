import React from 'react';
import { Film, Zap } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Burst2Gif</h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full flex items-center gap-1">
                <Zap className="w-3 h-3" /> 로컬 가속
              </span>
            </div>
            <p className="text-xs text-slate-400">
              고용량 연사 사진을 고화질 GIF 및 MP4로 빠르고 가볍게 변환
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-400 hidden sm:block text-right">
          <span className="text-emerald-400 font-medium">● FFmpeg 네이티브 연동</span>
          <p className="text-slate-500">2-Pass 고화질 팔레트 지원</p>
        </div>
      </div>
    </header>
  );
};
