import { useState, useCallback, useRef, useEffect } from 'react';
import { OCRService } from '../services/OCRService';
import { GoogleVisionService } from '../services/GoogleVisionService';

export interface OCRResult {
  tesseractText: string;
  googleText: string | null;
}

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const ocrServiceRef = useRef(new OCRService());
  const googleVisionRef = useRef(new GoogleVisionService());

  const processImage = useCallback(async (imageBlob: Blob): Promise<OCRResult> => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const result: OCRResult = { tesseractText: '', googleText: null };

      // Always try Google Vision path first
      try {
        setProgress(0.2);
        const text = await googleVisionRef.current.extractText(imageBlob);
        if (text && text.trim()) {
          result.googleText = text;
          return result;
        }
      } catch (err: any) {
        console.warn('Google Vision OCR failed:', err);
        // If the API explicitly returns an error (like model overloaded), throw it to the UI
        if (err instanceof Error || err?.message) {
          throw err;
        }
      }

      // Local OCR — no external API / client key
      setProgress(0.15);
      await ocrServiceRef.current.init((p) => setProgress(0.15 + p * 0.8));

      result.tesseractText = await ocrServiceRef.current.extractText(imageBlob);
      return result;
    } finally {
      setIsProcessing(false);
      setProgress(1);
    }
  }, []);

  useEffect(() => {
    return () => {
      ocrServiceRef.current.terminate();
    };
  }, []);

  return { processImage, isProcessing, progress };
}
