// Sync codes — a compact, copy-pasteable string that encodes the whole save.
//
// Wraps `store.exportJson()` / `store.importJson()`; format/versioning lives in
// progress.ts. We gzip the JSON via the Web CompressionStream API then
// base64url-encode it. A 1-byte format prefix distinguishes gzip vs a raw
// (uncompressed) fallback used when CompressionStream is unavailable, so decode
// always knows which path to take. Decode throws on malformed input.

const FORMAT_RAW = 0x00
const FORMAT_GZIP = 0x01

function hasCompressionStream(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'
}

// ── base64url (no padding) ──────────────────────────────────────────────────

function bytesToBase64url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlToBytes(code: string): Uint8Array {
  const normalized = code.replace(/-/g, '+').replace(/_/g, '/')
  let binary: string
  try {
    binary = atob(normalized)
  } catch {
    throw new Error('Invalid sync code')
  }
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// ── gzip helpers ────────────────────────────────────────────────────────────

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Response(
    new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('gzip')),
  )
  return new Uint8Array(await stream.arrayBuffer())
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Response(
    new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip')),
  )
  return new Uint8Array(await stream.arrayBuffer())
}

function withPrefix(format: number, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(body.length + 1)
  out[0] = format
  out.set(body, 1)
  return out
}

// ── public API ──────────────────────────────────────────────────────────────

export async function encodeSyncCode(json: string): Promise<string> {
  const utf8 = new TextEncoder().encode(json)
  if (hasCompressionStream()) {
    return bytesToBase64url(withPrefix(FORMAT_GZIP, await gzip(utf8)))
  }
  return bytesToBase64url(withPrefix(FORMAT_RAW, utf8))
}

export async function decodeSyncCode(code: string): Promise<string> {
  const trimmed = code.trim()
  if (!trimmed) throw new Error('Invalid sync code')
  const bytes = base64urlToBytes(trimmed)
  if (bytes.length < 2) throw new Error('Invalid sync code')
  const format = bytes[0]
  const body = bytes.subarray(1)
  if (format === FORMAT_RAW) {
    return new TextDecoder().decode(body)
  }
  if (format === FORMAT_GZIP) {
    if (!hasCompressionStream()) throw new Error('Gzip sync codes are not supported in this browser')
    try {
      return new TextDecoder().decode(await gunzip(body))
    } catch {
      throw new Error('Invalid sync code')
    }
  }
  throw new Error('Invalid sync code')
}

// Exposed for tests: force the raw (no-compression) encode path.
export function _encodeSyncCodeRaw(json: string): string {
  return bytesToBase64url(withPrefix(FORMAT_RAW, new TextEncoder().encode(json)))
}
