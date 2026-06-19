import cv from '@techstark/opencv-js';

export interface LogoDetectionResult {
  x: number;
  y: number;
  width: number;
  height: number;
  detected: boolean;
}

export class LogoDetectorService {
  public detectLogo(imageElement: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement, imageWidth: number, imageHeight: number): LogoDetectionResult {
    let result: LogoDetectionResult = { x: 0, y: 0, width: 0, height: 0, detected: false };
    
    if (!imageWidth || !imageHeight) return result;

    let canvas = document.createElement('canvas');
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    let ctx = canvas.getContext('2d');
    if (!ctx) return result;
    
    ctx.drawImage(imageElement, 0, 0, imageWidth, imageHeight);
    
    let src = new cv.Mat(imageHeight, imageWidth, cv.CV_8UC4);
    src.data.set(ctx.getImageData(0, 0, imageWidth, imageHeight).data);
    
    let gray = new cv.Mat();
    let blurred = new cv.Mat();
    let edges = new cv.Mat();
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();

    try {
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
      cv.Canny(blurred, edges, 50, 150);

      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      let bestScore = -1;
      let bestRect = null;

      for (let i = 0; i < contours.size(); ++i) {
        let cnt = contours.get(i);
        let rect = cv.boundingRect(cnt);
        let area = rect.width * rect.height;
        let aspectRatio = rect.width / rect.height;

        // Ignore very small or very large contours
        if (area < (imageWidth * imageHeight * 0.01) || area > (imageWidth * imageHeight * 0.3)) {
          cnt.delete();
          continue;
        }

        // Ignore contours that look like text lines (very wide and short)
        if (aspectRatio > 4 || aspectRatio < 0.2) {
          cnt.delete();
          continue;
        }

        // Score based on area and position (favor top-left/top-center)
        let centerY = rect.y + rect.height / 2;
        let positionPenalty = (centerY / imageHeight); // 0 at top, 1 at bottom

        let score = area - (area * positionPenalty);
        
        if (score > bestScore) {
          bestScore = score;
          bestRect = rect;
        }
        cnt.delete();
      }

      if (bestRect) {
        // Expand the rect slightly to ensure full logo is captured
        const padding = Math.max(bestRect.width, bestRect.height) * 0.1;
        result = {
          x: Math.max(0, bestRect.x - padding),
          y: Math.max(0, bestRect.y - padding),
          width: Math.min(imageWidth - bestRect.x, bestRect.width + padding * 2),
          height: Math.min(imageHeight - bestRect.y, bestRect.height + padding * 2),
          detected: true
        };
      }
    } catch (e) {
      console.error('Logo detection error:', e);
    } finally {
      src.delete();
      gray.delete();
      blurred.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();
    }

    return result;
  }
}
