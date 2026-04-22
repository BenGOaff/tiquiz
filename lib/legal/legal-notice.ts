import type { LegalPage } from "./types";
import { COMPANY as C } from "./company";

const fr: LegalPage = {
  title: "Mentions légales",
  lastUpdated: "Dernière mise à jour : 22/04/2026",
  sections: [
    {
      h: "Éditeur",
      body: [
        `${C.name}, ${C.form} au capital de ${C.capital}, immatriculée au RCS sous le numéro ${C.rcs}. Siège social : ${C.address}.`,
        `TVA : ${C.vat} — Contact : ${C.email}.`,
      ],
    },
    {
      h: "Périmètre",
      body: [
        "Les présentes mentions couvrent le site de présentation tiquiz.com et l'application Tiquiz (quiz.tiquiz.com ou équivalent).",
      ],
    },
    {
      h: "Directeur de la publication",
      body: [`${C.director}, dirigeante de ${C.name}.`],
    },
    {
      h: "Hébergement",
      body: [
        [
          "Application : Hostinger",
          "Base de données et authentification : Supabase",
          "Pages marketing : ITACWT Limited (Systeme.io), Dublin, Irlande",
        ],
      ],
    },
    {
      h: "Nature de l'activité",
      body: [
        "Édition d'un logiciel en mode SaaS permettant de créer des quiz interactifs, capturer des leads qualifiés et synchroniser avec les outils marketing du créateur.",
      ],
    },
    {
      h: "Propriété intellectuelle",
      body: [
        "Le nom, la marque Tiquiz®, le logo, les interfaces, le code et l'ensemble des contenus sont protégés. Toute reproduction, représentation, modification ou exploitation, totale ou partielle, est interdite sans autorisation écrite.",
      ],
    },
    {
      h: "Contenus générés par IA",
      body: [
        "Les quiz, titres, questions et résultats générés par l'IA peuvent comporter des erreurs, approximations ou inexactitudes. L'utilisateur reste responsable de leur relecture et de leur utilisation.",
      ],
    },
    {
      h: "Responsabilité",
      body: [
        `${C.name} décline toute responsabilité en cas de dommages indirects, notamment perte de chiffre d'affaires, perte de données ou atteinte à l'image.`,
      ],
    },
    {
      h: "Juridiction",
      body: [
        "Droit français applicable. Pour les professionnels, compétence exclusive des tribunaux du ressort de la Cour d'appel de Montpellier.",
      ],
    },
  ],
};

const en: LegalPage = {
  title: "Legal Notice",
  lastUpdated: "Last updated: 04/22/2026",
  sections: [
    {
      h: "Publisher",
      body: [
        `${C.name}, a ${C.form} with a share capital of ${C.capital}, registered with the Montpellier Trade Registry under no. 909 349 045. Registered office: ${C.address}.`,
        `VAT: ${C.vat} — Contact: ${C.email}.`,
      ],
    },
    {
      h: "Scope",
      body: [
        "This notice covers the marketing site tiquiz.com and the Tiquiz application.",
      ],
    },
    {
      h: "Director of publication",
      body: [`${C.director}, director of ${C.name}.`],
    },
    {
      h: "Hosting",
      body: [
        [
          "Application: Hostinger",
          "Database and authentication: Supabase",
          "Marketing pages: ITACWT Limited (Systeme.io), Dublin, Ireland",
        ],
      ],
    },
    {
      h: "Business activity",
      body: [
        "SaaS software publisher, providing an application to create interactive quizzes, capture qualified leads and sync with the creator's marketing stack.",
      ],
    },
    {
      h: "Intellectual property",
      body: [
        "The Tiquiz® name and logo, the interfaces, the code and every piece of content are protected. Any reproduction, modification or exploitation — full or partial — is forbidden without prior written consent.",
      ],
    },
    {
      h: "AI-generated content",
      body: [
        "Quizzes, titles, questions and results produced by the AI may contain errors, approximations or inaccuracies. It is the user's responsibility to review them before use.",
      ],
    },
    {
      h: "Liability",
      body: [
        `${C.name} disclaims any liability for indirect damages, including loss of revenue, loss of data or reputational damage.`,
      ],
    },
    {
      h: "Jurisdiction",
      body: [
        "French law applies. For professional users, the courts under the jurisdiction of the Montpellier Court of Appeal have exclusive jurisdiction.",
      ],
    },
  ],
};


