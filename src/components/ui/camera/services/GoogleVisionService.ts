import { apiService } from '@/services/apiService';
import { BusinessCardData } from '../models/BusinessCardData';

export class GoogleVisionService {
  public async extractText(imageBlob: Blob): Promise<string> {
    const base64Image = await this.blobToBase64(imageBlob);

    const payload = {
        "contents": [
          {
            "parts": [
              {
                "inline_data": {
                  "mime_type": "image/jpeg",
                  "data": base64Image
                }
              },
              {
                "text": "Extract all contact and address details from this business card. If the address mentions abbreviations or codes for country, state/province, or city (e.g., \"USA\" -> \"United States\", \"CA\" -> \"California\", \"TX\" -> \"Texas\"), expand them to their full official names in the corresponding fields."
              }
            ]
          }
        ],
        "generationConfig": {
          "response_mime_type": "application/json",
          "response_schema": {
            "type": "OBJECT",
            "properties": {
              "full_name": {
                "type": "STRING",
                "description": "Full name of the person"
              },
              "job_title": {
                "type": "STRING",
                "description": "Job title or designation"
              },
              "company_name": {
                "type": "STRING",
                "description": "Company or organization name"
              },
              "email": {
                "type": "STRING",
                "description": "Email address"
              },
              "phone_numbers": {
                "type": "ARRAY",
                "items": { "type": "STRING" },
                "description": "List of phone numbers"
              },
              "website": {
                "type": "STRING",
                "description": "Website URL"
              },
              "address": {
                "type": "STRING",
                "description": "Full raw physical address as printed"
              },
              "city": {
                "type": "STRING",
                "description": "Full name of the city (expand abbreviations if any)"
              },
              "state": {
                "type": "STRING",
                "description": "Full name of the state or province (e.g., expand CA to California, MH to Maharashtra)"
              },
              "country": {
                "type": "STRING",
                "description": "Full name of the country (e.g., expand US/USA to United States, IN to India, UK to United Kingdom)"
              },
              "postal_code": {
                "type": "STRING",
                "description": "ZIP or postal code"
              },
              "social_links": {
                "type": "ARRAY",
                "items": { "type": "STRING" },
                "description": "Social media profiles or links"
              }
            },
            "required": ["full_name"]
          },
          "temperature": 0.1
        }
    };

    try {
      const data = await apiService.post<any>('/api/utility/google-vision/images/annotate', payload);
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      return text ? text.trim() : '';
    } catch (error) {
      console.error('Backend Google Vision API Error:', error);
      throw error;
    }
  }

  public parseCardData(jsonText: string): BusinessCardData {
    try {
      const cleaned = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      const parsed = JSON.parse(cleaned);
      const phone = Array.isArray(parsed.phone_numbers) ? parsed.phone_numbers[0] : parsed.phone_numbers;

      return {
        name: parsed.full_name || '',
        designation: parsed.job_title || '',
        company: parsed.company_name || '',
        email: parsed.email || '',
        phone: phone || '',
        website: parsed.website || '',
        address: parsed.address || '',
        city: parsed.city || '',
        state: parsed.state || '',
        country: parsed.country || '',
      };
    } catch (error) {
      console.error('Failed to parse Google Vision card JSON:', error);
      return {};
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
