import { BusinessCardData } from '../models/BusinessCardData';

export class BusinessCardParserService {
  public parse(rawText: string): BusinessCardData {
    console.log("rawData--------->", rawText);
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 1 && /[A-Za-z]/.test(l));
    const data: BusinessCardData = {};

    const emailRegex = /([a-zA-Z0-9._,\-]+\s*(?:@|at|\[at\])\s*[a-zA-Z0-9._,\-]+\s*\.\s*[a-zA-Z0-9_\-]+)/i;
    const phoneRegex = /(?:\+?\d[\d\s\-\(\).]{7,20})/;
    const websiteRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/i;

    const remainingLines: string[] = [];
    let emailDomain = '';

    const cleanGarbage = (str: string) => str.replace(/[|()[\]{}_\-\\]/g, ' ').replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').replace(/\s+/g, ' ').trim();
    const isGarbageLabel = (str: string) => /^(email|e-mail|tel|telephone|phone|mobile|mob|cell|website|web|url)$/i.test(str.replace(/[^a-zA-Z]/g, ''));

    for (let line of lines) {
      if (line.replace(/[^A-Za-z]/g, '').length < 2) continue;

      const atCount = (line.match(/@/g) || []).length;
      if (atCount > 1) {
        line = line.replace(/@/g, (_match, offset, str) => offset === str.lastIndexOf('@') ? '@' : 'a');
      }

      if (!data.email && emailRegex.test(line)) {
        const emailMatch = line.match(emailRegex)?.[1];
        if (emailMatch) {
          let parsedEmail = emailMatch.replace(/\b(?:at)\b|\[at\]/gi, '@').replace(/\s+/g, '').replace(/,/g, '.');
          parsedEmail = parsedEmail.replace(/@/g, (_match, offset, str) => offset === str.indexOf('@') ? '@' : 'a');
          data.email = parsedEmail;
          try {
            emailDomain = data.email.split('@')[1].split('.')[0].toLowerCase();
          } catch (e) { }
          line = line.replace(emailRegex, '');
        }
      }

      if (!data.phone && phoneRegex.test(line)) {
        const match = line.match(phoneRegex);
        if (match && match[0].replace(/[\s\-\(\).]/g, '').length >= 8) {
          data.phone = cleanGarbage(match[0]);
          line = line.replace(phoneRegex, '');
        }
      }

      if (!data.website && websiteRegex.test(line) && !line.includes('@')) {
        const wMatch = line.match(websiteRegex)?.[0];
        if (wMatch && (!data.email || !data.email.includes(wMatch))) {
          data.website = cleanGarbage(wMatch);
          line = line.replace(websiteRegex, '');
        }
      }

      line = cleanGarbage(line);

      // Keep line if it has content, isn't just a label, and contains at least one real word
      if (line.replace(/[^A-Za-z0-9]/g, '').length > 2 && !isGarbageLabel(line)) {
        // Check if there is at least one word with 3+ letters to filter out pure noise like "A a. “ a"
        const hasRealWord = line.split(/\s+/).some(w => w.replace(/[^a-zA-Z]/g, '').length >= 3);
        if (hasRealWord || /\d{3,}/.test(line)) { // keep if has long number (like a zip code or part of address)
          remainingLines.push(line);
        }
      }
    }

    // Attempt to identify name (usually 2-4 words, no numbers)
    let nameIndex = -1;
    for (let i = 0; i < remainingLines.length; i++) {
      const cleanLine = cleanGarbage(remainingLines[i]);
      if (!cleanLine) continue;
      // Skip obvious address/company lines for name
      if (/road|street|st|avenue|ave|floor|fl|room|rm|building|bldg|park|center|inc|ltd|limited|corp|corporation|company|co\.|pvt|private|services|solutions|technologies|tech|motors|bank|group/i.test(cleanLine)) continue;
      if (/\d/.test(cleanLine)) continue; // Names rarely have numbers

      if (cleanLine.split(/\s+/).length >= 2 && cleanLine.split(/\s+/).length <= 4) {
        data.name = cleanLine;
        nameIndex = i;
        break;
      }
    }

    if (nameIndex !== -1) {
      remainingLines.splice(nameIndex, 1);
    }

    // Attempt to identify designation (Manager, Director, Engineer, etc.)
    const designationKeywords = /manager|director|engineer|developer|officer|president|ceo|cto|coo|cfo|executive|head|lead|supervisor|consultant|associate/i;
    let desigIndex = -1;
    for (let i = 0; i < remainingLines.length; i++) {
      if (designationKeywords.test(remainingLines[i])) {
        data.designation = cleanGarbage(remainingLines[i]);
        desigIndex = i;
        break;
      }
    }
    if (desigIndex !== -1) {
      remainingLines.splice(desigIndex, 1);
    }

    if (emailDomain) {
      const companyIndex = remainingLines.findIndex(l => l.toLowerCase().replace(/\s/g, '').includes(emailDomain));
      if (companyIndex !== -1) {
        data.company = remainingLines[companyIndex].replace(/[|()[\]{}_\-\\]/g, '').trim();
        remainingLines.splice(companyIndex, 1);
      }
    }

    if (!data.company && remainingLines.length > 0) {
      // Fallback: try to find a short line that isn't the name/designation and isn't a long address
      const candidateIndex = remainingLines.findIndex(l => l.length < 30 && !/road|street|st|avenue|ave|floor|fl|room|rm|building|bldg/i.test(l));
      if (candidateIndex !== -1) {
        data.company = remainingLines[candidateIndex].replace(/[|()[\]{}_\-\\]/g, '').trim();
        remainingLines.splice(candidateIndex, 1);
      }
    }

    if (remainingLines.length > 0) {
      data.address = remainingLines.map(l => l.replace(/[|()[\]{}_\-\\]/g, '').trim()).join(', ');
    }

    return data;
  }
}
