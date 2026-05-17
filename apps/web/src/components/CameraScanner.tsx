import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Camera, X, RefreshCw, ZoomIn, AlertTriangle } from 'lucide-react';

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  title?: string;
}

export default function CameraScanner({ onScan, onClose, title = 'Scan Barcode' }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState('');
  const cooldownRef = useRef(false);

  const startScan = useCallback(async (deviceId?: string) => {
    if (!videoRef.current) return;
    setError('');
    setScanning(true);

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      await reader.decodeFromVideoDevice(
        deviceId || null,
        videoRef.current,
        (result, err) => {
          if (result) {
            const text = (result as any).text || (result.getText ? result.getText() : '');
            if (text && text !== lastResult && !cooldownRef.current) {
              cooldownRef.current = true;
              setLastResult(text);
              onScan(text);
              // Cooldown to prevent duplicate scans
              setTimeout(() => { cooldownRef.current = false; }, 1500);
            }
          }
          // Suppress NotFoundException (normal between scans)
          if (err && !(err instanceof NotFoundException)) {
            console.warn('[CameraScanner]', err.message);
          }
        }
      );
    } catch (e: any) {
      setError(e?.message || 'Camera access denied. Please allow camera permission.');
      setScanning(false);
    }
  }, [lastResult, onScan]);

  useEffect(() => {
    // Get camera devices safely
    const getDevices = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          throw new Error('Media devices API not supported');
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);
        const rearCamera = videoDevices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        const preferred = rearCamera?.deviceId || videoDevices[0]?.deviceId || '';
        setSelectedDevice(preferred);
        if (preferred) startScan(preferred);
      } catch (err) {
        startScan(); // Try without specific device
      }
    };
    getDevices();

    return () => {
      readerRef.current?.reset();
    };
  }, []); // eslint-disable-line

  const switchCamera = async (deviceId: string) => {
    readerRef.current?.reset();
    setSelectedDevice(deviceId);
    setLastResult('');
    startScan(deviceId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
          <div className="flex items-center gap-2">
            <Camera size={18} />
            <span className="font-bold text-sm">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {devices.length > 1 && (
              <button
                onClick={() => {
                  const idx = devices.findIndex(d => d.deviceId === selectedDevice);
                  const next = devices[(idx + 1) % devices.length];
                  switchCamera(next.deviceId);
                }}
                className="p-1.5 hover:bg-gray-700 rounded-lg transition"
                title="Switch Camera"
              >
                <RefreshCw size={15} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-gray-700 rounded-lg transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewfinder */}
        <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />

          {/* Scan overlay */}
          {scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Corner brackets */}
              <div className="relative w-48 h-36">
                {/* TL */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                {/* TR */}
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                {/* BL */}
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                {/* BR */}
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
                {/* Scanning line */}
                <div className="absolute inset-x-2 h-0.5 bg-green-400 opacity-80 animate-[scan_2s_linear_infinite]" style={{ top: '50%' }} />
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-6 bg-black bg-opacity-70">
              <AlertTriangle size={32} className="text-yellow-400 mb-2" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 space-y-2">
          {lastResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
              <span className="text-green-600 font-semibold">✓ Scanned: </span>
              <span className="font-mono text-green-800">{lastResult}</span>
            </div>
          )}

          {devices.length > 1 && (
            <select
              value={selectedDevice}
              onChange={e => switchCamera(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-maroon bg-white"
            >
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          )}

          <p className="text-xs text-gray-400 text-center">
            Point camera at barcode · Auto-detects 1D &amp; 2D codes
          </p>
        </div>
      </div>

      {/* CSS for scanning line animation */}
      <style>{`
        @keyframes scan {
          0%   { top: 10%; }
          50%  { top: 85%; }
          100% { top: 10%; }
        }
      `}</style>
    </div>
  );
}
