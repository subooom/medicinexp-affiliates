// src/offline/demo-video.ts — each program's demo video, downloaded once (on Wi-Fi by
// default) so the MR can play it to a pharmacy owner with no internet.
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { File, Paths } from 'expo-file-system';
import { FieldKit } from '@/types/models';

type Meta = { updatedAt: string | null; bytes: number; uri: string };
type Progress = (fraction: number) => void;

const metaKey = (programId: number) => `demo-video:v1:${programId}`;
const fileFor = (programId: number) => new File(Paths.document, `demo-video-${programId}.mp4`);

let downloading: Promise<string | null> | null = null;

async function readMeta(programId: number): Promise<Meta | null> {
  try {
    return JSON.parse((await AsyncStorage.getItem(metaKey(programId))) || 'null');
  } catch {
    return null;
  }
}

export const demoVideo = {
  /** Local file uri if this program's video is on the phone. */
  async localUri(programId: number): Promise<string | null> {
    const meta = await readMeta(programId);
    const file = fileFor(programId);
    return meta && file.exists ? file.uri : null;
  },

  async isCurrent(kit: FieldKit): Promise<boolean> {
    if (!kit.demo_video) return true;
    const meta = await readMeta(kit.program_id);
    return !!meta && meta.updatedAt === kit.demo_video.updated_at && fileFor(kit.program_id).exists;
  },

  /**
   * Download if the program has a newer video. Without `force`, only on Wi-Fi so it
   * doesn't use up the MR's mobile data.
   */
  async sync(kit: FieldKit, options: { force?: boolean; onProgress?: Progress } = {}): Promise<string | null> {
    if (!kit.demo_video) {
      await this.remove(kit.program_id);
      return null;
    }
    if (await this.isCurrent(kit)) {
      return fileFor(kit.program_id).uri;
    }
    if (!options.force) {
      const state = await NetInfo.fetch();
      if (state.type !== 'wifi') return null;
    }
    if (downloading) return downloading;

    const video = kit.demo_video;
    downloading = (async () => {
      const target = fileFor(kit.program_id);
      const temp = new File(Paths.cache, `demo-video-${kit.program_id}.part`);
      try {
        if (temp.exists) temp.delete();
        const task = File.createDownloadTask(video.url, temp, {
          onProgress: ({ bytesWritten, totalBytes }: { bytesWritten: number; totalBytes: number }) => {
            const total = totalBytes > 0 ? totalBytes : video.bytes;
            options.onProgress?.(total ? bytesWritten / total : 0);
          },
        });
        const result = await task.downloadAsync();
        if (!result) return null;
        if (target.exists) target.delete();
        temp.move(target);
        const meta: Meta = { updatedAt: video.updated_at, bytes: video.bytes, uri: target.uri };
        await AsyncStorage.setItem(metaKey(kit.program_id), JSON.stringify(meta));
        return target.uri;
      } finally {
        downloading = null;
      }
    })();
    return downloading;
  },

  async remove(programId: number) {
    const file = fileFor(programId);
    if (file.exists) file.delete();
    await AsyncStorage.removeItem(metaKey(programId));
  },
};
