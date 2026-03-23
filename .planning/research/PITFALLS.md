# Pitfalls Research

**Domain:** Offline-First PWA POS (Point of Sale) — iPad/iOS, fair trade church stand
**Researched:** 2026-03-23
**Confidence:** HIGH (iOS/Safari limitations), MEDIUM (PDF parsing, sync conflicts), HIGH (touch UX)

---

## Critical Pitfalls

### Pitfall 1: Safari Transactions Auto-Close During Async/Promise Chains

**What goes wrong:**
IndexedDB transactions on Safari auto-commit if nothing happens to the transaction in the current stack frame. When code uses `await` or `Promise.then()` between opening a transaction and performing reads/writes, Safari considers the transaction done and closes it — silently. The write never happens. Data loss occurs without any thrown error.

**Why it happens:**
Safari's WebKit implements stricter transaction lifetime rules than Chrome. Developers test on Chrome (where transactions survive awaits) and only discover the bug on the target device (iPad).

**How to avoid:**
Never `await` anything between `transaction.objectStore()` and the actual `.put()` / `.get()` / `.add()` calls. Perform all reads and writes synchronously within a single transaction chain. Use a library like **Dexie.js** (which wraps IndexedDB and explicitly handles Safari's quirks) instead of raw IndexedDB.

**Warning signs:**
- Data disappears intermittently on iPad but not on Chrome DevTools
- Console shows no errors when writes fail
- Inventory counts are correct in Chrome but wrong after syncing from iPad

**Phase to address:**
Phase 1 (Data Layer / Offline Core) — Choose Dexie.js from day one. Never use raw IndexedDB.

---

### Pitfall 2: Storage Not Shared Between Safari Browser and Home Screen PWA

**What goes wrong:**
If a user sets up the app in Safari browser and then installs it to the Home Screen, the installed PWA has completely separate IndexedDB storage. All data entered in Safari is invisible from the Home Screen app. The user sees an empty, broken app.

**Why it happens:**
Safari treats the browser context and the standalone Home Screen context as different origins for storage purposes. This is intentional Apple behavior, not a bug.

**How to avoid:**
From the very first onboarding, instruct users to **add to Home Screen first, then open and use only from there**. Never test or enter production data in Safari browser if the app will be used from Home Screen. Show a prominent banner in Safari browser view explaining this limitation and prompting installation.

**Warning signs:**
- "Meine Daten sind weg" after installing to Home Screen
- Different article counts visible in Safari vs. Home Screen

**Phase to address:**
Phase 1 (PWA Setup / Install Flow) — Add install detection on first load. Show clear install prompt with explanation.

---

### Pitfall 3: StorageManager.persist() Not Called — Data Eviction Under Storage Pressure

**What goes wrong:**
On iOS, when the device runs low on storage, the OS can silently evict PWA data (IndexedDB, Cache Storage) without warning. For a POS app used at a church fair, this could mean losing all inventory and sales data between uses.

**Why it happens:**
Without calling `navigator.storage.persist()`, the PWA's storage is marked as "best-effort" and eligible for eviction. iOS grants persistent storage to Home Screen PWAs based on heuristics, but this is not guaranteed without explicitly requesting it.

**How to avoid:**
Call `navigator.storage.persist()` during app initialization and check the result. If denied, show a warning. Supplement with a server sync so local storage is never the sole copy of critical data.

**Warning signs:**
- Reports of "alles weg" after the iPad sat unused for a while
- App works normally but inventory/sales history is reset

**Phase to address:**
Phase 1 (Data Layer) — Request persistent storage on first launch. Log result. Add fallback warning UI.

---

### Pitfall 4: No Background Sync on iOS — Silent Sync Failure

**What goes wrong:**
The Background Sync API (`SyncManager`) is not supported on iOS/Safari. If the app relies on a registered background sync task to push offline changes to the server, those tasks simply never fire on iPad. Data piles up in the local queue indefinitely — or gets lost — without the user knowing.

**Why it happens:**
Developers build and test Background Sync on Chrome/Android where it works, then discover the iPad (primary device for this project) never syncs.

**How to avoid:**
Do not use Background Sync API at all. Instead, implement **sync-on-foreground**: every time the app becomes visible (`visibilitychange` event, `online` event), run the sync routine explicitly. This is the correct iOS strategy.

**Warning signs:**
- Chrome shows sync working; iPad does not push changes to server
- `ServiceWorkerRegistration.sync` is undefined in Safari console

**Phase to address:**
Phase 2 (Sync Engine) — Design sync around `online` event and `visibilitychange`, not Background Sync API.

---

### Pitfall 5: Inventory Conflict — Last-Write-Wins Overwrites Stock Counts

**What goes wrong:**
If two devices (e.g., iPad + iPhone) are used simultaneously offline and both sell the last unit of a product, then sync independently, the final stock count becomes incorrect. "Last write wins" means one sale erases the other's inventory decrement. Stock shows 1 instead of -1 (oversold), or shows wrong absolute value.

**Why it happens:**
Naive sync implementations store the current stock value and send it to the server. When two offline deltas arrive, the server takes the last one. The correct approach is to sync **deltas** (e.g., "sold 1 unit"), not absolute values.

**How to avoid:**
Never sync stock as an absolute value. Always sync as **events/deltas**: `{ type: "sale", product_id: "X", quantity: 1, timestamp: ... }`. The server accumulates events and derives current stock. This is event sourcing and it's the correct model for inventory systems with offline clients.

**Warning signs:**
- Stock counts drift after periods of multi-device use
- Counts after sync differ from what both devices show individually

**Phase to address:**
Phase 2 (Sync Engine) and Phase 1 (Data Model) — Design the data model with event/delta records from day one.

---

### Pitfall 6: Service Worker Serving Stale App Version After Deployment

**What goes wrong:**
After deploying an update (e.g., a price correction, a bug fix), the installed Home Screen PWA continues showing the old version indefinitely. Users never see updates. On iOS, this is worse than Chrome — the old service worker can persist even through hard-reloads.

**Why it happens:**
The new service worker installs but waits for the old one to release all clients before activating. Without explicit `skipWaiting()` + `clients.claim()` and an in-app update prompt, the old version stays active until the user closes and reopens the app (which may never happen for a persistent Home Screen app).

**How to avoid:**
Implement an explicit update flow: detect new service worker waiting, show an in-app banner ("Update verfügbar — Neu laden"), and call `skipWaiting()` on user confirmation. Use Workbox's `workbox-window` for this pattern. Do **not** rely on automatic activation.

**Warning signs:**
- After deployment, users report old UI or behavior
- DevTools shows "waiting" service worker that never activates
- "Version" indicator in app shows old number

**Phase to address:**
Phase 1 (PWA / Service Worker Setup) — Build update detection and prompt from the start with Workbox.

---

### Pitfall 7: PDF Table Parsing — Column Misalignment on Coordinate-Based Layout

**What goes wrong:**
The Süd-Nord-Kontor invoices are PDFs. Simple text-extraction libraries (pdf-parse, basic pdfjs-dist text layer) output text in reading order but lose spatial/column relationships. "EVP 2,95" may appear adjacent to the wrong article. The parser maps prices to wrong products, resulting in incorrect EK/VK prices being imported.

**Why it happens:**
PDF is not a table format. Tables in PDFs are just text elements with X/Y coordinates. A library that outputs a flat text stream loses column boundaries. Invoice tables with varying column widths, wrapped text in description fields, or multi-line rows are especially fragile.

**How to avoid:**
Use a **coordinate-aware** parser: `pdf2json` (preserves X/Y positions) or `pdfjs-dist` with direct access to the text content items and their `transform` matrices. Group text items by Y-coordinate (rows) then sort by X (columns). Always implement a **review step** after parsing — never auto-import without showing the user what was parsed and allowing correction.

**Warning signs:**
- Prices land in the wrong column in the preview table
- Articles with similar names get each other's EVP
- Parsed row count differs from visible rows on the PDF

**Phase to address:**
Phase 3 (Rechnungsimport) — Build coordinate-aware parser. Mandatory review/edit step before committing to inventory.

---

### Pitfall 8: Virtual Keyboard Covers Input Fields on iPad

**What goes wrong:**
When the user taps a numeric input (Bezahlt-Betrag eingeben), the virtual keyboard appears and shifts the viewport. On Safari/iOS PWA standalone mode, the viewport resize behavior differs from Chrome — the keyboard may cover the input and the user cannot see what they type. The "Wechselgeld" calculation panel below the input field disappears behind the keyboard.

**Why it happens:**
Safari/iOS does not fire `resize` events reliably when the software keyboard appears in standalone PWA mode. The `window.visualViewport` API is the correct approach, but many frameworks and CSS layouts assume a stable viewport.

**How to avoid:**
Use `window.visualViewport.addEventListener('resize', ...)` to detect keyboard appearance and scroll/adjust the active element into view. Use `inputmode="decimal"` or `inputmode="numeric"` for cash amount inputs to get the numeric keyboard without triggering text-mode suggestions. Pin the input and result display as a sticky bottom section that accounts for the keyboard height.

**Warning signs:**
- Tapping the Betrag-Eingabe field and not seeing the cursor
- Wechselgeld display disappears when keyboard is open
- User has to scroll down to see what they typed

**Phase to address:**
Phase 1 (Kassen-UI) and Phase 2 (UX Polish) — Test on physical iPad from first prototype. Use `visualViewport` from day one.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Raw IndexedDB without Dexie.js | No dependency | Silent transaction failures on Safari; untestable async logic | Never — Dexie is lightweight and essential |
| Sync stock as absolute values | Simpler server API | Incorrect inventory counts after multi-device offline use | Never for stock quantities |
| Skip the parse review step | Faster import UX | Wrong prices imported silently; trust in data destroyed | Never — review step is mandatory |
| Cache everything with cache-first | Full offline capability | Stale UI that never updates; users run old broken code | Never for app shell — use network-first for API data |
| Test only in Chrome DevTools | Fast development | Safari-specific IndexedDB bugs found late | Only in early wireframe stage, never for data layer |
| localStorage for sales data | Simplest API | No transactions, synchronous blocking, 5MB limit | Never for structured/relational data |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Süd-Nord-Kontor PDF | Use pdf-parse (text stream only) | Use pdfjs-dist with coordinate extraction or pdf2json; always show parsed result for review |
| Server sync API | Send full state snapshots | Send delta events with timestamps and device IDs for conflict-safe reconciliation |
| E-Mail report sending | Client-side email via `mailto:` | Server-side triggered send (cron or on-demand API call) — `mailto:` is unreliable on iPad |
| iOS Home Screen install | Assume browser prompt appears | Manual "Share → Zum Home-Bildschirm" flow required; show persistent custom install banner in Safari |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Opening IndexedDB transaction per sale item | Slow cart performance on older iPads | Batch all cart items into one transaction per checkout | At 10+ items in cart |
| Loading entire sales history into memory for reports | Reports take 5+ seconds, app freezes | Use IndexedDB cursor with aggregation; never `getAll()` on large datasets | At 500+ sales records |
| Parsing large PDF client-side | Browser tab freezes during import | Parse server-side (already planned); never parse client-side | Any PDF over 2MB |
| Re-rendering full article grid on every state change | Visible lag when tapping articles | Memoize article grid; only re-render cart section on state change | At 30+ articles |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Tap targets smaller than 44×44pt | Repeated mis-taps during live sales; frustration | Minimum 48×48px for all interactive elements; 56px+ for primary actions |
| No visible offline indicator | User unaware data isn't syncing; proceeds assuming server is updated | Show persistent offline badge in header; sync status always visible |
| Confirmation dialogs for every sale | Kills throughput at post-Gottesdienst rush | No confirmation for standard sale; one-tap Verkaufsabschluss; undo within 5 seconds instead |
| Numeric input showing full keyboard | Slower amount entry; wrong input type | `inputmode="decimal"` for Betrag; shows numeric pad immediately |
| No feedback after successful sale | User taps again accidentally, creating duplicate | Clear visual success state (green flash, cart reset) after every Abschluss |
| Warenkorb not showing running total prominently | Cashier has to calculate mentally | Total always in large type, always visible above the fold |

---

## "Looks Done But Isn't" Checklist

- [ ] **Offline Mode:** Works in Chrome DevTools offline — verify on physical iPad with airplane mode active
- [ ] **IndexedDB Transactions:** No `await` between transaction open and write — verify Dexie.js is used for all writes
- [ ] **Service Worker Update:** New deployment triggers visible update prompt — verify by deploying a version bump and checking on iPad
- [ ] **PDF Import:** All columns parse correctly — verify with a real Süd-Nord-Kontor invoice (not a dummy PDF)
- [ ] **Stock Delta Sync:** Selling same item from two devices offline produces correct combined count after sync — verify with two-device test
- [ ] **Home Screen Install:** Data persists after installing to Home Screen — verify by entering data in Safari, installing, opening from Home Screen
- [ ] **Keyboard UX:** Betrag input field and Wechselgeld display visible when keyboard open — verify on physical iPad, not simulator
- [ ] **StorageManager.persist():** Called on first launch and result logged — verify in Safari Web Inspector
- [ ] **Sync on Foreground:** Turning airplane mode off while app is open triggers sync — verify with network throttling

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Safari transaction bug discovered late | HIGH | Refactor all IndexedDB calls to Dexie.js; regression test all data operations on physical iPad |
| Storage eviction wipes local data | MEDIUM | Restore from server sync; implement daily auto-export to server as backup; call `persist()` immediately |
| Stale service worker blocking update | LOW | Document force-update steps for users (remove from Home Screen, clear Safari data, reinstall) |
| PDF parsing assigns wrong prices | MEDIUM | Re-run import with coordinate-aware parser; review step catches errors before commit — no data loss if review gate is enforced |
| Inventory count drift from naive sync | HIGH | Migrate to event/delta model; replay events to reconstruct correct counts; requires server-side migration |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| IndexedDB Safari transaction auto-close | Phase 1: Data Layer | Physical iPad test: write data through await chain; confirm data persists |
| Storage/origin split Safari vs. Home Screen | Phase 1: PWA Setup | Install to Home Screen; verify data from browser session is absent (expected) and install flow guidance is clear |
| StorageManager.persist() not called | Phase 1: Data Layer | Safari Web Inspector → Storage → confirm "persistent" flag |
| No Background Sync on iOS | Phase 2: Sync Engine | Airplane mode on; make sales; come back online; confirm sync fires without closing app |
| Inventory conflict / last-write-wins | Phase 1: Data Model + Phase 2: Sync | Two-device offline test; sell same item; sync; check server stock count |
| Stale service worker after deploy | Phase 1: PWA Setup | Deploy version bump; open app on iPad; confirm update banner appears |
| PDF column misalignment | Phase 3: Rechnungsimport | Import real Süd-Nord-Kontor PDF; verify all prices and article numbers in review table |
| Virtual keyboard covers inputs | Phase 1: Kassen-UI | Tap Betrag field on physical iPad; confirm Wechselgeld display remains visible |

---

## Sources

- [PWA iOS Limitations and Safari Support [2026] — MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [IndexedDB on Safari — Dexie.js Documentation](https://dexie.org/docs/IndexedDB-on-Safari)
- [WebKit Bug 190269 — Service Worker cache disappears unexpectedly](https://bugs.webkit.org/show_bug.cgi?id=190269)
- [WebKit Bug 266559 — Safari periodically erasing LocalStorage and IndexedDB](https://bugs.webkit.org/show_bug.cgi?id=266559)
- [Updates to Storage Policy — WebKit Blog](https://webkit.org/blog/14403/updates-to-storage-policy/)
- [Downsides of Offline-First / Local-First — RxDB](https://rxdb.info/downsides-of-offline-first.html)
- [The pain and anguish of using IndexedDB — pesterhazy GitHub Gist](https://gist.github.com/pesterhazy/4de96193af89a6dd5ce682ce2adff49a)
- [Handling Service Worker updates — whatwebcando.today](https://whatwebcando.today/articles/handling-service-worker-updates/)
- [Navigating Safari/iOS PWA Limitations — Vinova SG](https://vinova.sg/navigating-safari-ios-pwa-limitations/)
- [PWA iOS Safari Data Persistence Beyond 7 Days — Apple Developer Forums](https://developer.apple.com/forums/thread/710157)
- [Offline-first frontend apps 2025: IndexedDB and SQLite — LogRocket](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [7 PDF Parsing Libraries for Node.js — Strapi Blog](https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025)
- [Touch Target Sizes — NN/Group](https://www.nngroup.com/articles/touch-target-size/)
- [Data Synchronization in PWAs — GTCSys](https://gtcsys.com/comprehensive-faqs-guide-data-synchronization-in-pwas-offline-first-strategies-and-conflict-resolution/)
- [Do PWA Background Sync work on iOS — Apple Developer Forums](https://developer.apple.com/forums/thread/694805)

---
*Pitfalls research for: Offline-First PWA POS — Fairstand Kirchengemeinde St. Secundus*
*Researched: 2026-03-23*
