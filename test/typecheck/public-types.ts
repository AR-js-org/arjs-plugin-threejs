// Compiled by `npm run test:types`, never run. Every line must type-check
// as written; the @ts-expect-error lines must fail to.
import { ThreeJSRendererPlugin } from "@ar-js-org/arjs-plugin-threejs";
import type {
  MarkerEventPayload,
  MarkerType,
  MatrixConvention,
} from "@ar-js-org/arjs-plugin-threejs";

const convention: MatrixConvention = "webgl";
const plugin = new ThreeJSRendererPlugin({ matrixConvention: convention });

// @ts-expect-error: only 'webgl' and 'legacy' are conventions
new ThreeJSRendererPlugin({ matrixConvention: "left" });

const type: MarkerType = "barcode";
// @ts-expect-error: only 'pattern' and 'barcode' are marker families
const notAType: MarkerType = "qr";

const found: MarkerEventPayload = {
  markerId: 0,
  type,
  matrix: new Float32Array(16),
  confidence: 0.9,
  timestamp: 0,
};

const barcodeAnchor = plugin.getAnchor(0, "barcode");

export { notAType, found, barcodeAnchor };
