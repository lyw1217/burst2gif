import React, { useState } from 'react';
import { ImageItem } from '../types';
import { getThumbnailUrl } from '../api';
import { Trash2, ArrowLeftRight, ArrowUpDown, ChevronLeft, ChevronRight, X, Layers } from 'lucide-react';

interface Props {
  images: ImageItem[];
  onImagesChange: (images: ImageItem[]) => void;
  selectedFrameIndex: number;
  onSelectFrame: (index: number) => void;
}

export const TimelineGrid: React.FC<Props> = ({
  images,
  onImagesChange,
  selectedFrameIndex,
  onSelectFrame,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // 총 용량 계산
  const totalSizeBytes = images.reduce((acc, cur) => acc + cur.size_bytes, 0);
  const formattedTotalSize =
    totalSizeBytes < 1024 * 1024
      ? `${(totalSizeBytes / 1024).toFixed(1)} KB`
      : totalSizeBytes < 1024 * 1024 * 1024
      ? `${(totalSizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${(totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;

  // 개별 삭제
  const handleDelete = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onImagesChange(updated);
    if (selectedFrameIndex >= updated.length) {
      onSelectFrame(Math.max(0, updated.length - 1));
    }
  };

  // 좌우 이동
  const handleMove = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const updated = [...images];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onImagesChange(updated);
    onSelectFrame(to);
  };

  // 전체 역순
  const handleReverse = () => {
    onImagesChange([...images].reverse());
  };

  // 파일명 순 재정렬
  const handleResetSort = () => {
    const naturalSort = (a: string, b: string) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    const sorted = [...images].sort((a, b) => naturalSort(a.filename, b.filename));
    onImagesChange(sorted);
  };

  // 드래그 앤 드롭 순서 변경
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const updated = [...images];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);
    onImagesChange(updated);
    onSelectFrame(targetIndex);
    setDraggedIndex(null);
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Top Bar: Stats & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-slate-200">
            총 <span className="text-indigo-400">{images.length}</span>장의 연사 프레임
          </span>
          <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60">
            원본 합계: {formattedTotalSize}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReverse}
            title="순서 뒤집기"
            className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            역순 정렬
          </button>
          <button
            onClick={handleResetSort}
            title="파일명 순 재정렬"
            className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            이름순 재정렬
          </button>
          <button
            onClick={() => onImagesChange([])}
            title="전체 비우기"
            className="text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/30 transition"
          >
            비우기
          </button>
        </div>
      </div>

      {/* Frame Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 max-h-[480px] overflow-y-auto p-1">
        {images.map((img, idx) => {
          const isSelected = idx === selectedFrameIndex;
          return (
            <div
              key={img.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(idx)}
              onClick={() => onSelectFrame(idx)}
              className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all ${
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-slate-800'
                  : 'border-slate-800 hover:border-slate-600 bg-slate-950/60'
              }`}
            >
              {/* Frame Badge */}
              <div className="absolute top-1.5 left-1.5 z-10 bg-slate-900/80 backdrop-blur text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-700 shadow">
                #{idx + 1}
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(idx);
                }}
                className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 bg-rose-600/90 hover:bg-rose-500 text-white p-1 rounded-md transition shadow"
                title="이 컷 삭제"
              >
                <X className="w-3 h-3" />
              </button>

              {/* Thumbnail Image */}
              <div className="aspect-square bg-slate-950 flex items-center justify-center overflow-hidden">
                <img
                  src={getThumbnailUrl(img.path)}
                  alt={img.filename}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>

              {/* Card Footer: Move Controls & Name */}
              <div className="p-2 text-[11px] bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between">
                <span className="truncate max-w-[70px] text-slate-400" title={img.filename}>
                  {img.filename}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                  <button
                    disabled={idx === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMove(idx, idx - 1);
                    }}
                    className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30 rounded"
                    title="앞으로 이동"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    disabled={idx === images.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMove(idx, idx + 1);
                    }}
                    className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30 rounded"
                    title="뒤로 이동"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500 text-center">
        💡 카드를 마우스로 끌어서 순서를 변경하거나, 마우스 오버 시 화살표로 1칸씩 이동할 수 있습니다.
      </p>
    </div>
  );
};
