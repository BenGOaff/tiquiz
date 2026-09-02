import type { LegalPage } from "./types";
import { COMPANY as C } from "./company";

const fr: LegalPage = {
  title: "Politique de confidentialité",
  lastUpdated: "Dernière mise à jour : 02/09/2026",
  intro: `La présente politique décrit comment ${C.name} (édite Tiquiz®) collecte, utilise et protège les données personnelles des visiteurs et utilisateurs des sites tiquiz.fr et de l'application Tiquiz. Les traitements respectent le RGPD et la loi Informatique et Libertés.`,
  sections: [
    {
      h: "1. Responsable du traitement",
      body: [
        `Le responsable du traitement est ${C.name}, ${C.form} au capital de ${C.capital}, RCS ${C.rcs}, siège social ${C.address}.`,
        `Pour toute question : ${C.email}.`,
      ],
    },
    {
      h: "2. Périmètre des services",
      body: [
        `La politique couvre le site de présentation tiquiz.fr et l'application Tiquiz (quiz interactifs, capture de leads, intégrations marketing). Tiquiz® est une marque déposée de ${C.name}.`,
      ],
    },
    {
      h: "3. Données collectées",
      body: [
        "Nous collectons les catégories suivantes :",
        [
          "Identification : nom, prénom, email, numéro de téléphone (facultatif), adresse de facturation.",
          "Activité quiz : quiz créés, questions, résultats, statistiques d'usage.",
          "Leads captés par vos quiz : emails et informations des visiteurs que vos quiz collectent - vous en êtes le responsable de traitement, Tiquiz agit en sous-traitant.",
          "Techniques : adresse IP, navigateur, appareil, journaux de connexion.",
          "Paiement : les données bancaires sont traitées par Stripe et PayPal. Aucune donnée bancaire n'est stockée par Tiquiz.",
        ],
      ],
    },
    {
      h: "4. Finalités et bases légales",
      body: [
        [
          "Exécution du contrat : gestion du compte, accès au service, paiement, support.",
          "Consentement : communications marketing, cookies non essentiels, témoignages.",
          "Intérêt légitime : amélioration du service, sécurisation, prévention de la fraude.",
          "Obligation légale : comptabilité, fiscalité.",
        ],
      ],
    },
    {
      h: "5. Traitement par intelligence artificielle",
      body: [
        "Tiquiz utilise des modèles d'IA pour générer des quiz et analyser vos statistiques. Ces traitements n'emportent aucune décision automatisée produisant des effets juridiques. Les résultats sont des suggestions à valider par l'utilisateur.",
      ],
    },
    {
      h: "6. Rôle des parties (spécifique à Tiquiz)",
      body: [
        "Pour les leads captés par vos quiz, vous êtes responsable de traitement et Tiquiz agit en sous-traitant. Vous vous engagez à respecter la réglementation applicable et à informer les visiteurs de vos quiz.",
      ],
    },
    {
      h: "7. Destinataires et sous-traitants",
      body: [
        "Vos données peuvent être transmises à nos sous-traitants :",
        [
          "Supabase (hébergement base de données et authentification)",
          "Hostinger (hébergement applicatif)",
          "Stripe et PayPal (paiement)",
          "Anthropic (modèles d'IA)",
          "Systeme.io (quand vous activez l'intégration marketing)",
          "Google Analytics (mesure d'audience, avec consentement)",
        ],
        "Les données ne font l'objet d'aucune revente.",
      ],
    },
    {
      h: "8. Transferts hors Union européenne",
      body: [
        "Certains sous-traitants sont situés hors UE. Les transferts sont encadrés par les clauses contractuelles types ou les mécanismes adéquats reconnus par la Commission européenne.",
      ],
    },
    {
      h: "9. Durée de conservation",
      body: [
        [
          "Compte actif : pendant toute la durée d'utilisation.",
          "Compte inactif : 3 ans après le dernier accès.",
          "Données de prospection : 3 ans.",
          "Factures : 10 ans (obligation comptable).",
          "Cookies : 13 mois maximum.",
        ],
      ],
    },
    {
      h: "10. Vos droits",
      body: [
        "Vous disposez des droits d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition, ainsi que du droit de retirer votre consentement à tout moment. Vous pouvez exercer ces droits en écrivant à " + C.email + ". Nous répondons sous un mois. Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).",
      ],
    },
    {
      h: "11. Sécurité",
      body: [
        "Nous mettons en œuvre des mesures techniques et organisationnelles appropriées : chiffrement en transit et au repos, contrôle d'accès strict, isolation logique des environnements, journalisation.",
      ],
    },
    {
      h: "12. Connexion avec Google",
      body: [
        "Tiquiz propose une connexion « Continuer avec Google ». Elle est facultative : le compte peut aussi être créé avec une adresse email et un mot de passe.",
        "Lorsque vous l'utilisez, Google nous transmet trois informations, et trois seulement : votre adresse email, votre nom d'affichage et l'identifiant unique de votre compte Google. Nous les utilisons uniquement pour créer votre compte Tiquiz, ouvrir votre session et vous reconnaître lors des connexions suivantes.",
        "Tiquiz ne demande aucun autre accès à votre compte Google : ni Gmail, ni Drive, ni Agenda, ni Contacts, ni Photos, ni aucun droit d'écriture ou de publication. Aucun mot de passe Google ne nous est transmis ni conservé.",
        "Ces informations ne sont ni vendues, ni louées, ni utilisées à des fins publicitaires, ni transmises à des tiers en dehors des sous-traitants listés à l'article 7. Elles sont conservées pendant la durée de vie du compte, selon les durées de l'article 9, et supprimées avec lui.",
        "Vous pouvez retirer à tout moment l'accès de Tiquiz à votre compte Google depuis myaccount.google.com/permissions. Votre compte Tiquiz continue d'exister : vous vous connectez alors avec votre adresse email.",
      ],
    },
    {
      h: "13. Cookies",
      body: [
        "Voir la politique de cookies dédiée pour le détail par catégorie et la gestion du consentement.",
      ],
    },
    {
      h: "14. Mineurs",
      body: [
        "Tiquiz est réservé aux personnes majeures. Si vous constatez qu'un mineur nous a transmis des données, contactez-nous à " + C.email + " pour suppression.",
      ],
    },
    {
      h: "15. Modifications",
      body: [
        "La politique peut évoluer. En cas de modification substantielle, les utilisateurs en sont informés. Consultez régulièrement cette page.",
      ],
    },
    {
      h: "16. Contact",
      body: [
        `${C.name}, ${C.address}, ${C.email}.`,
        "Autorité de contrôle : CNIL (www.cnil.fr).",
      ],
    },
  ],
};

