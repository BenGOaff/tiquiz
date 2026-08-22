// lib/email/magicLinkContent.ts
//
// LE LIEN DE CONNEXION, ENVOYÉ PAR NOUS, SOUS LE NOM DE TIQUIZ.
//
// Béné, 22 août : "je demande un lien magique sur Tiquiz et je reçois
// les trucs Tipote, c'est pas pro du tout."
//
// Elle recevait un email intitulé "Connexion Tipote", signé "Béné -
// Tipote", qui renvoyait vers le support de Tipote. Ce n'était pas une
// faute de frappe dans notre code : **cet email ne venait pas de nous**.
// Le bouton "lien magique" appelait `signInWithOtp`, donc c'était
// Supabase qui écrivait, avec le gabarit configuré dans son tableau de
// bord, resté au nom de Tipote.
//
// Le mot de passe oublié, lui, avait été repris en email maison le 31
// juillet. **Une moitié corrigée**, et c'est le motif le plus répété de
// ce dépôt : le partage du résultat (7 août), le retour de l'Atelier
// (3 août), l'alignement du sous-titre (3 août). L'utilisatrice ne voit
// pas deux mécaniques, elle voit un produit qui se présente sous deux
// noms selon le bouton qu'elle a cliqué.
//
// Le cadre, l'expéditeur et l'envoi vivent dans `tiquizShell.ts`, avec
// ceux du mot de passe oublié : les deux ne peuvent plus diverger.

// Aucun `server-only` ici : c'est du texte qui part sous le nom de Béné,
// il doit rester lisible par un test. L'ENVOI vit à côté.

import { pickCopy, renderTiquizEmail, type TiquizEmailCopy } from "./tiquizShell";

/** Les 7 langues de l'interface. Aucun tiret cadratin, nulle part. */
const COPY: Record<string, TiquizEmailCopy> = {
  fr: {
    subject: "Tiquiz : ton lien de connexion",
    heading: "Ton lien de connexion",
    intro:
      "Tu as demandé à te connecter à Tiquiz sans mot de passe. Clique sur le bouton ci dessous, et te voilà dans ton tableau de bord.",
    cta: "Me connecter à Tiquiz",
    ignore:
      "Ce lien est valable une heure et ne sert qu'une fois. Si tu n'as rien demandé, ignore cet email : personne ne peut se connecter sans lui.",
    linkFallback: "Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :",
    footer: "Tiquiz, l'outil de quiz de l'écosystème Tipote.",
  },
  en: {
    subject: "Tiquiz: your login link",
    heading: "Your login link",
    intro:
      "You asked to sign in to Tiquiz without a password. Click the button below and you are in your dashboard.",
    cta: "Sign in to Tiquiz",
    ignore:
      "This link lasts one hour and works once. If you did not ask for it, ignore this email: nobody can sign in without it.",
    linkFallback: "If the button does not work, copy this link into your browser:",
    footer: "Tiquiz, the quiz tool of the Tipote ecosystem.",
  },
  es: {
    subject: "Tiquiz: tu enlace de acceso",
    heading: "Tu enlace de acceso",
    intro:
      "Has pedido entrar en Tiquiz sin contraseña. Haz clic en el botón de abajo y estarás en tu panel.",
    cta: "Entrar en Tiquiz",
    ignore:
      "Este enlace dura una hora y solo sirve una vez. Si no lo has pedido, ignora este correo: nadie puede entrar sin él.",
    linkFallback: "Si el botón no funciona, copia este enlace en tu navegador:",
    footer: "Tiquiz, la herramienta de quiz del ecosistema Tipote.",
  },
  it: {
    subject: "Tiquiz: il tuo link di accesso",
    heading: "Il tuo link di accesso",
    intro:
      "Hai chiesto di accedere a Tiquiz senza password. Clicca sul pulsante qui sotto e sei nella tua dashboard.",
    cta: "Accedi a Tiquiz",
    ignore:
      "Questo link dura un'ora e vale una sola volta. Se non l'hai chiesto, ignora questa email: nessuno può accedere senza.",
    linkFallback: "Se il pulsante non funziona, copia questo link nel tuo browser:",
    footer: "Tiquiz, lo strumento quiz dell'ecosistema Tipote.",
  },
  pt: {
    subject: "Tiquiz: o teu link de acesso",
    heading: "O teu link de acesso",
    intro:
      "Pediste para entrar no Tiquiz sem palavra-passe. Clica no botão abaixo e estás no teu painel.",
    cta: "Entrar no Tiquiz",
    ignore:
      "Este link dura uma hora e serve uma vez. Se não pediste, ignora este email: ninguém consegue entrar sem ele.",
    linkFallback: "Se o botão não funcionar, copia este link para o teu navegador:",
    footer: "Tiquiz, a ferramenta de quiz do ecossistema Tipote.",
  },
  "pt-BR": {
    subject: "Tiquiz: seu link de acesso",
    heading: "Seu link de acesso",
    intro:
      "Você pediu para entrar no Tiquiz sem senha. Clique no botão abaixo e você está no seu painel.",
    cta: "Entrar no Tiquiz",
    ignore:
      "Este link dura uma hora e vale uma vez. Se você não pediu, ignore este email: ninguém consegue entrar sem ele.",
    linkFallback: "Se o botão não funcionar, copie este link no seu navegador:",
    footer: "Tiquiz, a ferramenta de quiz do ecossistema Tipote.",
  },
  ar: {
    subject: "Tiquiz: رابط الدخول الخاص بك",
    heading: "رابط الدخول الخاص بك",
    intro: "طلبت الدخول إلى Tiquiz بدون كلمة مرور. اضغط على الزر أدناه وستكون في لوحتك.",
    cta: "الدخول إلى Tiquiz",
    ignore:
      "هذا الرابط صالح لمدة ساعة ويعمل مرة واحدة. إذا لم تطلبه، تجاهل هذا البريد: لا أحد يستطيع الدخول بدونه.",
    linkFallback: "إذا لم يعمل الزر، انسخ هذا الرابط في متصفحك:",
    footer: "Tiquiz، أداة الاختبارات في منظومة Tipote.",
  },
};

/** Le contenu seul, pour que les tests puissent le lire. */
export function buildMagicLinkContent(actionLink: string, locale?: string | null) {
  const copy = pickCopy(COPY, locale);
  return { ...renderTiquizEmail(actionLink, copy), subject: copy.subject };
}
