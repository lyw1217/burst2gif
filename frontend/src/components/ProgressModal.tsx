import React from 'react';
import { Loader2, XCircle } from 'lucide-react';
import { JobProgress } from '../modules/JobController';
import { formatBytes } from '../modules/FileManager';

interface Props {
  progress: JobProgress | null;
  onCancel: () => void;
}

export const ProgressModal: React.FC<Props> = ({ progress, onCancel }) => {
  if (!progress) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 mb-1">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-white">GIF를 만들고 있습니다</h3>
          <p className="text-xs text-slate-400">
            대용량 사진을 한 장씩 안전하게 인코딩 중입니다. 잠시만 기다려 주세요.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono font-medium">
            <span className="text-indigo-400 font-bold">{progress.percent}%</span>
            <span className="text-slate-300">
              {progress.currentFrame} / {progress.totalFrames}장 처리 중
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-200"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        {/* Status Info */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          <span>현재 생성된 파일 크기</span>
          <strong className="text-emerald-400 font-mono font-bold">
            약 {formatBytes(progress.currentBytes)}
          </strong>
        </div>

        {/* Cancel Button */}
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-2.5 px-4 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 text-slate-300 font-medium rounded-xl border border-slate-700 flex items-center justify-center gap-2 text-xs transition"
        >
          <XCircle className="w-4 h-4" />
          작업 취소
        </button>
      </div>
    </div>
  );
};
