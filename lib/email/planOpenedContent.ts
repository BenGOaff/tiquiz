// lib/email/planOpenedContent.ts
//
// L'EMAIL QUI CONFIRME QU'UN PAIEMENT A OUVERT QUELQUE CHOSE.
//
// Béné, 23 août 2026, apres le premier vrai paiement sur notre bon de
// commande : "j'ai bien reçu un lien de connexion mais pas le mail de
// bienvenue : il faut vérifier qu'une personne qui était en gratuit et
// passe en payant reçoit bien ce qu'il faut."
//
// Elle avait raison, et le trou etait plus large que ca. Apres un
// paiement, `grantPlanByEmail` envoyait `sendMagicLinkEmail`, c'est a
// dire un email intitule "ton lien de connexion" qui commence par "Tu as
// demandé à te connecter à Tiquiz sans mot de passe". **La cliente n'a
// pas demandé à se connecter : elle a payé.** Aucun message ne
// confirmait l'achat, ne nommait le plan ouvert, ni ne disait ou se
// gerent la carte et les factures.
//
// Et pour une cliente DEJA inscrite en gratuit, c'etait pire : elle
// recevait un lien de connexion vers un compte qu'elle savait deja
// avoir, donc rien qui ressemble a une confirmation de paiement.
//
// C'est exactement le drame de l'Atelier du 7 aout, dans l'autre repo :
// "l'email de montée de palier n'est plus l'email de bienvenue". On
// souhaitait la bienvenue a quelqu'un qui avait deja le produit, sans
// jamais lui confirmer que sa commande avait ouvert ce qu'il venait de
// payer. La correction n'avait pas ete portee ici.
//
// -- LA SITUATION EST UN PARAMETRE, JAMAIS DEVINEE ---------------------
//
// `situation` est obligatoire. On ne peut pas appeler cette fonction
// sans avoir dit de quel cas on parle, et c'est la seule protection qui
// survit au prochain qui touchera au fichier (lecon des controles
// "profil" appliques a un quiz score, 1er aout).
//
// Aucun `server-only` : ce texte part sous le nom de Béné, un test doit
// pouvoir le lire. L'ENVOI vit dans `planOpenedEmail.ts`.

import { pickCopy, renderTiquizEmail, type TiquizEmailCopy } from "./tiquizShell";

/**
 * Le compte a-t-il ete cree par cet achat, ou existait-il deja ?
 *
 * Les deux ont besoin du lien de connexion, mais pas du meme message :
 * on ne souhaite pas la bienvenue a quelqu'un qui utilise Tiquiz depuis
 * six mois, et on ne dit pas "ton plan change" a quelqu'un qui n'avait
 * pas de compte il y a trente secondes.
 */
export type PlanOpenedSituation = "nouveau-compte" | "montee-de-palier";

interface PlanOpenedCopy {
  subjectNouveau: string;
  subjectMontee: string;
  headingNouveau: string;
  headingMontee: string;
  introNouveau: string;
  introMontee: string;
  points: readonly string[];
  cta: string;
  ignore: string;
  linkFallback: string;
  footer: string;
}

