import type { LegalPage } from "./types";
import { COMPANY as C } from "./company";

const fr: LegalPage = {
  title: "Conditions générales du programme d'affiliation",
  lastUpdated: "Dernière mise à jour : 26/08/2026",
  intro: `${C.name} (${C.form}, capital ${C.capital}, RCS ${C.rcs}, siège ${C.address}), ci-après "l'Éditeur", propose un programme d'affiliation permettant aux participants de promouvoir Tiquiz® en échange de commissions.`,
  sections: [
    {
      h: "Article 1 - Objet",
      body: [
        "Le programme permet aux affiliés de percevoir des commissions sur les ventes Tiquiz® générées via leur lien d'affiliation.",
      ],
    },
    {
      h: "Article 2 - Inscription",
      body: [
        "L'inscription est gratuite. L'Éditeur se réserve le droit d'accepter ou de refuser toute candidature sans justification. L'affilié doit fournir des informations exactes et les maintenir à jour.",
      ],
    },
    {
      h: "Article 3 - Fonctionnement",
      body: [
        "Chaque affilié dispose d'un code public et de liens uniques, fournis dans son espace affilié. Un cookie identifie l'affilié lors du clic. Les liens émis antérieurement via Systeme.io restent valides et continuent d'être suivis. Les commissions sont attribuées conformément aux présentes conditions en cas de vente.",
      ],
    },
    {
      h: "Article 4 - Cookies et attribution",
      body: [
        "Le suivi repose sur un cookie déposé lors du clic, d'une durée de douze (12) mois, sous réserve de sa conservation sur l'appareil de l'utilisateur et de l'absence de suppression. Une inscription gratuite réalisée via un lien d'affiliation rattache durablement l'inscrit à cet affilié, sans limite de durée. L'Éditeur ne garantit pas une attribution parfaite des ventes. En cas de conflit, l'Éditeur détermine souverainement l'attribution.",
      ],
    },
    {
      h: "Article 5 - Commissions",
      body: [
        "Les montants figurent sur les pages du programme. Les commissions ne sont dues qu'après encaissement effectif du paiement. Elles peuvent être annulées en cas de remboursement, impayé, fraude ou non-respect des présentes conditions. La validation de l'Éditeur est requise avant paiement.",
      ],
    },
    {
      h: "Article 6 - Paiement",
      body: [
        "Une commission devient versable trente (30) jours après l'encaissement du paiement du client. Les commissions versables sont réglées entre le 10 et le 13 de chaque mois, par virement SEPA ou PayPal selon le choix de l'affilié, sur les coordonnées renseignées dans son espace. Un seuil minimum de vingt (20) euros s'applique : en dessous, le montant reste acquis à l'affilié et est reporté au versement suivant. Les commissions issues de ventes antérieures réalisées via les tunnels Systeme.io continuent d'être versées par cette plateforme. L'affilié assume seul ses obligations fiscales et sociales.",
      ],
    },
    {
      h: "Article 7 - Auto-affiliation et pratiques interdites",
      body: [
        "L'affilié ne peut percevoir de commission sur ses propres achats, directs ou indirects. Sont notamment interdits : tout achat effectué via son propre lien d'affiliation, par des proches ou par des comptes/emails/moyens de paiement qu'il contrôle, ainsi que toute tentative de contournement du tracking.",
        "L'Éditeur peut demander des justificatifs en cas de doute. Les commissions frauduleuses peuvent être annulées, retenues ou récupérées. Le compte peut être suspendu ou supprimé sans préavis en cas de violation.",
      ],
    },
    {
      h: "Article 8 - Obligations de l'affilié",
      body: [
        "L'affilié s'engage à promouvoir Tiquiz® loyalement, avec transparence et dans le respect de la réglementation. Sont interdits : informations trompeuses, promesses de gains, spam, usurpation d'identité, moyens frauduleux.",
      ],
    },
    {
      h: "Article 9 - Propriété intellectuelle",
      body: [
        "Les marques, logos et contenus restent la propriété exclusive de l'Éditeur. L'affilié dispose d'un droit d'utilisation limité au cadre du programme.",
      ],
    },
    {
      h: "Article 10 - Responsabilité",
      body: [
        "L'affilié agit en totale indépendance. Aucun lien de subordination, mandat ou représentation n'existe. L'affilié assume seul la responsabilité de ses contenus, actions de promotion et respect de la loi. L'Éditeur n'est pas responsable des agissements de l'affilié.",
      ],
    },
    {
      h: "Article 11 - Suspension et résiliation",
      body: [
        "L'Éditeur peut suspendre ou résilier le compte à tout moment en cas de non-respect, fraude ou comportement nuisible. Les commissions en cours peuvent être annulées.",
      ],
    },
    {
      h: "Article 12 - Modification du programme",
      body: [
        "L'Éditeur se réserve le droit de modifier à tout moment les conditions, commissions ou modalités de paiement.",
      ],
    },
    {
      h: "Article 13 - Données personnelles",
      body: [
        "Des données personnelles peuvent être traitées dans le cadre du programme. Les parties respectent la réglementation applicable.",
      ],
    },
    {
      h: "Article 14 - Droit applicable et juridiction",
      body: [
        "Les conditions sont soumises au droit français. Pour les professionnels, les tribunaux du ressort de la Cour d'appel de Montpellier ont compétence exclusive.",
      ],
    },
    {
      h: "Contact",
      body: [`${C.name}, ${C.address}, ${C.email}.`],
    },
  ],
};

