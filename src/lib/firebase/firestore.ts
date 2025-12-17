import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import type {
  Project,
  ProjectMember,
  List,
  Task,
  Label,
  Comment,
  Checklist,
  Attachment,
} from '@/types';

// Helper to convert Firestore timestamp to Date
function toDate(timestamp: Timestamp | null | undefined): Date {
  return timestamp?.toDate() || new Date();
}

// Helper to convert document to typed object
function convertDoc<T>(doc: DocumentData, id: string): T {
  const data = doc;
  return {
    ...data,
    id,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as T;
}

// ==================== Projects ====================

export async function createProject(
  data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<string> {
  const db = getFirebaseDb();
  const projectRef = await addDoc(collection(db, 'projects'), {
    ...data,
    ownerId: userId,
    memberIds: [userId],
    isArchived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Add owner as admin member
  await addDoc(collection(db, 'projects', projectRef.id, 'members'), {
    userId,
    role: 'admin',
    joinedAt: serverTimestamp(),
  });

  // Create default labels
  const defaultLabels = [
    { name: '高優先', color: '#ef4444' },
    { name: '中優先', color: '#f59e0b' },
    { name: '低優先', color: '#6b7280' },
    { name: 'バグ', color: '#dc2626' },
    { name: '機能', color: '#3b82f6' },
  ];

  const batch = writeBatch(db);
  defaultLabels.forEach((label) => {
    const labelRef = doc(collection(db, 'projects', projectRef.id, 'labels'));
    batch.set(labelRef, {
      ...label,
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();

  return projectRef.id;
}

export async function getProject(projectId: string): Promise<Project | null> {
  const db = getFirebaseDb();
  const projectDoc = await getDoc(doc(db, 'projects', projectId));

  if (!projectDoc.exists()) {
    return null;
  }

  return convertDoc<Project>(projectDoc.data(), projectDoc.id);
}

export async function updateProject(
  projectId: string,
  data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'projects', projectId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = getFirebaseDb();
  // Note: In production, use Cloud Functions to cascade delete subcollections
  await deleteDoc(doc(db, 'projects', projectId));
}

export async function archiveProject(
  projectId: string,
  isArchived: boolean
): Promise<void> {
  await updateProject(projectId, { isArchived });
}

export async function getUserProjects(userId: string): Promise<Project[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, 'projects'),
    where('memberIds', 'array-contains', userId),
    where('isArchived', '==', false),
    orderBy('updatedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => convertDoc<Project>(doc.data(), doc.id));
}

export function subscribeToUserProjects(
  userId: string,
  callback: (projects: Project[]) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, 'projects'),
    where('memberIds', 'array-contains', userId),
    where('isArchived', '==', false),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const projects = snapshot.docs.map((doc) =>
        convertDoc<Project>(doc.data(), doc.id)
      );
      callback(projects);
    },
    (error) => {
      console.error('[Firestore] subscribeToUserProjects error:', error);
      if (onError) {
        onError(error);
      }
    }
  );
}

// ==================== Project Members ====================

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: 'admin' | 'editor' | 'viewer'
): Promise<void> {
  const db = getFirebaseDb();

  // Add to members subcollection
  await addDoc(collection(db, 'projects', projectId, 'members'), {
    userId,
    role,
    joinedAt: serverTimestamp(),
  });

  // Update memberIds array
  const project = await getProject(projectId);
  if (project && !project.memberIds.includes(userId)) {
    await updateDoc(doc(db, 'projects', projectId), {
      memberIds: [...project.memberIds, userId],
      updatedAt: serverTimestamp(),
    });
  }
}

export async function updateMemberRole(
  projectId: string,
  memberId: string,
  role: 'admin' | 'editor' | 'viewer'
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'projects', projectId, 'members', memberId), {
    role,
  });
}

export async function removeProjectMember(
  projectId: string,
  memberId: string,
  userId: string
): Promise<void> {
  const db = getFirebaseDb();

  // Remove from members subcollection
  await deleteDoc(doc(db, 'projects', projectId, 'members', memberId));

  // Update memberIds array
  const project = await getProject(projectId);
  if (project) {
    await updateDoc(doc(db, 'projects', projectId), {
      memberIds: project.memberIds.filter((id) => id !== userId),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function getProjectMembers(
  projectId: string
): Promise<ProjectMember[]> {
  const db = getFirebaseDb();
  const snapshot = await getDocs(
    collection(db, 'projects', projectId, 'members')
  );

  return snapshot.docs.map((doc) => ({
    userId: doc.data().userId,
    role: doc.data().role,
    joinedAt: toDate(doc.data().joinedAt),
  })) as ProjectMember[];
}

// ==================== Lists ====================

export async function createList(
  projectId: string,
  data: Omit<List, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = getFirebaseDb();
  const listRef = await addDoc(collection(db, 'projects', projectId, 'lists'), {
    ...data,
    projectId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return listRef.id;
}

export async function updateList(
  projectId: string,
  listId: string,
  data: Partial<Omit<List, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'projects', projectId, 'lists', listId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteList(
  projectId: string,
  listId: string
): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, 'projects', projectId, 'lists', listId));
}

export async function getProjectLists(projectId: string): Promise<List[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, 'projects', projectId, 'lists'),
    orderBy('order', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => convertDoc<List>(doc.data(), doc.id));
}

export function subscribeToProjectLists(
  projectId: string,
  callback: (lists: List[]) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, 'projects', projectId, 'lists'),
    orderBy('order', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const lists = snapshot.docs.map((doc) =>
      convertDoc<List>(doc.data(), doc.id)
    );
    callback(lists);
  });
}

// ==================== Tasks ====================

export async function createTask(
  projectId: string,
  data: Omit<Task, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = getFirebaseDb();
  const taskRef = await addDoc(collection(db, 'projects', projectId, 'tasks'), {
    ...data,
    projectId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return taskRef.id;
}

export async function updateTask(
  projectId: string,
  taskId: string,
  data: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'projects', projectId, 'tasks', taskId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTask(
  projectId: string,
  taskId: string
): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, 'projects', projectId, 'tasks', taskId));
}

export async function getTask(
  projectId: string,
  taskId: string
): Promise<Task | null> {
  const db = getFirebaseDb();
  const taskDoc = await getDoc(
    doc(db, 'projects', projectId, 'tasks', taskId)
  );

  if (!taskDoc.exists()) {
    return null;
  }

  const data = taskDoc.data();
  return {
    ...convertDoc<Task>(data, taskDoc.id),
    startDate: data.startDate ? toDate(data.startDate) : null,
    dueDate: data.dueDate ? toDate(data.dueDate) : null,
  };
}

export async function getProjectTasks(projectId: string): Promise<Task[]> {
  const db = getFirebaseDb();
  const snapshot = await getDocs(
    collection(db, 'projects', projectId, 'tasks')
  );

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...convertDoc<Task>(data, doc.id),
      startDate: data.startDate ? toDate(data.startDate) : null,
      dueDate: data.dueDate ? toDate(data.dueDate) : null,
    };
  });
}

