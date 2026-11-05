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
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Darewaza · ${escape(title)}"><title>${escape(title)} · Darewaza</title><link rel="icon" href="/brand/favicon.png"><style>${style}</style></head><body><header><span class="brand">Darewaza<span style="color:#72CEBB">.</span></span><nav><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/delete-account">Delete account</a></nav></header><main><h1>${escape(title)}</h1>${body}</main><footer>© 2026 TRX Studio · Darewaza · <a href="mailto:contact@trxstudio.xyz">contact@trxstudio.xyz</a></footer></body></html>`;
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
  const body = `<p>Updated ${kind === "privacy" ? "November 5, 2026" : "November 1, 2026"}</p>${content("en")}<details><summary>کوردی</summary><div lang="ckb" dir="rtl">${content("ckb")}</div></details><details><summary>العربية</summary><div lang="ar" dir="rtl">${content("ar")}</div></details>`;
  await writeFile(
    `dist/${kind}.html`,
    page(kind === "privacy" ? "Privacy policy" : "Terms of use", body),
  );
}
const deletion = `<p>Request permanent deletion of your Darewaza account and associated data, even if you no longer have the mobile app installed.</p>
<section id="delete-account"><h2>Request account deletion</h2><p>Email <a href="mailto:contact@trxstudio.xyz?subject=Darewaza%20account%20deletion">contact@trxstudio.xyz</a> from the email address linked to your Darewaza account. Use the subject “Darewaza account deletion” and say that you want your account and associated data permanently deleted. Do not send your password. We may verify account ownership and will confirm when your request is completed.</p><a class="button" href="mailto:contact@trxstudio.xyz?subject=Darewaza%20account%20deletion">Request account deletion by email</a><p>No app installation or website account is required to submit a request.</p></section>
<div class="note"><strong>What is removed</strong><p>Your account, profile, saved cars, selected-car preference, and saved items are deleted from the active service. Apple authorization is revoked for Apple accounts. This cannot be undone. Deleting from the app also clears local bookmarks on that device. To erase bookmarks on another device, remove them there or clear that app’s storage. We cannot remotely erase offline device storage by email. Operational security logs and backups expire according to our infrastructure providers’ standard retention periods.</p></div>
<h2>Delete immediately in the mobile app</h2><p>Go to Profile → Delete account → Delete permanently.</p>
<details><summary>کوردی</summary><p dir="rtl" lang="ckb">بۆ داواکاری سڕینەوەی هەژماری Darewaza و داتا پەیوەندیدارەکان، لە ئیمەیڵی هەژمارەکەتەوە نامە بۆ contact@trxstudio.xyz بنێرە. وشەی نهێنی مەبنێرە. پێویستت بە دامەزراندنی ئەپەکە نییە. لە ئەپی مۆبایل بۆ سڕینەوەی ڕاستەوخۆ: هەژمار ← سڕینەوەی هەژمار ← سڕینەوە بۆ هەمیشە.</p></details>
<details><summary>العربية</summary><p dir="rtl" lang="ar">لطلب حذف حساب Darewaza والبيانات المرتبطة به، أرسل رسالة من بريد حسابك إلى contact@trxstudio.xyz بعنوان Darewaza account deletion. لا ترسل كلمة مرورك. لا يلزم تثبيت التطبيق لتقديم الطلب. للحذف المباشر من تطبيق الهاتف: حسابي ← حذف الحساب ← الحذف النهائي.</p></details>`;
const partialDeletion = `<section id="delete-data"><h2>Delete saved data without closing your account</h2><p>You can remove a saved car from My cars → the car’s menu → Remove car. Remove a saved item by turning off its bookmark in Saved. Removing a saved car deletes its account record. In the current app version, removing a bookmark deletes it from that device only; bookmarks do not synchronize across devices. These actions keep your sign-in available.</p><p>To request deletion of some or all saved data without closing your account, email us from your account email address. Tell us which saved cars, saved items or profile details you want removed. We may verify account ownership before processing the request.</p><a class="button" href="mailto:contact@trxstudio.xyz?subject=Darewaza%20saved%20data%20deletion">Request saved-data deletion</a><p dir="rtl" lang="ckb">بۆ سڕینەوەی داتای پاشەکەوتکراو بەبێ داخستنی هەژمار، لە ئیمەیڵی هەژمارەکەتەوە پەیوەندی بە contact@trxstudio.xyz بکە و ئەو داتایە دیاری بکە کە دەتەوێت بسڕدرێتەوە.</p><p dir="rtl" lang="ar">لحذف بيانات محفوظة دون إغلاق الحساب، أرسل طلباً من بريد حسابك إلى contact@trxstudio.xyz وحدد البيانات التي تريد حذفها.</p></section>`;
await writeFile(
  "dist/delete-account.html",
  page("Delete your account or saved data", deletion + partialDeletion),
);
console.log("Public privacy, terms, deletion, and brand pages are ready.");
