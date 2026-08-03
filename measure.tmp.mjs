import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto("http://127.0.0.1:3311/visual-test?layout=left&bg=gradient", { waitUntil: "networkidle" });
const r = await p.evaluate(() => {
  const h1 = document.querySelector("h1");
  // le sous-titre = le bloc rich-text juste apres le titre
  const sub = document.querySelector("h1 ~ .tiquiz-rich, h1 ~ p");
  const box = (el) => el ? { w: Math.round(el.getBoundingClientRect().width), left: Math.round(el.getBoundingClientRect().left) } : null;
  return { title: box(h1), subtitle: box(sub), subHtml: sub?.className ?? null };
});
console.log(JSON.stringify(r, null, 2));
await b.close();
