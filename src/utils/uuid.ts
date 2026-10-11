// src/utils/uuid.ts

// RFC 4122 version-4 UUID for client_uuid (offline-safe writes: the server stores a
// repeated request once). Only needs to be unique per MR, so Math.random is enough
// and avoids a native crypto module.
export const uuidv4 = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
