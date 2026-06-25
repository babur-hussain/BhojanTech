/**
 * useQZTray.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * A reactive hook that exposes:
 *   - qzConnected   : boolean — true if QZ Tray WebSocket is active
 *   - printers      : string[] — printers visible via QZ Tray
 *   - checkStatus() : re-probe QZ Tray connection
 *   - discoverPrinters() : fetch/refresh the printer list
 *   - kitchenPrinter : string — saved kitchen printer name (from localStorage)
 *   - setKitchenPrinter(name) : persist kitchen printer to localStorage
 *
 * Reliability features:
 *   - Subscribes to onConnectionChange for instant disconnect/reconnect updates
 *   - Runs a periodic health-check every 30 s to catch silent drops
 *   - All network calls are fire-and-forget; the hook never throws to consumers
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { isQZConnected, listPrinters, onConnectionChange } from '../utils/thermalPrint';

const LS_KEY_KITCHEN = 'qz_kitchen_printer';
const HEALTH_CHECK_INTERVAL_MS = 30_000; // 30 seconds

export function useQZTray() {
  const [qzConnected, setQzConnected] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [discovering, setDiscovering] = useState<boolean>(false);

  const [kitchenPrinter, setKitchenPrinterState] = useState<string>(
    () => localStorage.getItem(LS_KEY_KITCHEN) ?? ''
  );

  // Track mount status to avoid setting state after unmount
  const mountedRef = useRef(true);

  /** Probe QZ Tray and update connected state */
  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const ok = await isQZConnected();
      if (mountedRef.current) setQzConnected(ok);
      return ok;
    } finally {
      if (mountedRef.current) setChecking(false);
    }
  }, []);

  /** Query QZ Tray for installed printers */
  const discoverPrinters = useCallback(async () => {
    setDiscovering(true);
    try {
      const list = await listPrinters();
      if (mountedRef.current) setPrinters(list);
      return list;
    } finally {
      if (mountedRef.current) setDiscovering(false);
    }
  }, []);

  /** Persist the kitchen printer name to localStorage */
  const setKitchenPrinter = useCallback((name: string) => {
    localStorage.setItem(LS_KEY_KITCHEN, name);
    setKitchenPrinterState(name);
  }, []);

  // ── Lifecycle: subscribe to connection changes + periodic health-check ─────
  useEffect(() => {
    mountedRef.current = true;

    // 1. Initial probe on mount
    checkStatus();

    // 2. Subscribe to push-based connection change events from thermalPrint.ts
    //    This fires instantly when QZ Tray drops or reconnects.
    const unsubscribe = onConnectionChange((connected: boolean) => {
      if (mountedRef.current) {
        setQzConnected(connected);
      }
    });

    // 3. Periodic health-check as a safety net.
    //    Catches edge cases the close listener might miss (e.g. browser tab
    //    was throttled, QZ Tray process was killed without a clean close frame).
    const healthInterval = setInterval(() => {
      if (mountedRef.current) {
        checkStatus();
      }
    }, HEALTH_CHECK_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      unsubscribe();
      clearInterval(healthInterval);
    };
  }, [checkStatus]);

  return {
    qzConnected,
    checking,
    printers,
    discovering,
    kitchenPrinter,
    checkStatus,
    discoverPrinters,
    setKitchenPrinter,
  };
}
