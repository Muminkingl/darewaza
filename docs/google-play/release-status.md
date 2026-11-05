# Closed testing — 2026-11-02

Update prepared on 2026-11-05: Android **version code 5** adds matching part icons, BMW 530i 2023 final-item pages, generated-preview captions and device-local bookmarks. See `../bmw-530i-2023.md` and `../bookmark-performance.md`. Version 5 **has not been submitted to Google Play**. The closed-test submission described below remains version 3. Earlier prepared builds remain under ignored `artifacts/google-play/version-3/` and `version-4/`; the latest build is retained under `version-5/`.

Package: `com.trxstudio.darewaza`. Google Play app ID: `4973135236340605463`.

Version 1.0.0, code 2 was approved and made available to selected Alpha testers. Version code 3 was then submitted as a closed-test update, fixing the Saved screen so a removed section disappears immediately. Play Console confirmed **Changes in review** for version 3. No production release was created.

The existing **Internal Testers** email list is selected, containing 27 people. Feedback goes to `contact@trxstudio.xyz`. The initial release covers all selected countries and regions while remaining restricted to invited testers. Testers still need to opt in themselves. At least 12 must remain opted in continuously for 14 days before applying for production access: https://support.google.com/googleplay/android-developer/answer/14151465

The English and Arabic listings are saved with four real Android screenshots each, an app icon and a feature graphic. The optional store website field is empty. Privacy, account deletion, reviewer access, ratings, target audience, ads, Data safety, financial, government, health and category setup were completed in Play Console. Public customer web routes do not serve the mobile app; Vercel retains the Telegram Studio, APIs and policy/deletion resources.

Version 3 passed TypeScript checks, the 20 repository tests, signed artifact and private-credential checks, and 16 KB ELF/ZIP alignment checks. The release APK passed a native save → Saved → remove test, with the row disappearing without reopening the screen. Login/session persistence, manual city selection, catalog navigation and English/Arabic layout were checked in the release APK. Apple sign-in stays hidden until its Supabase provider is enabled.

Ignored local release artifacts: `artifacts/google-play/darewaza-1.0.0.aab`, the release APK, `verification.json`, `version-3-submitted.jpg`, `saved-removal-verified.png` and `final-track.json`. The uploaded version 3 AAB SHA-256 matches the verified local AAB: `08c8e0b8da4bc1d787ce34c73d1b50322d4f4ad7153f559df92f6962569e06ab`.

Real product items and vehicle models were absent during the release checks. Public inventory was not fabricated. Private reviewer bookmarks created during verification were removed afterward.

Future updates must retain the existing upload key in ignored `credentials/` and increase the Android version code. The provided service account accepted staging uploads but denied edit validation/commit after changes; final releases and listings were saved and submitted through the signed-in owner’s Play Console instead. Its account permissions were not changed.
