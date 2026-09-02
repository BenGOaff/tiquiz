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
        "Nous collectons uniquement ce qui est nécessaire au service. Les données viennent de trois sources : ce que vous saisissez vous même, ce que votre navigateur transmet automatiquement, et ce que nos prestataires de paiement nous renvoient après une transaction.",
        "Ce que vous nous donnez :",
        [
          "Identification : prénom, nom, adresse email. Obligatoires pour créer un compte, sans eux le service ne peut pas fonctionner.",
          "Facturation : adresse postale, pays, société et numéro de TVA si vous en avez un. Demandés au moment d'un achat, pour émettre une facture conforme.",
          "Téléphone : facultatif, jamais obligatoire.",
          "Contenu que vous créez : vos quiz, vos questions, vos réponses, vos profils de résultat, vos images, vos réglages de marque.",
        ],
        "Ce que votre navigateur transmet automatiquement :",
        [
          "Adresse IP, type de navigateur, système, appareil, langue.",
          "Journaux de connexion : date, heure, page consultée, code de réponse. Ils servent à la sécurité et au diagnostic de panne, pas au profilage.",
        ],
        "Ce que le service produit sur votre usage : nombre de quiz créés, vues, démarrages, complétions, taux de conversion, dates de dernière activité. Ces mesures alimentent VOS statistiques et notre suivi d'abonnement.",
        "Les leads captés par vos quiz : les emails et réponses des visiteurs de vos quiz. Sur ces données là, c'est VOUS le responsable de traitement et Tiquiz agit comme sous-traitant, selon l'article 6. Elles sont chiffrées, et une clé distincte est dérivée pour chaque compte.",
        "Le paiement : les numéros de carte et coordonnées bancaires sont saisis et traités directement par Stripe et PayPal. Ils ne transitent jamais par nos serveurs et Tiquiz n'en conserve aucun. Nous ne recevons que l'identifiant de la transaction, le montant, la devise et le statut.",
      ],
    },
    {
      h: "4. Finalités et bases légales",
      body: [
        "Chaque traitement répond à une finalité précise et repose sur une base légale identifiée.",
        [
          "Exécution du contrat : créer et tenir votre compte, vous donner accès au service selon votre formule, encaisser votre abonnement, émettre vos factures, répondre à vos demandes de support, vous envoyer les messages liés à votre compte (confirmation, sécurité, échéance, résiliation).",
          "Consentement : vous envoyer nos communications marketing, déposer les cookies non essentiels, publier votre témoignage. Chacun se retire à tout moment, aussi simplement qu'il a été donné, sans que cela affecte votre accès au service.",
          "Intérêt légitime : améliorer le produit à partir de mesures d'usage agrégées, sécuriser les comptes, détecter et prévenir la fraude, les abus et les tentatives d'auto-affiliation, assurer la continuité du service.",
          "Obligation légale : conserver les pièces comptables et fiscales, répondre à une réquisition d'une autorité compétente.",
        ],
        "Nous ne prenons aucune décision automatisée produisant des effets juridiques à votre égard, et nous ne faisons aucun profilage publicitaire.",
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
        "Vos données ne sont accessibles qu'aux personnes et prestataires strictement nécessaires au fonctionnement du service. Chacun est lié par un contrat qui lui impose les mêmes obligations de confidentialité et de sécurité que celles décrites ici.",
        [
          "Supabase : hébergement de la base de données et de l'authentification.",
          "Hostinger : hébergement applicatif des serveurs.",
          "Cloudflare : diffusion des pages, protection contre les abus et les attaques.",
          "Stripe et PayPal : encaissement des paiements et gestion des abonnements. Ils sont responsables de traitement pour les données bancaires.",
          "Resend : acheminement des emails que nous vous envoyons.",
          "Anthropic : modèles d'intelligence artificielle, pour les fonctions de génération et d'analyse.",
          "Systeme.io : uniquement si vous activez l'intégration marketing, et uniquement avec la clé que vous fournissez.",
          "Google Analytics : mesure d'audience, déposé uniquement après votre consentement.",
        ],
        "Aucune donnée n'est vendue, louée, échangée ni cédée à des courtiers en données. Aucune donnée n'est transmise à des annonceurs. En dehors de cette liste, une transmission ne peut avoir lieu que sur réquisition d'une autorité judiciaire ou administrative compétente.",
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
        "Nous mettons en oeuvre des mesures techniques et organisationnelles proportionnées au risque :",
        [
          "chiffrement des échanges en transit (TLS) sur l'ensemble des domaines, et chiffrement au repos de la base de données ;",
          "chiffrement applicatif supplémentaire des leads que vos quiz captent, avec une clé dérivée par compte : un accès direct à la base ne rend rien de lisible ;",
          "contrôle d'accès strict, isolation logique des environnements de production et de développement, journalisation des accès ;",
          "sauvegardes régulières et restauration testée ;",
          "mots de passe jamais stockés en clair, connexion sans mot de passe proposée par lien à usage unique.",
        ],
        "Aucun système n'est infaillible. En cas de violation de données susceptible d'engendrer un risque élevé pour vos droits, vous en serez informé et la CNIL sera notifiée dans les délais prévus par le règlement.",
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
      h: "13. Cookies et traceurs",
      body: [
        "Trois familles de cookies existent sur nos domaines, et seule la première est déposée sans votre accord.",
        [
          "Cookies strictement nécessaires : maintien de votre session, sécurité, mémorisation de votre langue, panier de commande. Sans eux le service ne fonctionne pas. Ils sont exemptés de consentement.",
          "Cookies de mesure d'audience : Google Analytics, déposé uniquement après votre acceptation, et refusable sans conséquence sur votre usage du service.",
          "Cookie d'affiliation : lorsque vous arrivez par le lien d'un affilié, un cookie garde ce lien pendant un an afin de lui attribuer la vente. Il ne contient aucune donnée personnelle, seulement le code public de l'affilié.",
        ],
        "Vous pouvez modifier ou retirer votre choix à tout moment depuis le bandeau de cookies, et supprimer les cookies déjà déposés dans les réglages de votre navigateur. La durée de vie d'un cookie de mesure n'excède pas 13 mois.",
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
        "We collect only what the service needs. The data comes from three sources: what you type in yourself, what your browser sends automatically, and what our payment providers return after a transaction.",
        "What you give us:",
        [
          "Identity: first name, last name, email address. Required to create an account; without them the service cannot work.",
          "Billing: postal address, country, company name and VAT number if you have one. Asked at purchase time, to issue a compliant invoice.",
          "Phone: optional, never required.",
          "Content you create: your quizzes, questions, answers, result profiles, images and brand settings.",
        ],
        "What your browser sends automatically:",
        [
          "IP address, browser type, operating system, device, language.",
          "Access logs: date, time, page requested, response code. They serve security and fault diagnosis, not profiling.",
        ],
        "What the service measures about your usage: number of quizzes created, views, starts, completions, conversion rate, last activity dates. These feed YOUR statistics and our subscription tracking.",
        "Leads captured by your quizzes: the email addresses and answers of your quiz visitors. For that data YOU are the controller and Tiquiz acts as a processor, as set out in section 6. It is encrypted, with a separate key derived for each account.",
        "Payment: card numbers and bank details are entered and handled directly by Stripe and PayPal. They never pass through our servers and Tiquiz stores none of them. We only receive the transaction reference, amount, currency and status.",
      ],
    },
    {
      h: "4. Purposes and legal bases",
      body: [
        "Each processing operation answers a specific purpose and rests on an identified legal basis.",
        [
          "Performance of the contract: creating and maintaining your account, giving you access according to your plan, collecting your subscription, issuing your invoices, answering your support requests, sending you messages related to your account (confirmation, security, renewal, cancellation).",
          "Consent: sending you marketing communications, setting non-essential cookies, publishing your testimonial. Each can be withdrawn at any time, as easily as it was given, without affecting your access to the service.",
          "Legitimate interest: improving the product from aggregated usage measurements, securing accounts, detecting and preventing fraud, abuse and self-referral attempts, keeping the service running.",
          "Legal obligation: keeping accounting and tax records, answering a request from a competent authority.",
        ],
        "We make no automated decision producing legal effects concerning you, and we do no advertising profiling.",
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
      h: "7. Recipients and processors",
      body: [
        "Your data is accessible only to the people and providers strictly required to run the service. Each one is bound by a contract imposing the same confidentiality and security obligations described here.",
        [
          "Supabase: database and authentication hosting.",
          "Hostinger: application server hosting.",
          "Cloudflare: page delivery, protection against abuse and attacks.",
          "Stripe and PayPal: payment collection and subscription management. They are controllers for bank data.",
          "Resend: delivery of the emails we send you.",
          "Anthropic: artificial intelligence models, for the generation and analysis features.",
          "Systeme.io: only if you enable the marketing integration, and only with the key you provide.",
          "Google Analytics: audience measurement, set only after your consent.",
        ],
        "No data is sold, rented, traded or handed to data brokers. No data is passed to advertisers. Outside this list, a disclosure can only happen on request from a competent judicial or administrative authority.",
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
        "We implement technical and organisational measures proportionate to the risk:",
        [
          "encryption in transit (TLS) across all domains, and encryption at rest for the database;",
          "additional application-level encryption of the leads your quizzes capture, with a key derived per account: direct access to the database yields nothing readable;",
          "strict access control, logical isolation of production and development environments, access logging;",
          "regular backups with tested restoration;",
          "passwords never stored in clear text, and passwordless sign-in offered through a single-use link.",
        ],
        "No system is infallible. Should a data breach be likely to result in a high risk to your rights, you will be informed and the supervisory authority notified within the time limits set by the regulation.",
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
      h: "13. Cookies and trackers",
      body: [
        "Three families of cookies exist on our domains, and only the first is set without your agreement.",
        [
          "Strictly necessary cookies: keeping your session, security, remembering your language, order basket. Without them the service does not work. They are exempt from consent.",
          "Audience measurement cookies: Google Analytics, set only after you accept, and refusable with no consequence on your use of the service.",
          "Affiliate cookie: when you arrive through an affiliate link, a cookie keeps that link for one year so the sale can be credited. It holds no personal data, only the affiliate's public code.",
        ],
        "You can change or withdraw your choice at any time from the cookie banner, and delete cookies already set from your browser settings. An audience measurement cookie lives no longer than 13 months.",
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
    { h: "3. Datos recogidos",
      body: [
        "Solo recogemos lo que el servicio necesita. Los datos provienen de tres fuentes: lo que tú introduces, lo que tu navegador envía automáticamente y lo que nuestros proveedores de pago nos devuelven tras una transacción.",
        "Lo que nos facilitas:",
        [
          "Identificación: nombre, apellidos, correo electrónico. Obligatorios para crear una cuenta; sin ellos el servicio no puede funcionar.",
          "Facturación: dirección postal, país, empresa y número de IVA si lo tienes. Se piden en el momento de la compra, para emitir una factura conforme.",
          "Teléfono: opcional, nunca obligatorio.",
          "Contenido que creas: tus cuestionarios, preguntas, respuestas, perfiles de resultado, imágenes y ajustes de marca.",
        ],
        "Lo que tu navegador envía automáticamente:",
        [
          "Dirección IP, tipo de navegador, sistema, dispositivo, idioma.",
          "Registros de conexión: fecha, hora, página solicitada, código de respuesta. Sirven para la seguridad y el diagnóstico de averías, no para la elaboración de perfiles.",
        ],
        "Lo que el servicio mide sobre tu uso: número de cuestionarios creados, visitas, inicios, finalizaciones, tasa de conversión, fechas de última actividad. Alimentan TUS estadísticas y nuestro seguimiento de la suscripción.",
        "Los leads captados por tus cuestionarios: los correos y respuestas de tus visitantes. Sobre esos datos TÚ eres el responsable del tratamiento y Tiquiz actúa como encargado, según el artículo 6. Están cifrados, con una clave distinta derivada para cada cuenta.",
        "El pago: los números de tarjeta y datos bancarios se introducen y tratan directamente en Stripe y PayPal. Nunca pasan por nuestros servidores y Tiquiz no conserva ninguno. Solo recibimos la referencia de la transacción, el importe, la moneda y el estado.",
      ]},
    { h: "4. Finalidades y bases legales",
      body: [
        "Cada tratamiento responde a una finalidad precisa y se apoya en una base legal identificada.",
        [
          "Ejecución del contrato: crear y mantener tu cuenta, darte acceso según tu plan, cobrar tu suscripción, emitir tus facturas, responder a tus solicitudes de soporte, enviarte los mensajes relacionados con tu cuenta (confirmación, seguridad, vencimiento, baja).",
          "Consentimiento: enviarte nuestras comunicaciones comerciales, instalar cookies no esenciales, publicar tu testimonio. Cada uno se retira en cualquier momento, con la misma facilidad con que se dio, sin afectar a tu acceso al servicio.",
          "Interés legítimo: mejorar el producto a partir de mediciones de uso agregadas, proteger las cuentas, detectar y prevenir el fraude, los abusos y los intentos de auto-afiliación, garantizar la continuidad del servicio.",
          "Obligación legal: conservar los documentos contables y fiscales, responder a un requerimiento de una autoridad competente.",
        ],
        "No tomamos ninguna decisión automatizada con efectos jurídicos sobre ti, y no realizamos ninguna elaboración de perfiles publicitarios.",
      ]},
    { h: "5. Tratamiento mediante inteligencia artificial",
      body: ["Tiquiz utiliza modelos de IA para generar quizzes y analizar estadísticas. Estos tratamientos no implican ninguna decisión automatizada con efectos jurídicos. Los resultados son sugerencias que debes validar."]},
    { h: "6. Roles de las partes (específico de Tiquiz)",
      body: ["Para los leads captados por tus quizzes, tú eres el responsable del tratamiento y Tiquiz actúa como encargado. Te comprometes a cumplir la normativa aplicable y a informar a los visitantes de tus quizzes."]},
    { h: "7. Destinatarios y encargados",
      body: [
        "Tus datos solo son accesibles para las personas y proveedores estrictamente necesarios para el funcionamiento del servicio. Cada uno está vinculado por un contrato que le impone las mismas obligaciones de confidencialidad y seguridad descritas aquí.",
        [
          "Supabase: alojamiento de la base de datos y de la autenticación.",
          "Hostinger: alojamiento de los servidores de la aplicación.",
          "Cloudflare: distribución de las páginas, protección frente a abusos y ataques.",
          "Stripe y PayPal: cobro de los pagos y gestión de las suscripciones. Son responsables del tratamiento de los datos bancarios.",
          "Resend: envío de los correos que te mandamos.",
          "Anthropic: modelos de inteligencia artificial, para las funciones de generación y análisis.",
          "Systeme.io: únicamente si activas la integración de marketing, y solo con la clave que tú facilitas.",
          "Google Analytics: medición de audiencia, instalado únicamente tras tu consentimiento.",
        ],
        "Ningún dato se vende, alquila, intercambia ni cede a intermediarios de datos. Ningún dato se transmite a anunciantes. Fuera de esta lista, una comunicación solo puede producirse por requerimiento de una autoridad judicial o administrativa competente.",
      ]},
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
      body: [
        "Aplicamos medidas técnicas y organizativas proporcionadas al riesgo:",
        [
          "cifrado de las comunicaciones en tránsito (TLS) en todos los dominios, y cifrado en reposo de la base de datos;",
          "cifrado adicional a nivel de aplicación de los leads que captan tus cuestionarios, con una clave derivada por cuenta: un acceso directo a la base no devuelve nada legible;",
          "control de acceso estricto, aislamiento lógico de los entornos de producción y desarrollo, registro de los accesos;",
          "copias de seguridad periódicas y restauración probada;",
          "contraseñas nunca almacenadas en claro, y acceso sin contraseña mediante enlace de un solo uso.",
        ],
        "Ningún sistema es infalible. Si una violación de datos pudiera suponer un riesgo elevado para tus derechos, se te informará y se notificará a la autoridad de control en los plazos previstos por el reglamento.",
      ]},
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
    { h: "13. Cookies y rastreadores", body: [
        "Existen tres familias de cookies en nuestros dominios, y solo la primera se instala sin tu acuerdo.",
        [
          "Cookies estrictamente necesarias: mantenimiento de la sesión, seguridad, memorización del idioma, cesta de compra. Sin ellas el servicio no funciona. Están exentas de consentimiento.",
          "Cookies de medición de audiencia: Google Analytics, instaladas solo tras tu aceptación, y rechazables sin consecuencia sobre tu uso del servicio.",
          "Cookie de afiliación: cuando llegas por el enlace de un afiliado, una cookie conserva ese enlace durante un año para poder atribuirle la venta. No contiene ningún dato personal, solo el código público del afiliado.",
        ],
        "Puedes modificar o retirar tu elección en cualquier momento desde el banner de cookies, y borrar las cookies ya instaladas desde los ajustes de tu navegador. Una cookie de medición no vive más de 13 meses.",
      ]},
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
      body: [
        "Raccogliamo solo ciò che serve al servizio. I dati provengono da tre fonti: quello che inserisci tu, quello che il tuo browser invia automaticamente e quello che i nostri fornitori di pagamento ci restituiscono dopo una transazione.",
        "Quello che ci fornisci:",
        [
          "Identificazione: nome, cognome, indirizzo email. Obbligatori per creare un account; senza di essi il servizio non può funzionare.",
          "Fatturazione: indirizzo postale, paese, azienda e partita IVA se ne hai una. Richiesti al momento dell'acquisto, per emettere una fattura conforme.",
          "Telefono: facoltativo, mai obbligatorio.",
          "Contenuti che crei: i tuoi quiz, le domande, le risposte, i profili di risultato, le immagini e le impostazioni del marchio.",
        ],
        "Quello che il tuo browser invia automaticamente:",
        [
          "Indirizzo IP, tipo di browser, sistema, dispositivo, lingua.",
          "Registri di connessione: data, ora, pagina richiesta, codice di risposta. Servono alla sicurezza e alla diagnosi dei guasti, non alla profilazione.",
        ],
        "Quello che il servizio misura sul tuo utilizzo: numero di quiz creati, visualizzazioni, avvii, completamenti, tasso di conversione, date dell'ultima attività. Alimentano le TUE statistiche e il nostro monitoraggio dell'abbonamento.",
        "I lead raccolti dai tuoi quiz: gli indirizzi email e le risposte dei tuoi visitatori. Su quei dati sei TU il titolare del trattamento e Tiquiz agisce come responsabile, secondo l'articolo 6. Sono cifrati, con una chiave distinta derivata per ogni account.",
        "Il pagamento: i numeri di carta e le coordinate bancarie sono inseriti e trattati direttamente da Stripe e PayPal. Non transitano mai dai nostri server e Tiquiz non ne conserva alcuno. Riceviamo soltanto il riferimento della transazione, l'importo, la valuta e lo stato.",
      ]},
    { h: "4. Finalità e basi giuridiche",
      body: [
        "Ogni trattamento risponde a una finalità precisa e si fonda su una base giuridica identificata.",
        [
          "Esecuzione del contratto: creare e mantenere il tuo account, darti accesso secondo il tuo piano, incassare l'abbonamento, emettere le fatture, rispondere alle richieste di assistenza, inviarti i messaggi legati al tuo account (conferma, sicurezza, scadenza, disdetta).",
          "Consenso: inviarti le nostre comunicazioni commerciali, installare i cookie non essenziali, pubblicare la tua testimonianza. Ciascuno si revoca in qualsiasi momento, con la stessa facilità con cui è stato dato, senza incidere sul tuo accesso al servizio.",
          "Interesse legittimo: migliorare il prodotto a partire da misurazioni d'uso aggregate, proteggere gli account, individuare e prevenire frodi, abusi e tentativi di auto-affiliazione, garantire la continuità del servizio.",
          "Obbligo di legge: conservare i documenti contabili e fiscali, rispondere a una richiesta di un'autorità competente.",
        ],
        "Non prendiamo alcuna decisione automatizzata che produca effetti giuridici nei tuoi confronti e non effettuiamo alcuna profilazione pubblicitaria.",
      ]},
    { h: "5. Trattamento con intelligenza artificiale",
      body: ["Tiquiz utilizza modelli di IA per generare quiz e analizzare le tue statistiche. Tali trattamenti non comportano decisioni automatizzate che producano effetti giuridici. I risultati sono suggerimenti da validare dall'utente."]},
    { h: "6. Ruoli delle parti (specifico per Tiquiz)",
      body: ["Per i lead catturati dai tuoi quiz, tu sei il titolare del trattamento e Tiquiz agisce come responsabile. Ti impegni a rispettare la normativa applicabile e a informare i visitatori dei tuoi quiz."]},
    { h: "7. Destinatari e responsabili",
      body: [
        "I tuoi dati sono accessibili solo alle persone e ai fornitori strettamente necessari al funzionamento del servizio. Ciascuno è vincolato da un contratto che gli impone gli stessi obblighi di riservatezza e sicurezza descritti qui.",
        [
          "Supabase: hosting del database e dell'autenticazione.",
          "Hostinger: hosting applicativo dei server.",
          "Cloudflare: distribuzione delle pagine, protezione da abusi e attacchi.",
          "Stripe e PayPal: incasso dei pagamenti e gestione degli abbonamenti. Sono titolari del trattamento per i dati bancari.",
          "Resend: recapito delle email che ti inviamo.",
          "Anthropic: modelli di intelligenza artificiale, per le funzioni di generazione e analisi.",
          "Systeme.io: solo se attivi l'integrazione marketing, e solo con la chiave che fornisci tu.",
          "Google Analytics: misurazione del pubblico, installato solo dopo il tuo consenso.",
        ],
        "Nessun dato è venduto, affittato, scambiato o ceduto a intermediari di dati. Nessun dato è trasmesso a inserzionisti. Al di fuori di questo elenco, una comunicazione può avvenire solo su richiesta di un'autorità giudiziaria o amministrativa competente.",
      ]},
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
      body: [
        "Adottiamo misure tecniche e organizzative proporzionate al rischio:",
        [
          "cifratura degli scambi in transito (TLS) su tutti i domini e cifratura a riposo del database;",
          "cifratura applicativa aggiuntiva dei lead raccolti dai tuoi quiz, con una chiave derivata per account: un accesso diretto al database non restituisce nulla di leggibile;",
          "controllo degli accessi rigoroso, isolamento logico degli ambienti di produzione e sviluppo, registrazione degli accessi;",
          "backup regolari e ripristino testato;",
          "password mai memorizzate in chiaro e accesso senza password tramite link monouso.",
        ],
        "Nessun sistema è infallibile. In caso di violazione dei dati che possa comportare un rischio elevato per i tuoi diritti, ne sarai informato e l'autorità di controllo sarà notificata nei termini previsti dal regolamento.",
      ]},
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
    { h: "13. Cookie e traccianti", body: [
        "Sui nostri domini esistono tre famiglie di cookie, e solo la prima viene installata senza il tuo accordo.",
        [
          "Cookie strettamente necessari: mantenimento della sessione, sicurezza, memorizzazione della lingua, carrello d'ordine. Senza di essi il servizio non funziona. Sono esenti da consenso.",
          "Cookie di misurazione del pubblico: Google Analytics, installato solo dopo la tua accettazione e rifiutabile senza conseguenze sull'uso del servizio.",
          "Cookie di affiliazione: quando arrivi tramite il link di un affiliato, un cookie conserva quel link per un anno affinché la vendita gli venga attribuita. Non contiene alcun dato personale, solo il codice pubblico dell'affiliato.",
        ],
        "Puoi modificare o revocare la tua scelta in qualsiasi momento dal banner dei cookie ed eliminare i cookie già installati dalle impostazioni del browser. Un cookie di misurazione non dura più di 13 mesi.",
      ]},
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
    { h: "3. البيانات التي نجمعها",
      body: [
        "لا نجمع إلا ما تحتاجه الخدمة. تأتي البيانات من ثلاثة مصادر: ما تُدخله بنفسك، وما يرسله متصفحك تلقائيًا، وما يعيده إلينا مزوّدو الدفع بعد كل معاملة.",
        "ما تقدّمه لنا:",
        [
          "التعريف: الاسم واللقب والبريد الإلكتروني. إلزامية لإنشاء الحساب، وبدونها لا يمكن للخدمة أن تعمل.",
          "الفوترة: العنوان البريدي والبلد واسم الشركة ورقم ضريبة القيمة المضافة إن وُجد. تُطلب عند الشراء لإصدار فاتورة مطابقة.",
          "الهاتف: اختياري، وغير إلزامي أبدًا.",
          "المحتوى الذي تنشئه: اختباراتك وأسئلتك وإجاباتك وملفات النتائج وصورك وإعدادات علامتك.",
        ],
        "ما يرسله متصفحك تلقائيًا:",
        [
          "عنوان IP، ونوع المتصفح، والنظام، والجهاز، واللغة.",
          "سجلات الاتصال: التاريخ والوقت والصفحة المطلوبة ورمز الاستجابة. تُستخدم للأمان وتشخيص الأعطال، لا لإنشاء ملفات تعريفية.",
        ],
        "ما تقيسه الخدمة عن استخدامك: عدد الاختبارات المنشأة، والمشاهدات، وعمليات البدء، والإكمال، ومعدل التحويل، وتواريخ آخر نشاط. وهي تغذّي إحصاءاتك أنت ومتابعتنا للاشتراك.",
        "العملاء المحتملون الذين تجمعهم اختباراتك: عناوين البريد والإجابات الخاصة بزوّارك. أنت المتحكم في هذه البيانات وTiquiz يعمل كمعالِج، وفق المادة 6. وهي مشفّرة بمفتاح مستقل مشتق لكل حساب.",
        "الدفع: تُدخل أرقام البطاقات والبيانات المصرفية وتُعالَج مباشرة لدى Stripe وPayPal. ولا تمر أبدًا عبر خوادمنا، ولا يحتفظ Tiquiz بأي منها. نتلقى فقط مرجع المعاملة والمبلغ والعملة والحالة.",
      ]},
    { h: "4. الأغراض والأسس القانونية",
      body: [
        "تستجيب كل عملية معالجة لغرض محدّد وتستند إلى أساس قانوني معيّن.",
        [
          "تنفيذ العقد: إنشاء حسابك وصيانته، ومنحك الوصول وفق باقتك، وتحصيل اشتراكك، وإصدار فواتيرك، والرد على طلبات الدعم، وإرسال الرسائل المتعلقة بحسابك (التأكيد والأمان والاستحقاق والإلغاء).",
          "الموافقة: إرسال رسائلنا التسويقية، ووضع ملفات تعريف الارتباط غير الضرورية، ونشر شهادتك. ويمكن سحب كل منها في أي وقت بالسهولة نفسها التي مُنحت بها، دون أن يؤثر ذلك على وصولك إلى الخدمة.",
          "المصلحة المشروعة: تحسين المنتج انطلاقًا من قياسات استخدام مجمّعة، وتأمين الحسابات، وكشف الاحتيال وإساءة الاستخدام ومحاولات الإحالة الذاتية ومنعها، وضمان استمرارية الخدمة.",
          "الالتزام القانوني: حفظ المستندات المحاسبية والضريبية، والاستجابة لطلب سلطة مختصة.",
        ],
        "لا نتخذ أي قرار آلي يُنتج آثارًا قانونية تجاهك، ولا نقوم بأي تصنيف لأغراض إعلانية.",
      ]},
    { h: "5. المعالجة بواسطة الذكاء الاصطناعي",
      body: ["يستخدم Tiquiz نماذج الذكاء الاصطناعي لتوليد الاختبارات وتحليل الإحصائيات. لا تترتب على هذه المعالجات أي قرارات آلية تنتج آثارًا قانونية. النتائج اقتراحات يجب أن يُصادق عليها المستخدم."]},
    { h: "6. أدوار الأطراف (خاص بـ Tiquiz)",
      body: ["بالنسبة للعملاء المحتملين الذين تجمعهم اختباراتك، أنت المسؤول عن المعالجة ويعمل Tiquiz كمعالج من الباطن. تلتزم باحترام التشريعات المطبقة وإبلاغ زوار اختباراتك."]},
    { h: "7. الجهات المستقبِلة والمعالِجون",
      body: [
        "لا يصل إلى بياناتك سوى الأشخاص والمزوّدين الضروريين لتشغيل الخدمة. وكل منهم مُلزَم بعقد يفرض عليه الالتزامات نفسها بالسرية والأمان الموصوفة هنا.",
        [
          "Supabase: استضافة قاعدة البيانات والمصادقة.",
          "Hostinger: استضافة خوادم التطبيق.",
          "Cloudflare: توزيع الصفحات والحماية من إساءة الاستخدام والهجمات.",
          "Stripe وPayPal: تحصيل المدفوعات وإدارة الاشتراكات. وهما المتحكمان في البيانات المصرفية.",
          "Resend: إيصال الرسائل التي نرسلها إليك.",
          "Anthropic: نماذج الذكاء الاصطناعي، لوظائف التوليد والتحليل.",
          "Systeme.io: فقط إذا فعّلت تكامل التسويق، وفقط بالمفتاح الذي تقدّمه أنت.",
          "Google Analytics: قياس الجمهور، ولا يُوضع إلا بعد موافقتك.",
        ],
        "لا تُباع أي بيانات ولا تُؤجَّر ولا تُتبادل ولا تُسلَّم إلى وسطاء البيانات. ولا تُنقل أي بيانات إلى المعلنين. وخارج هذه القائمة، لا يمكن الإفصاح إلا بطلب من سلطة قضائية أو إدارية مختصة.",
      ]},
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
      body: [
        "نطبّق تدابير تقنية وتنظيمية تتناسب مع المخاطر:",
        [
          "تشفير التبادلات أثناء النقل (TLS) على جميع النطاقات، وتشفير قاعدة البيانات في حالة السكون؛",
          "تشفير تطبيقي إضافي للعملاء المحتملين الذين تجمعهم اختباراتك، بمفتاح مشتق لكل حساب: الوصول المباشر إلى قاعدة البيانات لا يُظهر شيئًا مقروءًا؛",
          "ضوابط وصول صارمة، وعزل منطقي بين بيئتي الإنتاج والتطوير، وتسجيل عمليات الوصول؛",
          "نسخ احتياطية منتظمة مع اختبار الاستعادة؛",
          "كلمات المرور لا تُخزَّن أبدًا بشكل واضح، مع إتاحة الدخول بدون كلمة مرور عبر رابط يُستخدم مرة واحدة.",
        ],
        "لا يوجد نظام معصوم. وإذا كان خرق للبيانات قد يؤدي إلى خطر مرتفع على حقوقك، فسيتم إبلاغك وإخطار سلطة الرقابة ضمن المهل التي تنص عليها اللائحة.",
      ]},
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
    { h: "13. ملفات تعريف الارتباط وأدوات التتبّع", body: [
        "توجد على نطاقاتنا ثلاث عائلات من ملفات تعريف الارتباط، والأولى وحدها تُوضع دون موافقتك.",
        [
          "ملفات ضرورية تمامًا: الحفاظ على جلستك، والأمان، وتذكّر لغتك، وسلة الطلب. وبدونها لا تعمل الخدمة، وهي معفاة من الموافقة.",
          "ملفات قياس الجمهور: Google Analytics، ولا تُوضع إلا بعد قبولك، ويمكن رفضها دون أي أثر على استخدامك للخدمة.",
          "ملف الإحالة: عند وصولك عبر رابط شريك، يحفظ ملف تعريف ارتباط ذلك الرابط لمدة سنة حتى تُنسب إليه عملية البيع. ولا يحتوي على أي بيانات شخصية، بل على الرمز العام للشريك فقط.",
        ],
        "يمكنك تعديل اختيارك أو سحبه في أي وقت من شريط ملفات تعريف الارتباط، وحذف الملفات الموضوعة من إعدادات متصفحك. ولا تتجاوز مدة ملف القياس 13 شهرًا.",
      ]},
    { h: "14. القاصرون", body: ["Tiquiz محجوز للبالغين. إذا أرسل لنا قاصر بيانات، تواصل مع " + C.email + " للحذف."]},
    { h: "15. التعديلات", body: ["قد تتطور هذه السياسة. في حالة تعديل جوهري، يُبلَّغ المستخدمون. راجع هذه الصفحة بانتظام."]},
    { h: "16. الاتصال", body: [`${C.name}, ${C.address}, ${C.email}.`, "السلطة الرقابية: CNIL (www.cnil.fr)."]},
  ],
};

export const privacy: Record<string, LegalPage> = { fr, en, es, it, ar };
