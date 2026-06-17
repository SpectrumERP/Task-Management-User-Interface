export class LogoDetectionService {
  public detect(imageBlob: Blob): Promise<Blob | null> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(imageBlob);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        
        const canvas = document.createElement('canvas');
        // Heuristic: Logo is often in the top left 30% x 30% or top center. Let's capture the top 35% height and 40% width.
        const logoWidth = img.width * 0.4;
        const logoHeight = img.height * 0.35;
        
        canvas.width = logoWidth;
        canvas.height = logoHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(
          img,
          0, 0, logoWidth, logoHeight,
          0, 0, logoWidth, logoHeight
        );

        canvas.toBlob(blob => {
          resolve(blob);
        }, 'image/png');
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      
      img.src = url;
    });
  }
}
