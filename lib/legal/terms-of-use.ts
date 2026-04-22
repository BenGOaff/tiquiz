import type { LegalPage } from "./types";
import { COMPANY as C } from "./company";

const fr: LegalPage = {
  title: "Conditions générales d'utilisation",
  lastUpdated: "Dernière mise à jour : 22/04/2026",
  intro: `Les présentes CGU définissent les conditions d'accès et d'utilisation de Tiquiz® et du site tiquiz.com, édités par ${C.name} (${C.form}, capital ${C.capital}, RCS ${C.rcs}, siège ${C.address}). L'accès au service implique l'acceptation sans réserve des CGU. Elles complètent les Conditions générales de vente.`,
  sections: [
    {
      h: "Article 1 – Définitions",
      body: [
        [
          "Plateforme : l'application Tiquiz® et le site tiquiz.com.",
          "Utilisateur : toute personne accédant à la Plateforme.",
          "Compte : espace personnel permettant d'accéder aux services.",
          "Contenus Utilisateur : les données, textes et médias saisis par l'Utilisateur.",
          "Contenus Générés : contenus produits via les fonctionnalités d'IA.",
          "Services : l'ensemble des fonctionnalités proposées.",
        ],
      ],
    },
    {
      h: "Article 2 – Accès aux services",
      body: [
        "L'accès est réservé aux personnes majeures disposant de la capacité juridique. L'Utilisateur doit fournir des informations exactes et à jour, maintenir la confidentialité de ses identifiants et signaler tout accès non autorisé.",
      ],
    },
    {
      h: "Article 3 – Description des services",
      body: [
        "Tiquiz® est une application SaaS permettant de créer des quiz interactifs, capturer des leads, segmenter les prospects et synchroniser avec des outils marketing tiers. Les fonctionnalités peuvent évoluer sans préavis.",
      ],
    },
    {
      h: "Article 4 – Données et sécurité",
      body: [
        "L'Éditeur met en œuvre des mesures techniques et organisationnelles appropriées (chiffrement, contrôle d'accès, isolation logique). L'accès aux données utilisateur est strictement limité à la fourniture du service, à la maintenance, à la sécurité ou aux obligations légales.",
        "Pour les leads captés, l'Utilisateur agit en tant que responsable de traitement au sens du RGPD ; l'Éditeur agit en sous-traitant et s'engage à respecter la réglementation.",
      ],
    },
    {
      h: "Article 5 – Règles d'utilisation",
      body: [
        "Sont notamment interdits :",
        [
          "L'utilisation à des fins illégales, frauduleuses ou contraires à l'ordre public.",
          "La diffusion de contenus contraires aux droits des tiers ou à la dignité humaine.",
          "Le spam, le phishing ou toute pratique trompeuse.",
          "Toute tentative de porter atteinte à la sécurité ou au fonctionnement de la plateforme.",
          "La revente ou mise à disposition non autorisée du service à des tiers.",
        ],
      ],
    },
    {
      h: "Article 6 – Contenus",
      body: [
        "L'Utilisateur conserve l'intégralité des droits sur ses Contenus Utilisateur et accorde à l'Éditeur une licence non exclusive strictement limitée à la fourniture du service.",
        "Les Contenus Générés par IA sont fournis à titre informatif et peuvent comporter des erreurs. L'Utilisateur est seul responsable de leur vérification et de leur utilisation.",
      ],
    },
    {
      h: "Article 7 – Disponibilité",
      body: [
        "L'Éditeur s'efforce d'assurer la continuité du service mais celui-ci peut être suspendu pour maintenance, sécurité ou défaillance de fournisseurs tiers. Aucune garantie de disponibilité permanente n'est fournie.",
      ],
    },
    {
      h: "Article 8 – Responsabilité",
      body: [
        "L'Utilisateur assume seul la responsabilité des informations fournies, des contenus publiés et de l'usage des services. L'Éditeur est tenu à une obligation de moyens, sans garantie de résultat ni de performance économique. Sa responsabilité n'est pas engagée pour les dommages indirects.",
      ],
    },
    {
      h: "Article 9 – Suspension",
      body: [
        "L'Éditeur peut suspendre l'accès sans préavis en cas de violation des CGU, de fraude, de non-paiement ou d'utilisation abusive.",
      ],
    },
    {
      h: "Article 10 – Résiliation et suppression du compte",
      body: [
        "L'Utilisateur peut supprimer son compte à tout moment. Après suppression, l'accès est immédiatement interrompu ; les données peuvent être conservées temporairement pour raisons légales puis supprimées ou anonymisées. Un export des données peut être demandé avant suppression.",
      ],
    },
    {
      h: "Article 11 – Modification des CGU",
      body: [
        "L'Éditeur peut modifier les CGU à tout moment. Les modifications sont portées à la connaissance des Utilisateurs ; la poursuite de l'utilisation vaut acceptation.",
      ],
    },
    {
      h: "Article 12 – Droit applicable",
      body: [
        "Les CGU sont régies par le droit français. Pour les professionnels, les tribunaux du ressort de la Cour d'appel de Montpellier sont compétents.",
      ],
    },
    {
      h: "Contact",
      body: [`${C.name} — ${C.address} — ${C.email}.`],
    },
  ],
};

