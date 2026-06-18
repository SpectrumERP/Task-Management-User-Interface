import { BusinessCardData } from '../models/BusinessCardData';

export class BusinessCardParserService {
  public parse(rawText: string): BusinessCardData {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const data: BusinessCardData = {};

    const emailRegex = /([a-zA-Z0-9._,\-]+\s*(?:@|at)\s*[a-zA-Z0-9._,\-]+\s*\.\s*[a-zA-Z0-9_\-]+)/i;
    const phoneRegex = /(\+?[\d\s\-\(\).]{10,20})/;
    const websiteRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/i;

    const remainingLines: string[] = [];
    let emailDomain = '';

    for (const line of lines) {
      if (!data.email && emailRegex.test(line)) {
        const emailMatch = line.match(emailRegex)?.[1];
        if (emailMatch) {
          data.email = emailMatch.replace(/\s+/g, '').replace(/at/i, '@').replace(/,/g, '.');
          try {
            emailDomain = data.email.split('@')[1].split('.')[0].toLowerCase();
          } catch (e) {}
        }
        continue;
      }
      
      if (!data.phone && phoneRegex.test(line)) {
        const match = line.match(phoneRegex);
        if (match && match[0].replace(/[\s\-\(\).]/g, '').length >= 10) {
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

    if (emailDomain) {
      const companyLine = remainingLines.find(l => l.toLowerCase().replace(/\s/g, '').includes(emailDomain));
      if (companyLine) {
        data.company = companyLine;
      }
    }
    
    if (!data.company && remainingLines.length > 2) {
      // Fallback: try to find a short line that isn't the name/designation and isn't a long address
      const candidate = remainingLines.slice(2).find(l => l.length < 30);
      data.company = candidate || remainingLines[remainingLines.length - 1];
    }

    const usedLines = new Set([data.name, data.designation, data.company]);
    const unusedLines = remainingLines.filter(l => !usedLines.has(l));
    if (unusedLines.length > 0) {
      data.address = unusedLines.join(', ');
    }

    return data;
  }
}
