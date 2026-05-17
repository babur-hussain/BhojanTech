import { useEffect, useRef, useCallback } from 'react';

/**
 * useBarcodeScanner
 *
 * Detects input from hardware barcode scanners (USB, Bluetooth wedge).
 * These scanners act as keyboards: they emit characters very quickly
 * (< SCANNER_INTERVAL_MS between chars) and terminate with Enter.
 *
 * Usage:
 *   useBarcodeScanner((barcode) => handleBarcode(barcode));
 *
 * Options:
 *   - minLength: minimum barcode length to consider valid (default 3)
 *   - scanInterval: max ms between scanner keystrokes (default 50ms)
 *   - active: whether to listen (default true)
 */
interface BarcodeScannerOptions {
  minLength?: number;
  scanInterval?: number;
  active?: boolean;
}

export function useBarcodeScanner(
  onScan: (barcode: string) => void,
  options: BarcodeScannerOptions = {}
) {
  const { minLength = 3, scanInterval = 50, active = true } = options;

  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!active) return;

      const now = Date.now();
      const elapsed = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Ignore modifier keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        // If the elapsed time since the last character is small, and we have enough chars, it's a scanner.
        if (code.length >= minLength && elapsed <= scanInterval) {
          e.preventDefault(); // Prevent form submission
          onScan(code);
        }
        bufferRef.current = '';
        return;
      }

      if (e.key === 'Escape') {
        bufferRef.current = '';
        return;
      }

      // If it took too long between keys, this is human typing, reset buffer
      if (elapsed > scanInterval && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      // Only record single printable characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    },
    [active, minLength, onScan, scanInterval]
  );

  useEffect(() => {
    if (!active) return;
    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase to intercept before inputs
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [active, handleKeyDown]);
}

/**
 * useBarcodeScannerInput
 *
 * For use with a dedicated text input (data-barcode-input="true").
 * Fires onScan when Enter is pressed with a valid barcode.
 */
export function useBarcodeScannerInput(
  onScan: (barcode: string) => void,
  minLength = 3
) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const val = (e.target as HTMLInputElement).value.trim();
        if (val.length >= minLength) {
          onScan(val);
          (e.target as HTMLInputElement).value = '';
        }
      }
    },
    [minLength, onScan]
  );

  return { onKeyDown: handleKeyDown };
}
