import cv from '@techstark/opencv-js';
import { Rectangle } from '../models/DetectionResult';

export class CardCropperService {
  public crop(videoElement: HTMLVideoElement, rect?: Rectangle, cornersMat?: any): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!videoElement.videoWidth || !videoElement.videoHeight) {
        resolve(null);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      if (rect) {
        try {
          const croppedCanvas = document.createElement('canvas');
          croppedCanvas.width = rect.width;
          croppedCanvas.height = rect.height;
          const croppedCtx = croppedCanvas.getContext('2d');
          
          if (croppedCtx) {
            croppedCtx.drawImage(
              canvas,
              rect.x,
              rect.y,
              rect.width,
              rect.height,
              0,
              0,
              rect.width,
              rect.height
            );
            
            croppedCanvas.toBlob(blob => {
              resolve(blob);
            }, 'image/jpeg', 0.95);
            return;
          }
        } catch (e) {
          console.error('Crop failed, falling back to full image', e);
        }
      }

      // Fallback
      canvas.toBlob(blob => {
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  }
}