/** Les 7 langues de l'interface. Aucun tiret cadratin, nulle part. */
const COPY: Record<string, PlanOpenedCopy> = {
  fr: {
    subjectNouveau: "Tiquiz : bienvenue, ton accès est ouvert",
    subjectMontee: "Tiquiz : ton plan {plan} est ouvert",
    headingNouveau: "Bienvenue dans Tiquiz",
    headingMontee: "Ton plan est ouvert",
    introNouveau:
      "Ton paiement est passé et ton compte {plan} est ouvert. Clique sur le bouton pour entrer, tu n'as pas de mot de passe à créer.",
    introMontee:
      "Ton paiement est passé et ton compte passe en {plan}. Tout est déjà actif : tes quiz, tes leads et tes réglages sont exactement là où tu les as laissés.",
    points: [
      "Tes quiz, tes leads et tes statistiques restent à toi.",
      "Tes factures, ta carte et ton abonnement se gèrent depuis Réglages, dans ton tableau de bord.",
    ],
    cta: "Ouvrir mon tableau de bord",
    ignore:
      "Ce lien te connecte directement. Il est valable une heure et ne sert qu'une fois : ensuite, demande un nouveau lien depuis la page de connexion.",
    linkFallback: "Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :",
    footer: "Tiquiz, l'outil de quiz de l'écosystème Tipote.",
  },
  en: {
    subjectNouveau: "Tiquiz: welcome, your access is open",
    subjectMontee: "Tiquiz: your {plan} plan is open",
    headingNouveau: "Welcome to Tiquiz",
    headingMontee: "Your plan is open",
    introNouveau:
      "Your payment went through and your {plan} account is open. Click the button to come in, there is no password to create.",
    introMontee:
      "Your payment went through and your account moves to {plan}. Everything is already active: your quizzes, your leads and your settings are exactly where you left them.",
    points: [
      "Your quizzes, your leads and your stats stay yours.",
      "Your invoices, your card and your subscription live in Settings, inside your dashboard.",
    ],
    cta: "Open my dashboard",
    ignore:
      "This link signs you in directly. It lasts one hour and works once: after that, ask for a new one from the login page.",
    linkFallback: "If the button does not work, copy this link into your browser:",
    footer: "Tiquiz, the quiz tool of the Tipote ecosystem.",
  },
  es: {
    subjectNouveau: "Tiquiz: bienvenida, tu acceso está abierto",
    subjectMontee: "Tiquiz: tu plan {plan} está abierto",
    headingNouveau: "Bienvenida a Tiquiz",
    headingMontee: "Tu plan está abierto",
    introNouveau:
      "Tu pago se ha realizado y tu cuenta {plan} está abierta. Haz clic en el botón para entrar, no tienes que crear ninguna contraseña.",
    introMontee:
      "Tu pago se ha realizado y tu cuenta pasa a {plan}. Todo está ya activo: tus quiz, tus leads y tus ajustes siguen donde los dejaste.",
    points: [
      "Tus quiz, tus leads y tus estadísticas siguen siendo tuyos.",
      "Tus facturas, tu tarjeta y tu suscripción se gestionan desde Ajustes, en tu panel.",
    ],
    cta: "Abrir mi panel",
    ignore:
      "Este enlace te conecta directamente. Dura una hora y sirve una vez: después, pide uno nuevo desde la página de acceso.",
    linkFallback: "Si el botón no funciona, copia este enlace en tu navegador:",
    footer: "Tiquiz, la herramienta de quiz del ecosistema Tipote.",
  },
  it: {
    subjectNouveau: "Tiquiz: benvenuta, il tuo accesso è aperto",
    subjectMontee: "Tiquiz: il tuo piano {plan} è aperto",
    headingNouveau: "Benvenuta in Tiquiz",
    headingMontee: "Il tuo piano è aperto",
    introNouveau:
      "Il pagamento è andato a buon fine e il tuo account {plan} è aperto. Clicca sul pulsante per entrare, non devi creare nessuna password.",
    introMontee:
      "Il pagamento è andato a buon fine e il tuo account passa a {plan}. Tutto è già attivo: i tuoi quiz, i tuoi lead e le tue impostazioni sono esattamente dove li hai lasciati.",
    points: [
      "I tuoi quiz, i tuoi lead e le tue statistiche restano tuoi.",
      "Le fatture, la carta e l'abbonamento si gestiscono da Impostazioni, nella tua dashboard.",
    ],
    cta: "Apri la mia dashboard",
    ignore:
      "Questo link ti collega direttamente. Dura un'ora e vale una sola volta: poi chiedine uno nuovo dalla pagina di accesso.",
    linkFallback: "Se il pulsante non funziona, copia questo link nel tuo browser:",
    footer: "Tiquiz, lo strumento quiz dell'ecosistema Tipote.",
  },
  pt: {
    subjectNouveau: "Tiquiz: bem-vinda, o teu acesso está aberto",
    subjectMontee: "Tiquiz: o teu plano {plan} está aberto",
    headingNouveau: "Bem-vinda ao Tiquiz",
    headingMontee: "O teu plano está aberto",
    introNouveau:
      "O teu pagamento passou e a tua conta {plan} está aberta. Clica no botão para entrar, não tens de criar palavra-passe.",
    introMontee:
      "O teu pagamento passou e a tua conta passa a {plan}. Está tudo já ativo: os teus quiz, os teus leads e as tuas definições estão onde os deixaste.",
    points: [
      "Os teus quiz, os teus leads e as tuas estatísticas continuam a ser teus.",
      "As faturas, o cartão e a subscrição gerem-se a partir das Definições, no teu painel.",
    ],
    cta: "Abrir o meu painel",
    ignore:
      "Este link liga-te diretamente. Dura uma hora e serve uma vez: depois, pede um novo na página de entrada.",
    linkFallback: "Se o botão não funcionar, copia este link para o teu navegador:",
    footer: "Tiquiz, a ferramenta de quiz do ecossistema Tipote.",
  },
  "pt-BR": {
    subjectNouveau: "Tiquiz: bem-vinda, seu acesso está aberto",
    subjectMontee: "Tiquiz: seu plano {plan} está aberto",
    headingNouveau: "Bem-vinda ao Tiquiz",
    headingMontee: "Seu plano está aberto",
    introNouveau:
      "Seu pagamento passou e sua conta {plan} está aberta. Clique no botão para entrar, você não precisa criar senha.",
    introMontee:
      "Seu pagamento passou e sua conta passa para {plan}. Tudo já está ativo: seus quiz, seus leads e suas configurações estão exatamente onde você deixou.",
    points: [
      "Seus quiz, seus leads e suas estatísticas continuam sendo seus.",
      "Suas faturas, seu cartão e sua assinatura ficam em Configurações, no seu painel.",
    ],
    cta: "Abrir meu painel",
    ignore:
      "Este link conecta você direto. Ele dura uma hora e vale uma vez: depois, peça um novo na página de entrada.",
    linkFallback: "Se o botão não funcionar, copie este link no seu navegador:",
    footer: "Tiquiz, a ferramenta de quiz do ecossistema Tipote.",
  },
  ar: {
    subjectNouveau: "Tiquiz: مرحبا بك، حسابك مفتوح",
    subjectMontee: "Tiquiz: خطتك {plan} مفتوحة",
    headingNouveau: "مرحبا بك في Tiquiz",
    headingMontee: "خطتك مفتوحة",
    introNouveau:
      "تم الدفع وحسابك {plan} مفتوح. اضغط على الزر للدخول، لا حاجة لإنشاء كلمة مرور.",
    introMontee:
      "تم الدفع وحسابك انتقل إلى {plan}. كل شيء مفعل الآن: اختباراتك وعملاؤك وإعداداتك في مكانها تماما.",
    points: [
      "اختباراتك وعملاؤك وإحصاءاتك تبقى ملكك.",
      "الفواتير والبطاقة والاشتراك تدار من الإعدادات، داخل لوحتك.",
    ],
    cta: "افتح لوحتي",
    ignore:
      "هذا الرابط يدخلك مباشرة. صالح لمدة ساعة ويعمل مرة واحدة: بعدها اطلب رابطا جديدا من صفحة الدخول.",
    linkFallback: "إذا لم يعمل الزر، انسخ هذا الرابط في متصفحك:",
    footer: "Tiquiz، أداة الاختبارات في منظومة Tipote.",
  },
};

