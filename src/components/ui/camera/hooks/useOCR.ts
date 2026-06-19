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

      // Try Google Vision API First
      try {
        setProgress(0.20);
        const text = await googleVisionRef.current.extractText(imageBlob);
        if (text && text.trim()) {
          result.googleText = text;
          return result; // Fast path: Google Vision succeeded!
        }
      } catch (err) {
        console.error("Google Vision Error, falling back to Tesseract:", err);
      }

      // Fallback to Tesseract if Google Vision failed or returned empty
      setProgress(0.40);
      await ocrServiceRef.current.init((p) => setProgress(0.40 + p * 0.50)); 
      
      const tesseractText = await ocrServiceRef.current.extractText(imageBlob);
      result.tesseractText = tesseractText;

      return result;
    } finally {
      setIsProcessing(false);
      setProgress(1); // complete
    }
  }, []);

  useEffect(() => {
    return () => {
      ocrServiceRef.current.terminate();
    };
  }, []);

  return { processImage, isProcessing, progress };
}
