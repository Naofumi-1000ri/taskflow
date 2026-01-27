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
import { AIConversation, AIMessage, AIScope } from '@/types/ai';

const db = getFirebaseDb();

// Collection paths - Project scope
const getConversationsCollection = (projectId: string) =>
  collection(db, 'projects', projectId, 'aiConversations');

const getMessagesCollection = (projectId: string, conversationId: string) =>
  collection(db, 'projects', projectId, 'aiConversations', conversationId, 'messages');

// Collection paths - Personal scope
const getPersonalConversationsCollection = (userId: string) =>
  collection(db, 'users', userId, 'personalConversations');

const getPersonalMessagesCollection = (userId: string, conversationId: string) =>
  collection(db, 'users', userId, 'personalConversations', conversationId, 'messages');

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
    scope: 'project' as AIScope,
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
    scope: (doc.data().scope || 'project') as AIScope,
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
      scope: (doc.data().scope || 'project') as AIScope,
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

  // Build message data including optional tool-related fields
  const messageData: Record<string, unknown> = {
    role: message.role,
    content: message.content,
    createdAt: serverTimestamp(),
  };

  // Include tool calls for assistant messages
  if (message.toolCalls && message.toolCalls.length > 0) {
    messageData.toolCalls = message.toolCalls;
  }

  // Include tool-related fields for tool messages
  if (message.toolCallId) {
    messageData.toolCallId = message.toolCallId;
  }
  if (message.toolName) {
    messageData.toolName = message.toolName;
  }
  // Gemini 3: Include thought signature for function responses
  if (message.thoughtSignature) {
    messageData.thoughtSignature = message.thoughtSignature;
  }

  const docRef = await addDoc(messagesRef, messageData);

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

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const message: AIMessage = {
      id: doc.id,
      role: data.role,
      content: data.content,
      createdAt: toDate(data.createdAt),
    };

    // Include tool-related fields if present
    if (data.toolCalls) {
      message.toolCalls = data.toolCalls;
    }
    if (data.toolCallId) {
      message.toolCallId = data.toolCallId;
    }
    if (data.toolName) {
      message.toolName = data.toolName;
    }
    // Gemini 3: Include thought signature
    if (data.thoughtSignature) {
      message.thoughtSignature = data.thoughtSignature;
    }

    return message;
  });
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
    const messages = snapshot.docs.map((doc) => {
      const data = doc.data();
      const message: AIMessage = {
        id: doc.id,
        role: data.role as AIMessage['role'],
        content: data.content,
        createdAt: toDate(data.createdAt),
      };

      // Include tool-related fields if present
      if (data.toolCalls) {
        message.toolCalls = data.toolCalls;
      }
      if (data.toolCallId) {
        message.toolCallId = data.toolCallId;
      }
      if (data.toolName) {
        message.toolName = data.toolName;
      }
      // Gemini 3: Include thought signature
      if (data.thoughtSignature) {
        message.thoughtSignature = data.thoughtSignature;
      }

      return message;
    });
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

// ==================== Personal Conversations ====================

/**
 * Create a new personal conversation
 */