/**
 * Le nom du plan est ecrit PAR NOUS, jamais recopie d'un payload.
 *
 * Il vient du catalogue (`OWNER_CATALOG`), donc de ce qui a ete affiche
 * sur le bon de commande. C'est la meme lecon que le drame Ivan : on ne
 * raisonne pas sur la forme supposee d'un payload, on lit ce qu'on sait.
 */
function injecter(phrase: string, planLabel: string): string {
  return phrase.replace(/\{plan\}/g, planLabel);
}

/** Le contenu seul, pour que les tests puissent le lire. */
export function buildPlanOpenedContent(args: {
  situation: PlanOpenedSituation;
  planLabel: string;
  actionLink: string;
  locale?: string | null;
}) {
  const c = pickCopy(COPY, args.locale);
  const nouveau = args.situation === "nouveau-compte";
  const label = String(args.planLabel ?? "").trim() || "Tiquiz";

  const copy: TiquizEmailCopy = {
    subject: injecter(nouveau ? c.subjectNouveau : c.subjectMontee, label),
    heading: nouveau ? c.headingNouveau : c.headingMontee,
    intro: injecter(nouveau ? c.introNouveau : c.introMontee, label),
    points: c.points,
    cta: c.cta,
    ignore: c.ignore,
    linkFallback: c.linkFallback,
    footer: c.footer,
  };

  return { ...renderTiquizEmail(args.actionLink, copy), subject: copy.subject };
}
