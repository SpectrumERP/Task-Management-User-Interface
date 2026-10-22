import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, ImagePlus, RotateCcw, SwitchCamera } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InlineLoader } from '@/components/ui/BrandLoader';

interface PhotoCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The confirmed photo (JPEG). The dialog closes itself afterwards. */
  onCapture: (photo: File) => void;
  /** Offered when the camera can't be used, e.g. opens the form's image picker. */
  onChooseFile?: () => void;
  title?: string;
  description?: string;
}

type Phase = 'starting' | 'live' | 'review' | 'error';

const unsupportedMessage = () =>
  window.isSecureContext ? 'This browser cannot use the camera.' : 'The camera needs a secure (https) connection.';

/** Explains why getUserMedia failed in words a user can act on. */
const cameraErrorMessage = (error: unknown): string => {
  if (!window.isSecureContext) return 'The camera needs a secure (https) connection.';
  const name = (error as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera access was blocked. Allow the camera for this site in your browser settings, then try again.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera was found on this device.';
  if (name === 'NotReadableError') return 'The camera is being used by another app. Close it and try again.';
  return 'The camera could not be started.';
};

/** Starts a camera stream (a given device, or the rear camera) and lists the cameras on the device. */
async function openCamera(deviceId?: string): Promise<{ stream: MediaStream; cameras: MediaDeviceInfo[] }> {
  // No minimum resolution: low-res laptop webcams would otherwise fail outright.
  const stream = await navigator.mediaDevices.getUserMedia({
    video: deviceId
      ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false,
  });
  // Device labels are only filled in once permission is granted, so list cameras afterwards.
  const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[]);
  return { stream, cameras: devices.filter((d) => d.kind === 'videoinput') };
}

/**
 * Live camera in a dialog: preview → Capture → Retake / Use Photo. Uses the rear camera when there is
 * one, and lets the user switch when the device has several. The stream stops whenever the dialog closes.
 */
export function PhotoCaptureDialog({
  open,
  onOpenChange,
  onCapture,
  onChooseFile,
  title = 'Take Photo',
  description = 'Point the camera at what you want to attach, then capture.',
}: PhotoCaptureDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[12px] w-[95vw] max-w-2xl p-0 border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] overflow-hidden gap-0">
        <DialogHeader className="px-5 py-3.5 border-b border-[var(--tm-border)] space-y-0.5 text-left">
          <DialogTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Camera size={16} className="text-[#0EA5E9]" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">{description}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so every opening starts the camera afresh and closing stops it. */}
        {open && (
          <CameraPanel
            onCapture={(photo) => {
              onCapture(photo);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
            onChooseFile={onChooseFile && (() => {
              onOpenChange(false);
              onChooseFile();
            })}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CameraPanel({
  onCapture,
  onCancel,
  onChooseFile,
}: {
  onCapture: (photo: File) => void;
  onCancel: () => void;
  onChooseFile?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Bumped on every start / stop, so a camera that finishes starting after the panel closed is shut off.
  const sessionRef = useRef(0);
  const supported = !!navigator.mediaDevices?.getUserMedia;
  const [phase, setPhase] = useState<Phase>(supported ? 'starting' : 'error');
  const [errorMessage, setErrorMessage] = useState(supported ? '' : unsupportedMessage());
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const [mirrored, setMirrored] = useState(false);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);

  const stopStream = useCallback(() => {
    sessionRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  /** Opens the camera (a given one, or the rear camera); state changes only once the browser answers. */
  const startStream = useCallback((id?: string) => {
    stopStream();
    const session = sessionRef.current;
    if (!navigator.mediaDevices?.getUserMedia) return;
    openCamera(id).then(
      ({ stream, cameras: found }) => {
        if (session !== sessionRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const settings = stream.getVideoTracks()[0]?.getSettings();
        // Mirror the preview for selfie / laptop cameras only; the captured photo is never mirrored.
        setMirrored(settings?.facingMode !== 'environment');
        setDeviceId(settings?.deviceId);
        setCameras(found);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
        setPhase('live');
      },
      (error) => {
        if (session !== sessionRef.current) return;
        setErrorMessage(cameraErrorMessage(error));
        setPhase('error');
      }
    );
  }, [stopStream]);

  useEffect(() => {
    startStream();
    return stopStream;
  }, [startStream, stopStream]);

  // Free the preview image when it is replaced or the panel closes.
  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  const restart = (id?: string) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(unsupportedMessage());
      setPhase('error');
      return;
    }
    setPhase('starting');
    startStream(id);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
      setPhoto({ file, url: URL.createObjectURL(blob) });
      setPhase('review');
      // Pause the stream while reviewing so the camera light isn't on for nothing.
      stopStream();
    }, 'image/jpeg', 0.92);
  };

  const retake = () => {
    setPhoto(null);
    restart(deviceId);
  };

  const switchCamera = () => {
    if (cameras.length < 2) return;
    const index = cameras.findIndex((c) => c.deviceId === deviceId);
    restart(cameras[(index + 1) % cameras.length].deviceId);
  };

  return (
    <>
      <div className="relative bg-black aspect-[4/3] max-h-[65vh] w-full flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-contain ${phase === 'live' || phase === 'starting' ? '' : 'hidden'} ${mirrored ? '-scale-x-100' : ''}`}
        />
        {phase === 'review' && photo && (
          <img src={photo.url} alt="Captured photo" className="h-full w-full object-contain" />
        )}
        {phase === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-slate-300">
            <InlineLoader size={20} />
            Starting camera…
          </div>
        )}
        {phase === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <Camera size={28} className="text-slate-500" />
            <p className="text-xs font-medium text-slate-300 max-w-sm">{errorMessage}</p>
          </div>
        )}
        {phase === 'live' && cameras.length > 1 && (
          <button
            type="button"
            onClick={switchCamera}
            aria-label="Switch camera"
            className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70"
          >
            <SwitchCamera size={18} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3 border-t border-[var(--tm-border)]">
        {phase === 'error' ? (
          <>
            {onChooseFile && (
              <Button type="button" variant="outline" onClick={onChooseFile} className="h-9 gap-1.5 rounded-[8px] text-xs">
                <ImagePlus size={14} /> Choose a file instead
              </Button>
            )}
            <Button type="button" onClick={() => restart()} className="h-9 gap-1.5 rounded-[8px] text-xs bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
              <RotateCcw size={14} /> Try again
            </Button>
          </>
        ) : phase === 'review' ? (
          <>
            <Button type="button" variant="outline" onClick={retake} className="h-9 gap-1.5 rounded-[8px] text-xs">
              <RotateCcw size={14} /> Retake
            </Button>
            <Button type="button" onClick={() => photo && onCapture(photo.file)} className="h-9 gap-1.5 rounded-[8px] text-xs bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
              <Check size={14} /> Use Photo
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={onCancel} className="h-9 rounded-[8px] text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={capture}
              disabled={phase !== 'live'}
              className="h-9 gap-1.5 rounded-[8px] text-xs bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
            >
              <Camera size={14} /> Capture
            </Button>
          </>
        )}
      </div>
    </>
  );
}
