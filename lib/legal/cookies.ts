import type { LegalPage } from "./types";
import { COMPANY as C } from "./company";

const fr: LegalPage = {
  title: "Politique de cookies",
  lastUpdated: "Dernière mise à jour : 22/04/2026",
  intro: `Cette politique informe les utilisateurs sur les cookies et traceurs utilisés lors de la navigation sur tiquiz.com et l'application Tiquiz. Les services sont édités par ${C.name} (${C.form}, RCS ${C.rcs}, siège ${C.address}).`,
  sections: [
    {
      h: "1. Définition",
      body: [
        "Un cookie est un fichier déposé sur le terminal de l'utilisateur lors de la consultation d'un site. Il stocke des informations de navigation ou de comportement. Certains cookies sont déposés par Tiquiz, d'autres par des partenaires tiers.",
      ],
    },
    {
      h: "2. Finalités",
      body: [
        "Les cookies servent à :",
        [
          "Assurer le fonctionnement technique du service.",
          "Sécuriser l'accès et les transactions.",
          "Mesurer l'audience et les performances.",
          "Proposer des fonctionnalités de partage.",
        ],
      ],
    },
    {
      h: "3. Catégories de cookies",
      body: [
        "**Strictement nécessaires.** Indispensables au fonctionnement (authentification, session, panier, paiement). Pas de consentement requis.",
        "**Analytiques.** Mesurent l'audience et améliorent les performances. Déposés après consentement.",
        "**Partage et services tiers.** Intègrent des services tiers (Systeme.io, réseaux sociaux). Consentement requis.",
        "**Paiement.** Déposés par Stripe ou PayPal pour sécuriser les transactions. Strictement nécessaires.",
      ],
    },
    {
      h: "4. Gestion du consentement",
      body: [
        "À la première visite, un bandeau permet d'accepter, refuser ou personnaliser les cookies non essentiels. Le consentement est recueilli de manière libre, spécifique, éclairée et univoque. Il peut être retiré à tout moment via le lien disponible en pied de page.",
      ],
    },
    {
      h: "5. Paramétrage du navigateur",
      body: [
        "L'utilisateur peut configurer son navigateur pour refuser tout ou partie des cookies ou les supprimer. La désactivation peut altérer le fonctionnement de certaines fonctionnalités.",
      ],
    },
    {
      h: "6. Transferts hors UE",
      body: [
        "Les transferts éventuels hors Union européenne sont encadrés par les clauses contractuelles types ou des mécanismes équivalents reconnus par la Commission européenne.",
      ],
    },
    {
      h: "7. Durée de conservation",
      body: [
        "Les cookies sont conservés 13 mois maximum à compter de leur dépôt. Les préférences de consentement sont également conservées 13 mois maximum.",
      ],
    },
    {
      h: "8. Vos droits",
      body: [
        "Vous pouvez à tout moment vous opposer au dépôt de cookies non essentiels, retirer votre consentement, demander l'accès ou la suppression des données collectées. Contact : " + C.email + ". Réclamation possible auprès de la CNIL (www.cnil.fr).",
      ],
    },
    {
      h: "9. Modification",
      body: [
        "La politique peut évoluer pour tenir compte d'évolutions légales ou techniques.",
      ],
    },
    {
      h: "10. Contact",
      body: [`${C.name} — ${C.address} — ${C.email}.`],
    },
  ],
};

