import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import zlib from "node:zlib";
import type { AddressInfo } from "node:net";
import {
  BlockedUrlError,
  assertFetchableUrl,
  guardedLookup,
  isPublicAddress,
  safeFetch,
} from "./safeFetch.ts";

// --- address policy ---------------------------------------------------------

test("private, loopback, link-local and reserved addresses are refused", () => {
  for (const addr of [
    "127.0.0.1", "127.1.2.3", "10.0.0.1", "172.16.0.1", "172.31.255.255",
    "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1",
    "255.255.255.255", "198.18.0.1", "192.0.2.1",
    "::1", "::", "fe80::1", "fe80::1%eth0", "fc00::1", "fd12:3456::1", "ff02::1",
    "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:169.254.169.254", "::ffff:10.0.0.1",
    "64:ff9b::a00:1", "64:ff9b::127.0.0.1", "2002:7f00:1::", "2001:db8::1", "2001::1",
    "::127.0.0.1", "fd00:ec2::254",
    "not-an-ip", "",
  ]) {
    assert.equal(isPublicAddress(addr), false, addr);
  }
});

test("public addresses are allowed", () => {
  for (const addr of [
    "1.1.1.1", "8.8.8.8", "93.184.215.14", "172.15.255.255", "172.32.0.1",
    "2606:4700:4700::1111", "2a00:1450:4009:81f::200e", "::ffff:8.8.8.8", "64:ff9b::808:808",
  ]) {
    assert.equal(isPublicAddress(addr), true, addr);
  }
});

// --- URL policy -------------------------------------------------------------

test("unsafe URLs are refused before any request", () => {
  for (const url of [
    "file:///etc/passwd",
    "ftp://example.com/",
    "gopher://example.com/",
    "http://user:pass@example.com/",
    "http://example.com:8080/",
    "https://example.com:22/",
    "http://127.0.0.1/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://2130706433/", // 127.0.0.1 as a decimal integer
    "http://0x7f.1/", // 127.0.0.1 in hex shorthand
    "http://localhost/",
    "http://foo.localhost/",
    "not a url",
  ]) {
    assert.throws(() => assertFetchableUrl(url), BlockedUrlError, url);
  }
});

test("ordinary public URLs pass the URL check", () => {
  assert.equal(assertFetchableUrl("https://example.com/a?b=c").hostname, "example.com");
  assert.equal(assertFetchableUrl("http://example.com:80/").hostname, "example.com");
  assert.equal(assertFetchableUrl("https://8.8.8.8/").hostname, "8.8.8.8");
});

test("the connect-time DNS lookup refuses names that resolve to private addresses", async () => {
  const lookup = guardedLookup(isPublicAddress);
  for (const all of [false, true]) {
    const err = await new Promise<Error | null>((resolve) =>
      lookup("localhost", { all } as never, (e: Error | null) => resolve(e)),
    );
    assert.ok(err instanceof BlockedUrlError, `all=${all}`);
  }
});

// --- end-to-end against a local server --------------------------------------
// The default policy blocks 127.0.0.1, so these tests use a policy that lets
// loopback through and blocks everything else, then check that redirects to
// private targets, slow responses and huge bodies are still stopped.

let server: http.Server;
let base: string;
const onlyLoopback = { isAllowedAddress: (a: string) => a === "127.0.0.1", allowAnyPort: true };

before(async () => {
  server = http.createServer((req, res) => {
    const path = req.url ?? "/";
    if (path === "/ok") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<p>hello</p>");
    } else if (path === "/big") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      const chunk = Buffer.alloc(64 * 1024, "a");
      let sent = 0;
      const push = () => {
        while (sent < 50 * 1024 * 1024) {
          sent += chunk.length;
          if (!res.write(chunk)) return res.once("drain", push);
        }
        res.end();
      };
      res.on("close", () => (sent = Infinity));
      push();
    } else if (path === "/gzip-bomb") {
      res.writeHead(200, { "Content-Type": "text/plain", "Content-Encoding": "gzip" });
      res.end(zlib.gzipSync(Buffer.alloc(20 * 1024 * 1024, "a")));
    } else if (path === "/slow") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.write("start");
      // never ends
    } else if (path === "/binary") {
      res.writeHead(200, { "Content-Type": "application/octet-stream" });
      res.end("xx");
    } else if (path.startsWith("/redirect?to=")) {
      res.writeHead(302, { Location: decodeURIComponent(path.slice("/redirect?to=".length)) });
      res.end();
    } else if (path === "/loop") {
      res.writeHead(302, { Location: "/loop" });
      res.end();
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.closeAllConnections();
  server.close();
});

test("the default policy refuses the local server outright", async () => {
  await assert.rejects(safeFetch(`${base}/ok`), BlockedUrlError);
});

test("a normal page comes back", async () => {
  const res = await safeFetch(`${base}/ok`, { testPolicy: onlyLoopback });
  assert.equal(res.status, 200);
  assert.equal(res.body, "<p>hello</p>");
  assert.equal(res.truncated, false);
});

test("redirects to private or metadata addresses are refused", async () => {
  for (const target of [
    "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.1/",
    "http://localhost/",
    "file:///etc/passwd",
  ]) {
    await assert.rejects(
      safeFetch(`${base}/redirect?to=${encodeURIComponent(target)}`, { testPolicy: onlyLoopback }),
      BlockedUrlError,
      target,
    );
  }
});

test("safe redirects are followed and the final URL is reported", async () => {
  const res = await safeFetch(`${base}/redirect?to=${encodeURIComponent("/ok")}`, { testPolicy: onlyLoopback });
  assert.equal(res.body, "<p>hello</p>");
  assert.equal(res.url, `${base}/ok`);
});

test("redirect loops stop", async () => {
  await assert.rejects(safeFetch(`${base}/loop`, { testPolicy: onlyLoopback }), /Too many redirects/);
});

test("large bodies are cut off at the size cap", async () => {
  const res = await safeFetch(`${base}/big`, { testPolicy: onlyLoopback, maxBytes: 100_000 });
  assert.equal(res.truncated, true);
  assert.equal(res.body.length, 100_000);
});

test("the size cap applies after decompression", async () => {
  const res = await safeFetch(`${base}/gzip-bomb`, { testPolicy: onlyLoopback, maxBytes: 100_000 });
  assert.equal(res.truncated, true);
  assert.equal(res.body.length, 100_000);
});

test("slow responses time out", async () => {
  const started = Date.now();
  await assert.rejects(safeFetch(`${base}/slow`, { testPolicy: onlyLoopback, timeoutMs: 300 }));
  assert.ok(Date.now() - started < 2_000);
});

test("non-text content types are refused", async () => {
  await assert.rejects(safeFetch(`${base}/binary`, { testPolicy: onlyLoopback }), BlockedUrlError);
});
