import { useEffect, useRef, useState } from 'react';
import { hasValidCheckDigit } from '../lookup/barcode';
import { detectBarcode } from './detector';

/** Live camera view that reports the first valid product barcode it sees. */
export default function BarcodeScanner({ onFound }: { onFound: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const found = useRef(onFound);
  const [message, setMessage] = useState('Starting the camera…');

  useEffect(() => {
    found.current = onFound;
  }, [onFound]);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer = 0;

    const scan = async () => {
      const element = video.current;
      if (stopped || !element) return;
      try {
        if (element.readyState >= 2) {
          const code = await detectBarcode(element);
          if (!stopped && code && hasValidCheckDigit(code)) {
            navigator.vibrate?.(60);
            found.current(code);
            return;
          }
        }
      } catch {
        setMessage('The barcode reader could not start. Type the number below instead.');
        return;
      }
      timer = window.setTimeout(scan, 220);
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage('This browser cannot open the camera here. Use a photo or type the number.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false,
        });
        if (stopped || !video.current) return stream.getTracks().forEach((t) => t.stop());
        video.current.srcObject = stream;
        await video.current.play();
        setMessage('Hold the barcode inside the frame');
        scan();
      } catch (e) {
        if (stopped) return;
        setMessage(
          (e as DOMException).name === 'NotAllowedError'
            ? 'Camera access was blocked. Allow it in your browser settings, or type the number.'
            : 'No camera is available. Use a photo or type the number.',
        );
      }
    };

    start();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="viewfinder">
      <video ref={video} muted playsInline aria-label="Camera view" />
      <div className="frame" aria-hidden="true" />
      <p role="status">{message}</p>
    </div>
  );
}
