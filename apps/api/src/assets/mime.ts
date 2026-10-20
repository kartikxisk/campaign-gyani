/** Image mimetypes safe to serve inline (SVG excluded — it can carry script). */
export const SAFE_IMAGE_MIMES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

/** Extensions for common attachment mimetypes; falls back to '.bin'. */
export const ATTACHMENT_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/zip': '.zip',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/octet-stream': '.bin',
};

export function isSafeImage(mimetype: string): boolean {
  return mimetype in SAFE_IMAGE_MIMES;
}

export function extForUpload(kind: string, mimetype: string): string | null {
  if (kind === 'logo' || kind === 'image') {
    return SAFE_IMAGE_MIMES[mimetype] ?? null;
  }
  // attachment: derive a known extension, default to .bin for anything else
  return ATTACHMENT_EXT[mimetype] ?? '.bin';
}
