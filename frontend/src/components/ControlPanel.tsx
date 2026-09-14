import React from 'react';
import {
  Settings2,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Clock,
  Palette,
  Sliders,
  Zap,
  Info,
} from 'lucide-react';
import { evaluateRisk, calculateOutputDimensions } from '../modules/RiskEvaluator';
import { PlaybackPlan, PlaybackMode } from '../modules/PlaybackPlan';

interface Props {
  plan: PlaybackPlan;
  fps: number;
  onFpsChange: (fps: number) => void;
  targetLongEdge: number;
  onTargetLongEdgeChange: (width: number) => void;
  fitMode: 'contain' | 'cover';
  onFitModeChange: (mode: 'contain' | 'cover') => void;
  playbackMode: PlaybackMode;
  onPlaybackModeChange: (mode: PlaybackMode) => void;
  loop: number;
  onLoopChange: (loop: number) => void;
  frameSkip: number;
  onFrameSkipChange: (skip: number) => void;
  firstFramePauseMs: number;
  onFirstFramePauseChange: (ms: number) => void;
  lastFramePauseMs: number;
  onLastFramePauseChange: (ms: number) => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
  coverPosition: { x: number; y: number };
  onCoverPositionChange: (pos: { x: number; y: number }) => void;
  qualityMode: 'fast' | 'high';
  onQualityModeChange: (mode: 'fast' | 'high') => void;
  onSubmit: () => void;
  isProcessing: boolean;
  aspectDimensions?: { width: number; height: number };
  hasMixedOrientations?: boolean;
}

