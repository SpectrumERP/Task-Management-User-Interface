import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, Loader2, RefreshCw, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { attachmentService } from '@/services/attachmentService';
import { DocumentAttachment } from '@/types/task';
import { cn } from '@/lib/utils';

type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'captured' | 'uploading' | 'error';

export interface CameraCompProps {
  companyNo: number;
  formNo: number;
  fileNamePrefix?: string;
  className?: string;
  onUploaded?: (attachment: DocumentAttachment) => void;
  onCancel?: () => void;
}

const getCameraErrorMessage = (error: unknown) => {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'Camera permission was denied. Allow camera access from the browser prompt or site settings, then try again.';
    }

    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'No camera was found on this device.';
    }

    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'The camera is already in use by another app or browser tab.';
    }
  }

  return 'Unable to open the camera. Please check camera access and try again.';
};

const buildCameraFileName = (prefix: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}-${timestamp}.jpg`;
};

export function CameraComp({
  companyNo,
  formNo,
  fileNamePrefix = 'camera-capture',
  className,
  onUploaded,
  onCancel
}: CameraCompProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const clearCapture = useCallback(() => {
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
    }
    setCapturedUrl(null);
    setCapturedFile(null);
  }, [capturedUrl]);

  const requestCameraPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Camera is not supported in this browser.');
      setStatus('error');
      return;
    }

    try {
      clearCapture();
      stopCamera();
      setErrorMessage('');
      setStatus('requesting');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus('ready');
    } catch (error) {
      console.error('Camera permission failed:', error);
      setErrorMessage(getCameraErrorMessage(error));
      setStatus('denied');
      stopCamera();
    }
  }, [clearCapture, stopCamera]);

  const captureImage = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setErrorMessage('Camera preview is not ready yet. Please try again.');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      setErrorMessage('Unable to capture image from the camera.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      blob => {
        if (!blob) {
          setErrorMessage('Unable to prepare the captured image.');
          return;
        }

        clearCapture();
        const file = new File([blob], buildCameraFileName(fileNamePrefix), { type: 'image/jpeg' });
        setCapturedFile(file);
        setCapturedUrl(URL.createObjectURL(file));
        setStatus('captured');
        stopCamera();
      },
      'image/jpeg',
      0.92
    );
  }, [clearCapture, fileNamePrefix, stopCamera]);

  const retake = useCallback(() => {
    void requestCameraPermission();
  }, [requestCameraPermission]);

  const uploadCapture = useCallback(async () => {
    if (!capturedFile) {
      setErrorMessage('Capture an image before uploading.');
      return;
    }

    try {
      setStatus('uploading');
      setErrorMessage('');

      const entry = await attachmentService.createEntry(capturedFile.name, companyNo, formNo);
      await attachmentService.uploadFile(entry.id, capturedFile);

      const isVerified = await attachmentService.checkStatus(entry.id);
      if (!isVerified) {
        throw new Error('Upload status could not be verified by the backend.');
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
      toast.success(`"${uploadedAttachment.name}" uploaded successfully!`);
      clearCapture();
      setStatus('idle');
    } catch (error: any) {
      console.error('Camera image upload failed:', error);
      const message = error?.message || 'Image upload failed. Please try again.';
      setErrorMessage(message);
      setStatus('captured');
      toast.error(message);
    }
  }, [capturedFile, clearCapture, companyNo, formNo, onUploaded]);

  const cancel = useCallback(() => {
    stopCamera();
    clearCapture();
    setErrorMessage('');
    setStatus('idle');
    onCancel?.();
  }, [clearCapture, onCancel, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (capturedUrl) {
        URL.revokeObjectURL(capturedUrl);
      }
    };
  }, [capturedUrl, stopCamera]);

  const showVideo = status === 'requesting' || status === 'ready';
  const showPermissionHelp = status === 'denied' || status === 'error';
  const isBusy = status === 'requesting' || status === 'uploading';

  return (
    <div className={cn('w-full space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm', className)}>
      <div className="relative overflow-hidden rounded-md bg-slate-950">
        {showVideo && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="aspect-video w-full bg-slate-950 object-cover"
          />
        )}

        {capturedUrl && status !== 'uploading' && (
          <img
            src={capturedUrl}
            alt="Captured preview"
            className="aspect-video w-full bg-slate-950 object-contain"
          />
        )}

        {(status === 'idle' || showPermissionHelp) && (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
              <Camera className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Camera access is required</p>
              <p className="mt-1 max-w-md text-xs text-slate-600">
                Allow camera permission to take a photo and upload it as an attachment.
              </p>
            </div>
          </div>
        )}

        {status === 'uploading' && capturedUrl && (
          <div className="relative">
            <img
              src={capturedUrl}
              alt="Uploading captured preview"
              className="aspect-video w-full bg-slate-950 object-contain opacity-60"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 text-white">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Uploading image...</span>
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {(status === 'idle' || showPermissionHelp) && (
          <Button type="button" onClick={requestCameraPermission} disabled={isBusy}>
            <Camera className="h-4 w-4" />
            {showPermissionHelp ? 'Try Camera Again' : 'Open Camera'}
          </Button>
        )}

        {status === 'requesting' && (
          <Button type="button" disabled>
            <Loader2 className="h-4 w-4 animate-spin" />
            Requesting Permission
          </Button>
        )}

        {status === 'ready' && (
          <>
            <Button type="button" variant="outline" onClick={cancel}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="button" onClick={captureImage}>
              <Camera className="h-4 w-4" />
              Capture
            </Button>
          </>
        )}

        {(status === 'captured' || status === 'uploading') && (
          <>
            <Button type="button" variant="outline" onClick={retake} disabled={status === 'uploading'}>
              <RotateCcw className="h-4 w-4" />
              Retake
            </Button>
            <Button type="button" onClick={uploadCapture} disabled={status === 'uploading'}>
              {status === 'uploading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              OK
            </Button>
          </>
        )}

        {showPermissionHelp && (
          <Button type="button" variant="outline" onClick={requestCameraPermission}>
            <RefreshCw className="h-4 w-4" />
            Request Permission
          </Button>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    </div>
  );
}

export default CameraComp;
