import { apiService } from '@/services/apiService';

export class GoogleVisionService {
  public async extractText(imageBlob: Blob): Promise<string> {
    const base64Image = await this.blobToBase64(imageBlob);

    const payload = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: 'DOCUMENT_TEXT_DETECTION',
            },
          ],
        },
      ],
    };

    try {
      const data = await apiService.post<any>('/api/utility/google-vision/images/annotate', payload);
      const annotations = data.responses?.[0]?.fullTextAnnotation;
      
      return annotations ? annotations.text : '';
    } catch (error) {
      console.error('Backend Google Vision API Error:', error);
      throw error;
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip the data:image/jpeg;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