export async function createPersonalConversation(
  userId: string,
  options?: {
    title?: string;
  }
): Promise<string> {
  const conversationsRef = getPersonalConversationsCollection(userId);

  const docRef = await addDoc(conversationsRef, {
    title: options?.title || '新しい会話',
    scope: 'personal' as AIScope,
    contextType: 'personal',
    contextId: null,
    projectId: '',
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update personal conversation title
 */
export async function updatePersonalConversationTitle(
  userId: string,
  conversationId: string,
  title: string
): Promise<void> {
  const docRef = doc(db, 'users', userId, 'personalConversations', conversationId);
  await updateDoc(docRef, {
    title,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a personal conversation and all its messages
 */
export async function deletePersonalConversation(
  userId: string,
  conversationId: string
): Promise<void> {
  // Delete all messages first
  const messagesRef = getPersonalMessagesCollection(userId, conversationId);
  const messagesSnapshot = await getDocs(messagesRef);

  const deletePromises = messagesSnapshot.docs.map((doc) => deleteDoc(doc.ref));
  await Promise.all(deletePromises);

  // Delete the conversation
  const conversationRef = doc(db, 'users', userId, 'personalConversations', conversationId);
  await deleteDoc(conversationRef);
}

/**
 * Get all personal conversations for a user
 */
export async function getPersonalConversations(userId: string): Promise<AIConversation[]> {
  const conversationsRef = getPersonalConversationsCollection(userId);
  const q = query(conversationsRef, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    projectId: '',
    scope: 'personal' as AIScope,
    title: doc.data().title,
    contextType: 'personal' as const,
    contextId: null,
    createdBy: doc.data().createdBy,
    createdAt: toDate(doc.data().createdAt),
    updatedAt: toDate(doc.data().updatedAt),
  }));
}

/**
 * Subscribe to personal conversations for a user
 */
export function subscribeToPersonalConversations(
  userId: string,
  callback: (conversations: AIConversation[]) => void
): () => void {
  const conversationsRef = getPersonalConversationsCollection(userId);
  const q = query(conversationsRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map((doc) => ({
      id: doc.id,
      projectId: '',
      scope: 'personal' as AIScope,
      title: doc.data().title,
      contextType: 'personal' as const,
      contextId: null,
      createdBy: doc.data().createdBy,
      createdAt: toDate(doc.data().createdAt),
      updatedAt: toDate(doc.data().updatedAt),
    }));
    callback(conversations);
  });
}

/**
 * Add a message to a personal conversation
 */
export async function addPersonalMessage(
  userId: string,
  conversationId: string,
  message: Omit<AIMessage, 'id' | 'createdAt'>
): Promise<string> {
  const messagesRef = getPersonalMessagesCollection(userId, conversationId);

  // Build message data including optional tool-related fields
  const messageData: Record<string, unknown> = {
    role: message.role,
    content: message.content,
    createdAt: serverTimestamp(),
  };

  // Include tool calls for assistant messages
  if (message.toolCalls && message.toolCalls.length > 0) {
    messageData.toolCalls = message.toolCalls;
  }

  // Include tool-related fields for tool messages
  if (message.toolCallId) {
    messageData.toolCallId = message.toolCallId;
  }
  if (message.toolName) {
    messageData.toolName = message.toolName;
  }
  if (message.thoughtSignature) {
    messageData.thoughtSignature = message.thoughtSignature;
  }

  const docRef = await addDoc(messagesRef, messageData);

  // Update conversation's updatedAt
  const conversationRef = doc(db, 'users', userId, 'personalConversations', conversationId);
  await updateDoc(conversationRef, {
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Get all messages for a personal conversation
 */
export async function getPersonalMessages(
  userId: string,
  conversationId: string
): Promise<AIMessage[]> {
  const messagesRef = getPersonalMessagesCollection(userId, conversationId);
  const q = query(messagesRef, orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const message: AIMessage = {
      id: doc.id,
      role: data.role,
      content: data.content,
      createdAt: toDate(data.createdAt),
    };

    if (data.toolCalls) {
      message.toolCalls = data.toolCalls;
    }
    if (data.toolCallId) {
      message.toolCallId = data.toolCallId;
    }
    if (data.toolName) {
      message.toolName = data.toolName;
    }
    if (data.thoughtSignature) {
      message.thoughtSignature = data.thoughtSignature;
    }

    return message;
  });
}

/**
 * Subscribe to messages for a personal conversation
 */
export function subscribeToPersonalMessages(
  userId: string,
  conversationId: string,
  callback: (messages: AIMessage[]) => void
): () => void {
  const messagesRef = getPersonalMessagesCollection(userId, conversationId);
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => {
      const data = doc.data();
      const message: AIMessage = {
        id: doc.id,
        role: data.role as AIMessage['role'],
        content: data.content,
        createdAt: toDate(data.createdAt),
      };

      if (data.toolCalls) {
        message.toolCalls = data.toolCalls;
      }
      if (data.toolCallId) {
        message.toolCallId = data.toolCallId;
      }
      if (data.toolName) {
        message.toolName = data.toolName;
      }
      if (data.thoughtSignature) {
        message.thoughtSignature = data.thoughtSignature;
      }

      return message;
    });
    callback(messages);
  });
}
