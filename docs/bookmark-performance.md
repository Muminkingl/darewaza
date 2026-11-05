# Local bookmarks and catalog performance

Bookmarks now live in AsyncStorage on the device, separated by signed-in account. The user explicitly chose an empty local Saved list: there is no cloud import, cloud synchronization, membership query, Saved query or Saved-count query in the customer app. Existing server records from older releases are retained; no customer database rows were deleted.

A tap updates memory immediately and queues only the changed local record. Rapid repeated taps are coalesced, disk writes stay ordered, edits during hydration are preserved, and a failed write can be retried. Rows subscribe to their own bookmark IDs. The Saved list and counters update locally; opening Saved does not fetch Supabase data. Account deletion in the app also removes that account's local bookmark records. Signing out keeps them for the same account on that device. Clearing app data or uninstalling removes them.

Cached catalog pages are reused when navigating back. Pagination no longer revalidates page one when loading another page, repeated load-more events are guarded, and flattened result arrays are memoized. Catalog queries request display fields without generated search text or import provenance. Browser focus changes no longer cause requests; active data refreshes after the app has been in the background for at least a minute. Pull-to-refresh remains available. Product details and compatibility can still refresh when opened or explicitly refreshed.

Verification completed before the user requested no further checking:

- TypeScript checks and all 35 tests passed, including offline persistence, rapid taps, hydration races, account isolation, storage failure/retry and local cleanup after queued writes.
- The actual local app reported zero additional Supabase fetches after saving a bookmark, opening Saved and removing it.
- The saved item survived a full page reload, and the Home count restored to 1 from device storage. Verification bookmarks were removed, leaving the local list empty.
- A model's first catalog page required one request. The redundant pagination/focus paths were removed; no broad load test was performed.
- Temporary request logging was removed. Three pre-existing React Native Web direction-style warnings were addressed without changing native direction styles.

The changes are in source and the running local development app. Previously built Android version 4 APK/AAB files do not contain this change; a new native build is needed for installed apps. Google Play testing was not changed. Public privacy/deletion text now describes device-local bookmarks; customer web hosting remains disabled.
