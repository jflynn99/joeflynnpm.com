// SSRF-hardened fetch for the public /agent web_fetch tool.
//
// The agent is public and the model picks the URL, so anyone can steer it at
// anything this server can reach. This module only lets it reach the public
// internet:
//
// - http/https on the default ports only, no credentials in the URL.
// - Every address a hostname resolves to is checked, inside the socket's own
//   DNS lookup, so the address that is checked is the address that is dialled
//   (no DNS-rebinding window between "check" and "connect").
// - Redirects are followed by hand, at most MAX_REDIRECTS, and each hop goes
//   through the same checks.
// - One deadline covers the whole request, redirects included.
// - The body is streamed and cut off at maxBytes, counted after
//   decompression so a small gzip bomb cannot blow up memory.
//
// Uses node:http/https rather than global fetch because fetch has no public
// hook for the connect-time lookup. The chat route runs on the Node runtime.

import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import zlib from "node:zlib";
import type { Readable } from "node:stream";

export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_BYTES = 1_000_000;
export const MAX_REDIRECTS = 5;

const ALLOWED_CONTENT_TYPES = [
  /^text\//i,
  /^application\/(xhtml\+xml|xml|json|ld\+json|rss\+xml|atom\+xml)\b/i,
];

export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockedUrlError";
  }
}

// --- Address policy --------------------------------------------------------

const blocked = new net.BlockList();

// IPv4: everything that is not public unicast (RFC 6890 special-purpose).
for (const [addr, prefix] of [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, incl. cloud metadata 169.254.169.254
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.88.99.0", 24], // 6to4 relay anycast
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
] as const) {
  blocked.addSubnet(addr, prefix, "ipv4");
}

// IPv6 sub-ranges of global unicast (2000::/3) that are not really public
// or that embed an IPv4 address we cannot vet. Anything outside 2000::/3
// (loopback, link-local, ULA, multicast, IPv4-mapped...) is refused anyway.
for (const [addr, prefix] of [
  ["2001::", 32], // Teredo
  ["2001:2::", 48], // benchmarking
  ["2001:10::", 28], // ORCHID
  ["2001:20::", 28], // ORCHIDv2
  ["2001:db8::", 32], // documentation
  ["2002::", 16], // 6to4
  ["3fff::", 20], // documentation
] as const) {
  blocked.addSubnet(addr, prefix, "ipv6");
}
const globalUnicastV6 = new net.BlockList();
globalUnicastV6.addSubnet("2000::", 3, "ipv6");

/** Expand an IPv6 address to its 16 bytes. Input must pass net.isIPv6. */
function ipv6Bytes(address: string): number[] {
  let addr = address.split("%")[0]; // drop zone id
  // Trailing dotted IPv4 (e.g. ::ffff:1.2.3.4) -> two hex groups.
  const v4 = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const [a, b, c, d] = v4[1].split(".").map(Number);
    addr =
      addr.slice(0, -v4[1].length) +
      ((a << 8) | b).toString(16) +
      ":" +
      ((c << 8) | d).toString(16);
  }
  const [head, tail] = addr.includes("::") ? addr.split("::") : [addr, undefined];
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail ? tail.split(":") : [];
  const fill = tail === undefined ? 0 : 8 - headGroups.length - tailGroups.length;
  const groups = [...headGroups, ...Array(fill).fill("0"), ...tailGroups];
  return groups.flatMap((g) => {
    const n = parseInt(g, 16);
    return [n >> 8, n & 0xff];
  });
}

/**
 * True if an IP address is one the agent may connect to: public unicast only.
 * Anything that is not a valid IP literal is refused.
 */
export function isPublicAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  if (family !== 6) return false;

  const bytes = ipv6Bytes(address);
  // IPv4-mapped (::ffff:a.b.c.d) and NAT64 (64:ff9b::a.b.c.d) carry an IPv4
  // address that ends up dialled; judge them by that address.
  const isMapped =
    bytes.slice(0, 10).every((b) => b === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
  const isNat64 =
    bytes[0] === 0x00 && bytes[1] === 0x64 && bytes[2] === 0xff && bytes[3] === 0x9b &&
    bytes.slice(4, 12).every((b) => b === 0);
  if (isMapped || isNat64) {
    return isPublicAddress(bytes.slice(12).join("."));
  }

  const clean = address.split("%")[0];
  return globalUnicastV6.check(clean, "ipv6") && !blocked.check(clean, "ipv6");
}

// --- URL policy ------------------------------------------------------------

export type AddressPolicy = (address: string) => boolean;

export type UrlPolicy = {
  isAllowedAddress?: AddressPolicy;
  /** Tests only: lets a local test server on a random port through. */
  allowAnyPort?: boolean;
};

