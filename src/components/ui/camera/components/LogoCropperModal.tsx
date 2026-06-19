import { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LogoDetectorService } from '../services/LogoDetectorService';

interface LogoCropperModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onSave: (logoDataUrl: string) => void;
}

export function LogoCropperModal({ open, onOpenChange, imageUrl, onSave }: LogoCropperModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const detectorService = useRef(new LogoDetectorService());

  const detectAndSetCrop = () => {
    if (imgRef.current && imgRef.current.naturalWidth > 0) {
      const result = detectorService.current.detectLogo(
        imgRef.current,
        imgRef.current.naturalWidth,
        imgRef.current.naturalHeight
      );

      if (result.detected) {
        const scaleX = imgRef.current.width / imgRef.current.naturalWidth;
        const scaleY = imgRef.current.height / imgRef.current.naturalHeight;

        setCrop({
          unit: 'px',
          x: result.x * scaleX,
          y: result.y * scaleY,
          width: result.width * scaleX,
          height: result.height * scaleY,
        });
      } else {
         setCrop({
            unit: '%',
            x: 5,
            y: 5,
            width: 40,
            height: 30,
         });
      }
    }
  };

  useEffect(() => {
    if (open) {
      setTimeout(detectAndSetCrop, 100);
    }
  }, [open, imageUrl]);

  const handleSave = () => {
    if (!completedCrop || !imgRef.current) return;

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    
    // Check if valid crop
    if (completedCrop.width === 0 || completedCrop.height === 0) return;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const base64Image = canvas.toDataURL('image/jpeg', 0.9);
    onSave(base64Image);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Extract Logo</DialogTitle>
          <p className="text-sm text-slate-500">
            Adjust the box to outline the logo. Our system made an initial guess.
          </p>
        </DialogHeader>
        <div className="flex justify-center p-4 bg-slate-50 rounded-md">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            className="max-h-[50vh] shadow-sm rounded border"
          >
            <img 
              ref={imgRef} 
              src={imageUrl} 
              alt="Business Card" 
              className="max-h-[50vh] object-contain"
              crossOrigin="anonymous"
              onLoad={detectAndSetCrop}
            />
          </ReactCrop>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!completedCrop?.width || !completedCrop?.height}>Save Logo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
