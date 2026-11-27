import { normalizeCode } from '../sync/code';
import CameraScanner from './CameraScanner';
import { detectQr } from './detector';

/** Reports the first sync code the camera sees as a QR code. */
export default function CodeScanner({ onFound }: { onFound: (code: string) => void }) {
  return (
    <CameraScanner
      detect={detectQr}
      onFound={(text) => {
        const code = normalizeCode(text);
        if (!code) return false;
        onFound(code);
        return true;
      }}
      hint="Point at the QR code on your other device"
      fallback="Type or paste the sync code instead."
    />
  );
}