export function subscribeToProjectTasks(
  projectId: string,
  callback: (tasks: Task[]) => void
): () => void {
  const db = getFirebaseDb();

  return onSnapshot(
    collection(db, 'projects', projectId, 'tasks'),
    (snapshot) => {
      const tasks = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...convertDoc<Task>(data, doc.id),
          startDate: data.startDate ? toDate(data.startDate) : null,
          dueDate: data.dueDate ? toDate(data.dueDate) : null,
        };
      });
      callback(tasks);
    }
  );
}

// ==================== Labels ====================

export async function createLabel(
  projectId: string,
  data: Omit<Label, 'id' | 'projectId' | 'createdAt'>
): Promise<string> {
  const db = getFirebaseDb();
  const labelRef = await addDoc(
    collection(db, 'projects', projectId, 'labels'),
    {
      ...data,
      projectId,
      createdAt: serverTimestamp(),
    }
  );
  return labelRef.id;
}

export async function updateLabel(
  projectId: string,
  labelId: string,
  data: Partial<Omit<Label, 'id' | 'projectId' | 'createdAt'>>
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'projects', projectId, 'labels', labelId), data);
}

export async function deleteLabel(
  projectId: string,
  labelId: string
): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, 'projects', projectId, 'labels', labelId));
}

export async function getProjectLabels(projectId: string): Promise<Label[]> {
  const db = getFirebaseDb();
  const snapshot = await getDocs(
    collection(db, 'projects', projectId, 'labels')
  );

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    projectId,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
  })) as Label[];
}

