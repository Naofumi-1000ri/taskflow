import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  addDocMock,
  collectionMock,
  serverTimestampMock,
  getFirebaseDbMock,
} = vi.hoisted(() => ({
  addDocMock: vi.fn(),
  collectionMock: vi.fn(),
  serverTimestampMock: vi.fn(() => 'SERVER_TIMESTAMP'),
  getFirebaseDbMock: vi.fn(() => 'DB'),
}));

vi.mock('firebase/firestore', () => ({
  collection: collectionMock,
  doc: vi.fn(),
  addDoc: addDocMock,
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: serverTimestampMock,
  writeBatch: vi.fn(),
  Timestamp: class Timestamp {},
  documentId: vi.fn(),
  limit: vi.fn(),
}));

vi.mock('./config', () => ({
  getFirebaseDb: getFirebaseDbMock,
}));

import { createComment } from './firestore';

describe('createComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collectionMock.mockReturnValue('COMMENTS_COLLECTION');
    addDocMock.mockResolvedValue({ id: 'comment-1' });
  });

  it('omits undefined optional fields from the Firestore payload', async () => {
    await expect(
      createComment('project-1', 'task-1', {
        content: 'Comment with image',
        authorId: 'user-1',
        mentions: [],
        attachments: [],
      })
    ).resolves.toBe('comment-1');

    expect(collectionMock).toHaveBeenCalledWith(
      'DB',
      'projects',
      'project-1',
      'tasks',
      'task-1',
      'comments'
    );
    expect(addDocMock).toHaveBeenCalledWith('COMMENTS_COLLECTION', {
      content: 'Comment with image',
      authorId: 'user-1',
      authorIcon: null,
      mentions: [],
      attachments: [],
      taskId: 'task-1',
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    });
  });

  it('preserves authorLabel when it is provided', async () => {
    await createComment('project-1', 'task-1', {
      content: 'Named comment',
      authorId: 'user-1',
      authorLabel: 'Naofumi',
      mentions: [],
      attachments: [],
    });

    expect(addDocMock).toHaveBeenCalledWith('COMMENTS_COLLECTION', {
      content: 'Named comment',
      authorId: 'user-1',
      authorLabel: 'Naofumi',
      authorIcon: null,
      mentions: [],
      attachments: [],
      taskId: 'task-1',
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    });
  });
});
