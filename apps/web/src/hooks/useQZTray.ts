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
 * All network calls are fire-and-forget; the hook never throws to consumers.
 */

import { useState, useCallback, useEffect } from 'react';
import { isQZConnected, listPrinters } from '../utils/thermalPrint';

const LS_KEY_KITCHEN = 'qz_kitchen_printer';

export function useQZTray() {
  const [qzConnected, setQzConnected] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [discovering, setDiscovering] = useState<boolean>(false);

  const [kitchenPrinter, setKitchenPrinterState] = useState<string>(
    () => localStorage.getItem(LS_KEY_KITCHEN) ?? ''
  );

  /** Probe QZ Tray and update connected state */
  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const ok = await isQZConnected();
      setQzConnected(ok);
      return ok;
    } finally {
      setChecking(false);
    }
  }, []);

  /** Query QZ Tray for installed printers */
  const discoverPrinters = useCallback(async () => {
    setDiscovering(true);
    try {
      const list = await listPrinters();
      setPrinters(list);
      return list;
    } finally {
      setDiscovering(false);
    }
  }, []);

  /** Persist the kitchen printer name to localStorage */
  const setKitchenPrinter = useCallback((name: string) => {
    localStorage.setItem(LS_KEY_KITCHEN, name);
    setKitchenPrinterState(name);
  }, []);

  // Probe on first mount (silent — no UI blocking)
  useEffect(() => {
    checkStatus();
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
