import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, X, Sparkles, Clock, HardDrive } from 'lucide-react';
import { JobResult } from '../modules/JobController';
import { formatBytes } from '../modules/FileManager';

interface Props {
  result: JobResult | null;
  onClose: () => void;
}

export const ResultModal: React.FC<Props> = ({ result, onClose }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (result) {
      const url = URL.createObjectURL(result.blob);
      setBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setBlobUrl(null);
    }
  }, [result]);

  if (!result || !blobUrl) return null;

  const durationSec = (result.durationMs / 1000).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">GIF 생성이 완료되었습니다!</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview Player */}
        <div className="aspect-[4/3] sm:aspect-video w-full bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
          <img
            src={blobUrl}
            alt="생성된 GIF 미리보기"
            className="max-h-full max-w-full object-contain"
          />
        </div>

        {/* Metadata stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 text-slate-300">
            <HardDrive className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500">결과 파일 크기</div>
              <div className="font-mono font-bold text-emerald-400">
                {formatBytes(result.totalBytes)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 text-slate-300">
            <Clock className="w-4 h-4 text-violet-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500">처리 소요 시간</div>
              <div className="font-mono font-bold text-slate-200">{durationSec}초</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <a
            href={blobUrl}
            download={`burst_${Date.now().toString().slice(-6)}.gif`}
            className="py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs shadow-lg shadow-indigo-600/30 transition"
          >
            <Download className="w-4 h-4" />
            GIF 다운로드
          </a>
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl border border-slate-700 flex items-center justify-center gap-2 text-xs transition"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            계속 편집하기
          </button>
        </div>
      </div>
    </div>
  );
};
