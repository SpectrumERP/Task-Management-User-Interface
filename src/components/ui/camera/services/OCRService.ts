import { createWorker, Worker } from 'tesseract.js';

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
  }

  private async preprocessImage(imageBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(imageBlob);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(url); // fallback to original
          return;
        }

        // Apply filters for better OCR
        ctx.filter = 'grayscale(100%) contrast(150%) brightness(110%)';
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(blob => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            resolve(url);
          }
        }, 'image/jpeg', 1.0);
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
