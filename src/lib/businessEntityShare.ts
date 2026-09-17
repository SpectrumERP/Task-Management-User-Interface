import { toast } from 'sonner';
import { attachmentService } from '@/services/attachmentService';

export type ShareContactInfo = {
  companyName?: string;
  companyCode?: string;
  name?: string;
  designation?: string;
  department?: string;
  phone?: string;
  email?: string;
};

function clean(value?: string | null): string {
  const v = String(value ?? '').trim();
  if (!v || v === 'N/A' || v === '-' || v === '—') return '';
  return v;
}

function digitsOnlyPhone(phone?: string): string {
  const raw = clean(phone).replace(/[^\d+]/g, '');
  if (!raw) return '';
  // wa.me wants country code without +
  return raw.replace(/^\+/, '');
}

export function formatContactShareText(info: ShareContactInfo): string {
  const lines: string[] = ['Business Entity Contact'];
  const company = clean(info.companyName);
  const code = clean(info.companyCode);
  if (company) lines.push(`Company: ${company}${code ? ` (${code})` : ''}`);
  const name = clean(info.name);
  if (name) lines.push(`Name: ${name}`);
  const designation = clean(info.designation);
  if (designation) lines.push(`Designation: ${designation}`);
  const department = clean(info.department);
  if (department) lines.push(`Department: ${department}`);
  const phone = clean(info.phone);
  if (phone) lines.push(`Phone: ${phone}`);
  const email = clean(info.email);
  if (email) lines.push(`Email: ${email}`);
  return lines.join('\n');
}

export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function shareContactViaWhatsApp(info: ShareContactInfo): Promise<void> {
  const text = formatContactShareText(info);
  if (text.trim() === 'Business Entity Contact') {
    toast.message('Nothing to share', { description: 'Add contact details first.' });
    return;
  }
  const phone = digitsOnlyPhone(info.phone);
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function shareContactViaEmail(info: ShareContactInfo): Promise<void> {
  const text = formatContactShareText(info);
  if (text.trim() === 'Business Entity Contact') {
    toast.message('Nothing to share', { description: 'Add contact details first.' });
    return;
  }
  const name = clean(info.name) || 'Contact';
  const company = clean(info.companyName);
  const subject = company ? `${name} — ${company}` : name;
  const to = clean(info.email);
  const qs = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  window.location.href = to ? `mailto:${to}?${qs}` : `mailto:?${qs}`;
}

export async function shareContactNative(info: ShareContactInfo): Promise<void> {
  const text = formatContactShareText(info);
  if (!canNativeShare()) {
    await shareContactViaWhatsApp(info);
    return;
  }
  try {
    await navigator.share({
      title: clean(info.name) || 'Business Entity Contact',
      text,
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return;
    console.error(err);
    toast.error('Share failed', { description: 'Could not open the system share sheet.' });
  }
}

function isImageFileName(fileName: string): boolean {
  const n = fileName.toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].some((ext) => n.endsWith(ext));
}

export async function shareAttachmentViaWhatsApp(opts: {
  id: number;
  fileName: string;
  companyName?: string;
}): Promise<void> {
  const fileName = clean(opts.fileName) || 'attachment';
  const company = clean(opts.companyName);
  const caption = [
    company ? `Business Entity: ${company}` : 'Business Entity attachment',
    `File: ${fileName}`,
  ].join('\n');

  try {
    const file = await attachmentService.getAttachmentFile(opts.id, fileName);
    if (canNativeShare() && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: fileName,
        text: caption,
        files: [file],
      });
      return;
    }

    // Desktop fallback: download image/file, then open WhatsApp with caption
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);

    window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, '_blank', 'noopener,noreferrer');
    toast.message('File downloaded', {
      description: isImageFileName(fileName)
        ? 'Attach the downloaded image in WhatsApp.'
        : 'Attach the downloaded file in WhatsApp.',
    });
  } catch (err) {
    console.error(err);
    toast.error('Share failed', { description: 'Could not prepare the attachment for WhatsApp.' });
  }
}

export async function shareAttachmentViaEmail(opts: {
  id: number;
  fileName: string;
  companyName?: string;
}): Promise<void> {
  const fileName = clean(opts.fileName) || 'attachment';
  const company = clean(opts.companyName);
  const subject = company ? `${company} — ${fileName}` : fileName;
  const body = [
    company ? `Business Entity: ${company}` : null,
    `Attachment: ${fileName}`,
    '',
    'The file has been downloaded to your device — please attach it to this email.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const file = await attachmentService.getAttachmentFile(opts.id, fileName);
    if (canNativeShare() && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: subject,
        text: body,
        files: [file],
      });
      return;
    }

    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast.message('File downloaded', {
      description: 'Attach the downloaded file to your email.',
    });
  } catch (err) {
    console.error(err);
    toast.error('Share failed', { description: 'Could not prepare the attachment for email.' });
  }
}
