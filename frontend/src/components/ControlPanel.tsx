import React, { useState } from 'react';
import { ConvertOptions } from '../types';
import { Settings, Sparkles, Video, Image as ImageIcon, Sliders, Target, Loader2 } from 'lucide-react';

interface Props {
  options: ConvertOptions;
  onOptionsChange: (options: ConvertOptions) => void;
  onConvert: () => void;
  disabled: boolean;
  isLoading?: boolean;
  isSubmitting?: boolean;
}

export const ControlPanel: React.FC<Props> = ({
  options,
  onOptionsChange,
  onConvert,
  disabled,
  isLoading,
  isSubmitting,
}) => {
  const [customTargetSize, setCustomTargetSize] = useState<string>('');
  const [isCustomTarget, setIsCustomTarget] = useState<boolean>(false);

  // FPS 변경 시 처리
  const handleFpsChange = (fps: number) => {
    onOptionsChange({ ...options, fps });
  };

  const currentMs = Math.round(1000 / options.fps);

  // 목표 용량 프리셋 선택
  const handleTargetSizeSelect = (mb: number | undefined) => {
    if (mb === undefined) {
      setIsCustomTarget(false);
      onOptionsChange({ ...options, target_size_mb: undefined });
    } else {
      setIsCustomTarget(false);
      onOptionsChange({ ...options, target_size_mb: mb });
    }
  };

  const handleCustomSizeChange = (val: string) => {
    setCustomTargetSize(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      onOptionsChange({ ...options, target_size_mb: num });
    } else {
      onOptionsChange({ ...options, target_size_mb: undefined });
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Settings className="w-4 h-4 text-indigo-400" />
          변환 및 인코딩 설정
        </h2>
      </div>

      {/* 1. 포맷 선택 토글 */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300">출력 포맷</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onOptionsChange({ ...options, format: 'gif' })}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition ${
              options.format === 'gif'
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            고화질 GIF
          </button>
          <button
            type="button"
            onClick={() => onOptionsChange({ ...options, format: 'mp4' })}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition ${
              options.format === 'mp4'
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-4 h-4" />
            MP4 동영상 (H.264)
          </button>
        </div>
      </div>

      {/* 2. 속도 (FPS 및 ms) 제어 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            재생 속도 (FPS)
          </label>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-indigo-400 font-bold">{options.fps} FPS</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 font-mono">장당 {currentMs}ms</span>
          </div>
        </div>

        <input
          type="range"
          min={1}
          max={60}
          step={1}
          value={options.fps}
          onChange={(e) => handleFpsChange(Number(e.target.value))}
          className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />

        <div className="flex items-center justify-between gap-1 pt-1">
          {[5, 10, 15, 24, 30].map((presetFps) => (
            <button
              key={presetFps}
              onClick={() => handleFpsChange(presetFps)}
              className={`text-[11px] px-2 py-1 rounded-md border transition ${
                options.fps === presetFps
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-white'
              }`}
            >
              {presetFps}fps
            </button>
          ))}
        </div>
      </div>

      {/* 3. 목표 파일 용량 맞춤 (신규 기능 🎯) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            목표 파일 용량 제한
          </label>
          {options.target_size_mb ? (
            <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              최대 {options.target_size_mb} MB 이하 맞춤
            </span>
          ) : (
            <span className="text-xs text-slate-500">제한 없음 (최대 화질)</span>
          )}
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {[
            { label: '제한 없음', mb: undefined },
            { label: '5 MB', mb: 5 },
            { label: '10 MB', mb: 10 },
            { label: '25 MB', mb: 25 },
          ].map((p) => {
            const isSelected = !isCustomTarget && options.target_size_mb === p.mb;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => handleTargetSizeSelect(p.mb)}
                className={`py-1.5 px-1 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 text-xs'
                }`}
              >
                <span className="text-[11px]">{p.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setIsCustomTarget(true)}
            className={`py-1.5 px-1 rounded-xl border text-center transition flex flex-col items-center justify-center ${
              isCustomTarget
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 text-xs'
            }`}
          >
            <span className="text-[11px]">직접 입력</span>
          </button>
        </div>

        {isCustomTarget && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="number"
              min="0.5"
              max="500"
              step="0.5"
              value={customTargetSize}
              onChange={(e) => handleCustomSizeChange(e.target.value)}
              placeholder="목표 용량 (MB 단위 입력)"
              className="flex-1 bg-slate-950/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-xs text-slate-400 font-semibold">MB</span>
          </div>
        )}
        <p className="text-[11px] text-slate-400">
          💡 설정한 용량 이하가 되도록 해상도와 비트레이트를 자동으로 계산하여 압축합니다.
        </p>
      </div>

      {/* 4. 해상도 리사이즈 옵션 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">
            기준 해상도
          </label>
          {options.format === 'gif' && options.resolution === 'original' && !options.target_size_mb && (
            <span className="text-[11px] text-amber-400 font-medium">
              ⚠️ 원본은 GIF 용량이 매우 클 수 있습니다
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: '1080p', val: '1080', sub: 'FHD' },
            { label: '720p', val: '720', sub: 'HD 추천' },
            { label: '480p', val: '480', sub: '웹 최적' },
            { label: '원본 유지', val: 'original', sub: '고용량' },
          ].map((item) => (
            <button
              key={item.val}
              type="button"
              onClick={() => onOptionsChange({ ...options, resolution: item.val })}
              className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                options.resolution === item.val
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-xs font-semibold">{item.label}</span>
              <span className="text-[10px] text-slate-500">{item.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 5. 세부 화질 옵션 */}
      {options.format === 'gif' ? (
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">GIF 인코딩 품질</span>
            <select
              value={options.quality_mode}
              onChange={(e) =>
                onOptionsChange({
                  ...options,
                  quality_mode: e.target.value as 'high' | 'fast',
                })
              }
              className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="high">2-Pass 고화질 (색상 보존)</option>
              <option value="fast">고속 인코딩 (용량 절감)</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">무한 반복 재생 (Loop)</span>
            <input
              type="checkbox"
              checked={options.loop === 0}
              onChange={(e) =>
                onOptionsChange({ ...options, loop: e.target.checked ? 0 : 1 })
              }
              className="accent-indigo-500 w-4 h-4 cursor-pointer"
            />
          </div>
        </div>
      ) : (
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">MP4 압축 품질 (CRF)</span>
            <span className="text-indigo-400 font-mono">
              {options.crf} {options.crf <= 20 ? '(고화질)' : options.crf <= 24 ? '(표준)' : '(저용량)'}
            </span>
          </div>
          <input
            type="range"
            min={16}
            max={30}
            value={options.crf}
            onChange={(e) =>
              onOptionsChange({ ...options, crf: Number(e.target.value) })
            }
            className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      )}

      {/* 6. 변환 실행 버튼 */}
      <button
        onClick={onConvert}
        disabled={disabled || isLoading || isSubmitting}
        className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 text-sm"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            인코딩 요청 중...
          </>
        ) : isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            사진 불러오는 중...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            {options.format.toUpperCase()} 파일로 변환하기
          </>
        )}
      </button>
    </div>
  );
};
