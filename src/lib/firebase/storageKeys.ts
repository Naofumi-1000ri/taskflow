function defaultNow(): number {
  return Date.now();
}

function defaultCreateId(): string {
  return crypto.randomUUID();
}

export function createUniqueStorageObjectName(
  fileName: string,
  options?: {
    now?: () => number;
    createId?: () => string;
  }
): string {
  const now = options?.now ?? defaultNow;
  const createId = options?.createId ?? defaultCreateId;

  return `${now()}_${createId()}_${fileName}`;
}

export function createCommentAttachmentUploadDescriptor(
  fileName: string,
  options?: {
    now?: () => number;
    createId?: () => string;
  }
): { attachmentId: string; storageFileName: string } {
  const createId = options?.createId ?? defaultCreateId;
  const attachmentId = createId();

  return {
    attachmentId,
    storageFileName: createUniqueStorageObjectName(fileName, {
      now: options?.now,
      createId: () => attachmentId,
    }),
  };
}
