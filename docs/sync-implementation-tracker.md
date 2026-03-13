# Cortex Sync — Implementation Tracker

Tracks progress across all sync implementation phases. See `docs/cortex_desktop_sync_spec.md` and `docs/cortex_sync_extended_crdt_spec.md` for full specs.

---

## Phase 0: Rust Foundation — Keychain + Device Identity + SQLite ✅ COMPLETE

### Rust
- [x] `src-tauri/src/keychain/mod.rs` — Cross-platform keychain via `keyring` crate (`set`, `get`, `delete`)
- [x] `src-tauri/src/device/mod.rs` — Device identity (UUID generation + persistence)
- [x] `src-tauri/src/sync/db.rs` — SQLite sync.db (rusqlite, `sync_state` table, full CRUD)
- [x] `src-tauri/src/commands/keychain.rs` — `keychain_set`, `keychain_get`, `keychain_delete`
- [x] `src-tauri/src/commands/device.rs` — `get_device_id`, `get_device_info`
- [x] Update `Cargo.toml` — rusqlite, keyring, gethostname, aes-gcm, rand, reqwest, jsonwebtoken all present
- [x] Update `lib.rs` — all commands registered, mod declarations in place

### TypeScript
- [x] `packages/platform/src/interfaces/Keychain.ts` — Keychain interface
- [x] `packages/platform/src/interfaces/Device.ts` — Device interface + `DeviceInfo` type
- [x] `packages/ipc/src/Keychain.ts` — IPC wrapper (invoke for set/get/delete)
- [x] `packages/ipc/src/Device.ts` — IPC wrapper (invoke for both methods)
- [x] Update `packages/platform/src/index.ts` — exports Keychain, Device, Auth, Sync; Platform interface includes all adapters
- [x] Update `packages/ipc/src/tauriPlatform.ts` — wires all adapters including keychain, device, auth, sync

### Verification
- [ ] `get_device_id` returns same UUID across calls
- [ ] Keychain set/get/delete works from frontend

---

## Phase 1: Auth — HTTP Client + Token Management ✅ COMPLETE

### Rust
- [x] `src-tauri/src/sync/http.rs` — `SyncHttpClient` (reqwest, auto 401 token refresh, JWT expiry pre-check, server URL from keychain)
- [x] `src-tauri/src/sync/auth.rs` — login (stores tokens + user_id/email in keychain), register, logout, get_auth_status, get_current_user
- [x] `src-tauri/src/commands/auth.rs` — `auth_login`, `auth_register`, `auth_logout`, `auth_get_status`, `auth_get_current_user`
- [x] Update `Cargo.toml` — reqwest + jsonwebtoken present
- [x] Register auth commands in lib.rs

### TypeScript
- [x] `packages/platform/src/interfaces/Auth.ts` — `LoginResult`, `RegisterResult`, `AuthStatus`, `CurrentUser`, `Auth` interface
- [x] `packages/ipc/src/Auth.ts` — IPC wrapper for all 5 methods
- [x] `packages/core/src/stores/authStore.ts` — Zustand+Immer store (`checkAuth`, `login`, `register`, `logout`, `clearError`)
- [x] `apps/desktop/src/features/auth/LoginPage.tsx` — full form with server URL, email, password
- [x] `apps/desktop/src/features/auth/RegisterPage.tsx` — full form with validation (password match, min 8 chars)
- [x] `apps/desktop/src/features/auth/AuthGuard.tsx` — `checkAuth()` on mount, routes to Login/Register if unauthenticated
- [x] Update Platform interface + tauriPlatform — auth wired in both

### Verification
- [ ] Register + login flow works
- [ ] Tokens persist in keychain across app restart
- [ ] Token refresh happens transparently on expiry

---

## Phase 2: Sync Engine Core — State Machine + Queue + Watcher Bridge ✅ COMPLETE

