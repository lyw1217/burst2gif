import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { TimelineGrid } from './components/TimelineGrid';
import { PreviewPlayer } from './components/PreviewPlayer';
import { ControlPanel } from './components/ControlPanel';
import { ProgressModal } from './components/ProgressModal';
import { ResultModal } from './components/ResultModal';

import { ManagedFile } from './modules/FileManager';
import { jobController, JobProgress, JobResult } from './modules/JobController';
import { calculateOutputDimensions } from './modules/RiskEvaluator';
import { cleanupOldOPFSTempFiles, checkStorageQuota } from './modules/OutputSink';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';

export const App: React.FC = () => {
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<number>(0);
  const [fps, setFps] = useState<number>(12);
  const [targetLongEdge, setTargetLongEdge] = useState<number>(1280); // 기본값: 1280px (보통 화질)
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [loop, setLoop] = useState<number>(0); // 0 = 무한 반복
  const [aspectDimensions, setAspectDimensions] = useState<{ width: number; height: number }>({ width: 3, height: 2 });
  const [hasMixedOrientations, setHasMixedOrientations] = useState<boolean>(false);

  const [notification, setNotification] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null);
  const [jobResult, setJobResult] = useState<JobResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // 이전 세션 잔여 OPFS 임시 파일 정리
  useEffect(() => {
    cleanupOldOPFSTempFiles();
  }, []);

  // 첫 번째 사진의 실제 종횡비 자동 감지 및 가로/세로 혼합 여부 전수 판별
  useEffect(() => {
    if (files.length > 0) {
      const first = files[0];
      if (first.width && first.height) {
        setAspectDimensions({ width: first.width, height: first.height });
        const mixed = files.some((f) => f.isLandscape !== first.isLandscape);
        setHasMixedOrientations(mixed);
      } else {
        let isMounted = true;
        createImageBitmap(first.file).then((bmp) => {
          if (isMounted) {
            setAspectDimensions({ width: bmp.width, height: bmp.height });
          }
          bmp.close();
        }).catch(() => {});
        return () => {
          isMounted = false;
        };
      }
    } else {
      setHasMixedOrientations(false);
    }
  }, [files]);

  // 실시간 출력 치수 계산 (WYSIWYG 미리보기 및 인코딩에 공통 사용)
  const { width: targetWidth, height: targetHeight } = calculateOutputDimensions(
    aspectDimensions.width,
    aspectDimensions.height,
    targetLongEdge
  );

  // GIF 만들기 시작
  const handleStartConvert = async () => {
    if (files.length === 0 || isProcessing) return;

    setErrorMessage(null);

    // 1. 브라우저 임시 스토리지 Quota 사전 확인 (작업 크기에 따른 동적 계산)
    const estimatedNeededBytes = Math.min(500 * 1024 * 1024, Math.max(50 * 1024 * 1024, files.length * 2 * 1024 * 1024));
    const quotaCheck = await checkStorageQuota(estimatedNeededBytes);
    if (!quotaCheck.ok) {
      setErrorMessage(
        quotaCheck.message || '브라우저 임시 저장 공간이 부족합니다. 디스크 여유 공간을 확보해 주세요.'
      );
      return;
    }

    setIsProcessing(true);
    setJobResult(null);
    setJobProgress({
      currentFrame: 0,
      totalFrames: files.length,
      currentBytes: 0,
      fileName: files[0]?.name || '',
      percent: 0,
    });

    const rawFiles = files.map((f) => f.file);

    jobController.startJob(
      rawFiles,
      {
        targetWidth,
        targetHeight,
        fps,
        loop,
        fitMode,
      },
      (progress) => {
        setJobProgress(progress);
      },
      (result) => {
        setIsProcessing(false);
        setJobProgress(null);
        setJobResult(result);
      },
      (err) => {
        setIsProcessing(false);
        setJobProgress(null);
        setErrorMessage(err);
      }
    );
  };

  // 변환 취소
  const handleCancelConvert = () => {
    jobController.cancelJob();
    setIsProcessing(false);
    setJobProgress(null);
  };

  // 결과 모달 닫기 (임시 파일 정리 연동)
  const handleCloseResult = () => {
    setJobResult(null);
    cleanupOldOPFSTempFiles();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* 제외된 파일 피드백 배너 */}
        {notification && (
          <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-xs text-indigo-300 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-indigo-400" />
              <span>{notification}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-indigo-400 hover:text-white p-1 rounded-lg hover:bg-indigo-500/20 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 오류 안내 모달/배너 */}
        {errorMessage && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start justify-between shadow-lg">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="space-y-1">
                <div className="font-bold text-sm text-rose-200">처리 중 문제가 발생했습니다</div>
                <div className="text-slate-300">{errorMessage}</div>
                <div className="text-[11px] text-slate-400 pt-1">
                  💡 사진 크기를 960px 또는 1280px로 낮추거나, 손상된 사진이 있는지 확인 후 다시 시도해 보세요.
                </div>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white p-1 rounded-lg hover:bg-rose-500/20 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. 상단 파일/폴더 선택 섹션 (사진 등록 시 슬림 액션바로 전환) */}
        <InputSection
          onFilesSelected={(newFiles, notice) => {
            setFiles((prev) => [...prev, ...newFiles]);
            setSelectedFrame(0);
            if (notice) {
              setNotification(notice);
            }
          }}
          isLoading={isProcessing}
          existingFiles={files}
          onClearAll={() => setFiles([])}
        />

        {files.length > 0 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 2. 전체 폭 (12열): 타임라인 그리드 시퀀스 */}
            <TimelineGrid
              files={files}
              onFilesChange={setFiles}
              selectedFrameIndex={selectedFrame}
              onSelectFrame={setSelectedFrame}
            />

            {/* 3. 하단 2열 레이아웃: 대형 1:1 미리보기(7열) + 옵션 패널(5열) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7">
                <PreviewPlayer
                  files={files}
                  fps={fps}
                  currentFrame={selectedFrame}
                  setCurrentFrame={setSelectedFrame}
                  targetWidth={targetWidth}
                  targetHeight={targetHeight}
                  fitMode={fitMode}
                />
              </div>

              <div className="lg:col-span-5">
                <ControlPanel
                  fileCount={files.length}
                  fps={fps}
                  onFpsChange={setFps}
                  targetLongEdge={targetLongEdge}
                  onTargetLongEdgeChange={setTargetLongEdge}
                  fitMode={fitMode}
                  onFitModeChange={setFitMode}
                  loop={loop}
                  onLoopChange={setLoop}
                  onSubmit={handleStartConvert}
                  isProcessing={isProcessing}
                  aspectDimensions={aspectDimensions}
                  hasMixedOrientations={hasMixedOrientations}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 작업 진행률 모달 */}
      <ProgressModal
        progress={jobProgress}
        onCancel={handleCancelConvert}
      />

      {/* 최종 결과 모달 */}
      <ResultModal
        result={jobResult}
        onClose={handleCloseResult}
      />
    </div>
  );
};

export default App;
