import { useEffect, useRef, useCallback } from 'react';

/**
 * useBarcodeScanner
 *
 * Detects input from hardware barcode scanners (USB, Bluetooth wedge).
 * Operates in CAPTURE phase so it intercepts before inputs receive the key.
 * When `interceptAll` is true (form mode), prevents characters from reaching
 * the focused input and fills only the barcode target.
 */
interface BarcodeScannerOptions {
  minLength?: number;
  scanInterval?: number;
  active?: boolean;
  interceptAll?: boolean; // when true, eat ALL scanner keystrokes (form mode)
}

export function useBarcodeScanner(
  onScan: (barcode: string) => void,
  options: BarcodeScannerOptions = {}
) {
  const { minLength = 3, scanInterval = 50, active = true, interceptAll = false } = options;

  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const isScanningRef = useRef<boolean>(false); // true once first char arrives fast

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!active) return;

      // Ignore modifier keys
      if (['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'CapsLock'].includes(e.key)) return;

      const now = Date.now();
      const elapsed = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Escape') {
        bufferRef.current = '';
        isScanningRef.current = false;
        return;
      }

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        if (code.length >= minLength && isScanningRef.current) {
          e.preventDefault();
          e.stopImmediatePropagation();
          onScan(code);
        }
        bufferRef.current = '';
        isScanningRef.current = false;
        return;
      }

      // Reset buffer if too long since last key (human typing)
      if (elapsed > scanInterval && bufferRef.current.length > 0) {
        bufferRef.current = '';
        isScanningRef.current = false;
      }

      // Record single printable characters
      if (e.key.length === 1) {
        // If this char arrived very fast, mark as scanner input
        if (elapsed <= scanInterval || bufferRef.current.length === 0) {
          if (elapsed <= scanInterval) isScanningRef.current = true;
          bufferRef.current += e.key;

          // In interceptAll mode, prevent the char from reaching any focused input
          if (interceptAll && isScanningRef.current) {
            e.preventDefault();
            e.stopImmediatePropagation();
          }
        }
      }
    },
    [active, interceptAll, minLength, onScan, scanInterval]
  );

  useEffect(() => {
    if (!active) return;
    window.addEventListener('keydown', handleKeyDown, true); // capture phase
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [active, handleKeyDown]);
}

/**
 * useBarcodeScannerInput — for a dedicated visible input field.
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