### Rust
- [x] `src-tauri/src/sync/mod.rs` — Declares all 11 submodules (auth, crypto, db, downloader, engine, http, ignore, queue, sse, state, uploader)
- [x] `src-tauri/src/sync/state.rs` — `SyncEngineState` enum (Idle/Authenticating/Connecting/Syncing/Live/Offline/Recovering) + `SyncCommand` enum
- [x] `src-tauri/src/sync/queue.rs` — `BinaryHeap` priority queue; `SyncOp` variants (Upload/Download/Delete/Rename/ResolveConflict/InitialSync) with factory methods
- [x] `src-tauri/src/sync/engine.rs` — Full async event loop consuming `SyncCommand` via `mpsc::Receiver`; handles Start (opens DB, derives VEK, starts SSE), Stop, LocalFileChanged (5s debounce), ForceSyncFile, Remote events; emits `sync-file-event` + `sync-state-changed` Tauri events
- [x] `src-tauri/src/commands/sync.rs` — `sync_start`, `sync_stop`, `sync_force_sync_file`
- [x] Update `lib.rs` — engine spawned in setup(), mpsc Sender stored via `app.manage()`
- [x] Update `watcher.rs` — sends `SyncCommand::LocalFileChanged` to engine channel for every non-`.cortex` file event

### TypeScript
- [x] `packages/platform/src/interfaces/Sync.ts` — `SyncEngineState`, `SyncStateEvent`, `SyncFileEvent`, `Sync` interface (start/stop/forceSyncFile/onStateChanged/onFileEvent)
- [x] `packages/ipc/src/Sync.ts` — IPC wrapper (invoke for commands, `listen()` for events)
- [x] `packages/core/src/stores/syncStore.ts` — Zustand+Immer store (`startSync`, `stopSync`, `forceSyncFile`, `subscribeEvents`, `unsubscribeEvents`; tracks `engineState`, `syncingFiles`, `lastSyncedAt`)
- [ ] `packages/sync-client/package.json` — **NOT CREATED** — sync store lives in `@cortex/core` instead
- [ ] `packages/sync-client/src/index.ts` — **NOT CREATED**
- [ ] `packages/sync-client/src/eventBridge.ts` — **NOT CREATED** — event subscription is part of syncStore directly

### Verification
- [ ] Engine starts → state transitions visible in syncStore
- [ ] File watcher changes reach engine via mpsc channel

---

## Phase 3: SSE + File Upload/Download + E2EE ✅ COMPLETE

### Rust
- [x] `src-tauri/src/sync/crypto.rs` — AES-256-GCM: `generate_vek`, `store_vek`/`load_vek` (base64 in keychain), `get_or_create_vek`, `encrypt` (12-byte nonce prefix), `decrypt`
- [x] `src-tauri/src/sync/sse.rs` — SSE client: exponential backoff (1s→60s, max 5 failures), parses wire format, handles file_created/updated/deleted/renamed/ping, filters own-device events, tracks `Last-Event-ID`
- [x] `src-tauri/src/sync/uploader.rs` — Hash check → AES-GCM encrypt → POST `/sync/v1/vaults/{id}/files` with `X-File-Path` + `X-Local-Hash` headers → updates sync_state DB
- [x] `src-tauri/src/sync/downloader.rs` — GET + decrypt → write to disk (creates dirs) → DB update; also `delete_local_file`, `rename_local_file`
- [x] `src-tauri/src/sync/ignore.rs` — `should_ignore()` skips `.cortex/`, `.DS_Store`, `Thumbs.db`, `desktop.ini`
- [x] Wire SSE + uploader + downloader into engine.rs
- [x] Update `Cargo.toml` — add `dmp` crate (added in Phase 4)

### TypeScript
- [x] `apps/desktop/src/features/sync/SyncIndicator.tsx` — reads `engineState`+`syncingFiles` from `useSyncStore`; shows icon+label per state; returns null when idle
- [x] Update syncStore — per-file status tracking via `syncingFiles` record
- [ ] Update eventBridge — **N/A** (event subscription is in syncStore, not a separate bridge)
- [ ] Update noteCache.ts — handle sync-pre-write → snapshot → ack — **NOT DONE**

