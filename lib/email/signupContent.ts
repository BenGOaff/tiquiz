// lib/email/signupContent.ts
//
// LA CONFIRMATION D'INSCRIPTION, ÉCRITE PAR NOUS.
//
// Béné, 22 août : "On peut pas l'envoyer nous-même le lien de
// confirmation d'inscription, en mode joli ?"
//
// Oui, et c'était le DERNIER email encore confié à Supabase. Tant qu'il
// l'était, la toute première chose qu'une nouvelle inscrite recevait de
// Tiquiz était un email au nom de Tipote. La première impression, sur le
// seul email qu'elle est OBLIGÉE d'ouvrir pour entrer.
//
// Aucun `server-only` ici : c'est du texte qui part sous le nom de Béné,
// il doit rester lisible par un test. L'ENVOI vit à côté.

import { pickCopy, renderTiquizEmail, type TiquizEmailCopy } from "./tiquizShell";

/** Les 7 langues de l'interface. Aucun tiret cadratin, nulle part. */
const COPY: Record<string, TiquizEmailCopy> = {
  fr: {
    subject: "Tiquiz : confirme ton adresse",
    heading: "Bienvenue dans Tiquiz",
    intro:
      "Il reste un clic. Confirme ton adresse et ton compte s'ouvre, tu pourras créer ton premier quiz dans la foulée.",
    cta: "Confirmer mon adresse",
    ignore:
      "Si tu n'as pas créé de compte Tiquiz, ignore cet email : sans ce clic, il ne se passera rien.",
    linkFallback: "Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :",
    footer: "Tiquiz, l'outil de quiz de l'écosystème Tipote.",
  },
  en: {
    subject: "Tiquiz: confirm your email",
    heading: "Welcome to Tiquiz",
    intro:
      "One click left. Confirm your email and your account opens, so you can build your first quiz right away.",
    cta: "Confirm my email",
    ignore:
      "If you did not create a Tiquiz account, ignore this email: without this click, nothing happens.",
    linkFallback: "If the button does not work, copy this link into your browser:",
    footer: "Tiquiz, the quiz tool of the Tipote ecosystem.",
  },
  es: {
    subject: "Tiquiz: confirma tu correo",
    heading: "Te damos la bienvenida a Tiquiz",
    intro:
      "Queda un clic. Confirma tu correo y tu cuenta se abre, para crear tu primer quiz enseguida.",
    cta: "Confirmar mi correo",
    ignore:
      "Si no has creado una cuenta Tiquiz, ignora este correo: sin este clic, no pasa nada.",
    linkFallback: "Si el botón no funciona, copia este enlace en tu navegador:",
    footer: "Tiquiz, la herramienta de quiz del ecosistema Tipote.",
  },
  it: {
    subject: "Tiquiz: conferma la tua email",
    heading: "Ti diamo il benvenuto in Tiquiz",
    intro:
      "Manca un clic. Conferma la tua email e il tuo account si apre, per creare subito il tuo primo quiz.",
    cta: "Confermare la mia email",
    ignore:
      "Se non hai creato un account Tiquiz, ignora questa email: senza questo clic, non succede nulla.",
    linkFallback: "Se il pulsante non funziona, copia questo link nel tuo browser:",
    footer: "Tiquiz, lo strumento quiz dell'ecosistema Tipote.",
  },
  pt: {
    subject: "Tiquiz: confirma o teu email",
    heading: "Boas-vindas ao Tiquiz",
    intro:
      "Falta um clique. Confirma o teu email e a tua conta abre, para criares o teu primeiro quiz de seguida.",
    cta: "Confirmar o meu email",
    ignore:
      "Se não criaste uma conta Tiquiz, ignora este email: sem este clique, não acontece nada.",
    linkFallback: "Se o botão não funcionar, copia este link para o teu navegador:",
    footer: "Tiquiz, a ferramenta de quiz do ecossistema Tipote.",
  },
  "pt-BR": {
    subject: "Tiquiz: confirme seu email",
    heading: "Boas-vindas ao Tiquiz",
    intro:
      "Falta um clique. Confirme seu email e sua conta abre, para você criar seu primeiro quiz em seguida.",
    cta: "Confirmar meu email",
    ignore:
      "Se você não criou uma conta Tiquiz, ignore este email: sem este clique, nada acontece.",
    linkFallback: "Se o botão não funcionar, copie este link no seu navegador:",
    footer: "Tiquiz, a ferramenta de quiz do ecossistema Tipote.",
  },
  ar: {
    subject: "Tiquiz: أكد بريدك الإلكتروني",
    heading: "مرحبا بك في Tiquiz",
    intro: "بقيت نقرة واحدة. أكد بريدك وسيفتح حسابك، لتنشئ أول اختبار لك مباشرة.",
    cta: "تأكيد بريدي الإلكتروني",
    ignore: "إذا لم تنشئ حساب Tiquiz، تجاهل هذا البريد: بدون هذه النقرة لا يحدث شيء.",
    linkFallback: "إذا لم يعمل الزر، انسخ هذا الرابط في متصفحك:",
    footer: "Tiquiz، أداة الاختبارات في منظومة Tipote.",
  },
};

/** Le contenu seul, pour que les tests puissent le lire. */
export function buildSignupContent(actionLink: string, locale?: string | null) {
  const copy = pickCopy(COPY, locale);
  return { ...renderTiquizEmail(actionLink, copy), subject: copy.subject };
}
