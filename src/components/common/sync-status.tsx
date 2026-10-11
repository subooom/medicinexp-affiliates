// src/components/SyncStatusIndicator.tsx
import { syncService } from '@/service/BackgroundSyncService';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function SyncStatusIndicator() {
  const [status, setStatus] = useState({
    isSyncing: false,
    queueLength: 0,
    lastSyncTime: null as number | null,
  });

  useEffect(() => {
    const updateStatus = () => {
      const syncStatus = syncService.getSyncStatus();
      setStatus({
        isSyncing: syncStatus.isSyncing,
        queueLength: syncStatus.queueLength,
        lastSyncTime: syncStatus.lastSyncTime,
      });
    };

    // Update every 5 seconds
    const interval = setInterval(updateStatus, 5000);
    updateStatus();

    return () => clearInterval(interval);
  }, []);

  const lastSyncText = status.lastSyncTime
    ? new Date(status.lastSyncTime).toLocaleTimeString()
    : 'Never';

  return (
    <View style={styles.container}>
      {status.isSyncing && (
        <View style={styles.syncingBadge}>
          <Text style={styles.badgeText}>Syncing...</Text>
        </View>
      )}
      {status.queueLength > 0 && (
        <View style={styles.queueBadge}>
          <Text style={styles.badgeText}>
            {status.queueLength} pending
          </Text>
        </View>
      )}
      <Text style={styles.lastSync}>Last sync: {lastSyncText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f0f0f0',
  },
  syncingBadge: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  queueBadge: {
    backgroundColor: '#007bff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lastSync: {
    fontSize: 12,
    color: '#666',
  },
});