const en: LegalPage = {
  title: "Terms of Use",
  lastUpdated: "Last updated: 04/22/2026",
  intro: `These Terms of Use govern access to and use of Tiquiz® and tiquiz.com, published by ${C.name} (a ${C.form}, share capital ${C.capital}, registered with the Montpellier Trade Registry under no. 909 349 045, registered office ${C.address}). Accessing the service implies full acceptance of these Terms. They complement the Terms of Sale.`,
  sections: [
    {
      h: "Article 1 – Definitions",
      body: [
        [
          "Platform: the Tiquiz® application and tiquiz.com.",
          "User: any person accessing the Platform.",
          "Account: the personal area used to access the services.",
          "User Content: data, text and media entered by the User.",
          "Generated Content: output produced through AI features.",
          "Services: the full feature set offered.",
        ],
      ],
    },
    {
      h: "Article 2 – Access",
      body: [
        "Access is reserved to adults with legal capacity. Users must supply accurate, up-to-date information, keep their credentials confidential and report any unauthorised access.",
      ],
    },
    {
      h: "Article 3 – Service description",
      body: [
        "Tiquiz® is a SaaS application to build interactive quizzes, capture leads, segment prospects and sync with third-party marketing tools. Features may evolve without notice.",
      ],
    },
    {
      h: "Article 4 – Data and security",
      body: [
        "The Publisher implements appropriate technical and organisational measures (encryption, access control, logical isolation). Access to user data is strictly limited to service delivery, maintenance, security and legal obligations.",
        "For captured leads, the User acts as data controller under GDPR; the Publisher acts as processor and undertakes to comply with the applicable regulation.",
      ],
    },
    {
      h: "Article 5 – Usage rules",
      body: [
        "The following are prohibited:",
        [
          "Use for illegal, fraudulent or public-order-violating purposes.",
          "Publishing content that infringes third-party rights or human dignity.",
          "Spam, phishing or deceptive practices.",
          "Any attempt to compromise the platform's security or functioning.",
          "Reselling or making the service available to third parties without authorisation.",
        ],
      ],
    },
    {
      h: "Article 6 – Content",
      body: [
        "Users retain full rights over their User Content and grant the Publisher a non-exclusive licence strictly limited to delivering the service.",
        "AI-Generated Content is informational and may contain errors. Users are solely responsible for review and use.",
      ],
    },
    {
      h: "Article 7 – Availability",
      body: [
        "The Publisher makes reasonable efforts to keep the service available but it may be suspended for maintenance, security or third-party outages. No guarantee of permanent availability is offered.",
      ],
    },
    {
      h: "Article 8 – Liability",
      body: [
        "Users are solely responsible for the information they provide, the content they publish and their use of the service. The Publisher has an obligation of means, without guarantee of outcome or economic performance, and is not liable for indirect damages.",
      ],
    },
    {
      h: "Article 9 – Suspension",
      body: [
        "The Publisher may suspend access without notice in case of breach, fraud, non-payment or abusive use.",
      ],
    },
    {
      h: "Article 10 – Account termination",
      body: [
        "Users may delete their account at any time. After deletion, access is immediately cut; data may be kept temporarily for legal reasons and then deleted or anonymised. A data export can be requested before deletion.",
      ],
    },
    {
      h: "Article 11 – Changes",
      body: [
        "The Publisher may update these Terms at any time. Users are informed of changes; continued use implies acceptance.",
      ],
    },
    {
      h: "Article 12 – Governing law",
      body: [
        "These Terms are governed by French law. For professional users, the courts under the jurisdiction of the Montpellier Court of Appeal have jurisdiction.",
      ],
    },
    {
      h: "Contact",
      body: [`${C.name} — ${C.address} — ${C.email}.`],
    },
  ],
};


