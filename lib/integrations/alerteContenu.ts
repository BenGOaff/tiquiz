// lib/integrations/alerteContenu.ts
//
// L'EMAIL "TA CONNEXION EST COUPÉE", DANS LES SEPT LANGUES DE L'APP.
//
// PUR : le texte part sous le nom de Béné, il se teste. L'envoi vit dans
// `lib/email/connexionAlerte.ts` (server-only).
//
// Il part UNE fois par déconnexion (voir `doitAlerterDeconnexion`), et
// il dit QUOI FAIRE : rouvrir l'onglet Connexions et reconnecter. Un
// email d'alerte lu sans savoir quoi faire est un email remis à plus
// tard (règle des alertes d'accès, 11 septembre).
//
// Aucun tiret cadratin, aucun accord au féminin adressé au lecteur.

export interface ContenuAlerteConnexion {
  subject: string;
  heading: string;
  paragraphes: readonly string[];
  footer: string;
}

type Texte = (a: { outil: string; nom: string; lien: string }) => ContenuAlerteConnexion;

const TEXTES: Record<string, Texte> = {
  fr: ({ outil, nom, lien }) => ({
    subject: `Tiquiz : ta connexion ${outil} est coupée`,
    heading: `Ta connexion ${outil} ne répond plus`,
    paragraphes: [
      `${outil} vient de refuser le jeton de ta connexion "${nom}". Depuis ce moment, les leads de tes quiz qui visent cette connexion ne partent plus chez ${outil}. Ils restent dans Tiquiz, rien n'est perdu.`,
      `Ce qui arrive le plus souvent : le jeton a été révoqué ou régénéré, l'app a été désinstallée du sous-compte, ou ses droits ont été retirés.`,
      `Pour repartir : ouvre Paramètres, onglet Connexions, et reconnecte ${outil}. Les leads arrivés entre temps se renvoient depuis Mes leads, bouton Sync.`,
      lien,
    ],
    footer: "Tu reçois cet email parce qu'une connexion de ton compte Tiquiz a cessé de répondre. Il ne part qu'une fois par coupure.",
  }),
  en: ({ outil, nom, lien }) => ({
    subject: `Tiquiz: your ${outil} connection is down`,
    heading: `Your ${outil} connection stopped responding`,
    paragraphes: [
      `${outil} just rejected the token of your connection "${nom}". From now on, leads from quizzes that target this connection no longer reach ${outil}. They stay in Tiquiz, nothing is lost.`,
      `The usual causes: the token was revoked or regenerated, the app was uninstalled from the sub-account, or its permissions were removed.`,
      `To resume: open Settings, Connections tab, and reconnect ${outil}. Leads captured in the meantime can be resent from My leads, Sync button.`,
      lien,
    ],
    footer: "You receive this email because a connection on your Tiquiz account stopped responding. It is sent once per outage.",
  }),
  es: ({ outil, nom, lien }) => ({
    subject: `Tiquiz: tu conexión con ${outil} está cortada`,
    heading: `Tu conexión con ${outil} ya no responde`,
    paragraphes: [
      `${outil} acaba de rechazar el token de tu conexión "${nom}". Desde ese momento, los leads de tus quiz que usan esta conexión ya no llegan a ${outil}. Se quedan en Tiquiz, no se pierde nada.`,
      `Lo más habitual: el token fue revocado o regenerado, la app fue desinstalada de la subcuenta, o se le quitaron permisos.`,
      `Para reanudar: abre Ajustes, pestaña Conexiones, y vuelve a conectar ${outil}. Los leads llegados mientras tanto se reenvían desde Mis leads, botón Sync.`,
      lien,
    ],
    footer: "Recibes este email porque una conexión de tu cuenta Tiquiz dejó de responder. Se envía una sola vez por corte.",
  }),
  it: ({ outil, nom, lien }) => ({
    subject: `Tiquiz: la tua connessione ${outil} è interrotta`,
    heading: `La tua connessione ${outil} non risponde più`,
    paragraphes: [
      `${outil} ha appena rifiutato il token della tua connessione "${nom}". Da questo momento i lead dei quiz che usano questa connessione non arrivano più su ${outil}. Restano in Tiquiz, niente va perso.`,
      `Le cause più frequenti: il token è stato revocato o rigenerato, l'app è stata disinstallata dal sotto-account, oppure i permessi sono stati tolti.`,
      `Per ripartire: apri Impostazioni, scheda Connessioni, e ricollega ${outil}. I lead arrivati nel frattempo si rinviano da I miei lead, pulsante Sync.`,
      lien,
    ],
    footer: "Ricevi questa email perché una connessione del tuo account Tiquiz ha smesso di rispondere. Viene inviata una sola volta per interruzione.",
  }),
  pt: ({ outil, nom, lien }) => ({
    subject: `Tiquiz: a tua ligação ${outil} está cortada`,
    heading: `A tua ligação ${outil} deixou de responder`,
    paragraphes: [
      `${outil} acabou de recusar o token da tua ligação "${nom}". A partir de agora, os leads dos quizzes que usam esta ligação deixam de chegar ao ${outil}. Ficam no Tiquiz, nada se perde.`,
      `As causas mais comuns: o token foi revogado ou regenerado, a app foi desinstalada da subconta, ou as permissões foram retiradas.`,
      `Para retomar: abre Definições, separador Ligações, e volta a ligar o ${outil}. Os leads recebidos entretanto reenviam-se a partir de Os meus leads, botão Sync.`,
      lien,
    ],
    footer: "Recebes este email porque uma ligação da tua conta Tiquiz deixou de responder. É enviado uma única vez por corte.",
  }),
  "pt-BR": ({ outil, nom, lien }) => ({
    subject: `Tiquiz: sua conexão ${outil} está interrompida`,
    heading: `Sua conexão ${outil} parou de responder`,
    paragraphes: [
      `${outil} acabou de recusar o token da sua conexão "${nom}". A partir de agora, os leads dos quizzes que usam esta conexão não chegam mais ao ${outil}. Eles ficam no Tiquiz, nada se perde.`,
      `As causas mais comuns: o token foi revogado ou regenerado, o app foi desinstalado da subconta, ou as permissões foram retiradas.`,
      `Para retomar: abra Configurações, aba Conexões, e reconecte o ${outil}. Os leads recebidos nesse intervalo podem ser reenviados em Meus leads, botão Sync.`,
      lien,
    ],
    footer: "Você recebe este email porque uma conexão da sua conta Tiquiz parou de responder. Ele é enviado uma única vez por interrupção.",
  }),
  ar: ({ outil, nom, lien }) => ({
    subject: `Tiquiz: تم قطع اتصالك بـ ${outil}`,
    heading: `اتصالك بـ ${outil} لم يعد يستجيب`,
    paragraphes: [
      `رفض ${outil} للتو رمز الاتصال "${nom}". منذ تلك اللحظة، لم تعد جهات الاتصال القادمة من اختباراتك التي تستخدم هذا الاتصال تصل إلى ${outil}. تبقى في Tiquiz، ولا يضيع شيء.`,
      `الأسباب الأكثر شيوعًا: تم إلغاء الرمز أو إعادة إنشائه، أو أزيل التطبيق من الحساب الفرعي، أو سُحبت صلاحياته.`,
      `للمتابعة: افتح الإعدادات، تبويب الاتصالات، وأعد ربط ${outil}. يمكن إعادة إرسال جهات الاتصال التي وصلت في هذه الأثناء من صفحة جهات الاتصال، زر Sync.`,
      lien,
    ],
    footer: "تصلك هذه الرسالة لأن اتصالًا في حساب Tiquiz الخاص بك توقف عن الاستجابة. تُرسل مرة واحدة لكل انقطاع.",
  }),
};

export function contenuAlerteConnexion(args: {
  locale?: string | null;
  outil: string;
  nom: string;
  lien: string;
}): ContenuAlerteConnexion {
  const l = String(args.locale ?? "").trim();
  const texte = TEXTES[l] ?? TEXTES[l.split("-")[0]] ?? TEXTES.en;
  return texte({ outil: args.outil, nom: args.nom, lien: args.lien });
}
