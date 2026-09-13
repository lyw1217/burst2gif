import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { TimelineGrid } from './components/TimelineGrid';
import { PreviewPlayer } from './components/PreviewPlayer';
import { ControlPanel } from './components/ControlPanel';
import { ResultModal } from './components/ResultModal';
import { ImageItem, ConvertOptions, JobStatus } from './types';
import { startConvert, getJobStatus } from './api';

export const App: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [options, setOptions] = useState<ConvertOptions>({
    format: 'gif',
    fps: 12,
    resolution: '1080',
    quality_mode: 'high',
    crf: 23,
    loop: 0,
  });

  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const pollTimerRef = useRef<number | null>(null);

  // 변환 시작 핸들러 (중복 클릭 원천 차단)
  const handleConvert = async () => {
    if (isSubmitting || images.length === 0 || jobStatus?.status === 'running' || jobStatus?.status === 'queued') {
      return;
    }

    try {
      setIsSubmitting(true);
      const imagePaths = images.map((img) => img.path);
      const jobId = await startConvert(imagePaths, options);
      setJobStatus({
        job_id: jobId,
        status: 'queued',
        progress: 10,
        size_bytes: 0,
        size_formatted: '0 B',
      });
    } catch (err: any) {
      alert(err.message || '변환 요청에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Job Polling
  useEffect(() => {
    if (!jobStatus || jobStatus.status === 'completed' || jobStatus.status === 'failed') {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    pollTimerRef.current = window.setInterval(async () => {
      try {
        const latest = await getJobStatus(jobStatus.job_id);
        setJobStatus(latest);
      } catch (e) {
        console.error('Job status polling error', e);
      }
    }, 1000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [jobStatus]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* 상단 입력 섹션 */}
        <InputSection
          onImagesLoaded={(loaded) => {
            setImages(loaded);
            setSelectedFrame(0);
          }}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />

        {/* 2열 메인 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 좌측 (7열): 타임라인 그리드 (순서 편집/삭제) */}
          <div className="lg:col-span-7 space-y-6">
            <TimelineGrid
              images={images}
              onImagesChange={setImages}
              selectedFrameIndex={selectedFrame}
              onSelectFrame={setSelectedFrame}
            />
          </div>

          {/* 우측 (5열): 실시간 프리뷰어 & 제어 패널 */}
          <div className="lg:col-span-5 space-y-6">
            <PreviewPlayer
              images={images}
              fps={options.fps}
              currentFrame={selectedFrame}
              setCurrentFrame={setSelectedFrame}
            />

            <ControlPanel
              options={options}
              onOptionsChange={setOptions}
              onConvert={handleConvert}
              isLoading={isLoading}
              isSubmitting={isSubmitting}
              disabled={
                images.length === 0 ||
                isLoading ||
                isSubmitting ||
                jobStatus?.status === 'running' ||
                jobStatus?.status === 'queued'
              }
            />
          </div>
        </div>
      </main>

      {/* 결과 & 진행률 모달 */}
      <ResultModal
        status={jobStatus}
        onClose={() => setJobStatus(null)}
      />
    </div>
  );
};

export default App;
