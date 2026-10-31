export type LegalKind = "privacy" | "terms";
type Paragraph = { title: string; body: string };
export const legalContent: Record<
  "ckb" | "en" | "ar",
  Record<LegalKind, Paragraph[]>
> = {
  en: {
    privacy: [
      {
        title: "Who we are",
        body: "Darewaza is a car parts and accessories catalog operated by TRX Studio. For privacy questions or requests, contact contact@trxstudio.xyz.",
      },
      {
        title: "Information we use",
        body: "We use your account ID, email address, sign-in provider, and any name you choose to provide to operate your account. Google or Apple may share your name and email when you sign in. Your saved sections, recent viewing history (up to 100 entries), and language preference are stored with your account. We do not store your Google or Apple password.",
      },
      {
        title: "Location is your choice",
        body: "You can choose a city manually. With your permission, the app uses your foreground location to identify your city. Coordinates are processed on the device or through the operating system’s geocoding service, and are not stored in our database. The selected city is kept on your device. You can change it or revoke location permission in device settings at any time.",
      },
      {
        title: "How information is protected and shared",
        body: "Supabase provides authentication, database, and image storage. Vercel hosts our account service and public pages. These providers process information to operate the service and may process technical information such as IP addresses and security logs. Data may be processed outside your country. We use encrypted connections and account-based database access controls. We do not sell personal information, run advertising, or include third-party advertising or analytics SDKs.",
      },
      {
        title: "Storage and your choices",
        body: "Your account information and saved items are kept until you remove them or delete your account. Recent history is limited to 100 entries and can be cleared in the app. Authentication tokens are stored securely on native devices and in browser storage on the web. Language and selected city are also stored locally. Signing out removes the active session from that device.",
      },
      {
        title: "Delete or access your data",
        body: "In Profile, choose Delete account and confirm to permanently remove your account, profile, saved items, and viewing history from the active service. Apple authorization is revoked for Apple accounts. You can also start deletion at https://darewaza.vercel.app/delete-account. Operational logs and backups may remain for the infrastructure providers’ standard retention periods before expiring; they are not used to restore your deleted account. Contact contact@trxstudio.xyz to request access, correction, or help exercising your privacy rights.",
      },
      {
        title: "Children and changes",
        body: "Darewaza is not intended for children under 13. Contact us if a child has provided personal information. We may update this policy as the service changes and will show the updated date. This policy was last updated on October 31, 2026.",
      },
    ],
    terms: [
      {
        title: "Using Darewaza",
        body: "Darewaza, operated by TRX Studio, helps you discover car parts and accessories and save sections for later. Use the service lawfully and keep your sign-in credentials secure. Contact contact@trxstudio.xyz for support.",
      },
      {
        title: "Catalog and prices",
        body: "Product names, photos, availability, and prices can change. USD and Iraqi dinar prices are independent listings, not currency conversion offers. Confirm compatibility, condition, availability, and the final price with the seller. The current app does not take payments or process orders.",
      },
      {
        title: "Your account",
        body: "Provide accurate account information and do not misuse the service, attempt unauthorized access, or interfere with other users. You can sign out or permanently delete your account in Profile. Your personal saved items and history are private to your account.",
      },
      {
        title: "Content and availability",
        body: "Darewaza branding and interface belong to TRX Studio. Vehicle names and marks belong to their respective owners; their inclusion does not imply affiliation. We work to keep the service accurate and available, but do not guarantee uninterrupted service or the accuracy of every catalog entry.",
      },
      {
        title: "Your rights and changes",
        body: "These terms do not limit rights you have under applicable consumer or privacy law. We may change these terms and will publish the updated version. For questions, disputes, or requests, contact contact@trxstudio.xyz. Last updated October 31, 2026.",
      },
    ],
  },
  ckb: {
    privacy: [
      {
        title: "ئێمە کێین",
        body: "Darewaza کەتەلۆگێکی پارچەی یەدەگ و جوانکاری ئۆتۆمبێلە و لەلایەن TRX Studio بەڕێوە دەبرێت. بۆ پرسیار یان داواکاری تایبەتمەندی: contact@trxstudio.xyz.",
      },
      {
        title: "ئەو زانیارییانەی بەکاریان دەهێنین",
        body: "ناسنامەی هەژمار، ئیمەیڵ، ڕێگای چوونەژوورەوە و ناوی هەڵبژێردراوت بۆ بەڕێوەبردنی هەژمار بەکاردێن. Google یان Apple لەوانەیە ناو و ئیمەیڵەکەت هاوبەش بکەن. پاشەکەوتەکان، دوایین ١٠٠ بەشی بینراو و زمانی هەڵبژێردراو لەگەڵ هەژمارەکەت هەڵدەگیرێن. وشەی نهێنی Google یان Apple هەڵناگرین.",
      },
      {
        title: "شوێن بە هەڵبژاردنی خۆتە",
        body: "دەتوانیت شار بە دەست هەڵبژێریت. بە مۆڵەتی تۆ، شوێنی ئێستات بۆ دۆزینەوەی شار بەکاردێت. کۆئۆردیناتەکان لەسەر ئامێر یان بە خزمەتگوزاری سیستەمی کارپێکردن پرۆسێس دەکرێن و لە داتابەیسەکەمان هەڵناگیرێن. ناوی شار لە ئامێرەکەت هەڵدەگیرێت. هەرکاتێک دەتوانیت بیگۆڕیت یان مۆڵەتی شوێن لە ڕێکخستنی ئامێر لاببەیت.",
      },
      {
        title: "پاراستن و هاوبەشکردن",
        body: "Supabase بۆ چوونەژوورەوە، داتابەیس و وێنەکان بەکاردێت. Vercel خزمەتگوزاری هەژمار و پەڕە گشتییەکان هۆست دەکات. ئەم دابینکەرانە بۆ بەڕێوەبردنی خزمەتگوزاری زانیاری پرۆسێس دەکەن و لەوانەیە IP و تۆماری پاراستن هەڵبگرن. لەوانەیە داتا لە دەرەوەی وڵاتەکەت پرۆسێس بکرێت. پەیوەندی کۆدکراو و دەستگەیشتنی تایبەت بە هەژمار بەکاردەهێنین. زانیاری کەسی نافرۆشین و ڕیکلام یان SDKی ڕیکلام و شیکاری بەکارناهێنین.",
      },
      {
        title: "هەڵگرتن و هەڵبژاردنەکانت",
        body: "زانیاری هەژمار و پاشەکەوتەکانت تا سڕینەوەیان یان سڕینەوەی هەژمار هەڵدەگیرێن. مێژووی بینین تەنها دوایین ١٠٠ تۆمارە و دەتوانیت پاکی بکەیتەوە. تۆکنی چوونەژوورەوە لە ئامێری مۆبایل بە پارێزراوی و لە وێب لە هەڵگرتنی وێبگەڕ هەڵدەگیرێت. زمان و شار لە ئامێرەکەت هەڵدەگیرێن. چوونەدەرەوە دانیشتنی ئەو ئامێرە لادەبات.",
      },
      {
        title: "سڕینەوە و دەستگەیشتن بە داتا",
        body: "لە هەژمار، سڕینەوەی هەژمار هەڵبژێرە و پشتڕاستی بکەرەوە تا هەژمار، زانیاری کەسی، پاشەکەوت و مێژوو لە خزمەتگوزاری چالاک بۆ هەمیشە بسڕدرێنەوە. مۆڵەتی Apple بۆ هەژمارەکانی Apple هەڵدەوەشێتەوە. لە https://darewaza.vercel.app/delete-account یش دەست پێ بکە. تۆمارە تەکنیکی و پاشەکەوتە سیستەمییەکان لەوانەیە تا کۆتایی ماوەی ئاسایی دابینکەرەکان بمێننەوە؛ بۆ گەڕاندنەوەی هەژماری سڕاوە بەکارناهێنرێن. بۆ دەستگەیشتن، ڕاستکردنەوە یان مافەکانی تایبەتمەندی: contact@trxstudio.xyz.",
      },
      {
        title: "منداڵان و گۆڕانکاری",
        body: "Darewaza بۆ منداڵانی خوار ١٣ ساڵ نییە. ئەگەر منداڵێک زانیاری داوە، پەیوەندیمان پێوە بکە. لەگەڵ گۆڕانی خزمەتگوزاری، ئەم سیاسەتە نوێ دەکەینەوە. دوایین نوێکردنەوە: ٣١ی تشرینی یەکەمی ٢٠٢٦.",
      },
    ],
    terms: [
      {
        title: "بەکارهێنانی Darewaza",
        body: "Darewaza لەلایەن TRX Studio بەڕێوە دەبرێت و یارمەتیت دەدات پارچەی یەدەگ و جوانکاری بدۆزیتەوە و پاشەکەوت بکەیت. بە شێوەی یاسایی بەکاری بهێنە و زانیاری چوونەژوورەوەت بپارێزە. پشتگیری: contact@trxstudio.xyz.",
      },
      {
        title: "کەتەلۆگ و نرخ",
        body: "ناو، وێنە، بەردەستی و نرخەکان دەگۆڕێن. نرخەکانی دۆلار و دینار سەربەخۆن و پێشنیاری گۆڕینەوەی دراو نین. گونجان، دۆخ، بەردەستی و نرخی کۆتایی لەگەڵ فرۆشیار پشتڕاست بکەرەوە. ئێستا ئەپەکە پارە وەردەناگرێت و داواکاری کڕین بەڕێوە نابات.",
      },
      {
        title: "هەژمارەکەت",
        body: "زانیاری دروست بەکاربهێنە و خزمەتگوزاری خراپ بەکارمەهێنە، هەوڵی دەستگەیشتنی بێ مۆڵەت مەدە و کێشە بۆ بەکارهێنەرانی دیکە دروست مەکە. لە هەژمار دەتوانیت بچیتە دەرەوە یان هەژمارەکەت بۆ هەمیشە بسڕیتەوە. پاشەکەوت و مێژووت تایبەتن.",
      },
      {
        title: "ناوەڕۆک و بەردەستی",
        body: "براند و ڕووکارەکە موڵکی TRX Studio ن. ناو و نیشانەی ئۆتۆمبێلەکان موڵکی خاوەنەکانیانن و بەکارهێنانیان پەیوەندی هاوبەشی نیشان نادات. هەوڵی دروستی و بەردەستی دەدەین، بەڵام بەردەستی بێ پچڕان و دروستی هەموو تۆمارێک گەرەنتی ناکرێت.",
      },
      {
        title: "ماف و گۆڕانکاری",
        body: "ئەم مەرجانە مافە یاساییەکانت لە بواری کڕیار یان تایبەتمەندی سنووردار ناکەن. لەوانەیە مەرجەکان بگۆڕین و وەشانی نوێ بڵاو بکەینەوە. بۆ پرسیار و داواکاری: contact@trxstudio.xyz. نوێکردنەوە: ٣١ی تشرینی یەکەمی ٢٠٢٦.",
      },
    ],
  },
  ar: {
    privacy: [
      {
        title: "من نحن",
        body: "Darewaza دليل لقطع غيار السيارات والإكسسوارات تديره TRX Studio. للاستفسارات وطلبات الخصوصية: contact@trxstudio.xyz.",
      },
      {
        title: "المعلومات التي نستخدمها",
        body: "نستخدم معرّف الحساب والبريد الإلكتروني ومزود تسجيل الدخول والاسم الذي تختاره لتشغيل حسابك. قد تشارك Google أو Apple اسمك وبريدك عند الدخول. ترتبط المحفوظات وآخر ١٠٠ قسم شاهدته وتفضيل اللغة بحسابك. لا نحفظ كلمة مرور Google أو Apple.",
      },
      {
        title: "الموقع اختياري",
        body: "يمكنك اختيار المدينة يدوياً. بعد إذنك، يستخدم التطبيق موقعك أثناء الاستخدام لتحديد المدينة. تُعالج الإحداثيات على الجهاز أو عبر خدمة الترميز الجغرافي لنظام التشغيل، ولا تُحفظ في قاعدة بياناتنا. تُحفظ المدينة على جهازك. يمكنك تغييرها أو إلغاء إذن الموقع في إعدادات الجهاز.",
      },
      {
        title: "الحماية والمشاركة",
        body: "نستخدم Supabase للمصادقة وقاعدة البيانات والصور، وVercel لخدمة الحساب والصفحات العامة. تعالج هذه الجهات المعلومات لتشغيل الخدمة، وقد تعالج عناوين IP وسجلات الأمان. قد تُعالج البيانات خارج بلدك. نستخدم اتصالات مشفرة وضوابط وصول مرتبطة بالحساب. لا نبيع المعلومات الشخصية ولا نعرض إعلانات ولا نستخدم حزم إعلانات أو تحليلات خارجية.",
      },
      {
        title: "الاحتفاظ وخياراتك",
        body: "نحتفظ ببيانات الحساب والمحفوظات حتى تزيلها أو تحذف الحساب. يقتصر سجل المشاهدة على ١٠٠ عنصر ويمكن مسحه. تُحفظ رموز الدخول بأمان على الأجهزة الأصلية وفي تخزين المتصفح على الويب. تُحفظ اللغة والمدينة محلياً أيضاً. يزيل تسجيل الخروج الجلسة النشطة من ذلك الجهاز.",
      },
      {
        title: "حذف بياناتك أو الوصول إليها",
        body: "من حسابي اختر حذف الحساب وأكّد لإزالة الحساب والملف والمحفوظات والسجل نهائياً من الخدمة النشطة. يُلغى تفويض Apple لحسابات Apple. يمكنك بدء الحذف أيضاً من https://darewaza.vercel.app/delete-account. قد تبقى السجلات التشغيلية والنسخ الاحتياطية حتى انتهاء مدد الاحتفاظ المعتادة لمزودي البنية التحتية، ولا تُستخدم لاستعادة حسابك المحذوف. لطلبات الوصول أو التصحيح أو المساعدة في حقوق الخصوصية: contact@trxstudio.xyz.",
      },
      {
        title: "الأطفال والتغييرات",
        body: "Darewaza غير مخصص للأطفال دون ١٣ عاماً. تواصل معنا إذا قدّم طفل معلومات شخصية. قد نحدّث هذه السياسة مع تغير الخدمة وسنعرض تاريخ التحديث. آخر تحديث: ٣١ أكتوبر ٢٠٢٦.",
      },
    ],
    terms: [
      {
        title: "استخدام Darewaza",
        body: "تدير TRX Studio تطبيق Darewaza لاكتشاف قطع الغيار والإكسسوارات وحفظ الأقسام. استخدم الخدمة بصورة قانونية واحمِ بيانات الدخول. للدعم: contact@trxstudio.xyz.",
      },
      {
        title: "الدليل والأسعار",
        body: "قد تتغير الأسماء والصور والتوفر والأسعار. أسعار الدولار والدينار العراقي مستقلة وليست عروض تحويل عملات. تأكد من التوافق والحالة والتوفر والسعر النهائي مع البائع. لا يستقبل التطبيق حالياً مدفوعات أو طلبات شراء.",
      },
      {
        title: "حسابك",
        body: "قدّم معلومات صحيحة ولا تسيء استخدام الخدمة أو تحاول الوصول غير المصرح به أو تعطيل المستخدمين الآخرين. يمكنك تسجيل الخروج أو حذف الحساب نهائياً من حسابي. محفوظاتك وسجلك خاصان بحسابك.",
      },
      {
        title: "المحتوى والتوفر",
        body: "علامة Darewaza وواجهته تخص TRX Studio. أسماء وعلامات السيارات تخص أصحابها ولا يعني إدراجها وجود شراكة. نعمل على دقة الخدمة وتوفرها دون ضمان عدم انقطاعها أو دقة كل بيانات الدليل.",
      },
      {
        title: "حقوقك والتغييرات",
        body: "لا تحد هذه الشروط من حقوق المستهلك أو الخصوصية المقررة قانوناً. قد نغير الشروط وننشر النسخة المحدّثة. للأسئلة أو الطلبات: contact@trxstudio.xyz. آخر تحديث: ٣١ أكتوبر ٢٠٢٦.",
      },
    ],
  },
};
