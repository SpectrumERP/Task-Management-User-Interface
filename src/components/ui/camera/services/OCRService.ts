import { createWorker, Worker, PSM } from 'tesseract.js';
import cv from '@techstark/opencv-js';

export class OCRService {
  private worker: Worker | null = null;

  public async init(onProgress?: (progress: number) => void) {
    if (this.worker) return;
    
    this.worker = await createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress);
        }
      }
    });
    
    // Set Page Segmentation Mode to Sparse Text (11 or 12)
    // PSM.SPARSE_TEXT_OSD (12) or PSM.SPARSE_TEXT (11)
    await this.worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    });
  }

  private async preprocessImage(imageBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(imageBlob);
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(url); // fallback to original
            return;
          }

          // Draw original image to canvas
          ctx.drawImage(img, 0, 0);
          
          // Read image from canvas into OpenCV Mat
          const src = cv.imread(canvas);
          const dst = new cv.Mat();
          
          // 1. Convert to Grayscale
          cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);
          
          // 2. Gaussian Blur to reduce high frequency noise
          const ksize = new cv.Size(3, 3);
          cv.GaussianBlur(dst, dst, ksize, 0, 0, cv.BORDER_DEFAULT);
          
          // 3. Median Blur to specifically remove salt-and-pepper noise
          cv.medianBlur(dst, dst, 3);
          
          // 4. Adaptive Thresholding: 
          // Increased block size to 21 and C to 10 to aggressively remove background noise and shadows
          cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 21, 10);
          
          // Draw processed Mat back to canvas
          cv.imshow(canvas, dst);
          
          // Clean up OpenCV memory
          src.delete();
          dst.delete();
          
          // Convert processed canvas back to blob
          canvas.toBlob(blob => {
            if (blob) {
              resolve(URL.createObjectURL(blob));
            } else {
              resolve(url);
            }
          }, 'image/jpeg', 1.0);
        } catch (err) {
          console.error("OpenCV Preprocessing Error:", err);
          resolve(url); // fallback to original if OpenCV fails
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image for preprocessing'));
      img.src = url;
    });
  }

  public async extractText(imageBlob: Blob): Promise<string> {
    if (!this.worker) {
      await this.init();
    }
    
    let url = '';
    try {
      url = await this.preprocessImage(imageBlob);
      const { data: { text } } = await this.worker!.recognize(url);
      URL.revokeObjectURL(url);
      return text;
    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  public async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

