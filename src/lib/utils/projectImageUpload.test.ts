import { describe, expect, it } from 'vitest';
import {
  PROJECT_IMAGE_UPLOAD_ACCEPT,
  PROJECT_IMAGE_UPLOAD_FORMAT_LABEL,
  PROJECT_IMAGE_UPLOAD_MIME_TYPES,
  isSupportedProjectImageType,
} from './projectImageUpload';

describe('projectImageUpload', () => {
  it('includes avif in the supported MIME types and accept string', () => {
    expect(PROJECT_IMAGE_UPLOAD_MIME_TYPES).toContain('image/avif');
    expect(PROJECT_IMAGE_UPLOAD_ACCEPT).toContain('image/avif');
    expect(PROJECT_IMAGE_UPLOAD_FORMAT_LABEL).toContain('AVIF');
  });

  it('recognizes supported and unsupported project image types', () => {
    expect(isSupportedProjectImageType('image/avif')).toBe(true);
    expect(isSupportedProjectImageType('image/svg+xml')).toBe(false);
  });
});
