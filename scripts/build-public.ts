import { mkdir, writeFile, cp } from "node:fs/promises";
import { legalContent } from "../shared/legal";
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const style =
  "*{box-sizing:border-box}body{margin:0;background:#f7f9fc;color:#192d46;font:16px/1.9 system-ui,sans-serif}header,main,footer{max-width:780px;margin:auto;padding:24px}header{display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid #e3eaf2}a{color:#284f87}nav{display:flex;gap:14px;font-size:13px;flex-wrap:wrap}.brand{font-size:25px;font-weight:750;letter-spacing:-1px;text-decoration:none;color:#172d57}h1{font-size:38px;letter-spacing:-1px;line-height:1.4;margin:20px 0}h2{font-size:19px;margin-top:32px}p{color:#63768e}section{padding-bottom:20px}footer{font-size:12px;color:#91a0b2}.button{display:inline-block;background:#172d57;color:#fff;padding:14px 24px;border-radius:14px;text-decoration:none;margin:12px 0}summary{cursor:pointer;font-weight:600;padding:16px 0}.note{background:#ecf4f2;border-radius:16px;padding:20px}";
function page(title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Darewaza · ${escape(title)}"><title>${escape(title)} · Darewaza</title><link rel="icon" href="/brand/favicon.png"><style>${style}</style></head><body><header><a class="brand" href="/app/">Darewaza<span style="color:#72CEBB">.</span></a><nav><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/delete-account">Delete account</a></nav></header><main><h1>${escape(title)}</h1>${body}</main><footer>© 2026 TRX Studio · Darewaza · <a href="mailto:contact@trxstudio.xyz">contact@trxstudio.xyz</a></footer></body></html>`;
}
await mkdir("dist/brand", { recursive: true });
await cp("assets/brand", "dist/brand", { recursive: true });
for (const kind of ["privacy", "terms"] as const) {
  const content = (locale: "en" | "ckb" | "ar") =>
    legalContent[locale][kind]
      .map(
        (p) =>
          `<section><h2>${escape(p.title)}</h2><p>${escape(p.body)}</p></section>`,
      )
      .join("");
  const body = `<p>Updated October 31, 2026</p>${content("en")}<details><summary>کوردی</summary><div lang="ckb" dir="rtl">${content("ckb")}</div></details><details><summary>العربية</summary><div lang="ar" dir="rtl">${content("ar")}</div></details>`;
  await writeFile(
    `dist/${kind}.html`,
    page(kind === "privacy" ? "Privacy policy" : "Terms of use", body),
  );
}
const deletion = `<p>You can permanently delete your Darewaza account and associated data here, even if you no longer have the app installed.</p><div class="note"><strong>What is removed</strong><p>Your account, profile, and saved items are deleted from the active service. Apple authorization is revoked for Apple accounts. This cannot be undone. Operational security logs and backups expire according to our infrastructure providers’ standard retention periods.</p></div><h2>Delete online</h2><p>Open the secure account screen below. Sign in to the account you want to delete, then confirm “Delete permanently”. No app installation is required. If you signed in with Google or Apple, use the same provider.</p><a class="button" href="/app/?action=delete-account">Open secure account deletion</a><h2>Delete in the app</h2><p>Go to Profile → Delete account → Delete permanently.</p><p>Having trouble signing in? Email <a href="mailto:contact@trxstudio.xyz?subject=Darewaza%20account%20deletion">contact@trxstudio.xyz</a> from the address linked to your account for help. We may need to verify account ownership.</p><details><summary>کوردی</summary><p dir="rtl" lang="ckb">بۆ سڕینەوەی هەژماری Darewaza، دوگمەی سەرەوە دابگرە، بچۆ ژوورەوە و سڕینەوە بۆ هەمیشە پشتڕاست بکەرەوە. هەژمار، زانیاری کەسی، پاشەکەوتەکان دەسڕدرێنەوە. لە ئەپەکەش: هەژمار ← سڕینەوەی هەژمار.</p></details><details><summary>العربية</summary><p dir="rtl" lang="ar">لحذف حساب Darewaza اضغط الزر أعلاه، وسجّل الدخول ثم أكّد الحذف النهائي. يُحذف الحساب والملف والمحفوظات. من التطبيق: حسابي ← حذف الحساب.</p></details>`;
await writeFile(
  "dist/delete-account.html",
  page("Delete your account", deletion),
);
console.log("Public privacy, terms, deletion, and brand pages are ready.");