const en: LegalPage = {
  title: "Privacy Policy",
  lastUpdated: "Last updated: 09/02/2026",
  intro: `This policy explains how ${C.name} (the publisher of Tiquiz®) collects, uses and protects personal data of visitors and users of tiquiz.fr and the Tiquiz application. Processing complies with the EU GDPR and the French Data Protection Act.`,
  sections: [
    {
      h: "1. Data controller",
      body: [
        `The data controller is ${C.name}, a ${C.form} with a share capital of ${C.capital}, registered with the Montpellier Trade Registry under no. 909 349 045, with its registered office at ${C.address}.`,
        `Any question: ${C.email}.`,
      ],
    },
    {
      h: "2. Scope",
      body: [
        `This policy covers the marketing site tiquiz.fr and the Tiquiz application (interactive quizzes, lead capture, marketing integrations). Tiquiz® is a registered trademark of ${C.name}.`,
      ],
    },
    {
      h: "3. Data we collect",
      body: [
        "We collect the following categories:",
        [
          "Identification: first and last name, email, phone number (optional), billing address.",
          "Quiz activity: quizzes you create, questions, results, usage statistics.",
          "Leads captured by your quizzes: emails and answers collected by your quizzes - you are the data controller, Tiquiz acts as your processor.",
          "Technical: IP address, browser, device, connection logs.",
          "Payment: card data is processed by Stripe and PayPal. No card data is stored by Tiquiz.",
        ],
      ],
    },
    {
      h: "4. Purposes and legal bases",
      body: [
        [
          "Performance of the contract: account management, service access, billing, support.",
          "Consent: marketing communications, non-essential cookies, testimonials.",
          "Legitimate interest: product improvement, security, fraud prevention.",
          "Legal obligation: accounting and tax requirements.",
        ],
      ],
    },
    {
      h: "5. Use of Artificial Intelligence",
      body: [
        "Tiquiz uses AI models to generate quizzes and analyse your statistics. These operations do not trigger any automated decision producing legal effects. Outputs are suggestions that you validate.",
      ],
    },
    {
      h: "6. Roles (specific to Tiquiz)",
      body: [
        "For the leads your quizzes capture, you are the data controller and Tiquiz acts as a processor. You are responsible for compliance with the applicable regulation and for informing your quiz visitors.",
      ],
    },
    {
      h: "7. Recipients and sub-processors",
      body: [
        "Your data may be shared with our sub-processors:",
        [
          "Supabase (database hosting and authentication)",
          "Hostinger (application hosting)",
          "Stripe and PayPal (payments)",
          "Anthropic (AI models)",
          "Systeme.io (when you enable the marketing integration)",
          "Google Analytics (audience measurement, with consent)",
        ],
        "We never sell your data.",
      ],
    },
    {
      h: "8. International transfers",
      body: [
        "Some sub-processors are located outside the EU. Transfers are framed by Standard Contractual Clauses or other adequate mechanisms recognised by the European Commission.",
      ],
    },
    {
      h: "9. Retention",
      body: [
        [
          "Active account: for the whole duration of use.",
          "Inactive account: 3 years after last access.",
          "Prospecting data: 3 years.",
          "Invoices: 10 years (legal accounting requirement).",
          "Cookies: 13 months maximum.",
        ],
      ],
    },
    {
      h: "10. Your rights",
      body: [
        "You have the right to access, rectify, erase, restrict, port and object to the processing of your data, as well as the right to withdraw consent at any time. Write to " + C.email + " to exercise these rights. We reply within one month. You can also file a complaint with the French supervisory authority CNIL (www.cnil.fr) or your local EU authority.",
      ],
    },
    {
      h: "11. Security",
      body: [
        "We implement appropriate technical and organisational measures: encryption in transit and at rest, strict access control, environment isolation, logging.",
      ],
    },
    {
      h: "12. Signing in with Google",
      body: [
        "Tiquiz offers a \"Continue with Google\" sign-in. It is optional: an account can also be created with an email address and a password.",
        "When you use it, Google sends us three pieces of information, and only three: your email address, your display name and the unique identifier of your Google account. We use them solely to create your Tiquiz account, open your session and recognise you on later sign-ins.",
        "Tiquiz requests no other access to your Google account: no Gmail, no Drive, no Calendar, no Contacts, no Photos, and no write or posting permission. No Google password is ever sent to us or stored by us.",
        "This information is never sold, rented, used for advertising, or shared with third parties other than the processors listed in section 7. It is kept for the lifetime of the account, under the retention periods in section 9, and deleted with it.",
        "You can revoke Tiquiz's access to your Google account at any time at myaccount.google.com/permissions. Your Tiquiz account keeps existing: you then sign in with your email address.",
      ],
    },
    {
      h: "13. Cookies",
      body: [
        "See our dedicated Cookie Policy for the per-category detail and consent management.",
      ],
    },
    {
      h: "14. Minors",
      body: [
        "Tiquiz is reserved for adults. If a minor has sent us data, contact " + C.email + " for deletion.",
      ],
    },
    {
      h: "15. Changes",
      body: [
        "This policy may evolve. In case of material change, users are informed. Please check this page regularly.",
      ],
    },
    {
      h: "16. Contact",
      body: [
        `${C.name}, ${C.address}, ${C.email}.`,
        "Supervisory authority: CNIL (www.cnil.fr).",
      ],
    },
  ],
};


