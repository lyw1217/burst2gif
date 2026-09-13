import React, { useState, useEffect, useRef } from 'react';
import { ImageItem } from '../types';
import { getThumbnailUrl } from '../api';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';

interface Props {
  images: ImageItem[];
  fps: number;
  currentFrame: number;
  setCurrentFrame: React.Dispatch<React.SetStateAction<number>>;
}

export const PreviewPlayer: React.FC<Props> = ({
  images,
  fps,
  currentFrame,
  setCurrentFrame,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const timerRef = useRef<number | null>(null);

  // 썸네일 브라우저 백그라운드 프리로딩 (첫 재생 시 깜빡임 방지)
  useEffect(() => {
    images.forEach((img) => {
      const preloadImg = new Image();
      preloadImg.src = getThumbnailUrl(img.path);
    });
  }, [images]);

  // Play/Pause 애니메이션 루프
  useEffect(() => {
    if (!isPlaying || images.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = Math.max(16, 1000 / fps);
    timerRef.current = window.setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % images.length);
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, fps, images.length, setCurrentFrame]);

  if (images.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[360px] text-center">
        <FastForward className="w-12 h-12 text-slate-700 mb-3" />
        <p className="text-slate-400 font-medium">불러온 연사 사진이 없습니다</p>
        <p className="text-xs text-slate-600 mt-1">폴더 경로를 입력하거나 사진을 드래그해 주세요</p>
      </div>
    );
  }

  const activeImage = images[currentFrame] || images[0];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <span>실시간 캔버스 프리뷰</span>
          <span className="text-xs font-normal text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
            {fps} FPS 실시간 반영
          </span>
        </h2>
        <span className="text-xs font-mono text-slate-400">
          프레임 {currentFrame + 1} / {images.length}
        </span>
      </div>

      {/* Screen Frame */}
      <div className="relative aspect-[4/3] sm:aspect-video w-full bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
        {activeImage && (
          <img
            src={getThumbnailUrl(activeImage.path)}
            alt={activeImage.filename}
            className="max-h-full max-w-full object-contain select-none"
          />
        )}
      </div>

      {/* Player Controls */}
      <div className="space-y-3">
        {/* Timeline Range Slider */}
        <input
          type="range"
          min={0}
          max={Math.max(0, images.length - 1)}
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
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/30 transition"
              title={isPlaying ? '일시 정지' : '재생'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentFrame(0);
              }}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
              title="첫 프레임으로"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-slate-400">
            총 예상 재생 시간: <strong className="text-slate-200">{(images.length / fps).toFixed(2)}초</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
