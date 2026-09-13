import React from 'react';
import { JobStatus } from '../types';
import { openFolder } from '../api';
import { CheckCircle2, Download, FolderOpen, AlertOctagon, Loader2, X } from 'lucide-react';

interface Props {
  status: JobStatus | null;
  onClose: () => void;
}

export const ResultModal: React.FC<Props> = ({ status, onClose }) => {
  if (!status) return null;

  const isFinished = status.status === 'completed';
  const isFailed = status.status === 'failed';
  const isRunning = status.status === 'running' || status.status === 'queued';

  const handleOpenFolder = async () => {
    await openFolder(status.job_id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            {isRunning && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />}
            {isFinished && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {isFailed && <AlertOctagon className="w-5 h-5 text-rose-400" />}
            <h3 className="text-base font-bold text-white">
              {isRunning && '인코딩 진행 중...'}
              {isFinished && '변환이 완료되었습니다!'}
              {isFailed && '인코딩 오류 발생'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Running Progress */}
        {isRunning && (
          <div className="space-y-4 py-4 text-center">
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${status.progress}%` }}
              />
            </div>
            <p className="text-sm text-slate-300">
              FFmpeg 2-Pass 고화질 인코딩을 수행하고 있습니다.
            </p>
            <p className="text-xs text-slate-500">
              대용량 연사 사진의 프레임 차이점을 분석하여 최적의 팔레트를 합성 중입니다...
            </p>
          </div>
        )}

        {/* Failed */}
        {isFailed && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
            {status.error_message || '알 수 없는 오류가 발생했습니다.'}
          </div>
        )}

        {/* Completed */}
        {isFinished && status.download_url && (() => {
          const isMp4 = status.format === 'mp4' || status.download_url.includes('.mp4');
          return (
            <div className="space-y-4">
              {/* Inline Result Viewer */}
              <div className="aspect-[4/3] sm:aspect-video w-full bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
                {isMp4 ? (
                  <video
                    key={status.download_url}
                    src={status.download_url}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <img
                    src={status.download_url}
                    alt="Converted Result"
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>

              {/* File Info */}
              <div className="flex items-center justify-between text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-slate-300">
                <span>결과물 파일 크기</span>
                <strong className="text-emerald-400 font-bold font-mono text-sm">
                  {status.size_formatted}
                </strong>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <a
                  href={status.download_url}
                  download={`burst_${status.job_id.slice(0, 8)}.${isMp4 ? 'mp4' : 'gif'}`}
                  className="py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 text-sm shadow-md shadow-indigo-600/30 transition"
                >
                  <Download className="w-4 h-4" />
                  다운로드
                </a>
                <button
                  onClick={handleOpenFolder}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl border border-slate-700 flex items-center justify-center gap-2 text-sm transition"
                >
                  <FolderOpen className="w-4 h-4 text-indigo-400" />
                  탐색기에서 열기
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
