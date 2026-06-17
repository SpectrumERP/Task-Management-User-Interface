import { useState, useCallback, useRef, useEffect } from 'react';
import { OCRService } from '../services/OCRService';

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const ocrServiceRef = useRef(new OCRService());

  const processImage = useCallback(async (imageBlob: Blob): Promise<string> => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      await ocrServiceRef.current.init((p) => setProgress(p));
      const text = await ocrServiceRef.current.extractText(imageBlob);
      return text;
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