### Verification
- [ ] Local file change → encrypted upload to server
- [ ] Remote file change → SSE event → encrypted download
- [ ] Server stores only encrypted blobs (verify via API)
- [ ] X-Local-Hash deduplication prevents unnecessary uploads

---

## Phase 4: Initial Sync + Conflict Resolution ✅ COMPLETE

### Rust
- [x] `src-tauri/src/sync/initial.rs` — GET /files/list → compare → enqueue ops (concurrency 3), emits progress + complete events
- [x] `src-tauri/src/sync/merge.rs` — Three-way merge (markdown: dmp patch_apply, binary: last-modified-wins, JSON: key-by-key merge)
- [x] `src-tauri/src/sync/conflict.rs` — Detection (triple-hash) + `ConflictResolver` (attempt_auto_merge + apply_resolution)
- [x] Extend commands/sync.rs — sync_resolve_conflict, sync_get_conflicts, sync_get_version_history, sync_restore_version
- [x] Add `dmp = "0.2"` to Cargo.toml
- [x] Wire InitialSync into engine.rs (runs on Start before SSE)
- [x] Wire ResolveConflict handler in engine.rs
- [x] Downloader rewritten with conflict detection, auto-merge, version history
- [x] Uploader fixed for ancestor_hash + server_version_id tracking

### TypeScript
- [x] `apps/desktop/src/features/sync/ConflictBanner.tsx` — editor conflict banner (Keep Local / Keep Remote / View Diff)
- [x] `apps/desktop/src/features/sync/ConflictDiffView.tsx` — side-by-side diff viewer (Radix Dialog)
- [x] `apps/desktop/src/features/sync/InitialSyncProgress.tsx` — progress overlay with Progress bar
- [x] Update syncStore — conflicts map, initialSyncProgress, initialSyncComplete, resolveConflict(), loadConflicts(), getVersionHistory(), restoreVersion(), event subscriptions for progress/conflict/complete
- [x] Update platform/index.ts — exports ConflictInfo, ConflictResolution, InitialSyncProgressEvent, SyncConflictEvent, VersionInfo
- [x] Update ipc/Sync.ts — IPC wrappers for all new methods + event listeners
- [x] Wire ConflictBanner into PaneView.tsx (renders above editor when conflict exists)
- [x] Wire InitialSyncProgress into App.tsx (full-screen overlay during initial sync)

### Verification
- [ ] New device: full initial sync downloads all files
- [ ] Non-overlapping edits: auto-merged cleanly
- [ ] Overlapping edits: conflict markers inserted, UI shows conflict banner
- [ ] Keep Local / Keep Remote / manual merge all work
- [ ] Version history: list + restore works

---

## Phase 5: Vault + Device + Member Management (CRUD) ✅ COMPLETE

### Rust
- [x] `src-tauri/src/commands/remote_vault.rs` — remote_vault_create, remote_vault_list, remote_vault_get, remote_vault_update, remote_vault_delete, remote_vault_link, remote_vault_unlink, remote_vault_get_link
- [x] `src-tauri/src/commands/members.rs` — vault_members_list, vault_invite_create, vault_invites_list, vault_invite_delete, vault_my_invites, vault_invite_accept, vault_member_update_role, vault_member_remove
- [x] `src-tauri/src/commands/devices.rs` — devices_list, device_get, device_rename, device_revoke, device_update_sync_cursor
- [x] Register all new commands in `commands/mod.rs` and `lib.rs`

