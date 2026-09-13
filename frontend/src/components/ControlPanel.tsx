import React from 'react';
import { Settings2, Play, AlertTriangle, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { evaluateRisk, calculateOutputDimensions } from '../modules/RiskEvaluator';

interface Props {
  fileCount: number;
  fps: number;
  onFpsChange: (fps: number) => void;
  targetLongEdge: number;
  onTargetLongEdgeChange: (width: number) => void;
  fitMode: 'contain' | 'cover';
  onFitModeChange: (mode: 'contain' | 'cover') => void;
  loop: number;
  onLoopChange: (loop: number) => void;
  onSubmit: () => void;
  isProcessing: boolean;
  aspectDimensions?: { width: number; height: number };
  hasMixedOrientations?: boolean;
}

export const ControlPanel: React.FC<Props> = ({
  fileCount,
  fps,
  onFpsChange,
  targetLongEdge,
  onTargetLongEdgeChange,
  fitMode,
  onFitModeChange,
  loop,
  onLoopChange,
  onSubmit,
  isProcessing,
  aspectDimensions = { width: 3, height: 2 },
  hasMixedOrientations = false,
}) => {
  // 실제 감지된 종횡비에 맞춰 정확한 WorkPixels 및 출력 치수 계산
  const { width: outW, height: outH } = calculateOutputDimensions(
    aspectDimensions.width,
    aspectDimensions.height,
    targetLongEdge
  );
  const isLandscape = outW >= outH;
  const risk = evaluateRisk(outW, outH, fileCount);

  const presets = [
    { label: '작은 용량', width: 960, desc: '메신저 / 빠른 공유' },
    { label: '보통 화질', width: 1280, desc: '추천 기본값', isDefault: true },
    { label: '선명하게', width: 1920, desc: '고해상도 · 큰 화면용' },
  ];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white">GIF 생성 옵션</h2>
        </div>
        <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
          {outW} × {outH} ({isLandscape ? '가로형' : '세로형'})
        </span>
      </div>

      {hasMixedOrientations && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            가로와 세로 사진이 함께 섞여 있습니다. '화면에 맞추기' 모드 사용 시 일부 프레임에 검은 여백이 들어갈 수 있습니다.
          </span>
        </div>
      )}

      {/* 1. 크기 선택 (Resolution Presets) */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-300">
          출력 크기 (긴 변 기준)
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {presets.map((p) => {
            const isSelected = targetLongEdge === p.width;
            return (
              <button
                key={p.width}
                type="button"
                onClick={() => onTargetLongEdgeChange(p.width)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-600/15 ring-1 ring-indigo-500 text-white shadow-md shadow-indigo-600/20'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{p.label}</span>
                  {p.isDefault && (
                    <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded">
                      기본
                    </span>
                  )}
                </div>
                <div className="text-sm font-mono font-bold mt-1 text-indigo-300">
                  {p.width}px
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{p.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 속도 설정 (FPS) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">
            재생 속도 (FPS)
          </label>
          <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
            {fps} FPS ({Math.round(1000 / fps)}ms/장)
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="30"
          step="1"
          value={fps}
          onChange={(e) => onFpsChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>1 FPS (천천히)</span>
          <span>12 FPS (자연스러운 연사)</span>
          <span>30 FPS (빠름)</span>
        </div>
      </div>

      {/* 3. 화면 맞춤 및 무한 반복 */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">화면 맞춤 방식</label>
          <select
            value={fitMode}
            onChange={(e) => onFitModeChange(e.target.value as 'contain' | 'cover')}
            className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="contain">화면에 맞추기 (비율 유지, 기본)</option>
            <option value="cover">화면 채우기 (크롭)</option>
          </select>
        </div>

        <div className="space-y-1.5 flex flex-col justify-end">
          <label className="flex items-center gap-2 p-2 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition">
            <input
              type="checkbox"
              checked={loop === 0}
              onChange={(e) => onLoopChange(e.target.checked ? 0 : -1)}
              className="rounded accent-indigo-500"
            />
            <span className="text-xs text-slate-300 font-medium">무한 반복 (Loop)</span>
          </label>
        </div>
      </div>

      {/* 4. 작업량 기반 안전장치 카드 (Risk Evaluator) */}
      {risk.level === 'very_heavy' && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{risk.message}</span>
          </div>
          {risk.recommendedWidth && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-amber-400/90">{risk.subMessage}</span>
              <button
                type="button"
                onClick={() => onTargetLongEdgeChange(risk.recommendedWidth!)}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-xs font-medium text-amber-200 transition"
              >
                {risk.recommendedWidth}px로 변경
              </button>
            </div>
          )}
        </div>
      )}

      {risk.level === 'dangerous' && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{risk.message}</span>
          </div>
          {risk.recommendedWidth && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-rose-300">{risk.subMessage}</span>
              <button
                type="button"
                onClick={() => onTargetLongEdgeChange(risk.recommendedWidth!)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-xs font-bold text-white shadow transition"
              >
                {risk.recommendedWidth}px로 변경하기
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. 변환 시작 버튼 */}
      <button
        type="button"
        disabled={isProcessing || fileCount === 0 || !risk.canProceed}
        onClick={onSubmit}
        className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
          !risk.canProceed
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-500/25 active:scale-[0.99]'
        }`}
      >
        <Sparkles className="w-4 h-4" />
        GIF 만들기 ({fileCount}장)
      </button>
    </div>
  );
};
