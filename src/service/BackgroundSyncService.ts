// src/services/SyncService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { visitRepository } from '../api/visits';

class SyncService {
  private isSyncing = false;
  private lastSyncTime: number | null = null;
  private syncQueue: any[] = [];
  private readonly SYNC_KEY = 'sync_queue';
  private readonly LAST_SYNC_KEY = 'last_sync_time';

  async initialize(): Promise<void> {
    try {
      await this.loadSyncQueue();

      // Only set up background fetch if available (production builds)
      if (!__DEV__) {
        await this.setupBackgroundFetch();
      }

      // Always set up network listener
      NetInfo.addEventListener(async (state) => {
        if (state.isConnected) {
          console.log('Network reconnected, triggering sync...');
          await this.sync();
        }
      });

      // Initial sync if online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        await this.sync();
      }

      console.log('SyncService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SyncService:', error);
    }
  }

  private async setupBackgroundFetch(): Promise<void> {
    try {
      // Dynamically import background fetch only when available
      const BackgroundFetch = require('expo-background-fetch');
      const TaskManager = require('expo-task-manager');
      
      const SYNC_TASK_NAME = 'background-sync-task';

      // Define task if not already defined
      if (!TaskManager.isTaskDefined(SYNC_TASK_NAME)) {
        TaskManager.defineTask(SYNC_TASK_NAME, async () => {
          try {
            await this.performSync();
            return BackgroundFetch.BackgroundFetchResult.NewData;
          } catch (error) {
            console.error('Background sync failed:', error);
            return BackgroundFetch.BackgroundFetchResult.Failed;
          }
        });
      }

      // Register task
      const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME);
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
          minimumInterval: 60 * 15,
          stopOnTerminate: false,
          startOnBoot: true,
        });
        console.log('Background task registered');
      }
    } catch (error) {
      console.log('Background fetch not available:', error);
    }
  }

  async sync(): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    console.log('Starting manual sync...');
    await this.performSync();
  }

  async performSync(): Promise<void> {
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('No network connection, skipping sync');
        return;
      }

      this.isSyncing = true;

      await visitRepository.sync();
      this.lastSyncTime = Date.now();
      await this.saveLastSyncTime();
      await this.cleanupCache();

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  async queueOperation(operation: any): Promise<void> {
    this.syncQueue.push({
      ...operation,
      timestamp: Date.now(),
      id: Math.random().toString(36).substring(7) + Date.now().toString(36),
    });
    await this.saveSyncQueue();
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(this.SYNC_KEY);
      this.syncQueue = data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SYNC_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  private async saveLastSyncTime(): Promise<void> {
    try {
      if (this.lastSyncTime) {
        await AsyncStorage.setItem(
          this.LAST_SYNC_KEY,
          JSON.stringify(this.lastSyncTime)
        );
      }
    } catch (error) {
      console.error('Failed to save last sync time:', error);
    }
  }

  private async cleanupCache(): Promise<void> {
    try {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      this.syncQueue = this.syncQueue.filter(
        item => item.timestamp > oneWeekAgo
      );
      await this.saveSyncQueue();
    } catch (error) {
      console.error('Failed to cleanup cache:', error);
    }
  }

  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      queueLength: this.syncQueue.length,
      lastSyncTime: this.lastSyncTime,
      pendingOperations: this.syncQueue.length,
    };
  }

  async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
  }
}

export const syncService = new SyncService();