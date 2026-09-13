import React, { useState, useEffect, useRef } from 'react';
import { ManagedFile, compareNatural } from '../modules/FileManager';
import { thumbnailManager } from '../modules/ThumbnailManager';
import { Trash2, ArrowUpDown, ChevronLeft, ChevronRight, X, Layers, Image as ImageIcon } from 'lucide-react';

interface Props {
  files: ManagedFile[];
  onFilesChange: (files: ManagedFile[]) => void;
  selectedFrameIndex: number;
  onSelectFrame: (index: number) => void;
}

// 뷰포트에 들어올 때만 온디맨드로 썸네일을 생성하는 개별 썸네일 카드
const LazyThumbnail: React.FC<{ fileItem: ManagedFile; isSelected: boolean }> = ({
  fileItem,
  isSelected,
}) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          thumbnailManager.getThumbnail(fileItem.id, fileItem.file).then((url) => {
            if (isMounted) {
              setThumbUrl(url);
            }
          });
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      isMounted = false;
      observer.disconnect();
    };
  }, [fileItem.id, fileItem.file]);

  return (
    <div
      ref={containerRef}
      className={`relative aspect-square w-full rounded-xl overflow-hidden bg-slate-950 border transition-all ${
        isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-slate-800'
      }`}
    >
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={fileItem.name}
          className="w-full h-full object-cover select-none pointer-events-none"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-900/50">
          <ImageIcon className="w-5 h-5 animate-pulse" />
        </div>
      )}
    </div>
  );
};

export const TimelineGrid: React.FC<Props> = ({
  files,
  onFilesChange,
  selectedFrameIndex,
  onSelectFrame,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // 총 용량 계산
  const totalSizeBytes = files.reduce((acc, cur) => acc + cur.size, 0);
  const formattedTotalSize =
    totalSizeBytes < 1024 * 1024
      ? `${(totalSizeBytes / 1024).toFixed(1)} KB`
      : totalSizeBytes < 1024 * 1024 * 1024
      ? `${(totalSizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${(totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;

  // 개별 삭제
  const handleDelete = (index: number) => {
    const target = files[index];
    if (target) {
      thumbnailManager.revoke(target.id);
    }
    const updated = files.filter((_, i) => i !== index);
    onFilesChange(updated);
    if (selectedFrameIndex >= updated.length) {
      onSelectFrame(Math.max(0, updated.length - 1));
    }
  };

  // 좌우 이동
  const handleMove = (from: number, to: number) => {
    if (to < 0 || to >= files.length) return;
    const updated = [...files];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onFilesChange(updated);
    onSelectFrame(to);
  };

  // 전체 역순 정렬
  const handleReverse = () => {
    onFilesChange([...files].reverse());
  };

  // 파일명 순 재정렬
  const handleResetSort = () => {
    const sorted = [...files].sort((a, b) => compareNatural(a.name, b.name));
    onFilesChange(sorted);
  };

  // 전체 삭제
  const handleClearAll = () => {
    if (window.confirm('모든 사진을 타임라인에서 제거하시겠습니까?')) {
      thumbnailManager.clear();
      onFilesChange([]);
    }
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
    const updated = [...files];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);
    onFilesChange(updated);
    onSelectFrame(targetIndex);
    setDraggedIndex(null);
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Top Bar: Stats & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-slate-200">
            총 <span className="text-indigo-400">{files.length}</span>장의 연사 프레임
          </span>
          <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60">
            원본 합계: {formattedTotalSize}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetSort}
            title="파일명 기준 순차 정렬"
            className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            이름순
          </button>
          <button
            onClick={handleReverse}
            title="프레임 순서 반전"
            className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <ArrowUpDown className="w-3.5 h-3.5 rotate-180" />
            역순
          </button>
          <button
            onClick={handleClearAll}
            title="전체 비우기"
            className="flex items-center gap-1 text-xs text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600 px-2.5 py-1.5 rounded-lg border border-rose-500/30 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            비우기
          </button>
        </div>
      </div>

      {/* Grid Timeline (12열 전체 폭 대응) */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 max-h-64 sm:max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
        {files.map((item, index) => {
          const isSelected = index === selectedFrameIndex;
          return (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              onClick={() => onSelectFrame(index)}
              className={`group relative rounded-xl p-1 bg-slate-950/60 border cursor-pointer select-none transition-all ${
                isSelected
                  ? 'border-indigo-500 shadow-md shadow-indigo-500/20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Lazy Thumbnail */}
              <LazyThumbnail fileItem={item} isSelected={isSelected} />

              {/* Frame Index Badge */}
              <span className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm text-[10px] font-mono font-medium text-slate-300 px-1.5 py-0.5 rounded shadow">
                #{index + 1}
              </span>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(index);
                }}
                className={`absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-rose-600 text-slate-300 hover:text-white rounded-md transition shadow ${
                  isSelected ? 'opacity-100 scale-105' : 'opacity-0 group-hover:opacity-100'
                }`}
                title="이 프레임 삭제"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Move Buttons */}
              <div
                className={`absolute bottom-2 left-2 right-2 flex items-center justify-between transition ${
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <button
                  disabled={index === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMove(index, index - 1);
                  }}
                  className="p-1 bg-black/80 hover:bg-indigo-600 text-white rounded disabled:opacity-30"
                  title="앞으로 이동"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={index === files.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMove(index, index + 1);
                  }}
                  className="p-1 bg-black/80 hover:bg-indigo-600 text-white rounded disabled:opacity-30"
                  title="뒤로 이동"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* File Info */}
              <div className="mt-1 px-0.5 flex items-center justify-between text-[9px] text-slate-400">
                <span className="truncate max-w-[50px] sm:max-w-[60px]">{item.name}</span>
                <span className="shrink-0 font-mono">{item.sizeFormatted}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Frame Touch Action Toolbar (모바일/터치 친화적 큼직한 툴바) */}
      {files[selectedFrameIndex] && (
        <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              #{selectedFrameIndex + 1}
            </span>
            <span className="text-slate-400 truncate max-w-[130px] sm:max-w-[240px]">
              {files[selectedFrameIndex].name}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={selectedFrameIndex === 0}
              onClick={() => handleMove(selectedFrameIndex, selectedFrameIndex - 1)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-indigo-600 disabled:opacity-30 text-white rounded-lg transition flex items-center gap-1 text-xs"
              title="이 프레임을 앞으로 이동"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>앞으로</span>
            </button>
            <button
              disabled={selectedFrameIndex === files.length - 1}
              onClick={() => handleMove(selectedFrameIndex, selectedFrameIndex + 1)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-indigo-600 disabled:opacity-30 text-white rounded-lg transition flex items-center gap-1 text-xs"
              title="이 프레임을 뒤로 이동"
            >
              <span>뒤로</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDelete(selectedFrameIndex)}
              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg border border-rose-500/30 transition flex items-center gap-1 text-xs"
              title="이 프레임 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>삭제</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