### TypeScript
- [x] `packages/platform/src/interfaces/RemoteVault.ts` — RemoteVault + RemoteVaultInfo interfaces
- [x] `packages/platform/src/interfaces/Members.ts` — Members + VaultMember + VaultInvite + AcceptInviteResult interfaces
- [x] `packages/platform/src/interfaces/Devices.ts` — Devices + DeviceEntry interfaces
- [x] `packages/ipc/src/RemoteVault.ts` — IPC wrapper (8 methods)
- [x] `packages/ipc/src/Members.ts` — IPC wrapper (8 methods)
- [x] `packages/ipc/src/Devices.ts` — IPC wrapper (5 methods)
- [x] Update `packages/platform/src/index.ts` — exports all new types; Platform includes remoteVault, members, devices
- [x] Update `packages/ipc/src/tauriPlatform.ts` — wires RemoteVault, Members, Devices adapters
- [x] Update `packages/ipc/src/index.ts` — exports new classes
- [x] `packages/core/src/stores/remoteVaultStore.ts` — Zustand+Immer store (CRUD + link/unlink)
- [x] `packages/core/src/stores/membersStore.ts` — Zustand+Immer store (members + invites)
- [x] `packages/core/src/stores/devicesStore.ts` — Zustand+Immer store (device list + rename/revoke)
- [x] Update `packages/core/src/index.ts` — exports new stores
- [x] `apps/desktop/src/features/sync/SyncSettings.tsx` — sync settings section (vault link, devices, invites, members)
- [x] `apps/desktop/src/features/sync/VaultLinkModal.tsx` — create/link/unlink remote vault
- [x] `apps/desktop/src/features/sync/DeviceManager.tsx` — device list with rename/revoke
- [x] `apps/desktop/src/features/sync/MembersPanel.tsx` — member list + role change + invite creation
- [x] `apps/desktop/src/features/sync/InvitesPanel.tsx` — pending invites accept
- [x] Wire SyncSection into SettingsModal as "Sync" tab

### Verification
- [ ] Create remote vault + link to local
- [ ] Invite user by email → accept from other device
- [ ] Change member role, remove member
- [ ] List devices, rename, revoke

---

## Phase 6: Reconnection + Long Offline + Retry Hardening ✅ COMPLETE

### Rust
- [x] `src-tauri/src/sync/state.rs` — Added `SyncError` + `SyncErrorKind` (Transient/Permanent/Auth), `ConnectionMode` enum (Sse/Polling/Disconnected), new `SyncCommand` variants (SseConnected, SseDisconnected, Reconcile, PollTick)
- [x] `src-tauri/src/sync/db.rs` — Added `QueueRow` struct, `sync_queue` table (SQLite persistence for queue), `sync_metadata` table (key/value), queue CRUD methods + metadata CRUD
- [x] `src-tauri/src/sync/queue.rs` — Full rewrite with SQLite persistence (`set_db`, `load_from_db`, `reload_ready`), retry backoff (30s→6h schedule), deduplication, `mark_completed`/`mark_failed` with dead-letter support
- [x] `src-tauri/src/sync/sse.rs` — Removed 5-failure hard cap; infinite retry with exponential backoff (1s→5min) + 25% jitter; `CancellationToken` for clean shutdown; sends `SseConnected`/`SseDisconnected` to engine; accepts initial `last_event_id` for resumption
- [x] `src-tauri/src/sync/reconcile.rs` — **NEW** — Incremental reconciliation via `GET /changes?since=<id>` for short gaps; full `GET /files/list` reconciliation for long offline (>30 days); deduplicates events; saves last_event_id + reconcile timestamp to sync_metadata
- [x] `src-tauri/src/sync/engine.rs` — **REWRITE** — SSE lifecycle via `CancellationToken`; tracks `ConnectionMode` + `last_event_id`; handles SseConnected (→ Live, reconcile on reconnect), SseDisconnected (→ Offline, save event id), Reconcile, PollTick; polling fallback (30s interval when SSE disconnected); retry reload (60s interval loads retry-ready items from SQLite); queue persistence wired via `set_db`; `load_from_db` on startup to resume crashed ops; `process_queue` uses `mark_completed`/`mark_failed` with retriability check
- [x] `src-tauri/src/sync/mod.rs` — Added `pub mod reconcile`
- [x] `Cargo.toml` — Added `tokio-util = "0.7"` for `CancellationToken`

