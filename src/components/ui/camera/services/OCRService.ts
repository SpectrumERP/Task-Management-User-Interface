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

  public async extractText(imageBlob: Blob): Promise<string> {
    if (!this.worker) {
      await this.init();
    }
    
    try {
      const url = URL.createObjectURL(imageBlob);
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
