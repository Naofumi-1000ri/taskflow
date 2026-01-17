import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/config';
import { AIConversation, AIMessage } from '@/types/ai';

const db = getFirebaseDb();

// Collection paths
const getConversationsCollection = (projectId: string) =>
  collection(db, 'projects', projectId, 'aiConversations');

const getMessagesCollection = (projectId: string, conversationId: string) =>
  collection(db, 'projects', projectId, 'aiConversations', conversationId, 'messages');

// Convert Firestore timestamp to Date
const toDate = (timestamp: Timestamp | null | undefined): Date =>
  timestamp?.toDate() || new Date();

/**
 * Create a new conversation
 */
export async function createConversation(
  projectId: string,
  userId: string,
  options?: {
    title?: string;
    contextType?: 'task' | 'project' | null;
    contextId?: string | null;
  }
): Promise<string> {
  const conversationsRef = getConversationsCollection(projectId);

  const docRef = await addDoc(conversationsRef, {
    title: options?.title || '新しい会話',
    contextType: options?.contextType || null,
    contextId: options?.contextId || null,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  projectId: string,
  conversationId: string,
  title: string
): Promise<void> {
  const docRef = doc(db, 'projects', projectId, 'aiConversations', conversationId);
  await updateDoc(docRef, {
    title,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(
  projectId: string,
  conversationId: string
): Promise<void> {
  // Delete all messages first
  const messagesRef = getMessagesCollection(projectId, conversationId);
  const messagesSnapshot = await getDocs(messagesRef);

  const deletePromises = messagesSnapshot.docs.map((doc) => deleteDoc(doc.ref));
  await Promise.all(deletePromises);

  // Delete the conversation
  const conversationRef = doc(db, 'projects', projectId, 'aiConversations', conversationId);
  await deleteDoc(conversationRef);
}

/**
 * Get all conversations for a project
 */
export async function getConversations(projectId: string): Promise<AIConversation[]> {
  const conversationsRef = getConversationsCollection(projectId);
  const q = query(conversationsRef, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    projectId,
    title: doc.data().title,
    contextType: doc.data().contextType,
    contextId: doc.data().contextId,
    createdBy: doc.data().createdBy,
    createdAt: toDate(doc.data().createdAt),
    updatedAt: toDate(doc.data().updatedAt),
  }));
}

/**
 * Subscribe to conversations for a project
 */
export function subscribeToConversations(
  projectId: string,
  callback: (conversations: AIConversation[]) => void
): () => void {
  const conversationsRef = getConversationsCollection(projectId);
  const q = query(conversationsRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map((doc) => ({
      id: doc.id,
      projectId,
      title: doc.data().title,
      contextType: doc.data().contextType,
      contextId: doc.data().contextId,
      createdBy: doc.data().createdBy,
      createdAt: toDate(doc.data().createdAt),
      updatedAt: toDate(doc.data().updatedAt),
    }));
    callback(conversations);
  });
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  projectId: string,
  conversationId: string,
  message: Omit<AIMessage, 'id' | 'createdAt'>
): Promise<string> {
  const messagesRef = getMessagesCollection(projectId, conversationId);

  const docRef = await addDoc(messagesRef, {
    role: message.role,
    content: message.content,
    createdAt: serverTimestamp(),
  });

  // Update conversation's updatedAt
  const conversationRef = doc(db, 'projects', projectId, 'aiConversations', conversationId);
  await updateDoc(conversationRef, {
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Get all messages for a conversation
 */
export async function getMessages(
  projectId: string,
  conversationId: string
): Promise<AIMessage[]> {
  const messagesRef = getMessagesCollection(projectId, conversationId);
  const q = query(messagesRef, orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    role: doc.data().role,
    content: doc.data().content,
    createdAt: toDate(doc.data().createdAt),
  }));
}

/**
 * Subscribe to messages for a conversation
 */
export function subscribeToMessages(
  projectId: string,
  conversationId: string,
  callback: (messages: AIMessage[]) => void
): () => void {
  const messagesRef = getMessagesCollection(projectId, conversationId);
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      role: doc.data().role as AIMessage['role'],
      content: doc.data().content,
      createdAt: toDate(doc.data().createdAt),
    }));
    callback(messages);
  });
}

/**
 * Generate a title from the first message
 */
export function generateTitleFromMessage(content: string): string {
  // Take first 30 characters and add ellipsis if truncated
  const maxLength = 30;
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength) + '...';
}