export const ControlPanel: React.FC<Props> = ({
  plan,
  fps,
  onFpsChange,
  targetLongEdge,
  onTargetLongEdgeChange,
  fitMode,
  onFitModeChange,
  playbackMode,
  onPlaybackModeChange,
  loop,
  onLoopChange,
  frameSkip,
  onFrameSkipChange,
  firstFramePauseMs,
  onFirstFramePauseChange,
  lastFramePauseMs,
  onLastFramePauseChange,
  backgroundColor,
  onBackgroundColorChange,
  coverPosition,
  onCoverPositionChange,
  qualityMode,
  onQualityModeChange,
  onSubmit,
  isProcessing,
  aspectDimensions = { width: 3, height: 2 },
  hasMixedOrientations = false,
}) => {
  // 실제 감지된 종횡비에 맞춰 출력 치수 계산
  const { width: outW, height: outH } = calculateOutputDimensions(
    aspectDimensions.width,
    aspectDimensions.height,
    targetLongEdge
  );
  const isLandscape = outW >= outH;

  // 왕복 / 건너뛰기 등이 반영된 실제 인코딩 프레임 수 기준 위험도 평가
  const risk = evaluateRisk(outW, outH, plan.encodedFrameCount, qualityMode);

  const presets = [
    { label: '작은 용량', width: 960, desc: '메신저 / 공유' },
    { label: '보통 화질', width: 1280, desc: '추천 기본값', isDefault: true },
    { label: '선명하게', width: 1920, desc: '고해상도 감상' },
  ];

  const coverPresets = [
    { label: '상단', x: 0.5, y: 0.0 },
    { label: '중앙', x: 0.5, y: 0.5 },
    { label: '하단', x: 0.5, y: 1.0 },
    { label: '좌측', x: 0.0, y: 0.5 },
    { label: '우측', x: 1.0, y: 0.5 },
  ];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
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
            가로와 세로 사진이 함께 섞여 있습니다. '화면에 맞추기' 모드 사용 시 일부 프레임에 여백이 들어갈 수 있습니다.
          </span>
        </div>
      )}

      {/* 1. 크기 선택 (Resolution Presets) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300">출력 크기 (긴 변 기준)</label>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((p) => {
            const isSelected = targetLongEdge === p.width;
            return (
              <button
                key={p.width}
                type="button"
                onClick={() => onTargetLongEdgeChange(p.width)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-600/15 ring-1 ring-indigo-500 text-white shadow-md shadow-indigo-600/20'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{p.label}</span>
                  {p.isDefault && (
                    <span className="text-[9px] bg-indigo-500/30 text-indigo-300 px-1 py-0.2 rounded">
                      기본
                    </span>
                  )}
                </div>
                <div className="text-sm font-mono font-bold mt-0.5 text-indigo-300">
                  {p.width}px
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 재생 모드 (일반 vs 왕복) & 반복 횟수 */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            재생 방식
          </label>
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => onPlaybackModeChange('forward')}
              className={`py-1.5 text-xs font-medium rounded-lg transition ${
                playbackMode === 'forward'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              순방향
            </button>
            <button
              type="button"
              onClick={() => onPlaybackModeChange('ping-pong')}
              className={`py-1.5 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1 ${
                playbackMode === 'ping-pong'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              왕복
            </button>
          </div>
          <div className="text-[10px] text-slate-500">
            {playbackMode === 'ping-pong'
              ? '1→2→3→2→1 (양 끝 중복 없음)'
              : '1→2→3→1 순차 루프'}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">반복 횟수 (Loop)</label>
          <select
            value={loop}
            onChange={(e) => onLoopChange(Number(e.target.value))}
            className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="0">무한 반복 (기본)</option>
            <option value="1">1회 재생 (반복 안 함)</option>
            <option value="2">2회 재생</option>
            <option value="3">3회 재생</option>
            <option value="5">5회 재생</option>
          </select>
          <div className="text-[10px] text-slate-500">
            {loop === 0 ? '영구 루프 재생' : `${loop}회 재생 후 정지`}
          </div>
        </div>
      </div>

      {/* 3. 재생 속도 (FPS) & 프레임 건너뛰기 (시간 보존형) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">기본 속도 (FPS)</label>
            <span className="text-xs font-mono font-bold text-indigo-400">
              {fps} FPS ({Math.round(1000 / fps)}ms)
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
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>프레임 건너뛰기</span>
            <span className="text-[10px] text-indigo-400 font-normal">시간 보존형</span>
          </label>
          <select
            value={frameSkip}
            onChange={(e) => onFrameSkipChange(Number(e.target.value))}
            className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="1">모든 사진 사용 (1:1)</option>
            <option value="2">2장마다 1장 (용량 절반)</option>
            <option value="3">3장마다 1장 (용량 1/3)</option>
            <option value="4">4장마다 1장 (용량 1/4)</option>
          </select>
        </div>
      </div>

      {/* 4. 첫/마지막 프레임 정지 시간 설정 */}
      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/80 pt-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            첫 장 정지 시간
          </label>
          <select
            value={firstFramePauseMs}
            onChange={(e) => onFirstFramePauseChange(Number(e.target.value))}
            className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="0">기본 속도 유지</option>
            <option value="250">0.25초 (250ms)</option>
            <option value="500">0.5초 (500ms)</option>
            <option value="1000">1.0초 (1000ms)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {playbackMode === 'ping-pong' ? '반환점 정지 시간' : '마지막 장 정지 시간'}
          </label>
          <select
            value={lastFramePauseMs}
            onChange={(e) => onLastFramePauseChange(Number(e.target.value))}
            className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="0">기본 속도 유지</option>
            <option value="250">0.25초 (250ms)</option>
            <option value="500">0.5초 (500ms)</option>
            <option value="1000">1.0초 (1000ms)</option>
          </select>
        </div>
      </div>

      {/* 5. 화면 맞춤 방식 & (Contain 배경색 or Cover 크롭 위치) */}
      <div className="space-y-2 border-t border-slate-800/80 pt-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">화면 맞춤 방식</label>
            <select
              value={fitMode}
              onChange={(e) => onFitModeChange(e.target.value as 'contain' | 'cover')}
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="contain">화면에 맞추기 (비율 유지)</option>
              <option value="cover">화면 채우기 (크롭)</option>
            </select>
          </div>

          {fitMode === 'contain' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-indigo-400" />
                여백 배경색
              </label>
              <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-700">
                {[
                  { color: '#000000', label: '검정' },
                  { color: '#ffffff', label: '흰색' },
                  { color: '#1e293b', label: '그레이' },
                ].map((bg) => (
                  <button
                    key={bg.color}
                    type="button"
                    onClick={() => onBackgroundColorChange(bg.color)}
                    className={`flex-1 py-1 text-[11px] font-medium rounded-lg transition flex items-center justify-center gap-1 ${
                      backgroundColor === bg.color
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-slate-600"
                      style={{ backgroundColor: bg.color }}
                    />
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                크롭 기준 위치
              </label>
              <select
                value={`${coverPosition.x},${coverPosition.y}`}
                onChange={(e) => {
                  const [x, y] = e.target.value.split(',').map(Number);
                  onCoverPositionChange({ x, y });
                }}
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
              >
                {coverPresets.map((cp) => (
                  <option key={cp.label} value={`${cp.x},${cp.y}`}>
                    {cp.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 6. 사진 품질 우선 모드 (Floyd-Steinberg 디더링) */}
      <div className="border-t border-slate-800/80 pt-3">
        <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>사진 품질 우선 모드 (고화질 디더링)</span>
            </div>
            <p className="text-[10px] text-slate-500">
              하늘/인물 피부톤의 256색 밴딩을 제거합니다. (처리 시간 소폭 증가)
            </p>
          </div>
          <button
            type="button"
            onClick={() => onQualityModeChange(qualityMode === 'high' ? 'fast' : 'high')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
              qualityMode === 'high'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/30'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {qualityMode === 'high' ? '고화질 ON' : '빠른 생성'}
          </button>
        </div>
      </div>

      {/* 7. 작업량 기반 안전장치 카드 (Risk Evaluator) */}
      {risk.ditherWarning && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-300 space-y-1">
          <div className="flex items-start gap-2 text-xs">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-amber-200">고화질 디더링 모드 안내</span>
              <p className="text-[11px] text-amber-300/90 leading-relaxed">
                {risk.ditherWarning}
              </p>
            </div>
          </div>
        </div>
      )}

      {risk.level === 'very_heavy' && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 space-y-1.5">
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
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 space-y-1.5">
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

      {/* 8. 변환 시작 버튼 */}
      <button
        type="button"
        disabled={isProcessing || plan.encodedFrameCount === 0 || !risk.canProceed}
        onClick={onSubmit}
        className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
          !risk.canProceed || plan.encodedFrameCount === 0
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-500/25 active:scale-[0.99]'
        }`}
      >
        <Sparkles className="w-4 h-4" />
        GIF 만들기 ({plan.encodedFrameCount}프레임
        {playbackMode === 'ping-pong' ? ' 왕복' : ''})
      </button>
    </div>
  );
};
