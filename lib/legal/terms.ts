import type { LegalPage } from "./types";
import { COMPANY as C } from "./company";

const fr: LegalPage = {
  title: "Conditions générales de vente",
  lastUpdated: "Dernière mise à jour : 22/04/2026",
  intro: `Les présentes CGV régissent les relations entre ${C.name} (${C.form}, capital ${C.capital}, RCS ${C.rcs}, siège ${C.address}) — ci-après « le Vendeur » — et tout Client souscrivant aux services Tiquiz® sur tiquiz.com.`,
  sections: [
    {
      h: "Article 1 – Objet",
      body: [
        "Les CGV définissent les conditions d'accès et d'utilisation de Tiquiz®, application SaaS de création de quiz interactifs et de capture de leads.",
      ],
    },
    {
      h: "Article 2 – Description des services",
      body: [
        "Tiquiz est fourni à distance via une plateforme en ligne. Il permet notamment la création de quiz, la qualification de prospects, la synchronisation avec des outils tiers (Systeme.io, etc.) et la mesure de performances. Le Vendeur se réserve le droit de faire évoluer, modifier ou supprimer tout ou partie des fonctionnalités à tout moment.",
      ],
    },
    {
      h: "Article 3 – Offres et tarifs",
      body: [
        "Tiquiz propose une formule gratuite limitée et des abonnements payants (mensuels ou annuels), ainsi que, le cas échéant, des offres à durée limitée ou accès à vie bêta. Les prix sont en euros TTC. Le Vendeur se réserve le droit de modifier ses prix à tout moment avec information préalable.",
      ],
    },
    {
      h: "Article 4 – Commande et paiement",
      body: [
        "La souscription se fait exclusivement en ligne. Le contrat est formé dès la validation du paiement et l'acceptation des CGV. Les paiements sont réalisés via Stripe ou PayPal. Pour les abonnements, le Client autorise le prélèvement automatique à chaque échéance. En cas de défaut de paiement, le Vendeur se réserve le droit de suspendre ou résilier l'accès.",
      ],
    },
    {
      h: "Article 5 – Accès au service",
      body: [
        "L'accès est ouvert dès validation du paiement. Le Client est responsable de son compte et de la confidentialité de ses identifiants. Il s'engage à signaler toute utilisation frauduleuse.",
      ],
    },
    {
      h: "Article 6 – Droit de rétractation",
      body: [
        "Pour les prestations de fourniture d'un contenu numérique, le Client consommateur accepte expressément l'exécution immédiate du service dès validation. Il renonce expressément à son droit de rétractation. Cette renonciation est recueillie avant paiement.",
      ],
    },
    {
      h: "Article 7 – Remboursement",
      body: [
        "Aucun remboursement ne peut être accordé après validation de la commande. Une version gratuite est disponible pour un test préalable.",
      ],
    },
    {
      h: "Article 8 – Durée et résiliation",
      body: [
        "Les abonnements sont à durée indéterminée avec reconduction automatique. Le Client peut résilier à tout moment depuis son espace personnel. La résiliation prend effet à la fin de la période en cours, sans remboursement des sommes déjà versées.",
      ],
    },
    {
      h: "Article 9 – Données et sécurité",
      body: [
        "Le Vendeur met en œuvre des mesures techniques et organisationnelles appropriées (chiffrement, contrôle d'accès strict). Pour les leads captés par les quiz du Client, le Client est responsable de traitement, le Vendeur sous-traitant. Le Vendeur s'interdit toute utilisation des données du Client à des fins commerciales propres.",
      ],
    },
    {
      h: "Article 10 – Responsabilité",
      body: [
        "Le Vendeur est tenu à une obligation de moyens pour la fourniture du service, sans garantie de résultat commercial. Les contenus générés par IA peuvent comporter des erreurs ou inexactitudes ; le Client est seul responsable de leur vérification. La responsabilité du Vendeur est limitée aux sommes versées par le Client au cours des 12 derniers mois. Les dommages indirects sont exclus.",
      ],
    },
    {
      h: "Article 11 – Propriété intellectuelle",
      body: [
        "Le Vendeur reste titulaire des droits sur la plateforme, son architecture et son code. Le Client dispose d'un droit d'utilisation personnel, non exclusif et non transférable. Les contenus du Client (quiz, textes, images) restent sa propriété.",
      ],
    },
    {
      h: "Article 12 – Suspension et résiliation pour faute",
      body: [
        "Le Vendeur se réserve le droit de suspendre ou résilier l'accès sans préavis en cas de violation des CGV, de fraude, de non-paiement ou d'utilisation abusive.",
      ],
    },
    {
      h: "Article 13 – Données personnelles",
      body: [
        "Le traitement des données est détaillé dans la Politique de confidentialité.",
      ],
    },
    {
      h: "Article 14 – Modification des CGV",
      body: [
        "Le Vendeur peut modifier les CGV à tout moment. Les modifications sont notifiées préalablement à leur entrée en vigueur.",
      ],
    },
    {
      h: "Article 15 – Médiation",
      body: [
        "Le Client consommateur peut recourir gratuitement à un médiateur : CM2C, 14 rue Saint-Jean, 75017 Paris, www.cm2c.net.",
      ],
    },
    {
      h: "Article 16 – Droit applicable et juridiction",
      body: [
        "Les CGV sont soumises au droit français. Les consommateurs conservent la compétence des juridictions légales applicables. Pour les professionnels, les tribunaux du ressort de la Cour d'appel de Montpellier ont compétence exclusive.",
      ],
    },
  ],
};

