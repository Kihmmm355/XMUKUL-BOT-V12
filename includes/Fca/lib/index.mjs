/**
 * lib/index.mjs — STUB
 *
 * Original: loaded messagix.so / messagix.dll (native Go library) via koffi FFI.
 * Replaced: pure empty stub — the native library is never loaded.
 *
 * This file is only dynamically imported by e2ee.js when E2EE is enabled.
 * Since e2ee.enable is false in config.json AND e2ee.js is now a no-op stub,
 * this file is never imported at runtime. It exists only to prevent a
 * "module not found" error if anything tries to import it directly.
 */

export default {};
