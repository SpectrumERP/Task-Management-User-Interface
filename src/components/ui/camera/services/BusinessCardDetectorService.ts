import cv from '@techstark/opencv-js';
import { DetectionResult, Rectangle } from '../models/DetectionResult';

export class BusinessCardDetectorService {
  private processing = false;

  public detect(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): DetectionResult {
    if (this.processing) return { detected: false, confidence: 0 };
    if (!videoElement.videoWidth || !videoElement.videoHeight) return { detected: false, confidence: 0 };

    this.processing = true;
    let result: DetectionResult = { detected: false, confidence: 0 };

    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;
    canvasElement.width = width;
    canvasElement.height = height;

    const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      this.processing = false;
      return result;
    }

    ctx.drawImage(videoElement, 0, 0, width, height);
    
    let src = new cv.Mat(height, width, cv.CV_8UC4);
    src.data.set(ctx.getImageData(0, 0, width, height).data);
    
    let gray = new cv.Mat();
    let blurred = new cv.Mat();
    let edges = new cv.Mat();
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();

    try {
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
      cv.Canny(blurred, edges, 75, 200);

      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      let maxArea = 0;
      let bestRect: Rectangle | undefined;
      let bestCorners: any;

      const totalArea = width * height;
      const minArea = totalArea * 0.15; // 15% of frame
      const maxAllowedArea = totalArea * 0.95; // 95% of frame

      for (let i = 0; i < contours.size(); ++i) {
        let cnt = contours.get(i);
        let area = cv.contourArea(cnt);

        if (area > minArea && area < maxAllowedArea) {
          let peri = cv.arcLength(cnt, true);
          let approx = new cv.Mat();
          cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

          if (approx.rows === 4) {
            let rect = cv.boundingRect(approx);
            let aspectRatio = rect.width / rect.height;

            // Business cards usually have an aspect ratio between 1.4 and 1.9 (or inverse if vertical)
            const isValidRatio = (aspectRatio >= 1.4 && aspectRatio <= 1.9) || (aspectRatio >= 0.5 && aspectRatio <= 0.75);

            if (isValidRatio && area > maxArea) {
              maxArea = area;
              bestRect = rect;
              bestCorners = approx.clone(); // Need to clone because approx is deleted
            }
          }
          approx.delete();
        }
        cnt.delete();
      }

      if (bestRect && bestCorners) {
        result = {
          detected: true,
          confidence: maxArea / totalArea,
          rectangle: bestRect,
          corners: bestCorners
        };
      }

    } catch (e) {
      console.error('OpenCV processing error:', e);
    } finally {
      src.delete();
      gray.delete();
      blurred.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();
      this.processing = false;
    }

    return result;
  }
}
