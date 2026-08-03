// lib/customDomainsServer.ts
//
// Node-runtime-only piece of the custom-domains feature: the actual
// DNS lookup. Kept separate from lib/customDomains.ts so the Edge
// middleware never pulls `node:dns` into its bundle (Turbopack traces
// dynamic imports too, so the split has to be at the module level).
//
// Only API routes that need to verify ownership should import from
// here. Everything else stays on lib/customDomains.ts.
//
// -- POURQUOI CE FICHIER A CHANGE (drame Bene, 3 aout 2026) ----------
//
// "J'essaye d'ajouter un domaine a Tiquiz via Cloudflare et ca marche
// pas alors que c'est propage." Elle avait raison : son CNAME
// `monquiz.tipote.com -> connect.tipote.com` etait en place, confirme
// par DNSChecker depuis une dizaine de resolveurs dans le monde. Tiquiz
// repondait quand meme "DNS resolves to 3.165.136.x instead of
// 82.25.115.166".
//
// DEUX DEFAUTS, ET LE PREMIER EST CONCEPTUEL.
//
// 1. ON DEMANDAIT UN CNAME ET ON VERIFIAIT UNE IP. L'ecran dit "creez un
//    CNAME vers connect.tipote.com". Le controle, lui, ne regardait QUE
//    l'adresse au bout de la chaine, comparee a une constante. On
//    refusait donc une configuration parfaitement conforme a ce qu'on
//    venait de demander.
//
//    Le CNAME est la MEILLEURE preuve, et de loin : il designe notre
//    hote par son NOM, donc il reste vrai le jour ou le serveur change
//    d'IP. C'est meme tout l'interet d'un CNAME. On le verifie en
//    premier ; l'IP ne sert plus que de repli, pour les domaines a
//    l'apex qui ne PEUVENT pas porter de CNAME.
//
// 2. UN SEUL RESOLVEUR DECIDAIT. `dns.resolve4` interroge les serveurs
//    de `/etc/resolv.conf`. Si celui de la prod repond de travers (cache
//    perime, filtrage, resolveur d'hebergeur qui intercepte), la
//    creatrice est bloquee pour toujours et n'a AUCUN recours : son DNS
//    est bon partout dans le monde sauf vu de chez nous. On interroge
//    donc aussi un resolveur public en secours.
//
// La regle generale : on verifie ce qu'on a DEMANDE, et on ne laisse pas
// un seul serveur decider si une cliente a le droit d'avancer.

import "server-only";
import { promises as dns } from "node:dns";

import { DNS_TARGET_IP, isOurCnameTarget } from "./customDomains";

// Re-exportee pour les appelants deja en Node ; la definition vit dans
// customDomains.ts, qui n'a pas `server-only` et reste donc testable.
export { isOurCnameTarget };

export type DnsCheckResult = {
  ok: boolean;
  resolvedIps: string[];
  /** La cible du CNAME trouvee, quand il y en a une. */
  cnameTarget?: string | null;
  /** Ce qui a prouve la configuration. Sert aux logs et aux tests. */
  matchedBy?: "cname" | "ip" | null;
  error?: string;
};


/**
 * Interroge un resolveur PUBLIC en DNS-over-HTTPS. Le secours du point 2
 * ci-dessus.
 *
 * On demande le type A : un resolveur recursif suit la chaine de CNAME
 * et renvoie, dans `Answer`, a la fois les maillons CNAME et les
 * adresses finales. On recupere donc les deux en une requete.
 *
 * Best-effort de bout en bout : reseau coupe, quota, reponse illisible,
 * on rend un resultat vide et l'appelant s'en tient au resolveur local.
 * Ce chemin ne doit jamais faire ECHOUER une verification, seulement en
 * sauver une.
 */
async function resolveViaDoh(hostname: string): Promise<{ ips: string[]; cnames: string[] }> {
  const empty = { ips: [], cnames: [] };
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
      { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(5_000) },
    );
    if (!res.ok) return empty;
    const json = (await res.json()) as { Answer?: { type?: number; data?: string }[] };
    const answers = Array.isArray(json.Answer) ? json.Answer : [];
    return {
      // type 1 = A, type 5 = CNAME (RFC 1035).
      ips: answers.filter((a) => a.type === 1).map((a) => String(a.data ?? "")).filter(Boolean),
      cnames: answers.filter((a) => a.type === 5).map((a) => String(a.data ?? "")).filter(Boolean),
    };
  } catch {
    return empty;
  }
}

