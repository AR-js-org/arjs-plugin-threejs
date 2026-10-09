/**
 * Marker payload handling: one internal shape for every marker event, whatever
 * spelling or array type it arrives in.
 *
 * @module marker
 */

/**
 * The marker family. Pattern and barcode markers keep independent ID
 * registries in ARToolKit, so both can report `markerId: 0`.
 *
 * @typedef {'pattern' | 'barcode'} MarkerType
 */

/**
 * A marker event normalised for the renderer.
 *
 * @typedef {Object} NormalizedMarker
 * @property {string} key - `type:markerId`, the marker's identity
 * @property {string} markerId - The marker's ID within its family
 * @property {MarkerType} type - The marker family
 * @property {ArrayLike<number>|null} matrix - 4x4 column-major pose, or null
 * @property {boolean} visible - Whether the marker is in view
 * @property {number} [confidence] - Detection confidence, 0 to 1
 * @property {Array<[number, number]>} [vertex] - The four detected corners, in frame pixels
 * @property {number} [dir] - The marker's rotation, 0 to 3
 */

/**
 * A 4x4 matrix as sixteen numbers: a plain array or any typed array, which is
 * what arjs-plugin-artoolkit sends (`Float32Array`).
 *
 * @param {unknown} value - Candidate matrix
 * @returns {ArrayLike<number>|null} `value` itself when it holds sixteen numbers, else null
 */
export function toMatrix16(value) {
  const isArray = Array.isArray(value) || ArrayBuffer.isView(value);
  return isArray && /** @type {ArrayLike<number>} */ (value).length === 16
    ? /** @type {ArrayLike<number>} */ (value)
    : null;
}

/**
 * A marker's identity across both families.
 *
 * @param {number|string} markerId - The marker's ID within its family
 * @param {MarkerType} [type='pattern'] - The marker family
 * @returns {string} `type:markerId`
 */
export function markerKey(markerId, type) {
  return `${type ?? "pattern"}:${markerId}`;
}

/**
 * Reads a marker event into one shape. The field names arjs-plugin-artoolkit
 * 0.2.0+ emits come first; the 0.1.x names are the fallback.
 *
 * @param {Object|null|undefined} payload - A marker event payload
 * @param {boolean} visible - Whether the event means the marker is in view
 * @returns {NormalizedMarker|null} The normalised marker, or null without an ID
 */
export function normalizeMarker(payload, visible) {
  const id = payload?.markerId ?? payload?.id;
  if (id == null) return null;

  const type = payload.type ?? "pattern";
  const matrix =
    toMatrix16(payload.matrix) ??
    toMatrix16(payload.transformationMatrix) ??
    toMatrix16(payload.modelViewMatrix) ??
    toMatrix16(payload.poseMatrix);

  return {
    key: markerKey(id, type),
    markerId: String(id),
    type,
    matrix,
    visible,
    confidence: payload.confidence,
    vertex: payload.vertex,
    dir: payload.dir,
  };
}