const en: LegalPage = {
  title: "Cookie Policy",
  lastUpdated: "Last updated: 04/22/2026",
  intro: `This policy explains the cookies and trackers used when you browse tiquiz.com and the Tiquiz application. The services are published by ${C.name} (a ${C.form}, registered with the Montpellier Trade Registry under no. 909 349 045, registered office ${C.address}).`,
  sections: [
    {
      h: "1. Definition",
      body: [
        "A cookie is a file stored on your device when you visit a website. It stores browsing or behavioural information. Some cookies are set by Tiquiz, others by third-party partners.",
      ],
    },
    {
      h: "2. Purposes",
      body: [
        "Cookies are used to:",
        [
          "Ensure technical service operation.",
          "Secure access and transactions.",
          "Measure audience and performance.",
          "Enable sharing features.",
        ],
      ],
    },
    {
      h: "3. Categories",
      body: [
        "**Strictly necessary.** Required for service operation (authentication, session, cart, payment). No consent required.",
        "**Analytics.** Measure audience and improve performance. Dropped after consent.",
        "**Sharing and third-party services.** Embed third-party services (Systeme.io, social networks). Consent required.",
        "**Payment.** Dropped by Stripe or PayPal to secure transactions. Strictly necessary.",
      ],
    },
    {
      h: "4. Consent management",
      body: [
        "On the first visit, a banner lets you accept, reject or customise non-essential cookies. Consent is given freely, specifically, informed and unambiguously. You can withdraw it at any time via the link in the footer.",
      ],
    },
    {
      h: "5. Browser settings",
      body: [
        "You can configure your browser to refuse all or part of cookies, or delete them. Disabling may break some features.",
      ],
    },
    {
      h: "6. International transfers",
      body: [
        "Any transfer outside the EU is framed by Standard Contractual Clauses or equivalent mechanisms recognised by the European Commission.",
      ],
    },
    {
      h: "7. Retention",
      body: [
        "Cookies are kept for 13 months maximum from the time they are set. Consent preferences are also kept 13 months maximum.",
      ],
    },
    {
      h: "8. Your rights",
      body: [
        "You can object to non-essential cookies, withdraw consent, or ask for access/deletion at any time. Contact: " + C.email + ". You can also file a complaint with the French CNIL (www.cnil.fr) or your local EU authority.",
      ],
    },
    {
      h: "9. Changes",
      body: [
        "This policy may evolve to reflect legal or technical updates.",
      ],
    },
    {
      h: "10. Contact",
      body: [`${C.name} — ${C.address} — ${C.email}.`],
    },
  ],
};