const en: LegalPage = {
  title: "Affiliate Program Terms",
  lastUpdated: "Last updated: 08/26/2026",
  intro: `${C.name} (a ${C.form}, share capital ${C.capital}, registered with the Montpellier Trade Registry under no. 909 349 045, registered office ${C.address}), the "Publisher", offers an affiliate program that lets participants promote Tiquiz® in exchange for commissions.`,
  sections: [
    {
      h: "Article 1 - Purpose",
      body: [
        "The program lets affiliates earn commissions on Tiquiz® sales generated through their affiliate link.",
      ],
    },
    {
      h: "Article 2 - Enrolment",
      body: [
        "Enrolment is free. The Publisher may accept or reject any application without justification. Affiliates must supply accurate, up-to-date information.",
      ],
    },
    {
      h: "Article 3 - How it works",
      body: [
        "Each affiliate has a public code and unique links, provided in their affiliate dashboard. A cookie identifies the affiliate upon click. Links issued earlier through Systeme.io remain valid and keep being tracked. Commissions are attributed in case of a sale, per these terms.",
      ],
    },
    {
      h: "Article 4 - Cookies and attribution",
      body: [
        "Tracking relies on a cookie set on click, lasting twelve (12) months, provided it remains on the user's device and is not deleted. A free sign-up made through an affiliate link ties that person to the affiliate permanently, with no time limit. The Publisher does not guarantee perfect attribution. In case of conflict, the Publisher is the sole judge of attribution.",
      ],
    },
    {
      h: "Article 5 - Commissions",
      body: [
        "Rates are listed on the program pages. Commissions become due only after actual collection of the payment. They may be cancelled in case of refund, chargeback, fraud or breach. Publisher validation is required before payout.",
      ],
    },
    {
      h: "Article 6 - Payout",
      body: [
        "A commission becomes payable thirty (30) days after the customer's payment is collected. Payable commissions are settled between the 10th and the 13th of each month, by SEPA transfer or PayPal at the affiliate's choice, to the details entered in their dashboard. A minimum threshold of twenty (20) euros applies: below that, the amount remains owed to the affiliate and rolls over to the next payout. Commissions from earlier sales made through Systeme.io funnels keep being paid by that platform. The affiliate is solely responsible for tax and social obligations.",
      ],
    },
    {
      h: "Article 7 - Self-affiliation and prohibited practices",
      body: [
        "Affiliates cannot earn commissions on their own purchases, direct or indirect. In particular, the following are forbidden: purchases made via one's own affiliate link, by relatives, or by accounts/emails/payment methods under the affiliate's control, as well as any attempt to circumvent tracking.",
        "The Publisher may request supporting documents in case of doubt. Fraudulent commissions may be cancelled, withheld or clawed back. The account may be suspended or terminated without notice in case of breach.",
      ],
    },
    {
      h: "Article 8 - Affiliate obligations",
      body: [
        "Affiliates must promote Tiquiz® fairly, transparently and in compliance with applicable regulation. Misleading information, unrealistic earnings promises, spam, identity theft and fraudulent means are forbidden.",
      ],
    },
    {
      h: "Article 9 - Intellectual property",
      body: [
        "Trademarks, logos and content remain the exclusive property of the Publisher. Affiliates have a right of use strictly limited to the program.",
      ],
    },
    {
      h: "Article 10 - Liability",
      body: [
        "Affiliates act in full independence. There is no subordination, mandate or representation relationship. Affiliates are solely responsible for their content, promotional actions and legal compliance. The Publisher is not liable for the affiliate's actions.",
      ],
    },
    {
      h: "Article 11 - Suspension and termination",
      body: [
        "The Publisher may suspend or terminate the account at any time in case of breach, fraud or harmful behaviour. Pending commissions may be cancelled.",
      ],
    },
    {
      h: "Article 12 - Program changes",
      body: [
        "The Publisher may change terms, commission rates or payout conditions at any time.",
      ],
    },
    {
      h: "Article 13 - Personal data",
      body: [
        "Personal data may be processed in the context of the program. Both parties comply with the applicable regulation.",
      ],
    },
    {
      h: "Article 14 - Governing law and jurisdiction",
      body: [
        "These terms are governed by French law. For professional users, the courts under the jurisdiction of the Montpellier Court of Appeal have exclusive jurisdiction.",
      ],
    },
    {
      h: "Contact",
      body: [`${C.name}, ${C.address}, ${C.email}.`],
    },
  ],
};


