import { Rectangle } from '../models/DetectionResult';

export class CardStabilityService {
  private lastRect: Rectangle | null = null;
  private stableSince: number | null = null;
  private readonly STABILITY_THRESHOLD_MS = 1000;
  private readonly POSITION_TOLERANCE = 20; // pixels
  private readonly SIZE_TOLERANCE = 20; // pixels

  public checkStability(rect: Rectangle | undefined): boolean {
    if (!rect) {
      this.reset();
      return false;
    }

    const now = performance.now();

    if (!this.lastRect) {
      this.lastRect = rect;
      this.stableSince = now;
      return false;
    }

    const isStable = this.isWithinTolerance(this.lastRect, rect);

    if (isStable) {
      if (this.stableSince && (now - this.stableSince >= this.STABILITY_THRESHOLD_MS)) {
        return true;
      }
    } else {
      this.lastRect = rect;
      this.stableSince = now;
    }

    return false;
  }

  public reset() {
    this.lastRect = null;
    this.stableSince = null;
  }

  private isWithinTolerance(r1: Rectangle, r2: Rectangle): boolean {
    return (
      Math.abs(r1.x - r2.x) < this.POSITION_TOLERANCE &&
      Math.abs(r1.y - r2.y) < this.POSITION_TOLERANCE &&
      Math.abs(r1.width - r2.width) < this.SIZE_TOLERANCE &&
      Math.abs(r1.height - r2.height) < this.SIZE_TOLERANCE
    );
  }
}
