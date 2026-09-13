import React, { useEffect } from 'react';
import { Loader2, XCircle, AlertCircle } from 'lucide-react';
import { JobProgress } from '../modules/JobController';
import { formatBytes } from '../modules/FileManager';

interface Props {
  progress: JobProgress | null;
  onCancel: () => void;
}

export const ProgressModal: React.FC<Props> = ({ progress, onCancel }) => {
  // ESC 키 누르면 취소
  useEffect(() => {
    if (!progress) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [progress, onCancel]);

  if (!progress) return null;

  const isHighEstimated = progress.estimatedTotalBytes && progress.estimatedTotalBytes > 300 * 1024 * 1024;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 mb-1">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <h3 id="progress-modal-title" className="text-lg font-bold text-white">
            GIF를 만들고 있습니다
          </h3>
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
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <span>현재 인코딩 용량</span>
            <strong className="text-emerald-400 font-mono font-bold">
              {formatBytes(progress.currentBytes)}
            </strong>
          </div>
          {progress.estimatedTotalBytes && (
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-1.5">
              <span>최종 예상 용량</span>
              <span className="font-mono text-indigo-300 font-medium">
                약 {formatBytes(progress.estimatedTotalBytes)}
              </span>
            </div>
          )}
        </div>

        {isHighEstimated && (
          <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>최종 결과 크기가 다소 클 것으로 예상됩니다. 필요시 해상도를 줄여 다시 시도할 수 있습니다.</span>
          </div>
        )}

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
