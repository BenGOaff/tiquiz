// lib/email/refundGoodbyeEmail.ts
//
// L'EMAIL DE REMBOURSEMENT : ON SE QUITTE BIEN.
//
// Béné, 20 août 2026 : "je voudrais un truc auto qui dit pas de souci si
// ça n'a pas répondu à tes attentes, je reste dans les parages si je peux
// t'aider ! N'hésite pas à me dire s'il y a des choses que je peux
// améliorer, style on se quitte bons amis."
//
// Deux choses que cet email fait et que celui de Stripe ne fait pas : il
// dit clairement que l'abonnement s'arrête (le cacher se paierait en
// "pourquoi je ne peux plus me connecter ?"), et il DEMANDE la raison. Un
// remboursement est le seul moment où quelqu'un a une raison précise de
// dire ce qui n'allait pas, et où il n'a plus rien à perdre à le dire.
//
// Le délai de 5 à 10 jours ouvrés est celui annoncé par Stripe, pas une
// estimation maison : c'est la question numéro un qui arrive au support
// après un remboursement.
//
// Jumeau de `refundGoodbyeEmail` côté Atelier. Best-effort : un échec
// d'envoi ne doit JAMAIS annuler la rétrogradation, qui est la partie qui
// compte. Jamais de tiret cadratin.

import "server-only";

const RESEND_URL = "https://api.resend.com/emails";

function buildContent(prenom: string | null): { subject: string; html: string; text: string } {
  const bonjour = prenom && prenom.trim() ? `Hey ${prenom.trim()} 👋` : "Hey 👋";
  const lignes = [
    bonjour,
    "C'est fait, ton remboursement est parti. Compte 5 à 10 jours ouvrés avant de le voir sur ton relevé, c'est le délai annoncé par Stripe et il ne dépend plus de moi.",
    "Ton abonnement Tiquiz s'arrête là, forcément. Ton compte reste ouvert et tes quiz restent à toi, tu repasses simplement en gratuit.",
    "Si Tiquiz n'a pas répondu à tes attentes, ça ne me vexe pas (vraiment pas). Ce qui m'intéresse, c'est de savoir pourquoi. Réponds à cet email et dis moi ce qui manquait, ce qui coinçait, ou ce que tu cherchais et que tu n'as pas trouvé. Je lis tout, et je m'en sers pour corriger.",
    "Et si un jour tu as une question sur les quiz, tu peux m'écrire même sans être client. Je reste dans les parages.",
    "Béné",
  ];
  const html = lignes
    .map(
      (l) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:#1f2340;font-family:Inter,system-ui,sans-serif;">${l}</p>`,
    )
    .join("");
  return {
    subject: "Ton remboursement est parti",
    html: `<div style="max-width:560px;margin:0 auto;padding:24px;">${html}</div>`,
    text: lignes.join("\n\n"),
  };
}

/** Rend `true` seulement si l'email est vraiment parti. */
export async function sendRefundGoodbyeEmail(args: {
  email: string;
  prenom?: string | null;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[refundGoodbyeEmail] RESEND_API_KEY manquante, email non envoye.");
    return false;
  }
  const fromEmail =
    process.env.SUPPORT_FROM_EMAIL?.trim() ||
    process.env.RESELLER_FROM_EMAIL?.trim() ||
    "hello@tipote.com";

  try {
    const { subject, html, text } = buildContent(args.prenom ?? null);
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Tiquiz <${fromEmail}>`,
        to: [args.email],
        subject,
        html,
        text,
        headers: { "X-Entity-Ref-ID": "refund-goodbye" },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[refundGoodbyeEmail] Resend failed", res.status, body.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[refundGoodbyeEmail] envoi impossible:", (e as Error).message);
    return false;
  }
}
