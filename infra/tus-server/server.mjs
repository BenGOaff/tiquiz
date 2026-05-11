// Resumable upload endpoint for popquiz videos.
//
// Listens on 127.0.0.1:1080 behind nginx (tus.tipote.com / tus.tiquiz.com).
// Files land at:  <STORAGE_ROOT>/<app>/raw/<userId>/<videoId>/(source|thumbnail).<ext>
//
// Auth: every POST/PATCH must carry `Authorization: Bearer <jwt>` minted by
// the originating Next app. The JWT's `app` claim selects which secret we
// validate against, so Tipote and Tiquiz can't impersonate each other.
//
// File placement is decided entirely from the JWT claims — client-supplied
// tus metadata is informational only. That's the security boundary: the
// browser cannot pick where its file ends up.

import http from "node:http";
import path from "node:path";
import { Server } from "@tus/server";
import { FileStore } from "@tus/file-store";
import jwt from "jsonwebtoken";

const PORT = Number(process.env.PORT || 1080);
const HOST = process.env.HOST || "127.0.0.1";
const STORAGE_ROOT = process.env.STORAGE_ROOT || "/srv/popquiz-videos";
const MAX_SIZE = Number(process.env.MAX_SIZE_BYTES || 20 * 1024 ** 3);

const SECRETS = {
  tipote: process.env.TIPOTE_JWT_SECRET || "",
  tiquiz: process.env.TIQUIZ_JWT_SECRET || "",
};

if (!SECRETS.tipote && !SECRETS.tiquiz) {
  console.error(
    "[tus] No JWT secret configured. Set TIPOTE_JWT_SECRET and/or TIQUIZ_JWT_SECRET.",
  );
  process.exit(1);
}

const APP_RE = /^(tipote|tiquiz)$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXT_RE = /^[a-z0-9]{1,8}$/;
const KIND_RE = /^(source|thumbnail|thumbnail-custom)$/;

function httpError(status, message) {
  const err = new Error(message);
  err.status_code = status;
  return err;
}

function verifyAuth(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) throw httpError(401, "Missing bearer token");
  const raw = h.slice(7).trim();

  // Peek at the payload to choose which secret to verify against.
  // jwt.decode does not validate the signature, so we still call
  // jwt.verify below before trusting anything.
  const peek = jwt.decode(raw);
  if (!peek || typeof peek !== "object" || typeof peek.app !== "string") {
    throw httpError(401, "Malformed token");
  }
  const secret = SECRETS[peek.app];
  if (!secret) throw httpError(401, "Unknown app");

  let claims;
  try {
    claims = jwt.verify(raw, secret, { algorithms: ["HS256"] });
  } catch {
    throw httpError(401, "Invalid token");
  }

  if (!APP_RE.test(claims.app)) throw httpError(401, "Bad app claim");
  if (typeof claims.sub !== "string" || !UUID_RE.test(claims.sub)) {
    throw httpError(401, "Bad sub claim");
  }
  if (typeof claims.videoId !== "string" || !UUID_RE.test(claims.videoId)) {
    throw httpError(401, "Bad videoId claim");
  }
  if (typeof claims.ext !== "string" || !EXT_RE.test(claims.ext)) {
    throw httpError(401, "Bad ext claim");
  }
  if (typeof claims.kind !== "string" || !KIND_RE.test(claims.kind)) {
    throw httpError(401, "Bad kind claim");
  }
  return claims;
}

function relPathFromClaims(c) {
  const filenameByKind = {
    source: `source.${c.ext}`,
    thumbnail: `thumbnail.${c.ext}`,
    "thumbnail-custom": `thumbnail-custom.${c.ext}`,
  };
  const fname = filenameByKind[c.kind] ?? `source.${c.ext}`;
  return path.posix.join(c.app, "raw", c.sub, c.videoId, fname);
}

const tus = new Server({
  path: "/files",
  datastore: new FileStore({ directory: STORAGE_ROOT }),
  maxSize: MAX_SIZE,
  respectForwardedHeaders: true,
  namingFunction(req) {
    const c = req._claims;
    if (!c) throw httpError(401, "Missing claims");
    return relPathFromClaims(c);
  },
  generateUrl(_req, { proto, host, baseUrl, path: p, id }) {
    return `${proto}://${host}${baseUrl}${p}/${encodeURIComponent(id)}`;
  },
  getFileIdFromRequest(req) {
    const u = req.url || "";
    const m = u.match(/\/files\/([^?]+)/);
    return m ? decodeURIComponent(m[1]) : undefined;
  },
});

const server = http.createServer((req, res) => {
  // Browser preflight. The JWT in Authorization is the only auth gate;
  // any origin can attempt an upload, the token is what authorises it.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, GET, HEAD, PATCH, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Tus-Resumable, Upload-Length, Upload-Offset, Upload-Metadata, Upload-Defer-Length, Upload-Concat, X-Requested-With",
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Tus-Resumable, Tus-Version, Tus-Max-Size, Tus-Extension, Upload-Offset, Upload-Length, Location",
  );
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "POST" || req.method === "PATCH") {
    try {
      req._claims = verifyAuth(req);
    } catch (e) {
      res.statusCode = e.status_code || 401;
      res.setHeader("Content-Type", "text/plain");
      res.end(e.message);
      return;
    }
  }

  return tus.handle(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`[tus] listening on ${HOST}:${PORT}, storage=${STORAGE_ROOT}`);
});

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    console.log(`[tus] ${sig} received, shutting down`);
    server.close(() => process.exit(0));
  });
}
