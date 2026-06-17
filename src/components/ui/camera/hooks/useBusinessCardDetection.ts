import { useEffect, useRef, useState, useCallback } from 'react';
import cv from '@techstark/opencv-js';
import { BusinessCardDetectorService } from '../services/BusinessCardDetectorService';
import { CardStabilityService } from '../services/CardStabilityService';
import { DetectionResult } from '../models/DetectionResult';

export function useBusinessCardDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  isActive: boolean,
  onStableDetected: (result: DetectionResult) => void
) {
  const [isCvReady, setIsCvReady] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult>({ detected: false, confidence: 0 });
  const [isStable, setIsStable] = useState(false);
  
  const detectorRef = useRef(new BusinessCardDetectorService());
  const stabilityRef = useRef(new CardStabilityService());
  const animationFrameRef = useRef<number | null>(null);
  const lastProcessTimeRef = useRef<number>(0);
  
  const FPS = 10;
  const FRAME_INTERVAL = 1000 / FPS;

  useEffect(() => {
    // Check if OpenCV is loaded
    const checkCv = setInterval(() => {
      if (typeof cv !== 'undefined' && cv.Mat) {
        setIsCvReady(true);
        clearInterval(checkCv);
      }
    }, 100);

    return () => clearInterval(checkCv);
  }, []);

  const detectFrame = useCallback(() => {
    if (!isActive || !videoRef.current || !canvasRef.current || !isCvReady) {
      animationFrameRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    const now = performance.now();
    if (now - lastProcessTimeRef.current >= FRAME_INTERVAL) {
      lastProcessTimeRef.current = now;

      const result = detectorRef.current.detect(videoRef.current, canvasRef.current);
      setDetectionResult(result);

      if (result.detected) {
        const stable = stabilityRef.current.checkStability(result.rectangle);
        setIsStable(stable);

        if (stable) {
          onStableDetected(result);
        }
      } else {
        setIsStable(false);
        stabilityRef.current.reset();
      }
    }

    animationFrameRef.current = requestAnimationFrame(detectFrame);
  }, [isActive, videoRef, canvasRef, isCvReady, onStableDetected, FRAME_INTERVAL]);

  useEffect(() => {
    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(detectFrame);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      stabilityRef.current.reset();
      setDetectionResult({ detected: false, confidence: 0 });
      setIsStable(false);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, detectFrame]);

  return { isCvReady, detectionResult, isStable };
}
