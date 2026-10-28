import { useEffect, useState } from 'react';
import {
  offlineSyncService,
  OfflineSyncState,
} from '../services/offlineSyncService';

export function useOfflineSync() {
  const [syncState, setSyncState] = useState<OfflineSyncState>(() =>
    offlineSyncService.getState()
  );

  useEffect(() => {
    return offlineSyncService.subscribe(setSyncState);
  }, []);

  return {
    syncState,
    startOrResumeSync: (forceAll = false) =>
      offlineSyncService.startOrResumeSync(forceAll),
    retryFailedOnly: () => offlineSyncService.retryFailedOnly(),
    verifyIntegrityNow: () => offlineSyncService.verifyIntegrityNow(false),
    downloadAllTafsirsOffline: () =>
      offlineSyncService.downloadAllTafsirsOffline(),
    requestPersistentStorage: () =>
      offlineSyncService.requestPersistentStorage(),
    applyServiceWorkerUpdate: () =>
      offlineSyncService.applyServiceWorkerUpdate(),
  };
}
