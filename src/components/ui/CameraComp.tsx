import { useCallback, useEffect, useRef, useState, useReducer } from 'react';
import { Camera, Check, Loader2, RefreshCw, RotateCcw, X, Edit } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { attachmentService } from '@/services/attachmentService';
import { DocumentAttachment } from '@/types/task';
import { cn } from '@/lib/utils';

import { useBusinessCardDetection } from './camera/hooks/useBusinessCardDetection';
import { useOCR } from './camera/hooks/useOCR';
import { CardCropperService } from './camera/services/CardCropperService';
import { BusinessCardParserService } from './camera/services/BusinessCardParserService';
import { LogoDetectionService } from './camera/services/LogoDetectionService';
import { BusinessCardOverlay } from './camera/overlays/BusinessCardOverlay';
import { CardReviewForm } from './camera/components/CardReviewForm';
import { BusinessCardData } from './camera/models/BusinessCardData';

type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'capturing' | 'processing' | 'parsed' | 'uploading' | 'error';

interface CameraState {
  status: CameraStatus;
  errorMessage: string;
  capturedUrl: string | null;
  capturedFile: File | null;
  logoFile: File | null;
  parsedData: BusinessCardData | null;
}

type CameraAction =
  | { type: 'REQUEST_PERMISSION' }
  | { type: 'PERMISSION_GRANTED' }
  | { type: 'PERMISSION_DENIED'; error: string }
  | { type: 'START_CAPTURE' }
  | { type: 'START_PROCESSING' }
  | { type: 'PARSED'; data: BusinessCardData; file: File; url: string; logoFile: File | null }
  | { type: 'UPDATE_DATA'; data: BusinessCardData }
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
      return { ...state, parsedData: action.data };
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
}

const buildCameraFileName = (prefix: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}-${timestamp}.jpg`;
};

export function CameraComp({
  companyNo,
  formNo,
  fileNamePrefix = 'business-card',
  className,
  onUploaded,
  onCancel,
  onCardScanned
}: CameraCompProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cropperService = useRef(new CardCropperService());
  const parserService = useRef(new BusinessCardParserService());
  const logoService = useRef(new LogoDetectionService());
  const { processImage, isProcessing, progress } = useOCR();

  const [state, dispatch] = useReducer(cameraReducer, initialState);
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
        video: { facingMode: { ideal: 'environment' } },
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

  const handleAutoCapture = useCallback(async (result: any) => {
    if (status !== 'ready') return;
    dispatch({ type: 'START_CAPTURE' });

    const video = videoRef.current;
    if (!video) return;

    dispatch({ type: 'START_PROCESSING' });

    try {
      // 1. Crop Card
      const croppedBlob = await cropperService.current.crop(video, result.rectangle, result.corners);
      if (!croppedBlob) throw new Error('Failed to crop image');

      // 2. Extract Logo
      const extractedLogoBlob = await logoService.current.detect(croppedBlob);
      let extractedLogoFile = null;
      if (extractedLogoBlob) {
        extractedLogoFile = new File([extractedLogoBlob], buildCameraFileName('logo'), { type: 'image/png' });
      }

      // 3. Extract Text via OCR
      const rawText = await processImage(croppedBlob);

      // 4. Parse Data
      const data = parserService.current.parse(rawText);

      // 5. Create File from Cropped Blob
      const file = new File([croppedBlob], buildCameraFileName(fileNamePrefix), { type: 'image/jpeg' });
      const url = URL.createObjectURL(file);

      stopCamera();
      dispatch({ type: 'PARSED', data, file, url, logoFile: extractedLogoFile });
    } catch (err: any) {
      console.error(err);
      dispatch({ type: 'ERROR', error: 'Processing failed. Please try again.' });
    }
  }, [status, fileNamePrefix, processImage, stopCamera]);

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

      // Upload Card
      const entry = await attachmentService.createEntry(capturedFile.name, companyNo, formNo);
      await attachmentService.uploadFile(entry.id, capturedFile);

      const isVerified = await attachmentService.checkStatus(entry.id);
      if (!isVerified) throw new Error('Card upload status could not be verified by the backend.');

      // Upload Logo
      if (logoFile) {
        const logoEntry = await attachmentService.createEntry(logoFile.name, companyNo, formNo);
        await attachmentService.uploadFile(logoEntry.id, logoFile);
      }

      const uploadedAttachment: DocumentAttachment = {
        id: entry.id,
        name: (entry as any).docName || entry.name || capturedFile.name,
        size: (entry as any).docSize || entry.size || capturedFile.size,
        storedFileName: entry.storedFileName,
        storedFilePath: entry.storedFilePath,
        relativePath: entry.relativePath
      };

      onUploaded?.(uploadedAttachment);
      if (parsedData && onCardScanned) {
        onCardScanned(parsedData);
      }
      
      toast.success(`Business card scanned successfully!`);
      dispatch({ type: 'UPLOAD_SUCCESS' });
    } catch (error: any) {
      console.error('Camera image upload failed:', error);
      const message = error?.message || 'Upload failed. Please try again.';
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
    <div className={cn('w-full space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm', className)}>
      <div ref={containerRef} className="relative overflow-hidden rounded-md bg-slate-950">
        {showVideo && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={cn("aspect-video w-full bg-slate-950 object-cover", status === 'processing' && 'opacity-50 blur-sm')}
          />
        )}
        
        {status === 'ready' && isCvReady && videoRef.current && (
           <BusinessCardOverlay
             detectionResult={detectionResult}
             isStable={isStable}
             videoWidth={videoRef.current.videoWidth}
             videoHeight={videoRef.current.videoHeight}
             containerWidth={containerSize.width}
             containerHeight={containerSize.height}
           />
        )}

        {capturedUrl && status !== 'uploading' && status !== 'processing' && (
          <img src={capturedUrl} alt="Captured preview" className="aspect-video w-full bg-slate-950 object-contain" />
        )}

        {(status === 'idle' || showPermissionHelp) && (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
              <Camera className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Camera access is required</p>
              <p className="mt-1 max-w-md text-xs text-slate-600">
                Allow camera permission to scan a business card.
              </p>
            </div>
          </div>
        )}

        {(status === 'processing' || status === 'uploading') && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 text-white">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <span className="text-sm font-medium">
                {status === 'uploading' ? 'Uploading...' : `Analyzing Card... ${Math.round(progress * 100)}%`}
              </span>
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {status === 'parsed' && parsedData && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-2 font-semibold text-slate-800">Review Scanned Details</h3>
          <CardReviewForm 
            data={parsedData} 
            onChange={(data) => dispatch({ type: 'UPDATE_DATA', data })} 
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {(status === 'idle' || showPermissionHelp) && (
          <Button type="button" onClick={requestCameraPermission} disabled={!isCvReady}>
            {!isCvReady ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
            {!isCvReady ? 'Loading Scanner...' : showPermissionHelp ? 'Try Camera Again' : 'Open Camera'}
          </Button>
        )}

        {status === 'requesting' && (
          <Button type="button" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Requesting Permission
          </Button>
        )}

        {(status === 'ready' || status === 'processing') && (
          <Button type="button" variant="outline" onClick={cancel} disabled={status === 'processing'}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        )}

        {(status === 'parsed' || status === 'uploading') && (
          <>
            <Button type="button" variant="outline" onClick={retake} disabled={status === 'uploading'}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake
            </Button>
            <Button type="button" onClick={uploadCapture} disabled={status === 'uploading'}>
              {status === 'uploading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Confirm & Upload
            </Button>
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    </div>
  );
}

export default CameraComp;