export function subscribeToProjectLabels(
  projectId: string,
  callback: (labels: Label[]) => void
): () => void {
  const db = getFirebaseDb();

  return onSnapshot(
    collection(db, 'projects', projectId, 'labels'),
    (snapshot) => {
      const labels = snapshot.docs.map((doc) => ({
        id: doc.id,
        projectId,
        ...doc.data(),
        createdAt: toDate(doc.data().createdAt),
      })) as Label[];
      callback(labels);
    }
  );
}

// ==================== Comments ====================

export async function createComment(
  projectId: string,
  taskId: string,
  data: Omit<Comment, 'id' | 'taskId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = getFirebaseDb();
  const commentRef = await addDoc(
    collection(db, 'projects', projectId, 'tasks', taskId, 'comments'),
    {
      ...data,
      taskId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );
  return commentRef.id;
}

export async function getTaskComments(
  projectId: string,
  taskId: string
): Promise<Comment[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, 'projects', projectId, 'tasks', taskId, 'comments'),
    orderBy('createdAt', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => convertDoc<Comment>(doc.data(), doc.id));
}

export function subscribeToTaskComments(
  projectId: string,
  taskId: string,
  callback: (comments: Comment[]) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, 'projects', projectId, 'tasks', taskId, 'comments'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map((doc) =>
      convertDoc<Comment>(doc.data(), doc.id)
    );
    callback(comments);
  });
}

// ==================== Checklists ====================

export async function createChecklist(
  projectId: string,
  taskId: string,
  data: Omit<Checklist, 'id' | 'taskId' | 'createdAt'>
): Promise<string> {
  const db = getFirebaseDb();
  const checklistRef = await addDoc(
    collection(db, 'projects', projectId, 'tasks', taskId, 'checklists'),
    {
      ...data,
      taskId,
      createdAt: serverTimestamp(),
    }
  );
  return checklistRef.id;
}

export async function updateChecklist(
  projectId: string,
  taskId: string,
  checklistId: string,
  data: Partial<Omit<Checklist, 'id' | 'taskId' | 'createdAt'>>
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(
    doc(db, 'projects', projectId, 'tasks', taskId, 'checklists', checklistId),
    data
  );
}

export async function deleteChecklist(
  projectId: string,
  taskId: string,
  checklistId: string
): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(
    doc(db, 'projects', projectId, 'tasks', taskId, 'checklists', checklistId)
  );
}

export async function getTaskChecklists(
  projectId: string,
  taskId: string
): Promise<Checklist[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, 'projects', projectId, 'tasks', taskId, 'checklists'),
    orderBy('order', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    taskId,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
  })) as Checklist[];
}

// ==================== Attachments ====================

export async function createAttachment(
  projectId: string,
  taskId: string,
  data: Omit<Attachment, 'id' | 'taskId' | 'uploadedAt'>
): Promise<string> {
  const db = getFirebaseDb();
  const attachmentRef = await addDoc(
    collection(db, 'projects', projectId, 'tasks', taskId, 'attachments'),
    {
      ...data,
      taskId,
      uploadedAt: serverTimestamp(),
    }
  );
  return attachmentRef.id;
}

export async function deleteAttachment(
  projectId: string,
  taskId: string,
  attachmentId: string
): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(
    doc(db, 'projects', projectId, 'tasks', taskId, 'attachments', attachmentId)
  );
}

export async function getTaskAttachments(
  projectId: string,
  taskId: string
): Promise<Attachment[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, 'projects', projectId, 'tasks', taskId, 'attachments'),
    orderBy('uploadedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    taskId,
    ...doc.data(),
    uploadedAt: toDate(doc.data().uploadedAt),
  })) as Attachment[];
}

export function subscribeToTaskAttachments(
  projectId: string,
  taskId: string,
  callback: (attachments: Attachment[]) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, 'projects', projectId, 'tasks', taskId, 'attachments'),
    orderBy('uploadedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const attachments = snapshot.docs.map((doc) => ({
      id: doc.id,
      taskId,
      ...doc.data(),
      uploadedAt: toDate(doc.data().uploadedAt),
    })) as Attachment[];
    callback(attachments);
  });
}
