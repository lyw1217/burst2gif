import React, { useState, useEffect, useRef } from 'react';
import { ManagedFile } from '../modules/FileManager';
import { thumbnailManager } from '../modules/ThumbnailManager';
import { PlaybackPlan } from '../modules/PlaybackPlan';
import { Play, Pause, RotateCcw, FastForward, Repeat, RefreshCw } from 'lucide-react';

interface Props {
  files: ManagedFile[];
  plan: PlaybackPlan;
  currentFrame: number;
  setCurrentFrame: React.Dispatch<React.SetStateAction<number>>;
  targetWidth?: number;
  targetHeight?: number;
  fitMode?: 'contain' | 'cover';
  backgroundColor?: string;
  coverPosition?: { x: number; y: number };
}

export const PreviewPlayer: React.FC<Props> = ({
  files,
  plan,
  currentFrame,
  setCurrentFrame,
  targetWidth = 1280,
  targetHeight = 852,
  fitMode = 'contain',
  backgroundColor = '#000000',
  coverPosition = { x: 0.5, y: 0.5 },
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [planIndex, setPlanIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const planIndexRef = useRef(0);
  const loopCountRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  // PlaybackPlan이 변경될 때 인덱스 범위 초과 방지
  useEffect(() => {
    if (plan.frames.length === 0) {
      setPlanIndex(0);
      planIndexRef.current = 0;
      return;
    }
    if (planIndexRef.current >= plan.frames.length) {
      planIndexRef.current = 0;
      setPlanIndex(0);
    }
  }, [plan]);

  // 상위 선택 프레임(타임라인 클릭 등) 변경 시 planIndex 동기화
  useEffect(() => {
    if (!plan.frames.length) return;
    const foundIdx = plan.frames.findIndex((f) => f.sourceIndex === currentFrame);
    if (foundIdx !== -1 && foundIdx !== planIndexRef.current) {
      planIndexRef.current = foundIdx;
      setPlanIndex(foundIdx);
    }
  }, [currentFrame, plan]);

  // 현재 활성 프레임 이미지 온디맨드 로드
  const currentPlannedFrame = plan.frames[planIndex] || plan.frames[0];
  const activeFile = currentPlannedFrame ? files[currentPlannedFrame.sourceIndex] : files[0];

  useEffect(() => {
    if (!activeFile) {
      setPreviewUrl(null);
      return;
    }

    let isMounted = true;
    thumbnailManager.getThumbnail(activeFile.id, activeFile.file).then((url) => {
      if (isMounted) {
        setPreviewUrl(url);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeFile]);

  // PlaybackPlan 기반 정밀 애니메이션 루프 (프레임별 가변 딜레이 및 반복 횟수 제어)
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!isPlaying || plan.frames.length === 0) {
      return;
    }

    let isMounted = true;

    const scheduleNextFrame = () => {
      if (!isMounted) return;

      const curr = plan.frames[planIndexRef.current] || plan.frames[0];
      const delay = curr ? curr.delayMs : Math.max(16, Math.round(1000 / (plan.config.fps || 12)));

      timerRef.current = window.setTimeout(() => {
        if (!isMounted) return;

        let nextIdx = planIndexRef.current + 1;
        if (nextIdx >= plan.frames.length) {
          // 1사이클 완료
          loopCountRef.current++;
          const targetLoop = plan.loop; // 0 = 무한, 1 = 1회, 2 = 2회...
          if (targetLoop > 0 && loopCountRef.current >= targetLoop) {
            setIsPlaying(false);
            return;
          }
          nextIdx = 0;
        }

        planIndexRef.current = nextIdx;
        setPlanIndex(nextIdx);

        const nextPlanned = plan.frames[nextIdx];
        if (nextPlanned) {
          setCurrentFrame(nextPlanned.sourceIndex);
        }

        scheduleNextFrame();
      }, delay);
    };

    scheduleNextFrame();

    return () => {
      isMounted = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, plan, setCurrentFrame]);

  if (files.length === 0 || plan.frames.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[360px] text-center">
        <FastForward className="w-12 h-12 text-slate-700 mb-3" />
        <p className="text-slate-400 font-medium">선택된 연사 사진이 없습니다</p>
        <p className="text-xs text-slate-600 mt-1">사진을 끌어다 놓거나 폴더를 선택해 주세요</p>
      </div>
    );
  }

  const handlePlayToggle = () => {
    if (!isPlaying) {
      // 다시 재생 시 루프 카운터 리셋
      loopCountRef.current = 0;
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const handleRewind = () => {
    loopCountRef.current = 0;
    planIndexRef.current = 0;
    setPlanIndex(0);
    if (plan.frames[0]) {
      setCurrentFrame(plan.frames[0].sourceIndex);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
      {/* Top Bar: Live Status Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-200">실시간 미리보기</h2>
          <span className="text-xs font-normal text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
            {plan.config.fps} FPS
          </span>
          {plan.config.playbackMode === 'ping-pong' && (
            <span className="text-[11px] text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-md border border-violet-500/20 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              왕복 재생
            </span>
          )}
          {plan.config.frameSkip > 1 && (
            <span className="text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              {plan.config.frameSkip}장마다 1장
            </span>
          )}
          <span className="text-xs font-normal text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60 hidden sm:inline-block">
            {fitMode === 'cover' ? '화면 채우기 (크롭)' : '화면에 맞추기'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>
            {planIndex + 1} / {plan.frames.length} 프레임
          </span>
          <span className="text-[10px] text-slate-500">
            (원본 #{activeFile ? activeFile.name : ''})
          </span>
        </div>
      </div>

      {/* 1:1 WYSIWYG Screen Frame (배경색 및 Cover 크롭 정렬 100% 반영) */}
      <div className="w-full flex items-center justify-center bg-slate-950/60 rounded-xl p-2 border border-slate-800/80">
        <div
          className="relative w-full max-h-[480px] rounded-lg overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner transition-colors"
          style={{
            aspectRatio: `${targetWidth} / ${targetHeight}`,
            backgroundColor: fitMode === 'contain' ? backgroundColor : '#000000',
          }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={activeFile ? activeFile.name : '미리보기'}
              className={`select-none transition-all ${
                fitMode === 'cover'
                  ? 'w-full h-full object-cover'
                  : 'max-h-full max-w-full object-contain'
              }`}
              style={
                fitMode === 'cover'
                  ? {
                      objectPosition: `${coverPosition.x * 100}% ${coverPosition.y * 100}%`,
                    }
                  : undefined
              }
            />
          ) : (
            <div className="text-xs text-slate-600 animate-pulse">프레임 로딩 중...</div>
          )}
        </div>
      </div>

      {/* Player Controls */}
      <div className="space-y-3">
        {/* Timeline Range Slider */}
        <input
          type="range"
          min={0}
          max={Math.max(0, plan.frames.length - 1)}
          value={planIndex}
          onChange={(e) => {
            setIsPlaying(false);
            const val = Number(e.target.value);
            planIndexRef.current = val;
            setPlanIndex(val);
            const p = plan.frames[val];
            if (p) {
              setCurrentFrame(p.sourceIndex);
            }
          }}
          className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePlayToggle}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5 px-3 text-xs font-medium"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? '일시정지' : '재생'}</span>
            </button>
            <button
              type="button"
              onClick={handleRewind}
              title="처음으로 되감기"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            {plan.loop === 0 ? (
              <span className="flex items-center gap-1 text-[11px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                <Repeat className="w-3 h-3" /> 무한 반복
              </span>
            ) : (
              <span className="text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                {plan.loop}회 반복 설정
              </span>
            )}
            <span className="text-slate-500">|</span>
            <span className="font-mono text-slate-300">
              {currentPlannedFrame ? `${currentPlannedFrame.delayMs}ms` : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