const en: LegalPage = {
  title: "Terms of Sale",
  lastUpdated: "Last updated: 04/22/2026",
  intro: `These Terms of Sale ("Terms") govern the relationship between ${C.name} (a ${C.form}, share capital ${C.capital}, registered with the Montpellier Trade Registry under no. 909 349 045, registered office ${C.address}) — the "Vendor" — and any Customer subscribing to Tiquiz® on tiquiz.com.`,
  sections: [
    {
      h: "Article 1 – Purpose",
      body: [
        "These Terms set out the conditions of access to and use of Tiquiz®, a SaaS application to build interactive quizzes and capture leads.",
      ],
    },
    {
      h: "Article 2 – Service description",
      body: [
        "Tiquiz is delivered remotely through an online platform. It enables quiz creation, prospect qualification, syncing with third-party tools (Systeme.io, etc.) and performance analytics. The Vendor may change, evolve or remove part or all of the features at any time.",
      ],
    },
    {
      h: "Article 3 – Pricing",
      body: [
        "Tiquiz offers a limited free tier and paid subscriptions (monthly or yearly), plus occasional time-limited or lifetime-beta offers. Prices are displayed in euros, taxes included. The Vendor may change prices at any time with prior notice.",
      ],
    },
    {
      h: "Article 4 – Order and payment",
      body: [
        "Subscription happens exclusively online. The contract is formed upon payment validation and acceptance of these Terms. Payments are processed by Stripe or PayPal. Recurring subscriptions authorise automatic billing. In case of payment default, the Vendor may suspend or terminate access.",
      ],
    },
    {
      h: "Article 5 – Access",
      body: [
        "Access is granted upon payment validation. The Customer is responsible for their account and the confidentiality of their credentials, and must report any fraudulent use.",
      ],
    },
    {
      h: "Article 6 – Withdrawal",
      body: [
        "For digital service provision, the consumer Customer expressly accepts immediate execution of the service upon validation and expressly waives their statutory withdrawal right. This waiver is collected before payment.",
      ],
    },
    {
      h: "Article 7 – Refunds",
      body: [
        "No refund can be granted once the order is validated. A free tier is available to try the product beforehand.",
      ],
    },
    {
      h: "Article 8 – Term and termination",
      body: [
        "Subscriptions run for an indefinite term with automatic renewal. The Customer may cancel at any time from their account. Cancellation takes effect at the end of the current billing period; no pro-rata refund is issued.",
      ],
    },
    {
      h: "Article 9 – Data and security",
      body: [
        "The Vendor implements appropriate technical and organisational measures (encryption, strict access control). For leads captured through the Customer's quizzes, the Customer is the data controller and the Vendor is the processor. The Vendor will never use Customer data for its own commercial purposes.",
      ],
    },
    {
      h: "Article 10 – Liability",
      body: [
        "The Vendor has an obligation of means for service delivery, without guarantee of commercial outcome. AI-generated content may contain errors or inaccuracies; the Customer is solely responsible for review. The Vendor's liability is capped at the amounts paid by the Customer over the past 12 months. Indirect damages are excluded.",
      ],
    },
    {
      h: "Article 11 – Intellectual property",
      body: [
        "The Vendor retains the rights over the platform, its architecture and its code. The Customer has a personal, non-exclusive, non-transferable right of use. Customer-generated content (quizzes, text, images) remains the Customer's property.",
      ],
    },
    {
      h: "Article 12 – Suspension for cause",
      body: [
        "The Vendor may suspend or terminate access without notice in case of breach, fraud, non-payment or abusive use.",
      ],
    },
    {
      h: "Article 13 – Personal data",
      body: [
        "Data processing is detailed in the Privacy Policy.",
      ],
    },
    {
      h: "Article 14 – Changes",
      body: [
        "The Vendor may update these Terms at any time. Changes are notified before they take effect.",
      ],
    },
    {
      h: "Article 15 – Mediation",
      body: [
        "Consumer Customers may access free of charge the CM2C mediator: 14 rue Saint-Jean, 75017 Paris, France — www.cm2c.net.",
      ],
    },
    {
      h: "Article 16 – Governing law and jurisdiction",
      body: [
        "These Terms are governed by French law. Consumers retain the benefit of the mandatory rules of their country of residence. For professional users, the courts under the jurisdiction of the Montpellier Court of Appeal have exclusive jurisdiction.",
      ],
    },
  ],
};


