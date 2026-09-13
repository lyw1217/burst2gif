import React, { useState, useRef } from 'react';
import { UploadCloud, FolderOpen, Images, AlertCircle } from 'lucide-react';
import { ManagedFile, filterAndSortFiles } from '../modules/FileManager';

interface Props {
  onFilesSelected: (files: ManagedFile[], notice?: string) => void;
  isLoading: boolean;
  existingFiles: ManagedFile[];
  onClearAll?: () => void;
}

export const InputSection: React.FC<Props> = ({
  onFilesSelected,
  isLoading,
  existingFiles,
  onClearAll,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleRawFiles = async (rawFileList: FileList | null) => {
    if (!rawFileList || rawFileList.length === 0) return;

    setError(null);
    setIsVerifying(true);

    try {
      const filesArray = Array.from(rawFileList);
      const { validFiles, rejectedCount, rejectedReasons } = await filterAndSortFiles(
        filesArray,
        existingFiles
      );

      if (validFiles.length === 0) {
        if (rejectedCount > 0) {
          setError(`사진을 추가할 수 없습니다: ${rejectedReasons.join(', ')}`);
        } else {
          setError('선택된 파일 중 지원되는 이미지(JPG, PNG, WebP)가 없습니다.');
        }
        return;
      }

      let notice: string | undefined;
      if (rejectedCount > 0) {
        notice = `${rejectedCount}장의 사진을 제외했습니다 (${rejectedReasons.join(', ')}). 나머지 ${validFiles.length}장은 정상 추가되었습니다.`;
      }

      onFilesSelected(validFiles, notice);
    } catch (err: any) {
      setError(err.message || '파일 처리 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
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

  const totalBytes = existingFiles.reduce((sum, f) => sum + f.size, 0);
  const formattedTotalSize =
    totalBytes < 1024 * 1024
      ? `${(totalBytes / 1024).toFixed(1)} KB`
      : totalBytes < 1024 * 1024 * 1024
      ? `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;

  // Hidden file inputs
  const hiddenInputs = (
    <>
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
    </>
  );

  // 1. 이미 사진이 추가되어 있을 때: 초슬림 Compact Action Bar
  if (existingFiles.length > 0) {
    return (
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`bg-slate-900/80 border rounded-2xl p-3.5 sm:p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/15 ring-2 ring-indigo-500/30'
            : 'border-slate-800'
        }`}
      >
        {hiddenInputs}
        {error && (
          <div className="w-full p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
            <Images className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>{existingFiles.length}장의 사진 등록됨</span>
              <span className="text-xs font-mono text-slate-400 bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700/60">
                {formattedTotalSize}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              {isVerifying ? (
                <span className="text-indigo-400 animate-pulse">추가 사진 검사 중...</span>
              ) : isDragging ? (
                <span className="text-indigo-300 font-medium">여기에 놓으면 즉시 추가됩니다</span>
              ) : (
                '이곳에 사진을 더 끌어다 놓아 추가할 수 있습니다'
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isLoading || isVerifying}
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 shadow transition"
          >
            <Images className="w-3.5 h-3.5" />
            + 사진 추가
          </button>
          <button
            type="button"
            disabled={isLoading || isVerifying}
            onClick={() => folderInputRef.current?.click()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
            + 폴더 추가
          </button>
          {onClearAll && (
            <button
              type="button"
              disabled={isLoading || isVerifying}
              onClick={onClearAll}
              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-medium rounded-xl border border-rose-500/20 transition"
            >
              비우기
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. 사진이 없을 때: 큼직하고 친절한 기본 업로드 영역
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
      {hiddenInputs}

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
        onClick={() => !isVerifying && !isLoading && fileInputRef.current?.click()}
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
              {isVerifying ? '사진 파일 검사 중...' : '연사 사진들을 여기에 끌어다 놓으세요'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              또는 클릭하여 파일이나 폴더를 직접 선택하세요 (JPEG, PNG, WebP)
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              disabled={isLoading || isVerifying}
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition"
            >
              <Images className="w-4 h-4" />
              사진 선택 (복수)
            </button>
            <button
              type="button"
              disabled={isLoading || isVerifying}
              onClick={() => folderInputRef.current?.click()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
            >
              <FolderOpen className="w-4 h-4 text-indigo-400" />
              폴더 통째로 선택
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 px-2">
        <span>🔒 사진은 업로드되지 않고 내 기기에서 바로 처리돼요</span>
        <span>최대 1,000장 지원 (권장: 100~300장)</span>
      </div>
    </div>
  );
};
