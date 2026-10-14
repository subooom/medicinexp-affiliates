// src/offline/attachments.ts — shop photos and voice memos. Uploaded through the outbox
// as their own items, after the visit/lead they belong to, so a slow upload never holds
// up the visit itself.
import { Attachment } from '@/types/models';
import { uuidv4 } from '@/utils/uuid';
import { sendOrQueue } from './send';

export interface CapturedFile {
  uri: string;
  mimeType: string;
  name: string;
  durationSeconds?: number;
  transcript?: string;
}

export interface AttachTo {
  type: 'visit' | 'lead' | 'call_log';
  // Server id when known; otherwise the client_uuid of an item that may still be queued
  id?: number;
  clientUuid?: string;
}

export async function uploadAttachment(kind: 'photo' | 'voice_memo', file: CapturedFile, to: AttachTo, label: string) {
  return sendOrQueue<Attachment>({
    method: 'post',
    url: '/attachments',
    label,
    data: {
      kind,
      attachable_type: to.type,
      attachable_id: to.id && to.id > 0 ? to.id : undefined,
      attachable_client_uuid: to.id && to.id > 0 ? undefined : to.clientUuid,
      client_uuid: uuidv4(),
      duration_seconds: file.durationSeconds ? Math.round(file.durationSeconds) : undefined,
      transcript: file.transcript || undefined,
      recorded_at: new Date().toISOString(),
    },
    file: { uri: file.uri, name: file.name, type: file.mimeType },
  });
}
