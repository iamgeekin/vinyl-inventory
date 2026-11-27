import { hasValidCheckDigit } from '../lookup/barcode';
import CameraScanner from './CameraScanner';
import { detectBarcode } from './detector';

/** Reports the first valid product barcode the camera sees. */
export default function BarcodeScanner({ onFound }: { onFound: (code: string) => void }) {
  return (
    <CameraScanner
      detect={detectBarcode}
      onFound={(code) => {
        if (!hasValidCheckDigit(code)) return false;
        onFound(code);
        return true;
      }}
      hint="Hold the barcode inside the frame"
      fallback="Use a photo or type the number."
    />
  );
}