const es: LegalPage = {
  title: "Aviso legal",
  lastUpdated: "Última actualización: 22/04/2026",
  sections: [
    { h: "Editor", body: [`${C.name}, ${C.form} con capital social de ${C.capital}, inscrita en el RCS con el número ${C.rcs}. Sede social: ${C.address}.`, `CIF: ${C.vat} — Contacto: ${C.email}.`] },
    { h: "Ámbito", body: ["Este aviso cubre el sitio de presentación tiquiz.com y la aplicación Tiquiz."] },
    { h: "Director de la publicación", body: [`${C.director}, directora de ${C.name}.`] },
    { h: "Alojamiento", body: [[ "Aplicación: Hostinger", "Base de datos y autenticación: Supabase", "Páginas de marketing: ITACWT Limited (Systeme.io), Dublín, Irlanda" ]] },
    { h: "Naturaleza de la actividad", body: ["Edición de software en modo SaaS que permite crear quizzes interactivos, captar leads cualificados y sincronizar con las herramientas de marketing del creador."] },
    { h: "Propiedad intelectual", body: ["El nombre, la marca Tiquiz®, el logo, las interfaces, el código y todos los contenidos están protegidos. Queda prohibida toda reproducción, representación, modificación o explotación, total o parcial, sin autorización escrita."] },
    { h: "Contenidos generados por IA", body: ["Los quizzes, títulos, preguntas y resultados generados por IA pueden contener errores, aproximaciones o imprecisiones. El usuario es responsable de su revisión y uso."] },
    { h: "Responsabilidad", body: [`${C.name} declina toda responsabilidad en caso de daños indirectos, en particular pérdida de facturación, pérdida de datos o perjuicio a la imagen.`] },
    { h: "Jurisdicción", body: ["Derecho francés aplicable. Para los profesionales, competencia exclusiva de los tribunales de la Cour d'appel de Montpellier."] },
  ],
};
const it: LegalPage = {
  title: "Note legali",
  lastUpdated: "Ultimo aggiornamento: 22/04/2026",
  sections: [
    { h: "Editore", body: [`${C.name}, ${C.form} con capitale sociale di ${C.capital}, iscritta al RCS con il numero ${C.rcs}. Sede legale: ${C.address}.`, `Partita IVA: ${C.vat} — Contatto: ${C.email}.`] },
    { h: "Ambito", body: ["Le presenti note coprono il sito di presentazione tiquiz.com e l'applicazione Tiquiz."] },
    { h: "Direttore della pubblicazione", body: [`${C.director}, dirigente di ${C.name}.`] },
    { h: "Hosting", body: [[ "Applicazione: Hostinger", "Database e autenticazione: Supabase", "Pagine marketing: ITACWT Limited (Systeme.io), Dublino, Irlanda" ]] },
    { h: "Natura dell'attività", body: ["Editore di software in modalità SaaS che consente di creare quiz interattivi, catturare lead qualificati e sincronizzarsi con gli strumenti di marketing del creatore."] },
    { h: "Proprietà intellettuale", body: ["Il nome, il marchio Tiquiz®, il logo, le interfacce, il codice e tutti i contenuti sono protetti. È vietata qualsiasi riproduzione, rappresentazione, modifica o sfruttamento, totale o parziale, senza autorizzazione scritta."] },
    { h: "Contenuti generati dall'IA", body: ["I quiz, titoli, domande e risultati generati dall'IA possono contenere errori, approssimazioni o inesattezze. L'utente è responsabile della rilettura e dell'uso."] },
    { h: "Responsabilità", body: [`${C.name} declina ogni responsabilità per danni indiretti, in particolare perdita di fatturato, perdita di dati o danno all'immagine.`] },
    { h: "Giurisdizione", body: ["Diritto francese applicabile. Per i professionisti, competenza esclusiva dei tribunali della Corte d'appello di Montpellier."] },
  ],
};
const ar: LegalPage = {
  title: "إشعار قانوني",
  lastUpdated: "آخر تحديث: 22/04/2026",
  sections: [
    { h: "الناشر", body: [`${C.name}، ${C.form} برأس مال ${C.capital}، مسجلة في السجل التجاري تحت الرقم ${C.rcs}. المقر الاجتماعي: ${C.address}.`, `رقم ضريبة القيمة المضافة: ${C.vat} — الاتصال: ${C.email}.`] },
    { h: "النطاق", body: ["يغطي هذا الإشعار الموقع التعريفي tiquiz.com وتطبيق Tiquiz."] },
    { h: "مدير النشر", body: [`${C.director}، مديرة ${C.name}.`] },
    { h: "الاستضافة", body: [[ "التطبيق: Hostinger", "قاعدة البيانات والمصادقة: Supabase", "صفحات التسويق: ITACWT Limited (Systeme.io)، دبلن، إيرلندا" ]] },
    { h: "طبيعة النشاط", body: ["نشر برنامج بصيغة SaaS يسمح بإنشاء اختبارات تفاعلية، جذب عملاء محتملين مؤهلين، والمزامنة مع أدوات التسويق الخاصة بالمبدع."] },
    { h: "الملكية الفكرية", body: ["الاسم والعلامة التجارية Tiquiz® والشعار والواجهات والكود وجميع المحتويات محمية. يُمنع أي نسخ أو تمثيل أو تعديل أو استغلال، كلي أو جزئي، بدون إذن كتابي."] },
    { h: "المحتوى المُولَّد بالذكاء الاصطناعي", body: ["قد تحتوي الاختبارات والعناوين والأسئلة والنتائج المُولَّدة بالذكاء الاصطناعي على أخطاء أو تقريبات. يظل المستخدم مسؤولاً عن مراجعتها واستخدامها."] },
    { h: "المسؤولية", body: [`تُخلي ${C.name} مسؤوليتها في حالة الأضرار غير المباشرة، لا سيما خسارة الأرباح، فقدان البيانات، أو الإضرار بالصورة.`] },
    { h: "الاختصاص القضائي", body: ["القانون الفرنسي قابل للتطبيق. بالنسبة للمحترفين، الاختصاص الحصري لمحاكم محكمة استئناف مونبلييه."] },
  ],
};

export const legal: Record<string, LegalPage> = { fr, en, es, it, ar };