const es: LegalPage = {
  title: "Condiciones generales de venta",
  lastUpdated: "Última actualización: 22/04/2026",
  intro: `Las presentes CGV rigen las relaciones entre ${C.name} (${C.form}, capital ${C.capital}, RCS ${C.rcs}, sede ${C.address}) — en adelante «el Vendedor» — y cualquier Cliente que se suscriba a los servicios Tiquiz® en tiquiz.com.`,
  sections: [
    { h: "Artículo 1 – Objeto", body: ["Las CGV definen las condiciones de acceso y uso de Tiquiz®, aplicación SaaS de creación de quizzes interactivos y captura de leads."] },
    { h: "Artículo 2 – Descripción de los servicios", body: ["Tiquiz se proporciona a distancia a través de una plataforma online. Permite la creación de quizzes, la cualificación de prospectos, la sincronización con herramientas de terceros (Systeme.io, etc.) y la medición de rendimiento. El Vendedor se reserva el derecho de modificar, hacer evolucionar o suprimir todas o parte de las funcionalidades en cualquier momento."] },
    { h: "Artículo 3 – Ofertas y precios", body: ["Tiquiz ofrece una fórmula gratuita limitada y suscripciones de pago (mensuales o anuales), así como ofertas de duración limitada o acceso de por vida en versión beta. Los precios están en euros con IVA incluido. El Vendedor se reserva el derecho a modificar sus precios en cualquier momento con información previa."] },
    { h: "Artículo 4 – Pedido y pago", body: ["La suscripción se realiza exclusivamente online. El contrato se forma desde la validación del pago y la aceptación de las CGV. Los pagos se realizan mediante Stripe o PayPal. Para las suscripciones, el Cliente autoriza el cobro automático en cada vencimiento. En caso de impago, el Vendedor se reserva el derecho a suspender o rescindir el acceso."] },
    { h: "Artículo 5 – Acceso al servicio", body: ["El acceso se abre desde la validación del pago. El Cliente es responsable de su cuenta y de la confidencialidad de sus identificadores. Se compromete a señalar cualquier uso fraudulento."] },
    { h: "Artículo 6 – Derecho de desistimiento", body: ["Para las prestaciones de suministro de contenido digital, el Cliente consumidor acepta expresamente la ejecución inmediata del servicio desde la validación. Renuncia expresamente a su derecho de desistimiento. Esta renuncia se recoge antes del pago."] },
    { h: "Artículo 7 – Reembolso", body: ["No se puede conceder ningún reembolso tras la validación del pedido. Hay disponible una versión gratuita para una prueba previa."] },
    { h: "Artículo 8 – Duración y rescisión", body: ["Las suscripciones son de duración indeterminada con renovación automática. El Cliente puede rescindir en cualquier momento desde su espacio personal. La rescisión surte efecto al final del periodo en curso, sin reembolso de las cantidades ya abonadas."] },
    { h: "Artículo 9 – Datos y seguridad", body: ["El Vendedor aplica medidas técnicas y organizativas apropiadas (cifrado, control de acceso estricto). Para los leads captados por los quizzes del Cliente, el Cliente es responsable del tratamiento y el Vendedor encargado. El Vendedor se prohíbe todo uso de los datos del Cliente con fines comerciales propios."] },
    { h: "Artículo 10 – Responsabilidad", body: ["El Vendedor está sujeto a una obligación de medios para la prestación del servicio, sin garantía de resultado comercial. Los contenidos generados por IA pueden contener errores o imprecisiones; el Cliente es el único responsable de su verificación. La responsabilidad del Vendedor está limitada a las cantidades abonadas por el Cliente durante los últimos 12 meses. Los daños indirectos quedan excluidos."] },
    { h: "Artículo 11 – Propiedad intelectual", body: ["El Vendedor sigue siendo titular de los derechos sobre la plataforma, su arquitectura y su código. El Cliente dispone de un derecho de uso personal, no exclusivo y no transferible. Los contenidos del Cliente (quizzes, textos, imágenes) siguen siendo de su propiedad."] },
    { h: "Artículo 12 – Suspensión y rescisión por falta", body: ["El Vendedor se reserva el derecho de suspender o rescindir el acceso sin previo aviso en caso de violación de las CGV, fraude, impago o uso abusivo."] },
    { h: "Artículo 13 – Datos personales", body: ["El tratamiento de los datos se detalla en la Política de privacidad."] },
    { h: "Artículo 14 – Modificación de las CGV", body: ["El Vendedor puede modificar las CGV en cualquier momento. Las modificaciones son notificadas antes de su entrada en vigor."] },
    { h: "Artículo 15 – Mediación", body: ["El Cliente consumidor puede recurrir gratuitamente a un mediador: CM2C, 14 rue Saint-Jean, 75017 París, www.cm2c.net."] },
    { h: "Artículo 16 – Derecho aplicable y jurisdicción", body: ["Las CGV están sometidas al derecho francés. Los consumidores conservan la competencia de las jurisdicciones legales aplicables. Para los profesionales, los tribunales de la Cour d'appel de Montpellier tienen competencia exclusiva."] },
  ],
};
const it: LegalPage = {
  title: "Condizioni generali di vendita",
  lastUpdated: "Ultimo aggiornamento: 22/04/2026",
  intro: `Le presenti CGV disciplinano i rapporti tra ${C.name} (${C.form}, capitale ${C.capital}, RCS ${C.rcs}, sede ${C.address}) — di seguito "il Venditore" — e ogni Cliente che sottoscriva i servizi Tiquiz® su tiquiz.com.`,
  sections: [
    { h: "Articolo 1 – Oggetto", body: ["Le CGV definiscono le condizioni di accesso e di utilizzo di Tiquiz®, applicazione SaaS di creazione di quiz interattivi e di cattura di lead."] },
    { h: "Articolo 2 – Descrizione dei servizi", body: ["Tiquiz è fornito a distanza tramite una piattaforma online. Consente la creazione di quiz, la qualificazione dei prospect, la sincronizzazione con strumenti di terzi (Systeme.io, ecc.) e la misurazione delle prestazioni. Il Venditore si riserva il diritto di far evolvere, modificare o rimuovere tutte o parte delle funzionalità in qualsiasi momento."] },
    { h: "Articolo 3 – Offerte e tariffe", body: ["Tiquiz propone una formula gratuita limitata e abbonamenti a pagamento (mensili o annuali), nonché offerte a durata limitata o accesso a vita in beta. I prezzi sono in euro IVA inclusa. Il Venditore si riserva il diritto di modificare i prezzi in qualsiasi momento con informazione preliminare."] },
    { h: "Articolo 4 – Ordine e pagamento", body: ["La sottoscrizione avviene esclusivamente online. Il contratto è formato al momento della validazione del pagamento e dell'accettazione delle CGV. I pagamenti sono effettuati tramite Stripe o PayPal. Per gli abbonamenti, il Cliente autorizza il prelievo automatico a ogni scadenza. In caso di mancato pagamento, il Venditore si riserva il diritto di sospendere o risolvere l'accesso."] },
    { h: "Articolo 5 – Accesso al servizio", body: ["L'accesso è aperto dalla validazione del pagamento. Il Cliente è responsabile del proprio account e della riservatezza delle proprie credenziali. Si impegna a segnalare qualsiasi uso fraudolento."] },
    { h: "Articolo 6 – Diritto di recesso", body: ["Per le prestazioni di fornitura di contenuti digitali, il Cliente consumatore accetta espressamente l'esecuzione immediata del servizio al momento della validazione. Rinuncia espressamente al proprio diritto di recesso. Questa rinuncia è raccolta prima del pagamento."] },
    { h: "Articolo 7 – Rimborso", body: ["Nessun rimborso può essere accordato dopo la validazione dell'ordine. È disponibile una versione gratuita per un test preliminare."] },
    { h: "Articolo 8 – Durata e risoluzione", body: ["Gli abbonamenti sono a durata indeterminata con rinnovo automatico. Il Cliente può risolvere in qualsiasi momento dal proprio spazio personale. La risoluzione ha effetto alla fine del periodo in corso, senza rimborso delle somme già versate."] },
    { h: "Articolo 9 – Dati e sicurezza", body: ["Il Venditore attua misure tecniche e organizzative appropriate (cifratura, controllo degli accessi rigoroso). Per i lead catturati dai quiz del Cliente, il Cliente è il titolare del trattamento, il Venditore è il responsabile. Il Venditore si vieta qualsiasi uso dei dati del Cliente per fini commerciali propri."] },
    { h: "Articolo 10 – Responsabilità", body: ["Il Venditore è tenuto a un'obbligazione di mezzi per la fornitura del servizio, senza garanzia di risultato commerciale. I contenuti generati dall'IA possono contenere errori o imprecisioni; il Cliente è l'unico responsabile della loro verifica. La responsabilità del Venditore è limitata alle somme versate dal Cliente negli ultimi 12 mesi. Sono esclusi i danni indiretti."] },
    { h: "Articolo 11 – Proprietà intellettuale", body: ["Il Venditore rimane titolare dei diritti sulla piattaforma, sulla sua architettura e sul suo codice. Il Cliente dispone di un diritto di utilizzo personale, non esclusivo e non trasferibile. I contenuti del Cliente (quiz, testi, immagini) restano di sua proprietà."] },
    { h: "Articolo 12 – Sospensione e risoluzione per colpa", body: ["Il Venditore si riserva il diritto di sospendere o risolvere l'accesso senza preavviso in caso di violazione delle CGV, frode, mancato pagamento o uso abusivo."] },
    { h: "Articolo 13 – Dati personali", body: ["Il trattamento dei dati è dettagliato nell'Informativa sulla privacy."] },
    { h: "Articolo 14 – Modifica delle CGV", body: ["Il Venditore può modificare le CGV in qualsiasi momento. Le modifiche sono notificate prima della loro entrata in vigore."] },
    { h: "Articolo 15 – Mediazione", body: ["Il Cliente consumatore può ricorrere gratuitamente a un mediatore: CM2C, 14 rue Saint-Jean, 75017 Parigi, www.cm2c.net."] },
    { h: "Articolo 16 – Diritto applicabile e giurisdizione", body: ["Le CGV sono soggette al diritto francese. I consumatori conservano la competenza delle giurisdizioni legali applicabili. Per i professionisti, i tribunali della Corte d'appello di Montpellier hanno competenza esclusiva."] },
  ],
};
const ar: LegalPage = {
  title: "الشروط العامة للبيع",
  lastUpdated: "آخر تحديث: 22/04/2026",
  intro: `تحكم هذه الشروط العامة للبيع العلاقات بين ${C.name} (${C.form}، رأس مال ${C.capital}، RCS ${C.rcs}، المقر ${C.address}) — "البائع" — وكل عميل يشترك في خدمات Tiquiz® على tiquiz.com.`,
  sections: [
    { h: "المادة 1 – الموضوع", body: ["تحدد الشروط العامة للبيع شروط الوصول إلى Tiquiz® واستخدامه، وهو تطبيق SaaS لإنشاء اختبارات تفاعلية وجذب عملاء محتملين."] },
    { h: "المادة 2 – وصف الخدمات", body: ["يُقدَّم Tiquiz عن بُعد عبر منصة إلكترونية. يتيح إنشاء الاختبارات، تأهيل العملاء المحتملين، المزامنة مع أدوات طرف ثالث (Systeme.io، إلخ)، وقياس الأداء. يحتفظ البائع بالحق في تطوير أو تعديل أو إزالة كل أو بعض الوظائف في أي وقت."] },
    { h: "المادة 3 – العروض والأسعار", body: ["يقدم Tiquiz صيغة مجانية محدودة واشتراكات مدفوعة (شهرية أو سنوية)، بالإضافة إلى عروض محدودة المدة أو وصول مدى الحياة بنسخة تجريبية. الأسعار باليورو شامل الضرائب. يحتفظ البائع بحق تعديل أسعاره في أي وقت مع إشعار مسبق."] },
    { h: "المادة 4 – الطلب والدفع", body: ["يتم الاشتراك حصريًا عبر الإنترنت. يُبرَم العقد عند التحقق من الدفع وقبول الشروط. تتم عمليات الدفع عبر Stripe أو PayPal. بالنسبة للاشتراكات، يفوّض العميل الخصم التلقائي عند كل استحقاق. في حالة التخلف عن الدفع، يحتفظ البائع بالحق في تعليق الوصول أو إنهائه."] },
    { h: "المادة 5 – الوصول إلى الخدمة", body: ["يُفتَح الوصول عند التحقق من الدفع. العميل مسؤول عن حسابه وعن سرية بيانات اعتماده. يلتزم بالإبلاغ عن أي استخدام احتيالي."] },
    { h: "المادة 6 – حق التراجع", body: ["بالنسبة لخدمات تقديم المحتوى الرقمي، يقبل العميل المستهلك صراحةً التنفيذ الفوري للخدمة عند التحقق. يتنازل صراحةً عن حقه في التراجع. يتم جمع هذا التنازل قبل الدفع."] },
    { h: "المادة 7 – الاسترداد", body: ["لا يمكن منح أي استرداد بعد التحقق من الطلب. تتوفر نسخة مجانية لاختبار مسبق."] },
    { h: "المادة 8 – المدة والإنهاء", body: ["الاشتراكات لمدة غير محددة مع تجديد تلقائي. يمكن للعميل الإنهاء في أي وقت من فضائه الشخصي. يدخل الإنهاء حيز التنفيذ في نهاية الفترة الجارية، دون استرداد للمبالغ المدفوعة بالفعل."] },
    { h: "المادة 9 – البيانات والأمن", body: ["يطبق البائع تدابير تقنية وتنظيمية مناسبة (التشفير، التحكم الصارم في الوصول). بالنسبة للعملاء المحتملين الذين تجذبهم اختبارات العميل، يكون العميل هو المسؤول عن المعالجة والبائع معالجًا من الباطن. يحظر البائع على نفسه أي استخدام لبيانات العميل لأغراضه التجارية الخاصة."] },
    { h: "المادة 10 – المسؤولية", body: ["يلتزم البائع بالتزام وسائل لتقديم الخدمة، دون ضمان نتيجة تجارية. قد تحتوي المحتويات المُولَّدة بالذكاء الاصطناعي على أخطاء أو عدم دقة؛ العميل وحده مسؤول عن التحقق منها. تقتصر مسؤولية البائع على المبالغ المدفوعة من قبل العميل خلال الـ 12 شهرًا الماضية. الأضرار غير المباشرة مستثناة."] },
    { h: "المادة 11 – الملكية الفكرية", body: ["يظل البائع مالكًا للحقوق على المنصة وبنيتها وكودها. يحصل العميل على حق استخدام شخصي، غير حصري، وغير قابل للتحويل. تظل محتويات العميل (الاختبارات، النصوص، الصور) ملكه."] },
    { h: "المادة 12 – التعليق والإنهاء بسبب الخطأ", body: ["يحتفظ البائع بالحق في تعليق أو إنهاء الوصول دون إشعار مسبق في حالة انتهاك الشروط، الاحتيال، عدم الدفع، أو الاستخدام المسيء."] },
    { h: "المادة 13 – البيانات الشخصية", body: ["تفاصيل معالجة البيانات في سياسة الخصوصية."] },
    { h: "المادة 14 – تعديل الشروط", body: ["يمكن للبائع تعديل الشروط في أي وقت. يتم إخطار التعديلات قبل دخولها حيز التنفيذ."] },
    { h: "المادة 15 – الوساطة", body: ["يمكن للعميل المستهلك اللجوء مجانًا إلى وسيط: CM2C، 14 rue Saint-Jean، 75017 باريس، www.cm2c.net."] },
    { h: "المادة 16 – القانون الواجب التطبيق والاختصاص", body: ["الشروط تخضع للقانون الفرنسي. يحتفظ المستهلكون باختصاص المحاكم القانونية المعمول بها. بالنسبة للمحترفين، تتمتع محاكم محكمة استئناف مونبلييه بالاختصاص الحصري."] },
  ],
};

export const terms: Record<string, LegalPage> = { fr, en, es, it, ar };