const es: LegalPage = {
  title: "Política de privacidad",
  lastUpdated: "Última actualización: 02/09/2026",
  intro: `Esta política describe cómo ${C.name} (editora de Tiquiz®) recopila, utiliza y protege los datos personales de visitantes y usuarios de tiquiz.fr y la aplicación Tiquiz. Los tratamientos cumplen con el RGPD.`,
  sections: [
    { h: "1. Responsable del tratamiento",
      body: [
        `El responsable del tratamiento es ${C.name}, ${C.form} con capital social de ${C.capital}, inscrita en el RCS de Montpellier con el n.º 909 349 045, domicilio social ${C.address}.`,
        `Para cualquier consulta: ${C.email}.`,
      ]},
    { h: "2. Ámbito de los servicios",
      body: [`Esta política cubre el sitio de presentación tiquiz.fr y la aplicación Tiquiz (quizzes interactivos, captura de leads, integraciones de marketing). Tiquiz® es una marca registrada de ${C.name}.`]},
    { h: "3. Datos recopilados",
      body: ["Recopilamos las siguientes categorías:",
        [ "Identificación: nombre, apellidos, email, teléfono (opcional), dirección de facturación.",
          "Actividad del quiz: quizzes creados, preguntas, resultados, estadísticas de uso.",
          "Leads captados por tus quizzes: emails e información de los visitantes recogidos por tus quizzes - tú eres el responsable del tratamiento, Tiquiz actúa como encargado.",
          "Técnicos: dirección IP, navegador, dispositivo, registros de conexión.",
          "Pago: los datos bancarios los procesan Stripe y PayPal. Tiquiz no almacena datos bancarios." ]]},
    { h: "4. Finalidades y bases legales",
      body: [[
        "Ejecución del contrato: gestión de la cuenta, acceso al servicio, pago, soporte.",
        "Consentimiento: comunicaciones de marketing, cookies no esenciales, testimonios.",
        "Interés legítimo: mejora del servicio, seguridad, prevención de fraude.",
        "Obligación legal: contabilidad, fiscalidad."]]},
    { h: "5. Tratamiento mediante inteligencia artificial",
      body: ["Tiquiz utiliza modelos de IA para generar quizzes y analizar estadísticas. Estos tratamientos no implican ninguna decisión automatizada con efectos jurídicos. Los resultados son sugerencias que debes validar."]},
    { h: "6. Roles de las partes (específico de Tiquiz)",
      body: ["Para los leads captados por tus quizzes, tú eres el responsable del tratamiento y Tiquiz actúa como encargado. Te comprometes a cumplir la normativa aplicable y a informar a los visitantes de tus quizzes."]},
    { h: "7. Destinatarios y encargados",
      body: ["Tus datos pueden transmitirse a nuestros encargados:",
        [ "Supabase (hospedaje de la base de datos y autenticación)",
          "Hostinger (hospedaje de la aplicación)",
          "Stripe y PayPal (pago)",
          "Anthropic (modelos de IA)",
          "Systeme.io (cuando activas la integración de marketing)",
          "Google Analytics (medición de audiencia, con consentimiento)" ],
        "No vendemos tus datos."]},
    { h: "8. Transferencias fuera de la Unión Europea",
      body: ["Algunos encargados se encuentran fuera de la UE. Las transferencias están reguladas por las cláusulas contractuales tipo u otros mecanismos adecuados reconocidos por la Comisión Europea."]},
    { h: "9. Plazo de conservación",
      body: [[ "Cuenta activa: durante todo el periodo de uso.",
               "Cuenta inactiva: 3 años desde el último acceso.",
               "Datos de prospección: 3 años.",
               "Facturas: 10 años (obligación contable).",
               "Cookies: 13 meses máximo." ]]},
    { h: "10. Tus derechos",
      body: ["Tienes derecho de acceso, rectificación, supresión, limitación, portabilidad y oposición, así como el derecho a retirar tu consentimiento en cualquier momento. Puedes ejercer estos derechos escribiendo a " + C.email + ". Respondemos en el plazo de un mes. También puedes presentar una reclamación ante la autoridad de control competente."]},
    { h: "11. Seguridad",
      body: ["Aplicamos medidas técnicas y organizativas apropiadas: cifrado en tránsito y en reposo, control de acceso estricto, aislamiento de entornos, registro de actividad."]},
    { h: "12. Inicio de sesión con Google",
      body: [
        "Tiquiz ofrece un inicio de sesión «Continuar con Google». Es opcional: la cuenta también puede crearse con un correo electrónico y una contraseña.",
        "Cuando lo utilizas, Google nos transmite tres datos, y solo tres: tu dirección de correo electrónico, tu nombre visible y el identificador único de tu cuenta de Google. Los usamos únicamente para crear tu cuenta de Tiquiz, abrir tu sesión y reconocerte en los inicios de sesión posteriores.",
        "Tiquiz no solicita ningún otro acceso a tu cuenta de Google: ni Gmail, ni Drive, ni Calendario, ni Contactos, ni Fotos, ni permiso de escritura o publicación. Ninguna contraseña de Google se nos transmite ni se almacena.",
        "Estos datos no se venden, ni se alquilan, ni se usan con fines publicitarios, ni se comunican a terceros fuera de los encargados indicados en el punto 7. Se conservan durante la vida de la cuenta, según los plazos del punto 9, y se eliminan con ella.",
        "Puedes retirar el acceso de Tiquiz a tu cuenta de Google en cualquier momento en myaccount.google.com/permissions. Tu cuenta de Tiquiz sigue existiendo: a partir de ahí inicias sesión con tu correo electrónico.",
      ]},
    { h: "13. Cookies", body: ["Consulta la política de cookies dedicada para el detalle por categoría y la gestión del consentimiento."]},
    { h: "14. Menores", body: ["Tiquiz está reservado a personas mayores de edad. Si un menor nos ha transmitido datos, contacta con " + C.email + " para su supresión."]},
    { h: "15. Modificaciones", body: ["Esta política puede evolucionar. En caso de modificación sustancial, se informará a los usuarios. Consulta esta página regularmente."]},
    { h: "16. Contacto", body: [`${C.name}, ${C.address}, ${C.email}.`, "Autoridad de control: CNIL (www.cnil.fr)."]},
  ],
};