const es: LegalPage = {
  title: "Condiciones generales del programa de afiliación",
  lastUpdated: "Última actualización: 26/08/2026",
  intro: `${C.name} (${C.form}, capital ${C.capital}, RCS ${C.rcs}, sede ${C.address}), en adelante «el Editor», propone un programa de afiliación que permite a los participantes promocionar Tiquiz® a cambio de comisiones.`,
  sections: [
    { h: "Artículo 1 - Objeto", body: ["El programa permite a los afiliados percibir comisiones sobre las ventas Tiquiz® generadas a través de su enlace de afiliado."] },
    { h: "Artículo 2 - Inscripción", body: ["La inscripción es gratuita. El Editor se reserva el derecho de aceptar o rechazar cualquier candidatura sin justificación. El afiliado debe proporcionar información exacta y mantenerla actualizada."] },
    { h: "Artículo 3 - Funcionamiento", body: ["Cada afiliado dispone de un código público y de enlaces únicos, facilitados en su espacio de afiliado. Una cookie identifica al afiliado al hacer clic. Los enlaces emitidos anteriormente a través de Systeme.io siguen siendo válidos y se siguen rastreando. Las comisiones se atribuyen conforme a estas condiciones en caso de venta."] },
    { h: "Artículo 4 - Cookies y atribución", body: ["El seguimiento se basa en una cookie depositada al hacer clic, con una duración de doce (12) meses, siempre que se conserve en el dispositivo del usuario y no se suprima. Un registro gratuito realizado a través de un enlace de afiliado vincula de forma duradera a esa persona con el afiliado, sin límite de tiempo. El Editor no garantiza una atribución perfecta de las ventas. En caso de conflicto, el Editor decide soberanamente sobre la atribución."] },
    { h: "Artículo 5 - Comisiones", body: ["Los importes figuran en las páginas del programa. Las comisiones solo se deben tras el cobro efectivo del pago. Pueden anularse en caso de reembolso, impago, fraude o incumplimiento de las presentes condiciones. Se requiere la validación del Editor antes del pago."] },
    { h: "Artículo 6 - Pago", body: ["Una comisión pasa a ser pagadera treinta (30) días después del cobro del pago del cliente. Las comisiones pagaderas se abonan entre el 10 y el 13 de cada mes, por transferencia SEPA o PayPal según elija el afiliado, a los datos indicados en su espacio. Se aplica un umbral mínimo de veinte (20) euros: por debajo, el importe sigue perteneciendo al afiliado y se traslada al siguiente pago. Las comisiones de ventas anteriores realizadas a través de los embudos de Systeme.io siguen siendo abonadas por esa plataforma. El afiliado asume él solo sus obligaciones fiscales y sociales."] },
    { h: "Artículo 7 - Auto-afiliación y prácticas prohibidas", body: ["El afiliado no puede percibir comisión sobre sus propias compras, directas o indirectas. Se prohíben en particular: toda compra realizada a través de su propio enlace de afiliado, por personas cercanas o por cuentas/emails/medios de pago que controle, así como cualquier intento de eludir el seguimiento.","El Editor puede solicitar justificantes en caso de duda. Las comisiones fraudulentas pueden anularse, retenerse o recuperarse. La cuenta puede suspenderse o suprimirse sin previo aviso en caso de violación."] },
    { h: "Artículo 8 - Obligaciones del afiliado", body: ["El afiliado se compromete a promocionar Tiquiz® lealmente, con transparencia y respetando la normativa. Están prohibidas: informaciones engañosas, promesas de ganancias, spam, suplantación de identidad, medios fraudulentos."] },
    { h: "Artículo 9 - Propiedad intelectual", body: ["Las marcas, logos y contenidos siguen siendo propiedad exclusiva del Editor. El afiliado dispone de un derecho de uso limitado al marco del programa."] },
    { h: "Artículo 10 - Responsabilidad", body: ["El afiliado actúa con total independencia. No existe ningún vínculo de subordinación, mandato o representación. El afiliado asume él solo la responsabilidad de sus contenidos, acciones de promoción y cumplimiento de la ley. El Editor no es responsable de los actos del afiliado."] },
    { h: "Artículo 11 - Suspensión y rescisión", body: ["El Editor puede suspender o rescindir la cuenta en cualquier momento en caso de incumplimiento, fraude o comportamiento perjudicial. Las comisiones en curso pueden anularse."] },
    { h: "Artículo 12 - Modificación del programa", body: ["El Editor se reserva el derecho a modificar en cualquier momento las condiciones, comisiones o modalidades de pago."] },
    { h: "Artículo 13 - Datos personales", body: ["Pueden tratarse datos personales en el marco del programa. Las partes respetan la normativa aplicable."] },
    { h: "Artículo 14 - Derecho aplicable y jurisdicción", body: ["Las condiciones están sometidas al derecho francés. Para los profesionales, los tribunales de la Cour d'appel de Montpellier tienen competencia exclusiva."] },
    { h: "Contacto", body: [`${C.name}, ${C.address}, ${C.email}.`] },
  ],
};
const it: LegalPage = {
  title: "Condizioni generali del programma di affiliazione",
  lastUpdated: "Ultimo aggiornamento: 26/08/2026",
  intro: `${C.name} (${C.form}, capitale ${C.capital}, RCS ${C.rcs}, sede ${C.address}), di seguito "l'Editore", propone un programma di affiliazione che consente ai partecipanti di promuovere Tiquiz® in cambio di commissioni.`,
  sections: [
    { h: "Articolo 1 - Oggetto", body: ["Il programma consente agli affiliati di percepire commissioni sulle vendite Tiquiz® generate tramite il loro link di affiliazione."] },
    { h: "Articolo 2 - Iscrizione", body: ["L'iscrizione è gratuita. L'Editore si riserva il diritto di accettare o rifiutare qualsiasi candidatura senza giustificazione. L'affiliato deve fornire informazioni esatte e mantenerle aggiornate."] },
    { h: "Articolo 3 - Funzionamento", body: ["Ogni affiliato dispone di un codice pubblico e di link unici, forniti nella sua area affiliati. Un cookie identifica l'affiliato al click. I link emessi in precedenza tramite Systeme.io restano validi e continuano a essere tracciati. Le commissioni sono attribuite secondo le presenti condizioni in caso di vendita."] },
    { h: "Articolo 4 - Cookie e attribuzione", body: ["Il tracciamento si basa su un cookie depositato al click, della durata di dodici (12) mesi, a condizione che sia conservato sul dispositivo dell'utente e non sia eliminato. Un'iscrizione gratuita effettuata tramite un link di affiliazione collega stabilmente quella persona all'affiliato, senza limiti di durata. L'Editore non garantisce un'attribuzione perfetta delle vendite. In caso di conflitto, l'Editore determina sovranamente l'attribuzione."] },
    { h: "Articolo 5 - Commissioni", body: ["Gli importi figurano sulle pagine del programma. Le commissioni sono dovute solo dopo l'effettivo incasso del pagamento. Possono essere annullate in caso di rimborso, mancato pagamento, frode o inosservanza delle presenti condizioni. È richiesta la validazione dell'Editore prima del pagamento."] },
    { h: "Articolo 6 - Pagamento", body: ["Una commissione diventa pagabile trenta (30) giorni dopo l'incasso del pagamento del cliente. Le commissioni pagabili sono liquidate tra il 10 e il 13 di ogni mese, tramite bonifico SEPA o PayPal a scelta dell'affiliato, sulle coordinate indicate nella sua area. Si applica una soglia minima di venti (20) euro: al di sotto, l'importo resta acquisito all'affiliato e viene riportato al versamento successivo. Le commissioni derivanti da vendite precedenti effettuate tramite i funnel Systeme.io continuano a essere versate da quella piattaforma. L'affiliato si assume da solo i propri obblighi fiscali e previdenziali."] },
    { h: "Articolo 7 - Auto-affiliazione e pratiche vietate", body: ["L'affiliato non può percepire commissioni sui propri acquisti, diretti o indiretti. Sono in particolare vietati: qualsiasi acquisto effettuato tramite il proprio link di affiliazione, da persone vicine o da account/email/mezzi di pagamento che controlla, nonché qualsiasi tentativo di aggirare il tracciamento.","L'Editore può richiedere giustificativi in caso di dubbio. Le commissioni fraudolente possono essere annullate, trattenute o recuperate. L'account può essere sospeso o eliminato senza preavviso in caso di violazione."] },
    { h: "Articolo 8 - Obblighi dell'affiliato", body: ["L'affiliato si impegna a promuovere Tiquiz® lealmente, con trasparenza e nel rispetto della normativa. Sono vietati: informazioni ingannevoli, promesse di guadagni, spam, furto d'identità, mezzi fraudolenti."] },
    { h: "Articolo 9 - Proprietà intellettuale", body: ["I marchi, loghi e contenuti rimangono di proprietà esclusiva dell'Editore. L'affiliato dispone di un diritto di utilizzo limitato al quadro del programma."] },
    { h: "Articolo 10 - Responsabilità", body: ["L'affiliato agisce in totale indipendenza. Non esiste alcun rapporto di subordinazione, mandato o rappresentanza. L'affiliato si assume da solo la responsabilità dei propri contenuti, azioni promozionali e rispetto della legge. L'Editore non è responsabile delle azioni dell'affiliato."] },
    { h: "Articolo 11 - Sospensione e risoluzione", body: ["L'Editore può sospendere o risolvere l'account in qualsiasi momento in caso di inosservanza, frode o comportamento dannoso. Le commissioni in corso possono essere annullate."] },
    { h: "Articolo 12 - Modifica del programma", body: ["L'Editore si riserva il diritto di modificare in qualsiasi momento le condizioni, le commissioni o le modalità di pagamento."] },
    { h: "Articolo 13 - Dati personali", body: ["Nel quadro del programma possono essere trattati dati personali. Le parti rispettano la normativa applicabile."] },
    { h: "Articolo 14 - Diritto applicabile e giurisdizione", body: ["Le condizioni sono soggette al diritto francese. Per i professionisti, i tribunali della Corte d'appello di Montpellier hanno competenza esclusiva."] },
    { h: "Contatto", body: [`${C.name}, ${C.address}, ${C.email}.`] },
  ],
};
const ar: LegalPage = {
  title: "الشروط العامة لبرنامج الشركاء",
  lastUpdated: "آخر تحديث: 26/08/2026",
  intro: `${C.name} (${C.form}، رأس مال ${C.capital}، RCS ${C.rcs}، المقر ${C.address}), "الناشر", تقترح برنامج شركاء يتيح للمشاركين الترويج لـ Tiquiz® مقابل عمولات.`,
  sections: [
    { h: "المادة 1 - الموضوع", body: ["يتيح البرنامج للشركاء الحصول على عمولات على مبيعات Tiquiz® المُنشأة عبر رابط الشراكة الخاص بهم."] },
    { h: "المادة 2 - التسجيل", body: ["التسجيل مجاني. يحتفظ الناشر بالحق في قبول أو رفض أي طلب دون تبرير. يجب على الشريك تقديم معلومات دقيقة والحفاظ على تحديثها."] },
    { h: "المادة 3 - آلية العمل", body: ["يتلقى كل شريك رابطًا فريدًا عبر منصة Systeme.io. يحدد ملف تعريف ارتباط الشريك عند النقر. تُمنح العمولات وفقًا للشروط في حالة البيع."] },
    { h: "المادة 4 - ملفات تعريف الارتباط والإسناد", body: ["يعتمد التتبع على ملفات تعريف الارتباط، الصالحة إلى أجل غير مسمى بشرط الاحتفاظ بها على جهاز المستخدم وعدم حذفها. لا يضمن الناشر إسنادًا مثاليًا للمبيعات. في حالة النزاع، يحدد الناشر الإسناد بشكل سيادي."] },
    { h: "المادة 5 - العمولات", body: ["المبالغ مذكورة في صفحات البرنامج. لا تُستحق العمولات إلا بعد التحصيل الفعلي للدفع. يمكن إلغاؤها في حالة الاسترداد أو عدم الدفع أو الاحتيال أو عدم احترام هذه الشروط. يُشترط التحقق من الناشر قبل الدفع."] },
    { h: "المادة 6 - الدفع", body: ["تُدفع العمولات المعتمدة بين 10 و13 من كل شهر لمبيعات الشهر السابق، عبر Systeme.io أو أي وسيلة أخرى يقررها الناشر. قد ينطبق حد أدنى للدفع. يتحمل الشريك وحده التزاماته الضريبية والاجتماعية."] },
    { h: "المادة 7 - الشراكة الذاتية والممارسات المحظورة", body: ["لا يمكن للشريك الحصول على عمولة على مشترياته الخاصة، المباشرة أو غير المباشرة. يُحظر بشكل خاص: أي شراء عبر رابطه الخاص، من قبل المقربين أو من قبل حسابات/رسائل/وسائل دفع يتحكم فيها، وكذلك أي محاولة للتحايل على التتبع.","يمكن للناشر طلب مستندات إثبات في حالة الشك. يمكن إلغاء العمولات الاحتيالية أو حجزها أو استردادها. يمكن تعليق الحساب أو حذفه دون إشعار في حالة الانتهاك."] },
    { h: "المادة 8 - التزامات الشريك", body: ["يلتزم الشريك بالترويج لـ Tiquiz® بنزاهة وشفافية واحترام للتشريعات. يُحظر: المعلومات المضللة، ووعود الأرباح، والبريد المزعج، وانتحال الهوية، والوسائل الاحتيالية."] },
    { h: "المادة 9 - الملكية الفكرية", body: ["تظل العلامات التجارية والشعارات والمحتوى ملكية حصرية للناشر. يتمتع الشريك بحق استخدام محدود بإطار البرنامج."] },
    { h: "المادة 10 - المسؤولية", body: ["يتصرف الشريك باستقلالية تامة. لا توجد علاقة تبعية أو توكيل أو تمثيل. يتحمل الشريك وحده مسؤولية محتوياته وأعمال الترويج واحترام القانون. الناشر غير مسؤول عن تصرفات الشريك."] },
    { h: "المادة 11 - التعليق والإنهاء", body: ["يمكن للناشر تعليق الحساب أو إنهائه في أي وقت في حالة عدم الاحترام أو الاحتيال أو السلوك الضار. يمكن إلغاء العمولات الجارية."] },
    { h: "المادة 12 - تعديل البرنامج", body: ["يحتفظ الناشر بالحق في تعديل الشروط أو العمولات أو طرق الدفع في أي وقت."] },
    { h: "المادة 13 - البيانات الشخصية", body: ["قد تُعالَج بيانات شخصية في إطار البرنامج. تحترم الأطراف التشريعات المطبقة."] },
    { h: "المادة 14 - القانون الواجب التطبيق والاختصاص", body: ["تخضع الشروط للقانون الفرنسي. بالنسبة للمحترفين، تتمتع محاكم محكمة استئناف مونبلييه بالاختصاص الحصري."] },
    { h: "الاتصال", body: [`${C.name}, ${C.address}, ${C.email}.`] },
  ],
};

export const affiliate: Record<string, LegalPage> = { fr, en, es, it, ar };