const es: LegalPage = {
  title: "Política de cookies",
  lastUpdated: "Última actualización: 22/04/2026",
  intro: `Esta política informa a los usuarios sobre las cookies y trazadores utilizados durante la navegación en tiquiz.com y la aplicación Tiquiz. Los servicios son editados por ${C.name} (${C.form}, RCS ${C.rcs}, sede ${C.address}).`,
  sections: [
    { h: "1. Definición", body: ["Una cookie es un archivo depositado en el dispositivo del usuario al consultar un sitio. Almacena información de navegación o comportamiento. Algunas cookies son depositadas por Tiquiz, otras por socios terceros."] },
    { h: "2. Finalidades", body: ["Las cookies sirven para:", [ "Asegurar el funcionamiento técnico del servicio.", "Proteger el acceso y las transacciones.", "Medir la audiencia y el rendimiento.", "Ofrecer funciones de compartir." ]] },
    { h: "3. Categorías de cookies", body: [
      "**Estrictamente necesarias.** Indispensables para el funcionamiento (autenticación, sesión, carrito, pago). No se requiere consentimiento.",
      "**Analíticas.** Miden la audiencia y mejoran el rendimiento. Depositadas tras consentimiento.",
      "**Compartir y servicios de terceros.** Integran servicios de terceros (Systeme.io, redes sociales). Consentimiento requerido.",
      "**Pago.** Depositadas por Stripe o PayPal para asegurar las transacciones. Estrictamente necesarias." ] },
    { h: "4. Gestión del consentimiento", body: ["En la primera visita, un banner permite aceptar, rechazar o personalizar las cookies no esenciales. El consentimiento se recoge de manera libre, específica, informada e inequívoca. Puede retirarse en cualquier momento a través del enlace disponible en el pie de página."] },
    { h: "5. Configuración del navegador", body: ["El usuario puede configurar su navegador para rechazar todas o parte de las cookies o eliminarlas. La desactivación puede alterar el funcionamiento de ciertas funcionalidades."] },
    { h: "6. Transferencias fuera de la UE", body: ["Las transferencias eventuales fuera de la Unión Europea están reguladas por las cláusulas contractuales tipo o mecanismos equivalentes reconocidos por la Comisión Europea."] },
    { h: "7. Plazo de conservación", body: ["Las cookies se conservan un máximo de 13 meses desde su depósito. Las preferencias de consentimiento también se conservan 13 meses máximo."] },
    { h: "8. Tus derechos", body: ["Puedes en cualquier momento oponerte al depósito de cookies no esenciales, retirar tu consentimiento, pedir acceso o supresión de los datos recogidos. Contacto: " + C.email + ". Reclamación posible ante la autoridad de control competente."] },
    { h: "9. Modificación", body: ["La política puede evolucionar para tener en cuenta evoluciones legales o técnicas."] },
    { h: "10. Contacto", body: [`${C.name} — ${C.address} — ${C.email}.`] },
  ],
};
const it: LegalPage = {
  title: "Informativa sui cookie",
  lastUpdated: "Ultimo aggiornamento: 22/04/2026",
  intro: `La presente informativa informa gli utenti sui cookie e tracciatori utilizzati durante la navigazione su tiquiz.com e l'applicazione Tiquiz. I servizi sono editi da ${C.name} (${C.form}, RCS ${C.rcs}, sede ${C.address}).`,
  sections: [
    { h: "1. Definizione", body: ["Un cookie è un file depositato sul dispositivo dell'utente durante la consultazione di un sito. Memorizza informazioni di navigazione o comportamento. Alcuni cookie sono depositati da Tiquiz, altri da partner terzi."] },
    { h: "2. Finalità", body: ["I cookie servono a:", [ "Assicurare il funzionamento tecnico del servizio.", "Proteggere l'accesso e le transazioni.", "Misurare l'audience e le prestazioni.", "Proporre funzionalità di condivisione." ]] },
    { h: "3. Categorie di cookie", body: [
      "**Strettamente necessari.** Indispensabili al funzionamento (autenticazione, sessione, carrello, pagamento). Nessun consenso richiesto.",
      "**Analitici.** Misurano l'audience e migliorano le prestazioni. Depositati previo consenso.",
      "**Condivisione e servizi di terzi.** Integrano servizi di terzi (Systeme.io, social network). Consenso richiesto.",
      "**Pagamento.** Depositati da Stripe o PayPal per proteggere le transazioni. Strettamente necessari." ] },
    { h: "4. Gestione del consenso", body: ["Alla prima visita, un banner consente di accettare, rifiutare o personalizzare i cookie non essenziali. Il consenso è raccolto in maniera libera, specifica, informata e inequivocabile. Può essere revocato in qualsiasi momento tramite il link in fondo alla pagina."] },
    { h: "5. Impostazioni del browser", body: ["L'utente può configurare il proprio browser per rifiutare tutti o parte dei cookie o per eliminarli. La disattivazione può alterare il funzionamento di alcune funzionalità."] },
    { h: "6. Trasferimenti fuori dall'UE", body: ["Gli eventuali trasferimenti fuori dall'Unione Europea sono regolati da clausole contrattuali tipo o meccanismi equivalenti riconosciuti dalla Commissione europea."] },
    { h: "7. Durata di conservazione", body: ["I cookie sono conservati al massimo 13 mesi dal loro deposito. Le preferenze di consenso sono conservate anch'esse al massimo 13 mesi."] },
    { h: "8. I tuoi diritti", body: ["Puoi in qualsiasi momento opporti al deposito di cookie non essenziali, revocare il tuo consenso, chiedere l'accesso o la cancellazione dei dati raccolti. Contatto: " + C.email + ". Reclamo possibile presso l'autorità di controllo competente."] },
    { h: "9. Modifiche", body: ["L'informativa può evolvere per tenere conto di evoluzioni legali o tecniche."] },
    { h: "10. Contatto", body: [`${C.name} — ${C.address} — ${C.email}.`] },
  ],
};
const ar: LegalPage = {
  title: "سياسة ملفات تعريف الارتباط",
  lastUpdated: "آخر تحديث: 22/04/2026",
  intro: `تُعلِم هذه السياسة المستخدمين بملفات تعريف الارتباط والمتتبعات المستخدمة أثناء التصفح على موقع tiquiz.com وتطبيق Tiquiz. الخدمات نشرتها ${C.name} (${C.form}، RCS ${C.rcs}، المقر ${C.address}).`,
  sections: [
    { h: "1. التعريف", body: ["ملف تعريف الارتباط هو ملف يُودَع على جهاز المستخدم عند زيارة موقع. يخزّن معلومات التصفح أو السلوك. بعضها يُودَع من قبل Tiquiz والبعض الآخر من قبل شركاء خارجيين."] },
    { h: "2. الأغراض", body: ["تُستخدم ملفات تعريف الارتباط لـ:", [ "ضمان التشغيل التقني للخدمة.", "تأمين الوصول والمعاملات.", "قياس الجمهور والأداء.", "اقتراح ميزات المشاركة." ]] },
    { h: "3. فئات ملفات تعريف الارتباط", body: [
      "**ضرورية تمامًا.** لا غنى عنها لتشغيل الخدمة (المصادقة، الجلسة، السلة، الدفع). لا تتطلب موافقة.",
      "**تحليلية.** تقيس الجمهور وتحسّن الأداء. تُودَع بعد الموافقة.",
      "**المشاركة وخدمات الطرف الثالث.** تدمج خدمات طرف ثالث (Systeme.io، شبكات التواصل). تتطلب موافقة.",
      "**الدفع.** تُودَع من قبل Stripe أو PayPal لتأمين المعاملات. ضرورية تمامًا." ] },
    { h: "4. إدارة الموافقة", body: ["في الزيارة الأولى، يسمح شعار بقبول أو رفض أو تخصيص ملفات تعريف الارتباط غير الأساسية. تُجمَع الموافقة بشكل حر ومحدد ومستنير ومُتعدد. يمكن سحبها في أي وقت عبر الرابط المتاح في تذييل الصفحة."] },
    { h: "5. إعدادات المتصفح", body: ["يمكن للمستخدم إعداد متصفحه لرفض كل أو بعض ملفات تعريف الارتباط أو حذفها. قد يؤثر التعطيل على تشغيل بعض الميزات."] },
    { h: "6. التحويلات خارج الاتحاد الأوروبي", body: ["تُنظَّم أي تحويلات محتملة خارج الاتحاد الأوروبي ببنود تعاقدية نموذجية أو آليات مكافئة تعترف بها المفوضية الأوروبية."] },
    { h: "7. مدة الاحتفاظ", body: ["يتم الاحتفاظ بملفات تعريف الارتباط لمدة أقصاها 13 شهرًا من تاريخ إيداعها. يتم الاحتفاظ بتفضيلات الموافقة أيضًا لمدة أقصاها 13 شهرًا."] },
    { h: "8. حقوقك", body: ["يمكنك في أي وقت الاعتراض على إيداع ملفات تعريف الارتباط غير الأساسية، وسحب موافقتك، وطلب الوصول إلى البيانات المجمعة أو حذفها. الاتصال: " + C.email + ". يمكن تقديم شكوى إلى السلطة المختصة."] },
    { h: "9. التعديلات", body: ["قد تتطور هذه السياسة لمراعاة التطورات القانونية أو التقنية."] },
    { h: "10. الاتصال", body: [`${C.name} — ${C.address} — ${C.email}.`] },
  ],
};

export const cookies: Record<string, LegalPage> = { fr, en, es, it, ar };