/** Checks scheme, port, credentials and IP-literal hosts. Throws BlockedUrlError. */
export function assertFetchableUrl(raw: string | URL, policy: UrlPolicy = {}): URL {
  const isAllowed = policy.isAllowedAddress ?? isPublicAddress;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlockedUrlError("Not a valid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedUrlError(`Scheme ${url.protocol} is not allowed`);
  }
  if (url.username || url.password) {
    throw new BlockedUrlError("URLs with credentials are not allowed");
  }
  // URL normalises the default port to "", so any explicit port is non-default.
  if (url.port !== "" && !policy.allowAnyPort) {
    throw new BlockedUrlError("Only the default http/https ports are allowed");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && !isAllowed(host)) {
    throw new BlockedUrlError("That address is private or reserved");
  }
  if (/^localhost$|\.localhost$/i.test(host)) {
    throw new BlockedUrlError("That address is private or reserved");
  }
  return url;
}

/**
 * A net-compatible lookup that refuses to hand back any non-public address.
 * If a name resolves to a mix of public and private addresses, it is refused
 * outright rather than filtered, since that only happens when someone is
 * playing games.
 */
export function guardedLookup(isAllowed: AddressPolicy): net.LookupFunction {
  return (hostname, options, callback) => {
    dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) return callback(err, "", 0);
      const list = addresses as dns.LookupAddress[];
      if (list.length === 0 || list.some((a) => !isAllowed(a.address))) {
        const e = new BlockedUrlError(`${hostname} resolves to a private or reserved address`);
        return callback(e as NodeJS.ErrnoException, "", 0);
      }
      if (options.all) return callback(null, list as unknown as string);
      callback(null, list[0].address, list[0].family);
    });
  };
}

// --- Fetch -----------------------------------------------------------------

export type SafeFetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
  /** Test hooks. Production code must leave these unset. */
  testPolicy?: UrlPolicy;
};

export type SafeFetchResult = {
  url: string; // final URL after redirects
  status: number;
  contentType: string;
  body: string;
  truncated: boolean;
};

function requestOnce(
  url: URL,
  opts: {
    maxBytes: number;
    isAllowedAddress: AddressPolicy;
    headers: Record<string, string>;
    signal: AbortSignal;
  },
): Promise<{ status: number; location?: string; contentType: string; body: string; truncated: boolean }> {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.request(
      url,
      {
        method: "GET",
        headers: { "Accept-Encoding": "gzip, deflate, br", ...opts.headers },
        lookup: guardedLookup(opts.isAllowedAddress),
        signal: opts.signal,
        agent: false, // no pooled sockets reused across checks
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const contentType = String(res.headers["content-type"] ?? "");

        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ status, location: res.headers.location, contentType, body: "", truncated: false });
        }
        if (status < 200 || status >= 300) {
          res.resume();
          return resolve({ status, contentType, body: "", truncated: false });
        }
        if (contentType && !ALLOWED_CONTENT_TYPES.some((re) => re.test(contentType))) {
          res.destroy();
          return reject(new BlockedUrlError(`Unsupported content type: ${contentType.split(";")[0]}`));
        }

        let stream: Readable = res;
        const encoding = String(res.headers["content-encoding"] ?? "").toLowerCase().trim();
        if (encoding === "gzip" || encoding === "x-gzip") stream = res.pipe(zlib.createGunzip());
        else if (encoding === "deflate") stream = res.pipe(zlib.createInflate());
        else if (encoding === "br") stream = res.pipe(zlib.createBrotliDecompress());
        else if (encoding && encoding !== "identity") {
          res.destroy();
          return reject(new BlockedUrlError(`Unsupported content encoding: ${encoding}`));
        }

        const chunks: Buffer[] = [];
        let size = 0;
        let done = false;
        const finish = (truncated: boolean) => {
          if (done) return;
          done = true;
          resolve({ status, contentType, body: Buffer.concat(chunks).toString("utf8"), truncated });
        };
        stream.on("data", (chunk: Buffer) => {
          if (done) return;
          const room = opts.maxBytes - size;
          if (chunk.length >= room) {
            chunks.push(chunk.subarray(0, room));
            size = opts.maxBytes;
            finish(true);
            res.destroy();
            if (stream !== res) stream.destroy();
            return;
          }
          chunks.push(chunk);
          size += chunk.length;
        });
        stream.on("end", () => finish(false));
        stream.on("error", (err) => {
          if (!done) reject(err);
        });
        res.on("error", (err) => {
          if (!done) reject(err);
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

/**
 * GET a public URL with SSRF protection, a total time limit and a body size
 * cap. Throws BlockedUrlError for policy refusals; other errors (DNS, network,
 * abort) are thrown as-is.
 */
export async function safeFetch(rawUrl: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const policy = options.testPolicy ?? {};
  const isAllowedAddress = policy.isAllowedAddress ?? isPublicAddress;
  const headers = options.headers ?? {};
  const signal = AbortSignal.timeout(timeoutMs);

  let url = assertFetchableUrl(rawUrl, policy);
  for (let hop = 0; ; hop++) {
    const res = await requestOnce(url, { maxBytes, isAllowedAddress, headers, signal });
    if (res.location === undefined) {
      return { url: url.toString(), status: res.status, contentType: res.contentType, body: res.body, truncated: res.truncated };
    }
    if (hop >= MAX_REDIRECTS) {
      throw new BlockedUrlError(`Too many redirects (more than ${MAX_REDIRECTS})`);
    }
    url = assertFetchableUrl(new URL(res.location, url), policy);
  }
}
