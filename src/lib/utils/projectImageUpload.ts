export const PROJECT_IMAGE_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
] as const;

export const PROJECT_IMAGE_UPLOAD_ACCEPT = PROJECT_IMAGE_UPLOAD_MIME_TYPES.join(',');

export const PROJECT_IMAGE_UPLOAD_FORMAT_LABEL = 'JPG, PNG, GIF, WebP, AVIF';

export function isSupportedProjectImageType(fileType: string): boolean {
  return PROJECT_IMAGE_UPLOAD_MIME_TYPES.includes(
    fileType as (typeof PROJECT_IMAGE_UPLOAD_MIME_TYPES)[number]
  );
}
