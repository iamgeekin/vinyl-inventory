import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Returns the text of a code visible in the frame, or ''. */
  detect: (frame: HTMLVideoElement) => Promise<string>;
  /** Called with each detected text; return true to stop scanning. */
  onFound: (text: string) => boolean;
  hint: string;
  /** What to do instead when the camera cannot be used. */
  fallback: string;
}

/** Live camera view that looks for a code in each frame. */
export default function CameraScanner({ detect, onFound, hint, fallback }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const latest = useRef({ detect, onFound });
  const [message, setMessage] = useState('Starting the camera…');

  useEffect(() => {
    latest.current = { detect, onFound };
  });

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer = 0;

    const scan = async () => {
      const element = video.current;
      if (stopped || !element) return;
      try {
        if (element.readyState >= 2) {
          const text = await latest.current.detect(element);
          if (!stopped && text && latest.current.onFound(text)) {
            navigator.vibrate?.(60);
            return;
          }
        }
      } catch {
        setMessage(`The code reader could not start. ${fallback}`);
        return;
      }
      timer = window.setTimeout(scan, 220);
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage(`This browser cannot open the camera here. ${fallback}`);
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
        setMessage(hint);
        scan();
      } catch (e) {
        if (stopped) return;
        setMessage(
          (e as DOMException).name === 'NotAllowedError'
            ? `Camera access was blocked. Allow it in your browser settings. ${fallback}`
            : `No camera is available. ${fallback}`,
        );
      }
    };

    start();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [hint, fallback]);

  return (
    <div className="viewfinder">
      <video ref={video} muted playsInline aria-label="Camera view" />
      <div className="frame" aria-hidden="true" />
      <p role="status">{message}</p>
    </div>
  );
}