### Verification
- [ ] Kill network mid-sync → restore → reconciles correctly
- [ ] 30+ day offline → full reconciliation works
- [ ] App crash mid-sync → restart → queue resumes
- [ ] SSE disconnect → switches to polling → SSE reconnects → reconciles gap

---

## Phase 7 (Layer 2): Real-time Collaboration — Yjs + WebSocket ⬜ NOT STARTED

### Rust
- [ ] `src-tauri/src/sync/collab.rs` — WebSocket client (tokio-tungstenite), Yjs protocol
- [ ] `src-tauri/src/commands/collab.rs` — collab_join, collab_leave, collab_send_update, collab_send_awareness, collab_get_peers
- [ ] Update `Cargo.toml` — add tokio-tungstenite

### TypeScript
- [ ] `packages/sync-client/src/collabBridge.ts` — Yjs ↔ Rust WebSocket bridge
- [ ] `packages/core/src/stores/collabStore.ts` — active sessions, peers
- [ ] `packages/editor/src/collab/` — Yjs + CodeMirror 6 integration (yCollab extension)
- [ ] `apps/desktop/src/features/collab/CollabIndicator.tsx` — "N people editing" badge
- [ ] `apps/desktop/src/features/collab/CursorOverlay.tsx` — remote cursors
- [ ] Update editor livePreview — add collab extension when active
- [ ] Update syncStore — suppress upload on collab_active, schedule snapshot on collab_inactive
- [ ] Add deps: yjs, y-codemirror.next, lib0

### Verification
- [ ] Two devices same file → type on one → appears on other <100ms
- [ ] Cursor positions sync between devices
- [ ] Disconnect one device → type on both → reconnect → CRDT merge
- [ ] On last peer disconnect: compact message sent, snapshot uploaded

---

## Architecture Reference

### Phase Dependency Graph
```
Phase 0 (Foundation) ✅
  │
  v
Phase 1 (Auth) ✅
  │
  ├───────────────────┐
  v                   v
Phase 2 (Engine) ✅   Phase 5 (CRUD) ✅  ← parallelizable
  │                   │
  v                   │
Phase 3 (SSE+Sync) ✅ │
  │                   │
  v                   │
Phase 4 (Conflicts) ✅ │
  │                   │
  ├───────────────────┘
  v
Phase 6 (Hardening) ✅
  │
  v
Phase 7 (Collab) ⬜
```

### Rust Cargo Dependencies
| Crate | Phase | Purpose | Status |
|-------|-------|---------|--------|
| rusqlite (bundled) | 0 | sync.db SQLite | ✅ |
| keyring | 0 | Cross-platform keychain | ✅ |
| gethostname | 0 | Device name | ✅ |
| aes-gcm | 0 | AES-256-GCM encryption | ✅ |
| rand | 0 | IV generation | ✅ |
| reqwest (rustls-tls, json, blocking) | 1 | HTTP client | ✅ |
| jsonwebtoken | 1 | JWT decode (exp check) | ✅ |
| dmp | 4 | diff-match-patch merge | ✅ |
| tokio-util | 6 | CancellationToken for SSE | ✅ |
| tokio-tungstenite | 7 | WebSocket for collab | ❌ not added yet |

### Key Design Decisions
- Sync engine as tokio task (not separate OS thread)
- 5s upload debounce lives in Rust
- NoteCache pre-sync snapshots via Tauri event round-trip
- VEK stored in keychain as `(cortex, vek_{vault_id})`
- `packages/sync-client/` was planned as thin event bridge — **not created**, sync store lives in `@cortex/core` directly
- All interfaces in `packages/platform/` for future mobile reuse
