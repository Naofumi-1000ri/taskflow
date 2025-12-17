import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { getFirebaseStorage } from './config';

export async function uploadFile(
  projectId: string,
  taskId: string,
  file: File
): Promise<{ url: string; name: string; type: string; size: number }> {
  const storage = getFirebaseStorage();
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name}`;
  const filePath = `projects/${projectId}/tasks/${taskId}/attachments/${fileName}`;
  const fileRef = ref(storage, filePath);

  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);

  return {
    url,
    name: file.name,
    type: file.type,
    size: file.size,
  };
}

export async function deleteFile(
  projectId: string,
  taskId: string,
  fileName: string
): Promise<void> {
  const storage = getFirebaseStorage();
  const filePath = `projects/${projectId}/tasks/${taskId}/attachments/${fileName}`;
  const fileRef = ref(storage, filePath);

  try {
    await deleteObject(fileRef);
  } catch (error) {
    // File might not exist in storage, ignore the error
    console.warn('Failed to delete file from storage:', error);
  }
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return 'doc';
  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
    return 'excel';
  if (
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  )
    return 'ppt';
  if (mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed')
    return 'archive';
  return 'file';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
