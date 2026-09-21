import cv from '@techstark/opencv-js';
import { DetectionResult, Rectangle } from '../models/DetectionResult';

export class BusinessCardDetectorService {
  private processing = false;

  public detect(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): DetectionResult {
    if (this.processing) return { detected: false, confidence: 0 };
    if (!videoElement.videoWidth || !videoElement.videoHeight) return { detected: false, confidence: 0 };

    this.processing = true;
    let result: DetectionResult = { detected: false, confidence: 0 };

    const MAX_WIDTH = 400;
    const scale = videoElement.videoWidth > MAX_WIDTH ? MAX_WIDTH / videoElement.videoWidth : 1.0;
    const processWidth = Math.floor(videoElement.videoWidth * scale);
    const processHeight = Math.floor(videoElement.videoHeight * scale);
    
    canvasElement.width = processWidth;
    canvasElement.height = processHeight;

    const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      this.processing = false;
      return result;
    }

    ctx.drawImage(videoElement, 0, 0, processWidth, processHeight);
    
    let src = new cv.Mat(processHeight, processWidth, cv.CV_8UC4);
    src.data.set(ctx.getImageData(0, 0, processWidth, processHeight).data);
    
    let gray = new cv.Mat();
    let blurred = new cv.Mat();
    let edges = new cv.Mat();
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();

    try {
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
      cv.Canny(blurred, edges, 75, 200);

      // Connect nearby edges (text and card borders) to form a solid block
      let kernel = cv.Mat.ones(15, 15, cv.CV_8U);
      cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, kernel);

      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      kernel.delete();

      let maxArea = 0;
      let bestRect: Rectangle | undefined;

      const totalArea = processWidth * processHeight;
      const minArea = totalArea * 0.15; // 15% of frame
      const maxAllowedArea = totalArea * 0.95; // 95% of frame

      for (let i = 0; i < contours.size(); ++i) {
        let cnt = contours.get(i);
        let rect = cv.boundingRect(cnt);
        let area = rect.width * rect.height; // Use bounding box area instead of contour area!

        if (area > minArea && area < maxAllowedArea) {
          let aspectRatio = rect.width / rect.height;

          // Business cards usually have an aspect ratio between 1.4 and 1.9 (or inverse if vertical)
          const isValidRatio = (aspectRatio >= 1.4 && aspectRatio <= 1.9) || (aspectRatio >= 0.5 && aspectRatio <= 0.75);

          if (isValidRatio && area > maxArea) {
            maxArea = area;
            bestRect = rect;
          }
        }
        cnt.delete();
      }

      if (bestRect) {
        result = {
          detected: true,
          confidence: maxArea / totalArea,
          rectangle: {
            x: bestRect.x / scale,
            y: bestRect.y / scale,
            width: bestRect.width / scale,
            height: bestRect.height / scale
          }
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