const it: LegalPage = {
  title: "Informativa sulla privacy",
  lastUpdated: "Ultimo aggiornamento: 02/09/2026",
  intro: `La presente informativa descrive come ${C.name} (editore di Tiquiz®) raccoglie, utilizza e protegge i dati personali dei visitatori e utenti di tiquiz.fr e dell'applicazione Tiquiz. I trattamenti rispettano il GDPR.`,
  sections: [
    { h: "1. Titolare del trattamento",
      body: [ `Il titolare del trattamento è ${C.name}, ${C.form} con capitale sociale di ${C.capital}, iscritta al RCS di Montpellier con il n. 909 349 045, sede legale ${C.address}.`,
              `Per qualsiasi domanda: ${C.email}.` ]},
    { h: "2. Ambito dei servizi",
      body: [`L'informativa copre il sito di presentazione tiquiz.fr e l'applicazione Tiquiz (quiz interattivi, cattura di lead, integrazioni marketing). Tiquiz® è un marchio registrato di ${C.name}.`]},
    { h: "3. Dati raccolti",
      body: ["Raccogliamo le seguenti categorie:",
        [ "Identificazione: nome, cognome, email, numero di telefono (facoltativo), indirizzo di fatturazione.",
          "Attività quiz: quiz creati, domande, risultati, statistiche d'uso.",
          "Lead catturati dai tuoi quiz: email e informazioni dei visitatori raccolti dai tuoi quiz - tu sei il titolare del trattamento, Tiquiz agisce come responsabile.",
          "Tecnici: indirizzo IP, browser, dispositivo, log di connessione.",
          "Pagamento: i dati bancari sono trattati da Stripe e PayPal. Tiquiz non memorizza alcun dato bancario." ]]},
    { h: "4. Finalità e basi giuridiche",
      body: [[ "Esecuzione del contratto: gestione account, accesso al servizio, pagamento, assistenza.",
               "Consenso: comunicazioni di marketing, cookie non essenziali, testimonianze.",
               "Interesse legittimo: miglioramento del servizio, sicurezza, prevenzione frodi.",
               "Obbligo di legge: contabilità, fiscalità." ]]},
    { h: "5. Trattamento con intelligenza artificiale",
      body: ["Tiquiz utilizza modelli di IA per generare quiz e analizzare le tue statistiche. Tali trattamenti non comportano decisioni automatizzate che producano effetti giuridici. I risultati sono suggerimenti da validare dall'utente."]},
    { h: "6. Ruoli delle parti (specifico per Tiquiz)",
      body: ["Per i lead catturati dai tuoi quiz, tu sei il titolare del trattamento e Tiquiz agisce come responsabile. Ti impegni a rispettare la normativa applicabile e a informare i visitatori dei tuoi quiz."]},
    { h: "7. Destinatari e responsabili del trattamento",
      body: ["I tuoi dati possono essere trasmessi ai nostri responsabili:",
        [ "Supabase (hosting database e autenticazione)",
          "Hostinger (hosting applicativo)",
          "Stripe e PayPal (pagamento)",
          "Anthropic (modelli di IA)",
          "Systeme.io (quando attivi l'integrazione marketing)",
          "Google Analytics (misurazione audience, con consenso)" ],
        "Non vendiamo i tuoi dati."]},
    { h: "8. Trasferimenti fuori dall'Unione Europea",
      body: ["Alcuni responsabili sono situati fuori dall'UE. I trasferimenti sono regolati da clausole contrattuali tipo o altri meccanismi adeguati riconosciuti dalla Commissione europea."]},
    { h: "9. Durata di conservazione",
      body: [[ "Account attivo: per l'intera durata dell'utilizzo.",
               "Account inattivo: 3 anni dall'ultimo accesso.",
               "Dati di prospezione: 3 anni.",
               "Fatture: 10 anni (obbligo contabile).",
               "Cookie: 13 mesi massimo." ]]},
    { h: "10. I tuoi diritti",
      body: ["Hai diritto di accesso, rettifica, cancellazione, limitazione, portabilità e opposizione, nonché il diritto di revocare il consenso in qualsiasi momento. Puoi esercitare questi diritti scrivendo a " + C.email + ". Rispondiamo entro un mese. Puoi inoltre presentare reclamo all'autorità di controllo competente."]},
    { h: "11. Sicurezza",
      body: ["Adottiamo misure tecniche e organizzative appropriate: cifratura in transito e a riposo, controllo degli accessi rigoroso, isolamento degli ambienti, log."]},
    { h: "12. Accesso con Google",
      body: [
        "Tiquiz propone un accesso «Continua con Google». È facoltativo: l'account può essere creato anche con un indirizzo email e una password.",
        "Quando lo utilizzi, Google ci trasmette tre informazioni, e soltanto tre: il tuo indirizzo email, il tuo nome visualizzato e l'identificativo univoco del tuo account Google. Le usiamo unicamente per creare il tuo account Tiquiz, aprire la tua sessione e riconoscerti agli accessi successivi.",
        "Tiquiz non richiede nessun altro accesso al tuo account Google: né Gmail, né Drive, né Calendario, né Contatti, né Foto, né alcun permesso di scrittura o pubblicazione. Nessuna password Google ci viene trasmessa né conservata.",
        "Queste informazioni non vengono vendute, né noleggiate, né usate a fini pubblicitari, né comunicate a terzi al di fuori dei responsabili elencati al punto 7. Sono conservate per la durata di vita dell'account, secondo i termini del punto 9, ed eliminate insieme ad esso.",
        "Puoi revocare in qualsiasi momento l'accesso di Tiquiz al tuo account Google su myaccount.google.com/permissions. Il tuo account Tiquiz continua a esistere: da quel momento accedi con il tuo indirizzo email.",
      ]},
    { h: "13. Cookie", body: ["Consulta l'informativa dedicata ai cookie per il dettaglio per categoria e la gestione del consenso."]},
    { h: "14. Minori", body: ["Tiquiz è riservato alle persone maggiorenni. Se un minore ci ha trasmesso dati, contatta " + C.email + " per la cancellazione."]},
    { h: "15. Modifiche", body: ["La presente informativa può evolvere. In caso di modifica sostanziale, gli utenti ne saranno informati. Consulta regolarmente questa pagina."]},
    { h: "16. Contatto", body: [`${C.name}, ${C.address}, ${C.email}.`, "Autorità di controllo: CNIL (www.cnil.fr)."]},
  ],
};

