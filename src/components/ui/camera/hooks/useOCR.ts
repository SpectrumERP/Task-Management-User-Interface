import { useState, useCallback, useRef, useEffect } from 'react';
import { OCRService } from '../services/OCRService';
import { GoogleVisionService } from '../services/GoogleVisionService';

export interface OCRResult {
  tesseractText: string;
  googleText: string | null;
}

/** Off by default — no client Gemini/Google key required. Set VITE_USE_GEMINI_OCR=true to re-enable. */
const useGeminiOcr = import.meta.env.VITE_USE_GEMINI_OCR === 'true';

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const ocrServiceRef = useRef(new OCRService());
  const googleVisionRef = useRef(useGeminiOcr ? new GoogleVisionService() : null);

  const processImage = useCallback(async (imageBlob: Blob): Promise<OCRResult> => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const result: OCRResult = { tesseractText: '', googleText: null };

      // Optional Gemini path (disabled unless VITE_USE_GEMINI_OCR=true)
      if (useGeminiOcr && googleVisionRef.current) {
        try {
          setProgress(0.2);
          const text = await googleVisionRef.current.extractText(imageBlob);
          if (text && text.trim()) {
            result.googleText = text;
            return result;
          }
        } catch (err) {
          console.warn('Gemini OCR failed, using local Tesseract:', err);
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
