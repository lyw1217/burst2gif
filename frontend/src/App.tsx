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
import { cleanupOldOPFSTempFiles } from './modules/OutputSink';

export const App: React.FC = () => {
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<number>(0);
  const [fps, setFps] = useState<number>(12);
  const [targetLongEdge, setTargetLongEdge] = useState<number>(1280); // 기본값: 1280px (보통 화질)
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [loop, setLoop] = useState<number>(0); // 0 = 무한 반복

  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null);
  const [jobResult, setJobResult] = useState<JobResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // 이전 세션 잔여 OPFS 임시 파일 정리
  useEffect(() => {
    cleanupOldOPFSTempFiles();
  }, []);

  // GIF 만들기 시작
  const handleStartConvert = async () => {
    if (files.length === 0 || isProcessing) return;

    // 첫 번째 사진 기준 대략적인 원본 비율 계산 (또는 3:2 기본)
    const { width: targetWidth, height: targetHeight } = calculateOutputDimensions(
      3,
      2,
      targetLongEdge
    );

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
      (errorMessage) => {
        setIsProcessing(false);
        setJobProgress(null);
        alert(`오류: ${errorMessage}`);
      }
    );
  };

  // 변환 취소
  const handleCancelConvert = () => {
    jobController.cancelJob();
    setIsProcessing(false);
    setJobProgress(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* 상단 파일/폴더 선택 섹션 */}
        <InputSection
          onFilesSelected={(newFiles) => {
            setFiles((prev) => [...prev, ...newFiles]);
            setSelectedFrame(0);
          }}
          isLoading={isProcessing}
        />

        {files.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 좌측 (7열): 타임라인 그리드 (온디맨드 썸네일, 순서 편집, 삭제) */}
            <div className="lg:col-span-7 space-y-6">
              <TimelineGrid
                files={files}
                onFilesChange={setFiles}
                selectedFrameIndex={selectedFrame}
                onSelectFrame={setSelectedFrame}
              />
            </div>

            {/* 우측 (5열): 실시간 미리보기 및 제어 패널 */}
            <div className="lg:col-span-5 space-y-6">
              <PreviewPlayer
                files={files}
                fps={fps}
                currentFrame={selectedFrame}
                setCurrentFrame={setSelectedFrame}
              />

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
              />
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
        onClose={() => setJobResult(null)}
      />
    </div>
  );
};

export default App;
