import { describe, expect, it } from 'vitest';
import {
  createCommentAttachmentUploadDescriptor,
  createUniqueStorageObjectName,
} from './storageKeys';

describe('storageKeys', () => {
  it('creates unique storage object names even when timestamps are equal', () => {
    const first = createUniqueStorageObjectName('image.png', {
      now: () => 1700000000000,
      createId: () => 'uuid-a',
    });
    const second = createUniqueStorageObjectName('image.png', {
      now: () => 1700000000000,
      createId: () => 'uuid-b',
    });

    expect(first).toBe('1700000000000_uuid-a_image.png');
    expect(second).toBe('1700000000000_uuid-b_image.png');
    expect(first).not.toBe(second);
  });

  it('uses the same generated id for attachment metadata and storage path', () => {
    const descriptor = createCommentAttachmentUploadDescriptor('photo.jpg', {
      now: () => 1700000000000,
      createId: () => 'comment-uuid',
    });

    expect(descriptor).toEqual({
      attachmentId: 'comment-uuid',
      storageFileName: '1700000000000_comment-uuid_photo.jpg',
    });
  });
});