const ar: LegalPage = {
  title: "سياسة الخصوصية",
  lastUpdated: "آخر تحديث: 02/09/2026",
  intro: `تصف هذه السياسة كيف تقوم ${C.name} (الناشرة لـ Tiquiz®) بجمع واستخدام وحماية البيانات الشخصية لزوار ومستخدمي موقع tiquiz.fr وتطبيق Tiquiz. تلتزم عمليات المعالجة باللائحة العامة لحماية البيانات (RGPD).`,
  sections: [
    { h: "1. المسؤول عن المعالجة",
      body: [ `المسؤول عن المعالجة هو ${C.name}، ${C.form} برأس مال ${C.capital}، مسجلة في السجل التجاري لمونبلييه تحت الرقم 909 349 045، المقر الاجتماعي ${C.address}.`,
              `لأي سؤال: ${C.email}.` ]},
    { h: "2. نطاق الخدمات",
      body: [`تغطي هذه السياسة الموقع التعريفي tiquiz.fr وتطبيق Tiquiz (اختبارات تفاعلية، جمع العملاء المحتملين، التكاملات التسويقية). Tiquiz® علامة تجارية مسجلة لـ ${C.name}.`]},
    { h: "3. البيانات المجمعة",
      body: ["نجمع الفئات التالية:",
        [ "معلومات الهوية: الاسم، اللقب، البريد الإلكتروني، رقم الهاتف (اختياري)، عنوان الفوترة.",
          "نشاط الاختبار: الاختبارات المنشأة، الأسئلة، النتائج، إحصائيات الاستخدام.",
          "العملاء المحتملون: رسائل البريد الإلكتروني ومعلومات الزوار التي تجمعها اختباراتك - أنت المسؤول عن المعالجة، وTiquiz يعمل كمعالج من الباطن.",
          "بيانات تقنية: عنوان IP، المتصفح، الجهاز، سجلات الاتصال.",
          "الدفع: تُعالَج البيانات المصرفية بواسطة Stripe وPayPal. لا يخزن Tiquiz أي بيانات مصرفية." ]]},
    { h: "4. الأغراض والأسس القانونية",
      body: [[ "تنفيذ العقد: إدارة الحساب، الوصول إلى الخدمة، الدفع، الدعم.",
               "الموافقة: الاتصالات التسويقية، ملفات تعريف الارتباط غير الأساسية، الشهادات.",
               "المصلحة المشروعة: تحسين الخدمة، الأمن، منع الاحتيال.",
               "الالتزام القانوني: المحاسبة والضرائب." ]]},
    { h: "5. المعالجة بواسطة الذكاء الاصطناعي",
      body: ["يستخدم Tiquiz نماذج الذكاء الاصطناعي لتوليد الاختبارات وتحليل الإحصائيات. لا تترتب على هذه المعالجات أي قرارات آلية تنتج آثارًا قانونية. النتائج اقتراحات يجب أن يُصادق عليها المستخدم."]},
    { h: "6. أدوار الأطراف (خاص بـ Tiquiz)",
      body: ["بالنسبة للعملاء المحتملين الذين تجمعهم اختباراتك، أنت المسؤول عن المعالجة ويعمل Tiquiz كمعالج من الباطن. تلتزم باحترام التشريعات المطبقة وإبلاغ زوار اختباراتك."]},
    { h: "7. المستلمون والمعالجون من الباطن",
      body: ["قد تُنقل بياناتك إلى المعالجين من الباطن:",
        [ "Supabase (استضافة قاعدة البيانات والمصادقة)",
          "Hostinger (استضافة التطبيق)",
          "Stripe وPayPal (الدفع)",
          "Anthropic (نماذج الذكاء الاصطناعي)",
          "Systeme.io (عند تفعيل التكامل التسويقي)",
          "Google Analytics (قياس الجمهور، بموافقة)" ],
        "لا نبيع بياناتك."]},
    { h: "8. التحويلات خارج الاتحاد الأوروبي",
      body: ["بعض المعالجين من الباطن موجودون خارج الاتحاد الأوروبي. تُنظَّم التحويلات ببنود تعاقدية نموذجية أو آليات ملائمة أخرى تعترف بها المفوضية الأوروبية."]},
    { h: "9. مدة الاحتفاظ",
      body: [[ "حساب نشط: طوال مدة الاستخدام.",
               "حساب غير نشط: 3 سنوات بعد آخر وصول.",
               "بيانات التنقيب: 3 سنوات.",
               "الفواتير: 10 سنوات (التزام محاسبي).",
               "ملفات تعريف الارتباط: 13 شهرًا كحد أقصى." ]]},
    { h: "10. حقوقك",
      body: ["لديك حقوق الوصول، التصحيح، الحذف، التقييد، نقل البيانات، والاعتراض، بالإضافة إلى الحق في سحب موافقتك في أي وقت. يمكنك ممارسة هذه الحقوق بالكتابة إلى " + C.email + ". نرد في غضون شهر. يمكنك أيضًا تقديم شكوى إلى السلطة المختصة."]},
    { h: "11. الأمن",
      body: ["نطبق تدابير تقنية وتنظيمية مناسبة: تشفير أثناء النقل والتخزين، تحكم صارم في الوصول، عزل البيئات، تسجيل."]},
    { h: "12. تسجيل الدخول عبر Google",
      body: [
        "يوفر Tiquiz تسجيل دخول عبر «المتابعة باستخدام Google». وهو اختياري: يمكن أيضًا إنشاء الحساب ببريد إلكتروني وكلمة مرور.",
        "عند استخدامه، ترسل إلينا Google ثلاث معلومات فقط: بريدك الإلكتروني، واسم العرض الخاص بك، والمعرّف الفريد لحسابك على Google. نستخدمها حصريًا لإنشاء حسابك في Tiquiz وفتح جلستك والتعرف عليك في عمليات تسجيل الدخول اللاحقة.",
        "لا يطلب Tiquiz أي وصول آخر إلى حسابك على Google: لا Gmail، ولا Drive، ولا التقويم، ولا جهات الاتصال، ولا الصور، ولا أي إذن بالكتابة أو النشر. ولا تُرسل إلينا أي كلمة مرور خاصة بـ Google ولا تُخزَّن.",
        "لا تُباع هذه المعلومات ولا تُؤجَّر ولا تُستخدم لأغراض إعلانية ولا تُنقل إلى أطراف ثالثة خارج المعالجين المذكورين في البند 7. تُحفظ طوال مدة وجود الحساب وفق المدد المذكورة في البند 9، وتُحذف معه.",
        "يمكنك سحب وصول Tiquiz إلى حسابك على Google في أي وقت عبر myaccount.google.com/permissions. يظل حسابك في Tiquiz قائمًا: عندئذٍ تسجّل الدخول ببريدك الإلكتروني.",
      ]},
    { h: "13. ملفات تعريف الارتباط", body: ["راجع سياسة ملفات تعريف الارتباط المخصصة للتفاصيل حسب الفئة وإدارة الموافقة."]},
    { h: "14. القاصرون", body: ["Tiquiz محجوز للبالغين. إذا أرسل لنا قاصر بيانات، تواصل مع " + C.email + " للحذف."]},
    { h: "15. التعديلات", body: ["قد تتطور هذه السياسة. في حالة تعديل جوهري، يُبلَّغ المستخدمون. راجع هذه الصفحة بانتظام."]},
    { h: "16. الاتصال", body: [`${C.name}, ${C.address}, ${C.email}.`, "السلطة الرقابية: CNIL (www.cnil.fr)."]},
  ],
};

export const privacy: Record<string, LegalPage> = { fr, en, es, it, ar };
