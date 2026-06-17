import React from 'react';
import { DetectionResult } from '../models/DetectionResult';
import { cn } from '@/lib/utils';

interface BusinessCardOverlayProps {
  detectionResult: DetectionResult;
  isStable: boolean;
  videoWidth: number;
  videoHeight: number;
  containerWidth: number;
  containerHeight: number;
}

export function BusinessCardOverlay({
  detectionResult,
  isStable,
  videoWidth,
  videoHeight,
  containerWidth,
  containerHeight
}: BusinessCardOverlayProps) {
  if (!detectionResult.detected || !detectionResult.rectangle || !videoWidth || !videoHeight) {
    return null;
  }

  // Calculate scaling factors to map video coordinates to container coordinates
  const scaleX = containerWidth / videoWidth;
  const scaleY = containerHeight / videoHeight;

  const rect = detectionResult.rectangle;

  const style = {
    left: `${rect.x * scaleX}px`,
    top: `${rect.y * scaleY}px`,
    width: `${rect.width * scaleX}px`,
    height: `${rect.height * scaleY}px`,
  };

  let borderColorClass = 'border-red-500';
  let message = 'No Card Found';

  if (detectionResult.detected) {
    if (isStable) {
      borderColorClass = 'border-green-500';
      message = 'Business Card Detected';
    } else {
      borderColorClass = 'border-yellow-500';
      message = 'Align Card Properly';
    }
  }

  return (
    <>
      <div
        className={cn('absolute border-4 transition-all duration-100 ease-in-out', borderColorClass)}
        style={style}
      />
      <div
        className={cn('absolute -top-8 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-sm font-semibold text-white shadow', 
          isStable ? 'bg-green-500' : 'bg-yellow-500')}
        style={{
          left: `${(rect.x + rect.width / 2) * scaleX}px`,
          top: `${rect.y * scaleY - 32}px`,
        }}
      >
        {message}
      </div>
    </>
  );
}
