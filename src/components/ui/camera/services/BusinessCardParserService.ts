import { BusinessCardData } from '../models/BusinessCardData';

export class BusinessCardParserService {
  public parse(rawText: string): BusinessCardData {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const data: BusinessCardData = {};

    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i;
    const phoneRegex = /(?:(?:\+?([1-9]|[0-9][0-9]|[0-9][0-9][0-9])\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([0-9][1-9]|[0-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?/i;
    const websiteRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/i;

    const remainingLines: string[] = [];

    for (const line of lines) {
      if (!data.email && emailRegex.test(line)) {
        data.email = line.match(emailRegex)?.[1];
        continue;
      }
      
      if (!data.phone && phoneRegex.test(line)) {
        const match = line.match(phoneRegex);
        if (match && match[0].length >= 10) {
          data.phone = match[0].trim();
          continue;
        }
      }

      if (!data.website && websiteRegex.test(line) && !line.includes('@')) {
        data.website = line.match(websiteRegex)?.[0];
        continue;
      }

      remainingLines.push(line);
    }

    if (remainingLines.length > 0) {
      data.name = remainingLines[0]; // Heuristic: first non-matched line is often name
    }
    
    if (remainingLines.length > 1) {
      data.designation = remainingLines[1]; // Heuristic: second line is designation
    }

    if (remainingLines.length > 2) {
      data.company = remainingLines[remainingLines.length - 1]; // Heuristic: last line or nearby might be company
    }

    return data;
  }
}
