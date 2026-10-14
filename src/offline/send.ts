// src/offline/send.ts — the one way screens save things: straight to the server when
// online, into the outbox when not. Validation errors still come back to the form.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import apiClient, { ACTIVE_PROGRAM_KEY } from '@/api/client';
import { uuidv4 } from '@/utils/uuid';
import { isNetworkError, network } from './network';
import { OutboxFile, OutboxItem, outbox, resolveTempIds } from './outbox';

export type SendResult<T> = { queued: false; data: T } | { queued: true; item: OutboxItem };

interface SendRequest {
  method: OutboxItem['method'];
  url: string;
  data?: Record<string, any>;
  label: string;
  file?: OutboxFile;
}

/**
 * Save now if we can, otherwise queue. While anything is already queued, new writes
 * queue behind it so they reach the server in the order the MR made them.
 */
export async function sendOrQueue<T = any>(request: SendRequest): Promise<SendResult<T>> {
  const programId = await AsyncStorage.getItem(ACTIVE_PROGRAM_KEY);
  const queue = async () => {
    const item = await outbox.enqueue({ ...request, file: request.file ? keepFile(request.file) : undefined, programId });
    outbox.flush().catch(() => undefined);
    return { queued: true as const, item };
  };

  if (!network.isOnline() || (await outbox.hasPending())) {
    return queue();
  }

  try {
    // A venue made offline that has synced since: send its client_uuid, not the temporary id
    request = { ...request, data: await resolveTempIds(request.data) };
    const response = request.file
      ? await apiClient.request({
          method: request.method,
          url: request.url,
          data: formData(request.data, request.file),
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000,
        })
      : await apiClient.request({ method: request.method, url: request.url, data: request.data });
    return { queued: false, data: response.data?.data as T };
  } catch (error: any) {
    if (isNetworkError(error)) {
      return queue();
    }
    throw error;
  }
}

function formData(data: Record<string, any> | undefined, file: OutboxFile): FormData {
  const form = new FormData();
  Object.entries(data ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, String(value));
  });
  form.append(file.field ?? 'file', { uri: file.uri, name: file.name, type: file.type } as any);
  return form;
}

/**
 * Camera and recorder files live in the cache, which the phone may clear: copy queued
 * files somewhere permanent until they're uploaded.
 */
function keepFile(file: OutboxFile): OutboxFile {
  try {
    const dir = new Directory(Paths.document, 'outbox');
    dir.create({ intermediates: true, idempotent: true });
    const extension = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const target = new File(dir, `${uuidv4()}.${extension}`);
    new File(file.uri).copy(target);
    return { ...file, uri: target.uri };
  } catch {
    return file;
  }
}

/** Short message for a save that went into the queue. */
export const queuedMessage = 'Saved on your phone. It will be sent when you are back online.';