const es: LegalPage = {
  title: "Condiciones generales de uso",
  lastUpdated: "Última actualización: 22/04/2026",
  intro: `Las presentes CGU definen las condiciones de acceso y uso de Tiquiz® y del sitio tiquiz.com, editados por ${C.name} (${C.form}, capital ${C.capital}, RCS ${C.rcs}, sede ${C.address}). El acceso al servicio implica la aceptación sin reservas de las CGU. Completan las Condiciones generales de venta.`,
  sections: [
    { h: "Artículo 1 – Definiciones", body: [[ "Plataforma: la aplicación Tiquiz® y el sitio tiquiz.com.","Usuario: toda persona que accede a la Plataforma.","Cuenta: espacio personal que permite acceder a los servicios.","Contenidos de Usuario: datos, textos y medios introducidos por el Usuario.","Contenidos Generados: contenidos producidos mediante las funciones de IA.","Servicios: conjunto de funcionalidades ofrecidas." ]] },
    { h: "Artículo 2 – Acceso a los servicios", body: ["El acceso está reservado a personas mayores de edad con capacidad jurídica. El Usuario debe proporcionar información exacta y actualizada, mantener la confidencialidad de sus identificadores y señalar cualquier acceso no autorizado."] },
    { h: "Artículo 3 – Descripción de los servicios", body: ["Tiquiz® es una aplicación SaaS que permite crear quizzes interactivos, captar leads, segmentar prospectos y sincronizar con herramientas de marketing de terceros. Las funcionalidades pueden evolucionar sin previo aviso."] },
    { h: "Artículo 4 – Datos y seguridad", body: ["El Editor aplica medidas técnicas y organizativas apropiadas (cifrado, control de acceso, aislamiento lógico). El acceso a los datos del usuario está estrictamente limitado a la prestación del servicio, el mantenimiento, la seguridad o las obligaciones legales.","Para los leads captados, el Usuario actúa como responsable del tratamiento en el sentido del RGPD; el Editor actúa como encargado y se compromete a respetar la normativa."] },
    { h: "Artículo 5 – Reglas de uso", body: ["Están especialmente prohibidos:", [ "El uso con fines ilegales, fraudulentos o contrarios al orden público.","La difusión de contenidos contrarios a los derechos de terceros o a la dignidad humana.","El spam, el phishing o cualquier práctica engañosa.","Todo intento de atentar contra la seguridad o funcionamiento de la plataforma.","La reventa o puesta a disposición no autorizada del servicio a terceros." ]] },
    { h: "Artículo 6 – Contenidos", body: ["El Usuario conserva la totalidad de los derechos sobre sus Contenidos de Usuario y concede al Editor una licencia no exclusiva estrictamente limitada a la prestación del servicio.","Los Contenidos Generados por IA se proporcionan a título informativo y pueden contener errores. El Usuario es el único responsable de su verificación y uso."] },
    { h: "Artículo 7 – Disponibilidad", body: ["El Editor se esfuerza por asegurar la continuidad del servicio, pero este puede suspenderse por mantenimiento, seguridad o fallo de proveedores terceros. No se ofrece garantía de disponibilidad permanente."] },
    { h: "Artículo 8 – Responsabilidad", body: ["El Usuario asume la única responsabilidad de la información proporcionada, los contenidos publicados y el uso de los servicios. El Editor está sujeto a una obligación de medios, sin garantía de resultado o rendimiento económico. Su responsabilidad no se compromete por los daños indirectos."] },
    { h: "Artículo 9 – Suspensión", body: ["El Editor puede suspender el acceso sin previo aviso en caso de violación de las CGU, fraude, impago o uso abusivo."] },
    { h: "Artículo 10 – Rescisión y supresión de la cuenta", body: ["El Usuario puede suprimir su cuenta en cualquier momento. Tras la supresión, el acceso se interrumpe inmediatamente; los datos pueden conservarse temporalmente por motivos legales y después suprimirse o anonimizarse. Puede solicitarse una exportación de datos antes de la supresión."] },
    { h: "Artículo 11 – Modificación de las CGU", body: ["El Editor puede modificar las CGU en cualquier momento. Las modificaciones se ponen en conocimiento de los Usuarios; la continuación del uso implica aceptación."] },
    { h: "Artículo 12 – Derecho aplicable", body: ["Las CGU se rigen por el derecho francés. Para los profesionales, los tribunales de la Cour d'appel de Montpellier son competentes."] },
    { h: "Contacto", body: [`${C.name} — ${C.address} — ${C.email}.`] },
  ],
};
const it: LegalPage = {
  title: "Condizioni generali di utilizzo",
  lastUpdated: "Ultimo aggiornamento: 22/04/2026",
  intro: `Le presenti CGU definiscono le condizioni di accesso e utilizzo di Tiquiz® e del sito tiquiz.com, editi da ${C.name} (${C.form}, capitale ${C.capital}, RCS ${C.rcs}, sede ${C.address}). L'accesso al servizio implica l'accettazione senza riserve delle CGU. Completano le Condizioni generali di vendita.`,
  sections: [
    { h: "Articolo 1 – Definizioni", body: [[ "Piattaforma: l'applicazione Tiquiz® e il sito tiquiz.com.","Utente: qualsiasi persona che acceda alla Piattaforma.","Account: spazio personale che consente di accedere ai servizi.","Contenuti Utente: dati, testi e media inseriti dall'Utente.","Contenuti Generati: contenuti prodotti tramite le funzioni di IA.","Servizi: l'insieme delle funzionalità proposte." ]] },
    { h: "Articolo 2 – Accesso ai servizi", body: ["L'accesso è riservato a persone maggiorenni con capacità giuridica. L'Utente deve fornire informazioni esatte e aggiornate, mantenere la riservatezza delle proprie credenziali e segnalare qualsiasi accesso non autorizzato."] },
    { h: "Articolo 3 – Descrizione dei servizi", body: ["Tiquiz® è un'applicazione SaaS che consente di creare quiz interattivi, catturare lead, segmentare prospect e sincronizzarsi con strumenti di marketing di terzi. Le funzionalità possono evolvere senza preavviso."] },
    { h: "Articolo 4 – Dati e sicurezza", body: ["L'Editore attua misure tecniche e organizzative appropriate (cifratura, controllo degli accessi, isolamento logico). L'accesso ai dati dell'utente è strettamente limitato alla fornitura del servizio, alla manutenzione, alla sicurezza o agli obblighi di legge.","Per i lead catturati, l'Utente agisce come titolare del trattamento ai sensi del GDPR; l'Editore agisce come responsabile e si impegna a rispettare la normativa."] },
    { h: "Articolo 5 – Regole di utilizzo", body: ["Sono in particolare vietati:", [ "L'uso per fini illegali, fraudolenti o contrari all'ordine pubblico.","La diffusione di contenuti contrari ai diritti di terzi o alla dignità umana.","Lo spam, il phishing o qualsiasi pratica ingannevole.","Qualsiasi tentativo di compromettere la sicurezza o il funzionamento della piattaforma.","La rivendita o la messa a disposizione non autorizzata del servizio a terzi." ]] },
    { h: "Articolo 6 – Contenuti", body: ["L'Utente conserva tutti i diritti sui propri Contenuti Utente e concede all'Editore una licenza non esclusiva strettamente limitata alla fornitura del servizio.","I Contenuti Generati dall'IA sono forniti a titolo informativo e possono contenere errori. L'Utente è l'unico responsabile della loro verifica e del loro utilizzo."] },
    { h: "Articolo 7 – Disponibilità", body: ["L'Editore si adopera per assicurare la continuità del servizio, ma questo può essere sospeso per manutenzione, sicurezza o guasti di fornitori terzi. Non è fornita alcuna garanzia di disponibilità permanente."] },
    { h: "Articolo 8 – Responsabilità", body: ["L'Utente si assume l'unica responsabilità delle informazioni fornite, dei contenuti pubblicati e dell'uso dei servizi. L'Editore è tenuto a un'obbligazione di mezzi, senza garanzia di risultato o di prestazione economica. La sua responsabilità non è impegnata per i danni indiretti."] },
    { h: "Articolo 9 – Sospensione", body: ["L'Editore può sospendere l'accesso senza preavviso in caso di violazione delle CGU, frode, mancato pagamento o uso abusivo."] },
    { h: "Articolo 10 – Risoluzione e cancellazione dell'account", body: ["L'Utente può cancellare il proprio account in qualsiasi momento. Dopo la cancellazione, l'accesso è immediatamente interrotto; i dati possono essere conservati temporaneamente per motivi legali e poi cancellati o anonimizzati. È possibile richiedere un'esportazione dei dati prima della cancellazione."] },
    { h: "Articolo 11 – Modifica delle CGU", body: ["L'Editore può modificare le CGU in qualsiasi momento. Le modifiche sono portate a conoscenza degli Utenti; la continuazione dell'utilizzo vale come accettazione."] },
    { h: "Articolo 12 – Diritto applicabile", body: ["Le CGU sono disciplinate dal diritto francese. Per i professionisti, i tribunali della Corte d'appello di Montpellier sono competenti."] },
    { h: "Contatto", body: [`${C.name} — ${C.address} — ${C.email}.`] },
  ],
};
const ar: LegalPage = {
  title: "الشروط العامة للاستخدام",
  lastUpdated: "آخر تحديث: 22/04/2026",
  intro: `تحدد هذه الشروط العامة للاستخدام شروط الوصول إلى Tiquiz® وموقع tiquiz.com واستخدامهما، الناشرة ${C.name} (${C.form}، رأس مال ${C.capital}، RCS ${C.rcs}، المقر ${C.address}). يستلزم الوصول إلى الخدمة قبول الشروط دون تحفظ. تكمّل هذه الشروط الشروط العامة للبيع.`,
  sections: [
    { h: "المادة 1 – التعاريف", body: [[ "المنصة: تطبيق Tiquiz® وموقع tiquiz.com.","المستخدم: كل شخص يصل إلى المنصة.","الحساب: الفضاء الشخصي الذي يسمح بالوصول إلى الخدمات.","محتويات المستخدم: البيانات والنصوص والوسائط التي يدخلها المستخدم.","المحتويات المُولَّدة: المحتويات المنتجة عبر ميزات الذكاء الاصطناعي.","الخدمات: مجموع الميزات المقترحة." ]] },
    { h: "المادة 2 – الوصول إلى الخدمات", body: ["الوصول محجوز للبالغين الذين يتمتعون بالأهلية القانونية. يجب على المستخدم تقديم معلومات دقيقة ومحدّثة، والحفاظ على سرية بيانات اعتماده والإبلاغ عن أي وصول غير مصرح به."] },
    { h: "المادة 3 – وصف الخدمات", body: ["Tiquiz® هو تطبيق SaaS يتيح إنشاء اختبارات تفاعلية، جذب عملاء محتملين، تقسيم العملاء والمزامنة مع أدوات تسويق طرف ثالث. قد تتطور الميزات دون إشعار مسبق."] },
    { h: "المادة 4 – البيانات والأمن", body: ["يطبق الناشر تدابير تقنية وتنظيمية مناسبة (التشفير، التحكم في الوصول، العزل المنطقي). الوصول إلى بيانات المستخدم محصور بتقديم الخدمة والصيانة والأمن أو الالتزامات القانونية.","بالنسبة للعملاء المحتملين، يتصرف المستخدم كمسؤول عن المعالجة بمفهوم RGPD؛ ويتصرف الناشر كمعالج من الباطن ويلتزم باحترام التشريعات."] },
    { h: "المادة 5 – قواعد الاستخدام", body: ["يُحظر بشكل خاص:", [ "الاستخدام لأغراض غير قانونية أو احتيالية أو مخالفة للنظام العام.","نشر محتويات تنتهك حقوق الغير أو الكرامة الإنسانية.","البريد المزعج، التصيّد الاحتيالي، أو أي ممارسة خادعة.","أي محاولة للإضرار بأمن أو تشغيل المنصة.","إعادة بيع أو إتاحة الخدمة دون إذن لأطراف ثالثة." ]] },
    { h: "المادة 6 – المحتويات", body: ["يحتفظ المستخدم بكامل الحقوق على محتوياته ويمنح الناشر ترخيصًا غير حصري يقتصر بشكل صارم على تقديم الخدمة.","تُقدَّم المحتويات المُولَّدة بالذكاء الاصطناعي لأغراض معلوماتية وقد تحتوي على أخطاء. المستخدم وحده مسؤول عن التحقق منها واستخدامها."] },
    { h: "المادة 7 – التوفر", body: ["يسعى الناشر لضمان استمرار الخدمة لكن قد يتم تعليقها للصيانة أو الأمن أو أعطال الموردين. لا يوجد ضمان بتوفر دائم."] },
    { h: "المادة 8 – المسؤولية", body: ["يتحمل المستخدم وحده مسؤولية المعلومات المقدمة والمحتويات المنشورة واستخدام الخدمات. يلتزم الناشر بالتزام وسائل دون ضمان نتيجة أو أداء اقتصادي. لا تتحمل الشركة المسؤولية عن الأضرار غير المباشرة."] },
    { h: "المادة 9 – التعليق", body: ["يمكن للناشر تعليق الوصول دون إشعار في حالة انتهاك الشروط أو الاحتيال أو عدم الدفع أو الاستخدام المسيء."] },
    { h: "المادة 10 – الإنهاء وحذف الحساب", body: ["يمكن للمستخدم حذف حسابه في أي وقت. بعد الحذف، يتم قطع الوصول فورًا؛ قد يُحتفَظ بالبيانات مؤقتًا لأسباب قانونية ثم تُحذف أو تصبح مجهولة الهوية. يمكن طلب تصدير البيانات قبل الحذف."] },
    { h: "المادة 11 – تعديل الشروط", body: ["يمكن للناشر تعديل الشروط في أي وقت. يتم إبلاغ المستخدمين بالتعديلات؛ استمرار الاستخدام يُعدّ قبولًا لها."] },
    { h: "المادة 12 – القانون الواجب التطبيق", body: ["تخضع الشروط للقانون الفرنسي. بالنسبة للمحترفين، تختص محاكم محكمة استئناف مونبلييه."] },
    { h: "الاتصال", body: [`${C.name} — ${C.address} — ${C.email}.`] },
  ],
};

export const termsOfUse: Record<string, LegalPage> = { fr, en, es, it, ar };
