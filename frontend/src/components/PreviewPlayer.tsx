import React, { useState, useEffect, useRef } from 'react';
import { ManagedFile } from '../modules/FileManager';
import { thumbnailManager } from '../modules/ThumbnailManager';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';

interface Props {
  files: ManagedFile[];
  fps: number;
  currentFrame: number;
  setCurrentFrame: React.Dispatch<React.SetStateAction<number>>;
  targetWidth?: number;
  targetHeight?: number;
  fitMode?: 'contain' | 'cover';
}

export const PreviewPlayer: React.FC<Props> = ({
  files,
  fps,
  currentFrame,
  setCurrentFrame,
  targetWidth = 1280,
  targetHeight = 852,
  fitMode = 'contain',
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [localFrame, setLocalFrame] = useState(currentFrame);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  // 상위 선택 프레임 변경 시 로컬 프레임 동기화
  useEffect(() => {
    setLocalFrame(currentFrame);
  }, [currentFrame]);

  // 현재 활성 프레임 이미지 온디맨드 로드
  const activeFile = files[localFrame] || files[0];

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

  // Play/Pause 애니메이션 루프 (컴포넌트 내부 state만 변경하여 App 전체 리렌더링 완전 방지)
  useEffect(() => {
    if (!isPlaying || files.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = Math.max(16, 1000 / fps);
    timerRef.current = window.setInterval(() => {
      setLocalFrame((prev) => (prev + 1) % files.length);
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, fps, files.length]);

  if (files.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[360px] text-center">
        <FastForward className="w-12 h-12 text-slate-700 mb-3" />
        <p className="text-slate-400 font-medium">선택된 연사 사진이 없습니다</p>
        <p className="text-xs text-slate-600 mt-1">사진을 끌어다 놓거나 폴더를 선택해 주세요</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <span>실시간 미리보기</span>
          <span className="text-xs font-normal text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
            {fps} FPS 실시간 재생
          </span>
          <span className="text-xs font-normal text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60 hidden sm:inline-block">
            {fitMode === 'cover' ? '화면 채우기 (크롭)' : '화면에 맞추기'}
          </span>
        </h2>
        <span className="text-xs font-mono text-slate-400">
          프레임 {localFrame + 1} / {files.length}
        </span>
      </div>

      {/* 1:1 WYSIWYG Screen Frame (실제 출력 종횡비 및 fitMode 크롭 상태 100% 반영) */}
      <div className="w-full flex items-center justify-center bg-slate-950/60 rounded-xl p-2 border border-slate-800/80">
        <div
          className="relative w-full max-h-[480px] bg-black rounded-lg overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner"
          style={{ aspectRatio: `${targetWidth} / ${targetHeight}` }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={activeFile.name}
              className={`select-none transition-all ${
                fitMode === 'cover'
                  ? 'w-full h-full object-cover'
                  : 'max-h-full max-w-full object-contain'
              }`}
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
          max={Math.max(0, files.length - 1)}
          value={localFrame}
          onChange={(e) => {
            setIsPlaying(false);
            const val = Number(e.target.value);
            setLocalFrame(val);
            setCurrentFrame(val);
          }}
          className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5 px-3 text-xs font-medium"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? '일시정지' : '재생'}</span>
            </button>
            <button
              onClick={() => {
                setLocalFrame(0);
                setCurrentFrame(0);
              }}
              title="처음으로 되감기"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-slate-400 font-mono truncate max-w-[200px]">
            {activeFile.name}
          </div>
        </div>
      </div>
    </div>
  );
};
