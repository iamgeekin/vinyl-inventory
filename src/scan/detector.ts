import { BarcodeDetector, prepareZXingModule } from 'barcode-detector/ponyfill';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

// Serve the decoder from this app instead of a public CDN, so it also works offline.
prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
  },
});

function reader(formats: ('ean_13' | 'ean_8' | 'upc_a' | 'upc_e' | 'qr_code')[]) {
  let detector: BarcodeDetector | undefined;
  return async (source: ImageBitmapSource): Promise<string> => {
    detector ??= new BarcodeDetector({ formats });
    const [result] = await detector.detect(source);
    return result?.rawValue ?? '';
  };
}

export const detectBarcode = reader(['ean_13', 'ean_8', 'upc_a', 'upc_e']);
export const detectQr = reader(['qr_code']);