/**
 * Resolves the A records for `hostname` and checks one matches our VPS
 * IP. Works for both apex domains (A record straight to us) and
 * subdomains CNAMEd to our `connect.tipote.com` — the OS resolver
 * follows the CNAME chain transparently.
 *
 * Returns the resolved IPs alongside the verdict so the UI can show
 * "you pointed it to X instead of Y" when the check fails.
 */
export async function verifyDomainDns(hostname: string): Promise<DnsCheckResult> {
  let resolvedIps: string[] = [];
  let cnameTarget: string | null = null;
  let localError: string | undefined;

  // 1. Le CNAME, la preuve qu'on a DEMANDEE.
  try {
    const cnames = await dns.resolveCname(hostname);
    cnameTarget = cnames[0] ?? null;
    if (cnames.some((c) => isOurCnameTarget(c))) {
      return { ok: true, resolvedIps: [], cnameTarget, matchedBy: "cname" };
    }
  } catch {
    // Pas de CNAME : le cas normal d'un domaine a l'apex, et celui d'un
    // sous-domaine pointe en A. On continue.
  }

  // 2. L'IP, pour les domaines a l'apex qui ne peuvent pas avoir de CNAME.
  try {
    resolvedIps = await dns.resolve4(hostname);
    if (resolvedIps.includes(DNS_TARGET_IP)) {
      return { ok: true, resolvedIps, cnameTarget, matchedBy: "ip" };
    }
  } catch (e) {
    localError = (e as Error).message;
  }

  // 3. Le resolveur public, quand le notre a repondu autre chose. C'est
  // ce cran qui debloque une creatrice dont le DNS est bon partout sauf
  // vu de notre serveur.
  const doh = await resolveViaDoh(hostname);
  if (doh.cnames.some((c) => isOurCnameTarget(c))) {
    return {
      ok: true,
      resolvedIps: doh.ips,
      cnameTarget: doh.cnames[0] ?? cnameTarget,
      matchedBy: "cname",
    };
  }
  if (doh.ips.includes(DNS_TARGET_IP)) {
    return { ok: true, resolvedIps: doh.ips, cnameTarget, matchedBy: "ip" };
  }

  // Rien ne colle : on rend ce qu'on a vu de plus complet, pour que le
  // message a l'ecran soit exploitable.
  const seenIps = resolvedIps.length > 0 ? resolvedIps : doh.ips;
  return {
    ok: false,
    resolvedIps: seenIps,
    cnameTarget: cnameTarget ?? doh.cnames[0] ?? null,
    matchedBy: null,
    error: seenIps.length === 0 ? (localError ?? "Hostname does not resolve yet.") : undefined,
  };
}

/**
 * Walks the hostname up the DNS hierarchy until it finds an NS record
 * set. For `blog.alice.com` this typically returns the NS for
 * `alice.com` — DNS hierarchy means the parent's authoritative servers
 * own the entire subtree.
 *
 * Returns an empty array if no level resolves (very weird DNS state,
 * or hostname is bogus). The caller treats that as "unknown registrar"
 * and falls back to generic instructions.
 *
 * We intentionally don't use a public suffix list. The naive
 * "trim-leftmost-label" loop covers every real-world case (apex, www,
 * arbitrary subdomain) without dragging in a 200 KB asset.
 */
export async function findAuthoritativeNs(hostname: string): Promise<string[]> {
  const labels = hostname.toLowerCase().split(".").filter(Boolean);
  while (labels.length >= 2) {
    const candidate = labels.join(".");
    try {
      const ns = await dns.resolveNs(candidate);
      if (ns.length > 0) return ns;
    } catch {
      // ENOTFOUND, ENODATA, etc. — keep climbing.
    }
    labels.shift();
  }
  return [];
}
