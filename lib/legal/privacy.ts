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
      h: "12. Connexion avec Google et données utilisateur Google",
      body: [
        "Tiquiz propose une connexion « Continuer avec Google ». Elle est facultative : un compte peut être créé et utilisé entièrement avec une adresse email et un mot de passe, sans jamais passer par Google.",
        "Cet article décrit précisément comment Tiquiz accède aux données utilisateur Google, les utilise, les stocke, les protège, les partage et les conserve.",
        "Ce à quoi nous accédons. Lorsque vous choisissez « Continuer avec Google », Google nous transmet trois informations, et trois seulement :",
        [
          "votre adresse email, qui identifie votre compte Tiquiz ;",
          "votre nom d'affichage, utilisé pour vous nommer dans l'interface ;",
          "l'identifiant unique de votre compte Google, qui nous permet de vous reconnaître lors des connexions suivantes.",
        ],
        "Nous demandons uniquement les autorisations openid, email et profile. Tiquiz ne demande et n'obtient aucun autre accès à votre compte Google : ni Gmail, ni Drive, ni Agenda, ni Contacts, ni Photos, ni YouTube, ni aucune autorisation d'écriture, de suppression ou de publication. Aucun mot de passe Google ne nous est transmis, et nous n'en conservons aucun.",
        "Comment nous les utilisons. Ces trois informations servent exclusivement à créer votre compte Tiquiz, ouvrir votre session, vous reconnaître lors des connexions suivantes, et vous envoyer les messages liés à votre compte (confirmation, sécurité, facturation, réponse à une demande de support). Elles ne servent à aucun autre usage.",
        "Comment nous les stockons et les protégeons. Elles sont enregistrées dans la base de données de Tiquiz, chez les hébergeurs listés à l'article 7, chiffrées en transit et au repos, derrière un contrôle d'accès strict et une journalisation des accès (article 11). Les transferts éventuels hors Union européenne sont encadrés comme indiqué à l'article 8.",
        "Avec qui nous les partageons. Ces données ne sont ni vendues, ni louées, ni échangées, ni cédées à qui que ce soit. Elles ne servent pas à de la publicité, ne sont pas transmises à des courtiers en données, et ne sont pas utilisées pour entraîner, améliorer ou personnaliser des modèles d'intelligence artificielle. Seuls les sous-traitants strictement nécessaires au fonctionnement du service y ont accès, ceux listés à l'article 7, chacun lié par contrat et tenu aux mêmes obligations.",
        "Combien de temps nous les conservons, et comment les supprimer. Elles sont conservées pendant la durée de vie de votre compte, selon les durées de l'article 9, et supprimées avec lui. Vous pouvez demander la suppression de votre compte et de ces données à tout moment, selon l'article 10 : nous répondons sous un mois.",
        "Comment retirer notre accès. Vous pouvez retirer l'accès de Tiquiz à votre compte Google à tout moment depuis la page myaccount.google.com/permissions. Votre compte Tiquiz continue d'exister : vous vous connectez alors avec votre adresse email et un mot de passe.",
        "Usage limité. L'utilisation et le transfert par Tiquiz des informations reçues des API Google respectent la Politique relative aux données utilisateur des services API Google (Google API Services User Data Policy), y compris ses exigences d'utilisation limitée (Limited Use).",
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
      h: "12. Signing in with Google and Google user data",
      body: [
        "Tiquiz offers a “Continue with Google” sign-in. It is optional: an account can be created and used entirely with an email address and a password, without ever going through Google.",
        "This section describes precisely how Tiquiz accesses, uses, stores, protects, shares and retains Google user data.",
        "What we access. When you choose “Continue with Google”, Google sends us three pieces of information, and only three:",
        [
          "your email address, which identifies your Tiquiz account;",
          "your display name, used to address you in the interface;",
          "the unique identifier of your Google account, which lets us recognise you on later sign-ins.",
        ],
        "We request only the openid, email and profile scopes. Tiquiz neither requests nor obtains any other access to your Google account: no Gmail, no Drive, no Calendar, no Contacts, no Photos, no YouTube, and no write, delete or publish permission. No Google password is ever sent to us, and we store none.",
        "How we use it. These three items are used solely to create your Tiquiz account, open your session, recognise you on later sign-ins, and send you messages related to your account (confirmation, security, billing, answers to support requests). They are used for nothing else.",
        "How we store and protect it. It is stored in the Tiquiz database, with the hosting providers listed in section 7, encrypted in transit and at rest, behind strict access control and access logging (section 11). Any transfer outside the European Union is covered as described in section 8.",
        "Who we share it with. This data is never sold, rented, traded or handed over to anyone. It is not used for advertising, not passed to data brokers, and not used to train, improve or personalise artificial intelligence models. Only the processors strictly required to run the service have access to it, those listed in section 7, each bound by contract to the same obligations.",
        "How long we keep it, and how to delete it. It is kept for the lifetime of your account, according to the periods in section 9, and deleted with it. You can request deletion of your account and of this data at any time under section 10: we answer within one month.",
        "How to revoke our access. You can revoke Tiquiz's access to your Google account at any time at myaccount.google.com/permissions. Your Tiquiz account keeps working: you then sign in with your email address and a password.",
        "Limited Use. Tiquiz's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including its Limited Use requirements.",
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
    { h: "12. Inicio de sesión con Google y datos de usuario de Google",
      body: [
        "Tiquiz ofrece un inicio de sesión « Continuar con Google ». Es opcional: se puede crear y usar una cuenta íntegramente con una dirección de correo y una contraseña, sin pasar nunca por Google.",
        "Este artículo describe con precisión cómo Tiquiz accede a los datos de usuario de Google, los usa, los almacena, los protege, los comparte y los conserva.",
        "A qué accedemos. Cuando eliges « Continuar con Google », Google nos transmite tres datos, y solo tres:",
        [
          "tu dirección de correo, que identifica tu cuenta de Tiquiz;",
          "tu nombre para mostrar, usado para dirigirnos a ti en la interfaz;",
          "el identificador único de tu cuenta de Google, que nos permite reconocerte en los inicios de sesión posteriores.",
        ],
        "Solicitamos únicamente los permisos openid, email y profile. Tiquiz no solicita ni obtiene ningún otro acceso a tu cuenta de Google: ni Gmail, ni Drive, ni Calendario, ni Contactos, ni Fotos, ni YouTube, ni ningún permiso de escritura, borrado o publicación. Ninguna contraseña de Google nos es transmitida ni conservada.",
        "Cómo los usamos. Estos tres datos sirven exclusivamente para crear tu cuenta de Tiquiz, abrir tu sesión, reconocerte en los inicios de sesión posteriores y enviarte los mensajes relacionados con tu cuenta (confirmación, seguridad, facturación, respuesta a una solicitud de soporte). No se usan para ningún otro fin.",
        "Cómo los almacenamos y protegemos. Se guardan en la base de datos de Tiquiz, en los proveedores de alojamiento indicados en el artículo 7, cifrados en tránsito y en reposo, tras un control de acceso estricto y con registro de accesos (artículo 11). Las transferencias fuera de la Unión Europea están cubiertas según el artículo 8.",
        "Con quién los compartimos. Estos datos no se venden, ni se alquilan, ni se intercambian, ni se ceden a nadie. No se usan con fines publicitarios, no se transmiten a intermediarios de datos y no se utilizan para entrenar, mejorar ni personalizar modelos de inteligencia artificial. Solo acceden a ellos los encargados estrictamente necesarios para el servicio, los del artículo 7, cada uno vinculado por contrato a las mismas obligaciones.",
        "Cuánto tiempo los conservamos y cómo eliminarlos. Se conservan durante la vida de tu cuenta, según los plazos del artículo 9, y se eliminan con ella. Puedes solicitar la supresión de tu cuenta y de estos datos en cualquier momento según el artículo 10: respondemos en un plazo de un mes.",
        "Cómo retirar nuestro acceso. Puedes retirar el acceso de Tiquiz a tu cuenta de Google cuando quieras desde myaccount.google.com/permissions. Tu cuenta de Tiquiz sigue existiendo: entonces inicias sesión con tu dirección de correo y una contraseña.",
        "Uso limitado. El uso y la transferencia por parte de Tiquiz de la información recibida de las API de Google se ajustan a la Política de Datos de Usuario de los Servicios API de Google (Google API Services User Data Policy), incluidos sus requisitos de uso limitado (Limited Use).",
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
    { h: "12. Accesso con Google e dati utente Google",
      body: [
        "Tiquiz offre un accesso « Continua con Google ». È facoltativo: un account può essere creato e usato interamente con un indirizzo email e una password, senza mai passare da Google.",
        "Questo articolo descrive con precisione come Tiquiz accede ai dati utente Google, li usa, li archivia, li protegge, li condivide e li conserva.",
        "A cosa accediamo. Quando scegli « Continua con Google », Google ci trasmette tre informazioni, e solo tre:",
        [
          "il tuo indirizzo email, che identifica il tuo account Tiquiz;",
          "il tuo nome visualizzato, usato per rivolgerci a te nell'interfaccia;",
          "l'identificativo univoco del tuo account Google, che ci permette di riconoscerti agli accessi successivi.",
        ],
        "Richiediamo soltanto le autorizzazioni openid, email e profile. Tiquiz non richiede né ottiene alcun altro accesso al tuo account Google: né Gmail, né Drive, né Calendario, né Contatti, né Foto, né YouTube, né alcun permesso di scrittura, cancellazione o pubblicazione. Nessuna password Google ci viene trasmessa né conservata.",
        "Come li usiamo. Queste tre informazioni servono esclusivamente a creare il tuo account Tiquiz, aprire la tua sessione, riconoscerti agli accessi successivi e inviarti i messaggi legati al tuo account (conferma, sicurezza, fatturazione, risposta a una richiesta di assistenza). Non servono ad altro.",
        "Come li archiviamo e li proteggiamo. Sono registrati nel database di Tiquiz, presso i fornitori di hosting elencati all'articolo 7, cifrati in transito e a riposo, dietro un controllo degli accessi rigoroso e con registrazione degli accessi (articolo 11). Gli eventuali trasferimenti fuori dall'Unione europea sono disciplinati come indicato all'articolo 8.",
        "Con chi li condividiamo. Questi dati non sono venduti, né affittati, né scambiati, né ceduti a chicchessia. Non sono usati a fini pubblicitari, non sono trasmessi a intermediari di dati e non sono usati per addestrare, migliorare o personalizzare modelli di intelligenza artificiale. Vi accedono solo i responsabili strettamente necessari al servizio, quelli elencati all'articolo 7, ciascuno vincolato per contratto agli stessi obblighi.",
        "Per quanto tempo li conserviamo e come cancellarli. Sono conservati per tutta la durata del tuo account, secondo i termini dell'articolo 9, e cancellati con esso. Puoi chiedere la cancellazione del tuo account e di questi dati in qualsiasi momento ai sensi dell'articolo 10: rispondiamo entro un mese.",
        "Come revocare il nostro accesso. Puoi revocare l'accesso di Tiquiz al tuo account Google in qualsiasi momento da myaccount.google.com/permissions. Il tuo account Tiquiz continua a esistere: accedi allora con il tuo indirizzo email e una password.",
        "Uso limitato. L'uso e il trasferimento da parte di Tiquiz delle informazioni ricevute dalle API di Google rispettano la Google API Services User Data Policy, inclusi i suoi requisiti di uso limitato (Limited Use).",
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
    { h: "12. تسجيل الدخول عبر Google وبيانات مستخدم Google",
      body: [
        "يوفّر Tiquiz تسجيل الدخول عبر «المتابعة باستخدام Google». وهو اختياري: يمكن إنشاء الحساب واستخدامه بالكامل ببريد إلكتروني وكلمة مرور، دون المرور عبر Google إطلاقًا.",
        "توضّح هذه المادة بدقة كيف يصل Tiquiz إلى بيانات مستخدم Google، وكيف يستخدمها ويخزّنها ويحميها ويشاركها ويحتفظ بها.",
        "ما الذي نصل إليه. عند اختيارك «المتابعة باستخدام Google»، ترسل إلينا Google ثلاث معلومات فقط:",
        [
          "بريدك الإلكتروني، وهو الذي يحدّد حسابك في Tiquiz؛",
          "اسم العرض الخاص بك، ويُستخدم لمخاطبتك داخل الواجهة؛",
          "المعرّف الفريد لحسابك على Google، وهو ما يتيح لنا التعرّف عليك في عمليات تسجيل الدخول اللاحقة.",
        ],
        "نطلب فقط الأذونات openid وemail وprofile. لا يطلب Tiquiz ولا يحصل على أي وصول آخر إلى حسابك على Google: لا Gmail، ولا Drive، ولا التقويم، ولا جهات الاتصال، ولا الصور، ولا YouTube، ولا أي إذن بالكتابة أو الحذف أو النشر. ولا تُرسَل إلينا أي كلمة مرور خاصة بـ Google ولا نحتفظ بأي منها.",
        "كيف نستخدمها. تُستخدم هذه المعلومات الثلاث حصريًا لإنشاء حسابك في Tiquiz، وفتح جلستك، والتعرّف عليك في عمليات تسجيل الدخول اللاحقة، وإرسال الرسائل المتعلقة بحسابك (التأكيد، والأمان، والفوترة، والرد على طلبات الدعم). ولا تُستخدم لأي غرض آخر.",
        "كيف نخزّنها ونحميها. تُحفظ في قاعدة بيانات Tiquiz لدى مزوّدي الاستضافة المذكورين في المادة 7، مشفّرة أثناء النقل وفي حالة السكون، خلف ضوابط وصول صارمة مع تسجيل عمليات الوصول (المادة 11). وتخضع أي عمليات نقل خارج الاتحاد الأوروبي لما هو مبيّن في المادة 8.",
        "مع من نشاركها. لا تُباع هذه البيانات ولا تُؤجَّر ولا تُتبادل ولا تُسلَّم لأي جهة. ولا تُستخدم لأغراض إعلانية، ولا تُنقل إلى وسطاء بيانات، ولا تُستخدم لتدريب نماذج الذكاء الاصطناعي أو تحسينها أو تخصيصها. ولا يصل إليها سوى المعالجين الضروريين لتشغيل الخدمة، المذكورين في المادة 7، وكل منهم ملتزم تعاقديًا بالالتزامات نفسها.",
        "مدة الاحتفاظ بها وكيفية حذفها. يُحتفظ بها طوال مدة حسابك، وفق المدد الواردة في المادة 9، وتُحذف معه. ويمكنك طلب حذف حسابك وهذه البيانات في أي وقت بموجب المادة 10: ونردّ خلال شهر واحد.",
        "كيفية سحب وصولنا. يمكنك سحب وصول Tiquiz إلى حسابك على Google في أي وقت من myaccount.google.com/permissions. ويبقى حسابك في Tiquiz قائمًا: عندئذ تسجّل الدخول ببريدك الإلكتروني وكلمة مرور.",
        "الاستخدام المحدود. يلتزم استخدام Tiquiz ونقله للمعلومات الواردة من واجهات Google البرمجية بسياسة بيانات مستخدمي خدمات Google API، بما في ذلك متطلبات الاستخدام المحدود (Limited Use).",
      ]},
    { h: "13. ملفات تعريف الارتباط", body: ["راجع سياسة ملفات تعريف الارتباط المخصصة للتفاصيل حسب الفئة وإدارة الموافقة."]},
    { h: "14. القاصرون", body: ["Tiquiz محجوز للبالغين. إذا أرسل لنا قاصر بيانات، تواصل مع " + C.email + " للحذف."]},
    { h: "15. التعديلات", body: ["قد تتطور هذه السياسة. في حالة تعديل جوهري، يُبلَّغ المستخدمون. راجع هذه الصفحة بانتظام."]},
    { h: "16. الاتصال", body: [`${C.name}, ${C.address}, ${C.email}.`, "السلطة الرقابية: CNIL (www.cnil.fr)."]},
  ],
};

export const privacy: Record<string, LegalPage> = { fr, en, es, it, ar };
