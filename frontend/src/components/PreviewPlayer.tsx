import React, { useState, useEffect, useRef } from 'react';
import { ManagedFile } from '../modules/FileManager';
import { thumbnailManager } from '../modules/ThumbnailManager';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';

interface Props {
  files: ManagedFile[];
  fps: number;
  currentFrame: number;
  setCurrentFrame: React.Dispatch<React.SetStateAction<number>>;
}

export const PreviewPlayer: React.FC<Props> = ({
  files,
  fps,
  currentFrame,
  setCurrentFrame,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  // 현재 활성 프레임 이미지 온디맨드 로드
  const activeFile = files[currentFrame] || files[0];

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

  // Play/Pause 애니메이션 루프
  useEffect(() => {
    if (!isPlaying || files.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = Math.max(16, 1000 / fps);
    timerRef.current = window.setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % files.length);
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, fps, files.length, setCurrentFrame]);

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
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <span>실시간 미리보기</span>
          <span className="text-xs font-normal text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
            {fps} FPS 실시간 반영
          </span>
        </h2>
        <span className="text-xs font-mono text-slate-400">
          프레임 {currentFrame + 1} / {files.length}
        </span>
      </div>

      {/* Screen Frame */}
      <div className="relative aspect-[4/3] sm:aspect-video w-full bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={activeFile.name}
            className="max-h-full max-w-full object-contain select-none"
          />
        ) : (
          <div className="text-xs text-slate-600 animate-pulse">프레임 로딩 중...</div>
        )}
      </div>

      {/* Player Controls */}
      <div className="space-y-3">
        {/* Timeline Range Slider */}
        <input
          type="range"
          min={0}
          max={Math.max(0, files.length - 1)}
          value={currentFrame}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentFrame(Number(e.target.value));
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
