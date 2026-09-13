import React, { useState, useRef } from 'react';
import { Folder, UploadCloud, Loader2, AlertCircle } from 'lucide-react';
import { scanFolder, uploadFiles } from '../api';
import { ImageItem } from '../types';

interface Props {
  onImagesLoaded: (images: ImageItem[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const InputSection: React.FC<Props> = ({ onImagesLoaded, isLoading, setIsLoading }) => {
  const [activeTab, setActiveTab] = useState<'folder' | 'upload'>('folder');
  const [folderPath, setFolderPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!folderPath.trim()) {
      setError('폴더 경로를 입력해주세요.');
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      const images = await scanFolder(folderPath.trim());
      if (images.length === 0) {
        setError('해당 폴더에 지원되는 이미지 파일(JPG, PNG, WEBP)이 없습니다.');
      } else {
        onImagesLoaded(images);
      }
    } catch (err: any) {
      setError(err.message || '폴더를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const SUPPORTED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      setError(null);
      setIsLoading(true);
      const fileList = Array.from(files);

      // ARW, CR2, NEF 등 RAW 파일은 프론트에서 먼저 제외하여 불필요한 대용량 업로드 방지
      const validFiles = fileList.filter((file) => {
        const dotIndex = file.name.lastIndexOf('.');
        if (dotIndex === -1) return false;
        const ext = file.name.slice(dotIndex).toLowerCase();
        return SUPPORTED_EXTS.includes(ext);
      });

      if (validFiles.length === 0) {
        setError('지원되는 이미지(JPG, PNG, WEBP)가 없습니다. (ARW, CR2 등 RAW 파일은 제외됩니다)');
        return;
      }

      const images = await uploadFiles(validFiles);
      onImagesLoaded(images);
    } catch (err: any) {
      setError(err.message || '파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
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
      handleFileUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-5">
        <button
          onClick={() => { setActiveTab('folder'); setError(null); }}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'folder'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Folder className="w-4 h-4" />
          로컬 폴더 경로 (초고속 추천)
        </button>
        <button
          onClick={() => { setActiveTab('upload'); setError(null); }}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'upload'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          드래그 앤 드롭 업로드
        </button>
      </div>

      {/* Tab 1: Folder Path Input */}
      {activeTab === 'folder' && (
        <form onSubmit={handleScan} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="예: C:\Users\사진\연사폴더 또는 D:\Photos\Burst_01"
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/30 shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Folder className="w-4 h-4" />}
              사진 불러오기
            </button>
          </div>
          <p className="text-xs text-slate-400">
            💡 로컬 경로를 지정하면 20MB 고용량 사진 수십 장도 브라우저 업로드 없이 <strong className="text-slate-300">0초 만에 즉시 로드</strong>됩니다.
          </p>
        </form>
      )}

      {/* Tab 2: Drag & Drop */}
      {activeTab === 'upload' && (
        <div>
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-slate-700 hover:border-slate-500 bg-slate-950/40 hover:bg-slate-950/70'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              multiple
              accept="image/*"
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
              </div>
              <p className="text-sm font-medium text-slate-200">
                연사 사진들을 여기에 끌어다 놓거나 클릭하여 선택하세요
              </p>
              <p className="text-xs text-slate-500">
                JPG, PNG, WEBP 지원 (다중 선택 가능)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
