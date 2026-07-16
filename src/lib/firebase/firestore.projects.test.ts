import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteDoc: vi.fn(),
  doc: vi.fn(() => 'PROJECT_REF'),
  getDoc: vi.fn(),
  getFirebaseDb: vi.fn(() => 'DB'),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: mocks.doc,
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: mocks.deleteDoc,
  getDoc: mocks.getDoc,
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(),
  writeBatch: vi.fn(),
  Timestamp: class Timestamp {},
  documentId: vi.fn(),
  limit: vi.fn(),
}));

vi.mock('./config', () => ({
  getFirebaseDb: mocks.getFirebaseDb,
}));

import { deleteProject } from './firestore';

describe('deleteProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects deletion while the project is active', async () => {
    mocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ isArchived: false }),
    });

    await expect(deleteProject('project-1')).rejects.toThrow(
      'プロジェクトを削除するには先にアーカイブしてください'
    );
    expect(mocks.deleteDoc).not.toHaveBeenCalled();
  });

  it('deletes an archived project', async () => {
    mocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ isArchived: true }),
    });

    await deleteProject('project-1');

    expect(mocks.doc).toHaveBeenCalledWith('DB', 'projects', 'project-1');
    expect(mocks.deleteDoc).toHaveBeenCalledWith('PROJECT_REF');
  });
});
