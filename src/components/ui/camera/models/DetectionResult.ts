export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectionResult {
  detected: boolean;
  confidence: number;
  rectangle?: Rectangle;
  corners?: any; // To store cv.Mat points for perspective correction
}
