import React, { useState, useRef } from 'react';
import { UploadCloud, FolderOpen, Images, AlertCircle } from 'lucide-react';
import { ManagedFile, filterAndSortFiles } from '../modules/FileManager';

interface Props {
  onFilesSelected: (files: ManagedFile[]) => void;
  isLoading: boolean;
}

export const InputSection: React.FC<Props> = ({ onFilesSelected, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleRawFiles = (rawFileList: FileList | null) => {
    if (!rawFileList || rawFileList.length === 0) return;

    setError(null);
    const filesArray = Array.from(rawFileList);
    const { validFiles, rejectedCount, rejectedReasons } = filterAndSortFiles(filesArray);

    if (validFiles.length === 0) {
      setError('선택된 파일 중 지원되는 이미지(JPG, PNG, WEBP)가 없습니다.');
      return;
    }

    if (rejectedCount > 0) {
      console.warn(`일부 파일 제외됨: ${rejectedReasons.join(', ')} (${rejectedCount}개)`);
    }

    onFilesSelected(validFiles);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleRawFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Drag and Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99]'
            : 'border-slate-700 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-slate-950/70'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 shadow-inner">
            <UploadCloud className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              연사 사진들을 여기에 끌어다 놓으세요
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              또는 클릭하여 파일이나 폴더를 직접 선택하세요 (JPEG, PNG, WebP)
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition"
            >
              <Images className="w-4 h-4" />
              사진 선택 (복수)
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => folderInputRef.current?.click()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
            >
              <FolderOpen className="w-4 h-4 text-indigo-400" />
              폴더 통째로 선택
            </button>
          </div>
        </div>

        {/* Hidden Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.bmp"
          className="hidden"
          onChange={(e) => handleRawFiles(e.target.files)}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={(e) => handleRawFiles(e.target.files)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 px-2">
        <span>⚡ 20~50MB 고용량 사진도 브라우저 튕김 없이 안전하게 처리</span>
        <span>최대 1,000장 / 총 10GB까지 지원</span>
      </div>
    </div>
  );
};
