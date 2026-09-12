import { useCallback, useEffect, useRef, useState, useReducer } from 'react';
import { Camera, Check, Loader2, RotateCcw, X, ImagePlus, ScanText, FlipHorizontal } from 'lucide-react';
import ReactCrop, { Crop, PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { attachmentService } from '@/services/attachmentService';
import { DocumentAttachment } from '@/types/task';
import { cn } from '@/lib/utils';

import { useBusinessCardDetection } from './camera/hooks/useBusinessCardDetection';
import { useOCR, OCRResult } from './camera/hooks/useOCR';
import { CardCropperService } from './camera/services/CardCropperService';
import { BusinessCardParserService } from './camera/services/BusinessCardParserService';
import { GoogleVisionService } from './camera/services/GoogleVisionService';
import { LogoDetectionService } from './camera/services/LogoDetectionService';
import { BusinessCardOverlay } from './camera/overlays/BusinessCardOverlay';
import { CardReviewForm } from './camera/components/CardReviewForm';

import { useClipboardStore } from '@/store/useClipboardStore';
import { getUserErrorMessage, toErrorMessage } from '@/lib/errorFeedback';
import { LogoCropperModal } from './camera/components/LogoCropperModal';
import { BusinessCardData } from './camera/models/BusinessCardData';

type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'capturing' | 'preview' | 'processing' | 'parsed' | 'uploading' | 'error';

interface CameraState {
  status: CameraStatus;
  errorMessage: string;
  capturedUrl: string | null;
  capturedFile: File | null;
  logoFile: File | null;
  parsedData: BusinessCardData | null;
  isBusinessCard?: boolean;
}

type CameraAction =
  | { type: 'REQUEST_PERMISSION' }
  | { type: 'PERMISSION_GRANTED' }
  | { type: 'PERMISSION_DENIED'; error: string }
  | { type: 'START_CAPTURE' }
  | { type: 'PREVIEW'; file: File; url: string; isBusinessCard: boolean }
  | { type: 'START_PROCESSING' }
  | { type: 'PARSED'; data: BusinessCardData; file: File; url: string; logoFile: File | null }
  | { type: 'UPDATE_DATA'; data: BusinessCardData; logoFile?: File | null }
  | { type: 'START_UPLOAD' }
  | { type: 'UPLOAD_SUCCESS' }
  | { type: 'ERROR'; error: string }
  | { type: 'RESET' };

const initialState: CameraState = {
  status: 'idle',
  errorMessage: '',
  capturedUrl: null,
  capturedFile: null,
  logoFile: null,
  parsedData: null,
};

function cameraReducer(state: CameraState, action: CameraAction): CameraState {
  switch (action.type) {
    case 'REQUEST_PERMISSION':
      return { ...state, status: 'requesting', errorMessage: '' };
    case 'PERMISSION_GRANTED':
      return { ...state, status: 'ready', errorMessage: '' };
    case 'PERMISSION_DENIED':
      return { ...state, status: 'denied', errorMessage: action.error };
    case 'START_CAPTURE':
      return { ...state, status: 'capturing' };
    case 'PREVIEW':
      return {
        ...state,
        status: 'preview',
        capturedFile: action.file,
        capturedUrl: action.url,
        isBusinessCard: action.isBusinessCard
      };
    case 'START_PROCESSING':
      return { ...state, status: 'processing', errorMessage: '' };
    case 'PARSED':
      return {
        ...state,
        status: 'parsed',
        parsedData: action.data,
        capturedFile: action.file,
        capturedUrl: action.url,
        logoFile: action.logoFile
      };
    case 'UPDATE_DATA':
      return { ...state, parsedData: action.data, logoFile: action.logoFile !== undefined ? action.logoFile : state.logoFile };
    case 'START_UPLOAD':
      return { ...state, status: 'uploading' };
    case 'UPLOAD_SUCCESS':
      return { ...state, status: 'idle', capturedFile: null, capturedUrl: null, parsedData: null, logoFile: null };
    case 'ERROR':
      return { ...state, status: 'error', errorMessage: action.error };
    case 'RESET':
      if (state.capturedUrl) URL.revokeObjectURL(state.capturedUrl);
      return { ...initialState };
    default:
      return state;
  }
}

export interface CameraCompProps {
  companyNo: number;
  formNo: number;
  fileNamePrefix?: string;
  className?: string;
  onUploaded?: (attachment: DocumentAttachment) => void;
  onCancel?: () => void;
  onCardScanned?: (data: BusinessCardData) => void;
  initialAnalyzeFile?: File;
}

const buildCameraFileName = (prefix: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}-${timestamp}.jpg`;
};

const dataUrlToFile = (dataUrl: string, filename: string): File => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

export function CameraComp({
  companyNo,
  formNo,
  fileNamePrefix = 'business-card',
  className,
  onUploaded,
  onCancel,
  onCardScanned,
  initialAnalyzeFile
}: CameraCompProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cropperService = useRef(new CardCropperService());
  const parserService = useRef(new BusinessCardParserService());
  const googleVisionService = useRef(new GoogleVisionService());
  const logoService = useRef(new LogoDetectionService());
  const analysisCache = useRef(new Map<string, any>());
  const { processImage, progress } = useOCR();

  const parseOcrResult = useCallback((result: OCRResult): { data: BusinessCardData; formattedText: string } => {
    if (result.googleText) {
      return { data: googleVisionService.current.parseCardData(result.googleText), formattedText: result.googleText };
    }
    return { data: parserService.current.parse(result.tesseractText), formattedText: result.tesseractText };
  }, []);

  const [state, dispatch] = useReducer(cameraReducer, initialState);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [previewCrop, setPreviewCrop] = useState<Crop>();
  const [previewCompletedCrop, setPreviewCompletedCrop] = useState<PercentCrop>();
  const [isMirrored, setIsMirrored] = useState(false);

  const { status, errorMessage, capturedUrl, capturedFile, parsedData, logoFile } = state;

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (containerRef.current) {
      setContainerSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
  }, [status]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const requestCameraPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      dispatch({ type: 'ERROR', error: 'Camera is not supported in this browser.' });
      return;
    }

    try {
      dispatch({ type: 'REQUEST_PERMISSION' });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      dispatch({ type: 'PERMISSION_GRANTED' });
    } catch (error: any) {
      console.error('Camera permission failed:', error);
      dispatch({ type: 'PERMISSION_DENIED', error: error.message || 'Permission denied' });
      stopCamera();
    }
  }, [stopCamera]);

  const analyzeImage = useCallback(async (fileToProcess?: File, urlToProcess?: string) => {
    const targetFile = fileToProcess || capturedFile;
    const targetUrl = urlToProcess || capturedUrl;
    if (!targetFile || !targetUrl) return;
    dispatch({ type: 'START_PROCESSING' });
    try {
      let finalBlob: Blob = targetFile;

      // Apply manual crop if provided
      if (previewCompletedCrop && previewCompletedCrop.width > 0 && previewCompletedCrop.height > 0) {
        const image = new Image();
        image.src = targetUrl;
        await new Promise((resolve) => { image.onload = resolve; });

        const canvas = document.createElement('canvas');

        // Use percentages against natural image size to avoid DOM scaling mismatches
        const sx = (previewCompletedCrop.x / 100) * image.naturalWidth;
        const sy = (previewCompletedCrop.y / 100) * image.naturalHeight;
        const sWidth = (previewCompletedCrop.width / 100) * image.naturalWidth;
        const sHeight = (previewCompletedCrop.height / 100) * image.naturalHeight;

        canvas.width = sWidth;
        canvas.height = sHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(
            image,
            sx,
            sy,
            sWidth,
            sHeight,
            0,
            0,
            canvas.width,
            canvas.height
          );

          finalBlob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Canvas to blob failed'));
            }, 'image/jpeg', 0.95);
          });
        }
      }

      const cacheKey = `${finalBlob.size}_${finalBlob.type}`;
      let result;
      if (analysisCache.current.has(cacheKey)) {
        result = analysisCache.current.get(cacheKey);
      } else {
        result = await processImage(finalBlob);
        analysisCache.current.set(cacheKey, result);
      }
      const { data, formattedText } = parseOcrResult(result);

      // Auto-store in clipboard
      useClipboardStore.getState().addEntry({
        source: 'BusinessCard',
        data,
        formattedText
      });

      const finalFile = new File([finalBlob], buildCameraFileName(fileNamePrefix), { type: 'image/jpeg' });
      const finalUrl = URL.createObjectURL(finalFile);

      dispatch({ type: 'PARSED', data, file: finalFile, url: finalUrl, logoFile: null });
    } catch (e) {
      console.error(e);
      dispatch({ type: 'ERROR', error: 'Analysis failed. Please try again.' });
    }
  }, [capturedFile, capturedUrl, processImage, previewCompletedCrop, fileNamePrefix, parseOcrResult]);

  const analyzedFileRef = useRef<File | null>(null);

  useEffect(() => {
    if (initialAnalyzeFile && initialAnalyzeFile !== analyzedFileRef.current) {
      analyzedFileRef.current = initialAnalyzeFile;
      const url = URL.createObjectURL(initialAnalyzeFile);
      dispatch({ type: 'PREVIEW', file: initialAnalyzeFile, url, isBusinessCard: true });
      analyzeImage(initialAnalyzeFile, url);
    }
  }, [initialAnalyzeFile, analyzeImage]);

  const handleAutoCapture = useCallback(async (result: any) => {
    if (status !== 'ready') return;
    dispatch({ type: 'START_CAPTURE' });

    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        dispatch({ type: 'ERROR', error: 'Failed to capture image' });
        return;
      }

      const file = new File([blob], buildCameraFileName(fileNamePrefix), { type: 'image/jpeg' });
      const url = URL.createObjectURL(file);

      stopCamera();

      if (result?.detected) {
        dispatch({ type: 'START_PROCESSING' });
        try {
          const croppedBlob = await cropperService.current.crop(video, result.rectangle, result.corners);
          if (!croppedBlob) throw new Error('Failed to crop image');

          const extractedLogoBlob = await logoService.current.detect(croppedBlob);
          let extractedLogoFile = null;
          if (extractedLogoBlob) {
            extractedLogoFile = new File([extractedLogoBlob], buildCameraFileName('logo'), { type: 'image/png' });
          }

          const ocrResult = await processImage(croppedBlob);

          const { data, formattedText } = parseOcrResult(ocrResult);

          // Auto-store in clipboard
          useClipboardStore.getState().addEntry({
            source: 'BusinessCard',
            data,
            formattedText
          });

          const finalFile = new File([croppedBlob], buildCameraFileName(fileNamePrefix), { type: 'image/jpeg' });
          const finalUrl = URL.createObjectURL(finalFile);

          dispatch({ type: 'PARSED', data, file: finalFile, url: finalUrl, logoFile: extractedLogoFile });
        } catch (err: any) {
          console.error(err);
          dispatch({ type: 'ERROR', error: 'Processing failed. Please try again.' });
        }
      } else {
        // Initialize a centered crop box
        setPreviewCrop({ unit: '%', x: 10, y: 20, width: 80, height: 60 });
        dispatch({ type: 'PREVIEW', file, url, isBusinessCard: false });
      }
    }, 'image/jpeg', 0.9);

  }, [status, fileNamePrefix, processImage, stopCamera, parseOcrResult]);

  const { isCvReady, detectionResult, isStable } = useBusinessCardDetection(
    videoRef,
    canvasRef,
    status === 'ready',
    handleAutoCapture
  );

  const retake = useCallback(() => {
    dispatch({ type: 'RESET' });
    void requestCameraPermission();
  }, [requestCameraPermission]);

  const uploadCapture = useCallback(async () => {
    if (!capturedFile) return;

    try {
      dispatch({ type: 'START_UPLOAD' });

      let uploadedAttachment: any = null;

      // Upload Card only if it's a newly captured image
      if (!initialAnalyzeFile) {
        const entry = await attachmentService.createEntry(capturedFile.name, companyNo, formNo);
        await attachmentService.uploadFile(entry.id, capturedFile);

        const isVerified = await attachmentService.checkStatus(entry.id);
        if (!isVerified) throw new Error('Card upload status could not be verified by the backend.');

        uploadedAttachment = {
          id: entry.id,
          name: (entry as any).docName || entry.name || capturedFile.name,
          size: (entry as any).docSize || entry.size || capturedFile.size,
          storedFileName: entry.storedFileName,
          storedFilePath: entry.storedFilePath,
          relativePath: entry.relativePath
        };
      }

      // Upload Logo if extracted
      if (logoFile) {
        const logoEntry = await attachmentService.createEntry(logoFile.name, companyNo, formNo);
        await attachmentService.uploadFile(logoEntry.id, logoFile);

        onUploaded?.({
          id: logoEntry.id,
          name: (logoEntry as any).docName || logoEntry.name || logoFile.name,
          size: (logoEntry as any).docSize || logoEntry.size || logoFile.size,
          storedFileName: logoEntry.storedFileName,
          storedFilePath: logoEntry.storedFilePath,
          relativePath: logoEntry.relativePath
        });
      }

      if (uploadedAttachment) {
        onUploaded?.(uploadedAttachment);
      } else if (initialAnalyzeFile && !logoFile) {
        onUploaded?.(null as unknown as DocumentAttachment);
      }
      
      if (parsedData && onCardScanned) {
        onCardScanned(parsedData);
      }

      // In analyze mode we just confirm details, otherwise we actually scanned it
      toast.success(initialAnalyzeFile ? `Details confirmed!` : `Business card scanned successfully!`);
      dispatch({ type: 'UPLOAD_SUCCESS' });
    } catch (error: any) {
      console.error('Camera image upload failed:', error);
      const message = getUserErrorMessage(error, 'Upload failed. Please try again.');
      dispatch({ type: 'ERROR', error: message });
      toast.error(message);
    }
  }, [capturedFile, logoFile, companyNo, formNo, onUploaded, onCardScanned, parsedData]);

  const cancel = useCallback(() => {
    stopCamera();
    dispatch({ type: 'RESET' });
    onCancel?.();
  }, [onCancel, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
  }, [capturedUrl, stopCamera]);

  const showVideo = status === 'requesting' || status === 'ready' || status === 'capturing' || status === 'processing';
  const showPermissionHelp = status === 'denied' || status === 'error';

  return (
    <div className={cn('w-full h-full flex flex-col min-h-0 bg-[var(--tm-surface)]', className)}>
      <div
        className={cn(
          'flex flex-col flex-1 min-h-0 w-full',
          status === 'parsed' && 'md:flex-row md:items-stretch gap-3 p-3 sm:p-4 overflow-y-auto'
        )}
      >
        <div
          ref={containerRef}
          className={cn(
            'relative overflow-hidden bg-[#f1f5f8] flex flex-col items-center justify-center w-full',
            status === 'parsed'
              ? 'md:w-1/2 shrink-0 rounded-[10px] border border-[var(--tm-border)]/80 min-h-[240px] md:min-h-0'
              : 'flex-1 min-h-[min(52vh,420px)] border-0 rounded-none'
          )}
        >
          {showVideo && (
            <>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={cn(
                  'absolute inset-0 w-full h-full bg-slate-950 object-cover transition-transform duration-300',
                  status === 'processing' && 'opacity-50 blur-sm',
                  isMirrored && 'scale-x-[-1]'
                )}
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2.5 right-2.5 bg-black/45 hover:bg-black/65 text-white rounded-full z-10 h-8 w-8 backdrop-blur-sm border border-white/10"
                onClick={() => setIsMirrored((prev) => !prev)}
                title="Toggle Mirror View"
              >
                <FlipHorizontal
                  size={14}
                  className={cn('transition-transform duration-300', isMirrored && 'scale-x-[-1]')}
                />
              </Button>
            </>
          )}

          {status === 'ready' && isCvReady && videoRef.current && (
            <div
              className={cn(
                'absolute inset-0 pointer-events-none transition-transform duration-300',
                isMirrored && 'scale-x-[-1]'
              )}
            >
              <BusinessCardOverlay
                detectionResult={detectionResult}
                isStable={isStable}
                videoWidth={videoRef.current.videoWidth}
                videoHeight={videoRef.current.videoHeight}
                containerWidth={containerSize.width}
                containerHeight={containerSize.height}
              />
            </div>
          )}

          {capturedUrl && status !== 'uploading' && status !== 'processing' && (
            <div className="relative flex flex-col flex-1 w-full justify-center items-center min-h-0 bg-slate-950">
              {status === 'preview' ? (
                <>
                  <div className="absolute top-3 left-0 right-0 flex justify-center z-10 px-3">
                    <div className="bg-slate-900/90 text-white px-3 py-1.5 rounded-[8px] text-xs font-medium shadow-md border border-slate-700/80">
                      Crop the business card, then click Analyze
                    </div>
                  </div>
                  <div className="w-full flex justify-center overflow-hidden">
                    <ReactCrop
                      crop={previewCrop}
                      onChange={(c) => setPreviewCrop(c)}
                      onComplete={(_, percentCrop) => setPreviewCompletedCrop(percentCrop)}
                    >
                      <img
                        id="preview-image"
                        src={capturedUrl}
                        alt="Captured preview"
                        className="max-h-[min(48vh,380px)] max-w-full block object-contain"
                      />
                    </ReactCrop>
                  </div>
                </>
              ) : (
                <img
                  src={capturedUrl}
                  alt="Captured preview"
                  className="max-h-full max-w-full object-contain"
                />
              )}

              {status === 'parsed' && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center z-20">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shadow-md bg-[var(--tm-surface)]/95 hover:bg-[var(--tm-surface)] text-slate-100 rounded-[8px]"
                    onClick={() => setIsLogoModalOpen(true)}
                  >
                    <ImagePlus className="w-4 h-4 mr-1.5" />
                    Extract Logo
                  </Button>
                </div>
              )}
            </div>
          )}

          {(status === 'idle' || showPermissionHelp) && (
            <div className="flex w-full h-full min-h-[min(52vh,420px)] flex-col items-center justify-center gap-3.5 bg-[linear-gradient(160deg,var(--tm-elevated)_0%,#eef3f7_55%,#e8eef3_100%)] p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--tm-surface)] text-[#0EA5E9] shadow-sm ring-1 ring-[var(--tm-border)]/80">
                <Camera className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-100 tracking-tight">
                  {showPermissionHelp ? 'Camera access blocked' : 'Camera access is required'}
                </p>
                <p className="max-w-sm text-[11px] font-medium text-slate-500 leading-relaxed">
                  {showPermissionHelp
                    ? 'Allow camera permission in your browser, then try again to scan a business card.'
                    : 'Allow camera permission to scan a business card and attach the photo.'}
                </p>
              </div>
            </div>
          )}

          {(status === 'processing' || status === 'uploading') && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 text-white backdrop-blur-[2px]">
              <div className="flex flex-col items-center gap-2 rounded-[10px] bg-slate-900/80 px-5 py-4 border border-white/10">
                <Loader2 className="h-7 w-7 animate-spin text-white" />
                <span className="text-xs font-medium">
                  {status === 'uploading'
                    ? 'Uploading…'
                    : `Analyzing card… ${Math.round(progress * 100)}%`}
                </span>
              </div>
            </div>
          )}

          {status === 'parsed' && logoFile && (
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent z-30 pointer-events-none">
              <div className="border border-slate-700/50 rounded-[10px] bg-slate-800/90 backdrop-blur-md shadow-lg p-2.5 pointer-events-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                    Extracted Logo
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() =>
                      dispatch({ type: 'UPDATE_DATA', data: parsedData!, logoFile: null })
                    }
                  >
                    Remove Logo
                  </Button>
                </div>
                <div className="flex justify-center bg-slate-900/80 rounded-[8px] p-2 border border-slate-700/50">
                  <img
                    src={URL.createObjectURL(logoFile)}
                    alt="Extracted Logo"
                    className="max-h-20 object-contain rounded drop-shadow-md"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {status === 'parsed' && parsedData && (
          <div className="rounded-[10px] border border-[var(--tm-border)]/80 bg-[var(--tm-elevated)] p-3.5 md:w-1/2 flex flex-col justify-start overflow-y-auto min-h-0">
            <h3 className="mb-2 text-sm font-semibold text-slate-100 tracking-tight">
              Review Scanned Details
            </h3>
            <CardReviewForm
              data={parsedData}
              onChange={(data) => dispatch({ type: 'UPDATE_DATA', data })}
            />
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mx-4 sm:mx-5 mb-2 rounded-[8px] border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400">
          {toErrorMessage(errorMessage, 'Something went wrong')}
        </div>
      )}

      <div className="shrink-0 border-t border-[var(--tm-border)] bg-[var(--tm-elevated)] px-4 sm:px-5 py-3 flex flex-wrap items-center justify-end gap-2">
        {(status === 'idle' || showPermissionHelp) && (
          <Button
            type="button"
            onClick={requestCameraPermission}
            disabled={!isCvReady}
            className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-[8px]"
          >
            {!isCvReady ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-1.5 h-4 w-4" />
            )}
            {!isCvReady ? 'Loading Scanner…' : showPermissionHelp ? 'Try Camera Again' : 'Open Camera'}
          </Button>
        )}

        {status === 'requesting' && (
          <Button type="button" disabled className="rounded-[8px]">
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            Requesting Permission
          </Button>
        )}

        {(status === 'ready' || status === 'processing') && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={cancel}
              disabled={status === 'processing'}
              className="rounded-[8px]"
            >
              <X className="mr-1.5 h-4 w-4" />
              Cancel
            </Button>
            {status === 'ready' && (
              <Button
                type="button"
                onClick={() =>
                  handleAutoCapture(detectionResult.detected ? detectionResult : undefined)
                }
                className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-[8px]"
              >
                <Camera className="mr-1.5 h-4 w-4" />
                Capture Manually
              </Button>
            )}
          </>
        )}

        {status === 'preview' && (
          <>
            <Button type="button" variant="outline" onClick={retake} className="rounded-[8px]">
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Retake
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => analyzeImage()}
              className="rounded-[8px]"
            >
              <ScanText className="mr-1.5 h-4 w-4" />
              Analyze Details
            </Button>
            <Button
              type="button"
              onClick={uploadCapture}
              className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-[8px]"
            >
              <Check className="mr-1.5 h-4 w-4" />
              Upload Image
            </Button>
          </>
        )}

        {(status === 'parsed' || status === 'uploading') && (
          <>
            {!initialAnalyzeFile && (
              <Button
                type="button"
                variant="outline"
                onClick={retake}
                disabled={status === 'uploading'}
                className="rounded-[8px]"
              >
                <RotateCcw className="mr-1.5 h-4 w-4" />
                Retake
              </Button>
            )}
            <Button
              type="button"
              onClick={uploadCapture}
              disabled={status === 'uploading'}
              className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-[8px]"
            >
              {status === 'uploading' ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              {initialAnalyzeFile ? 'Confirm' : 'Confirm & Upload'}
            </Button>
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {capturedUrl && (
        <LogoCropperModal
          open={isLogoModalOpen}
          onOpenChange={setIsLogoModalOpen}
          imageUrl={capturedUrl}
          onSave={(logo) => {
            if (parsedData) {
              const newLogoFile = dataUrlToFile(logo, buildCameraFileName('logo'));
              dispatch({
                type: 'UPDATE_DATA',
                data: { ...parsedData, logo },
                logoFile: newLogoFile,
              });
            }
          }}
        />
      )}
    </div>
  );
}

export default CameraComp;
