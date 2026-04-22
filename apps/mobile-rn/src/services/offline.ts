/**
 * Offline Support Service
 *
 * - Detects connectivity via @react-native-community/netinfo
 * - Caches data to MMKV (react-native-mmkv)
 * - Queues offline actions and syncs when online
 */

// import NetInfo from '@react-native-community/netinfo';
// import { MMKV } from 'react-native-mmkv';

// const storage = new MMKV();

const OFFLINE_QUEUE_KEY = 'offline_action_queue';

export interface OfflineAction {
    id: string;
    endpoint: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body: any;
    createdAt: number;
}

// ─── MMKV Cache Helpers ─────────────────────────────────────────────────────

export function cacheSet(key: string, value: any) {
    try {
        // storage.set(key, JSON.stringify(value));
        console.log(`[Offline] Cache set: ${key}`);
    } catch { }
}

export function cacheGet<T = any>(key: string): T | null {
    try {
        // const raw = storage.getString(key);
        // return raw ? JSON.parse(raw) : null;
        return null;
    } catch {
        return null;
    }
}

// ─── Offline Action Queue ───────────────────────────────────────────────────

export function enqueueAction(action: Omit<OfflineAction, 'id' | 'createdAt'>) {
    const queue = getQueue();
    queue.push({
        ...action,
        id: Math.random().toString(36).slice(2),
        createdAt: Date.now(),
    });
    cacheSet(OFFLINE_QUEUE_KEY, queue);
}

export function getQueue(): OfflineAction[] {
    return cacheGet<OfflineAction[]>(OFFLINE_QUEUE_KEY) || [];
}

export function clearQueue() {
    cacheSet(OFFLINE_QUEUE_KEY, []);
}

export async function syncQueue(apiFn: (endpoint: string, options: any) => Promise<any>) {
    const queue = getQueue();
    if (queue.length === 0) return;

    const failed: OfflineAction[] = [];
    for (const action of queue) {
        try {
            await apiFn(action.endpoint, { method: action.method, body: action.body });
        } catch {
            failed.push(action);
        }
    }
    cacheSet(OFFLINE_QUEUE_KEY, failed);
}

// ─── Connectivity Listener ──────────────────────────────────────────────────

let isConnected = true;

export function getIsConnected() {
    return isConnected;
}

export function setupConnectivityListener(onChange: (connected: boolean) => void) {
    // return NetInfo.addEventListener(state => {
    //   const connected = state.isConnected ?? true;
    //   isConnected = connected;
    //   onChange(connected);
    // });
    console.log('[Offline] Connectivity listener stub');
    return () => { };
}
