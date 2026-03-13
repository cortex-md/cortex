# Cortex Sync — Implementation Tracker

Tracks progress across all sync implementation phases. See `docs/cortex_desktop_sync_spec.md` and `docs/cortex_sync_extended_crdt_spec.md` for full specs.

---

## Phase 0: Rust Foundation — Keychain + Device Identity + SQLite

### Rust
- [ ] `src-tauri/src/keychain/mod.rs` — Cross-platform keychain via `keyring` crate
- [ ] `src-tauri/src/device/mod.rs` — Device identity (UUID generation + persistence)
- [ ] `src-tauri/src/sync/db.rs` — SQLite sync.db (rusqlite, sync_state table)
- [ ] `src-tauri/src/commands/keychain.rs` — `keychain_set`, `keychain_get`, `keychain_delete`
- [ ] `src-tauri/src/commands/device.rs` — `get_device_id`, `get_device_info`
- [ ] Update `Cargo.toml` — add rusqlite, keyring, gethostname, aes-gcm, rand
- [ ] Update `lib.rs` — register commands, add mod declarations

### TypeScript
- [ ] `packages/platform/src/interfaces/Keychain.ts` — Keychain interface
- [ ] `packages/platform/src/interfaces/Device.ts` — Device interface
- [ ] `packages/ipc/src/Keychain.ts` — IPC wrapper
- [ ] `packages/ipc/src/Device.ts` — IPC wrapper
- [ ] Update `packages/platform/src/index.ts` — add to Platform interface
- [ ] Update `packages/ipc/src/tauriPlatform.ts` — wire adapters

### Verification
- [ ] `get_device_id` returns same UUID across calls
- [ ] Keychain set/get/delete works from frontend

---

## Phase 1: Auth — HTTP Client + Token Management

### Rust
- [ ] `src-tauri/src/sync/http.rs` — Authenticated HTTP client (reqwest + auto-refresh)
- [ ] `src-tauri/src/sync/auth.rs` — login, register, logout, get_status, refresh
- [ ] `src-tauri/src/commands/auth.rs` — auth_login, auth_register, auth_logout, auth_get_status, auth_get_current_user
- [ ] Update `Cargo.toml` — add reqwest, jsonwebtoken
- [ ] Register auth commands in lib.rs

### TypeScript
- [ ] `packages/platform/src/interfaces/Auth.ts` — Auth interface
- [ ] `packages/ipc/src/Auth.ts` — IPC wrapper
- [ ] `packages/core/src/stores/authStore.ts` — Zustand auth store
- [ ] `apps/desktop/src/features/auth/LoginPage.tsx`
- [ ] `apps/desktop/src/features/auth/RegisterPage.tsx`
- [ ] `apps/desktop/src/features/auth/AuthGuard.tsx`
- [ ] Update Platform interface + tauriPlatform

### Verification
- [ ] Register + login flow works
- [ ] Tokens persist in keychain across app restart
- [ ] Token refresh happens transparently on expiry

---

## Phase 2: Sync Engine Core — State Machine + Queue + Watcher Bridge

### Rust
- [ ] `src-tauri/src/sync/mod.rs` — Module root
- [ ] `src-tauri/src/sync/state.rs` — SyncEngineState enum + SyncCommand enum
- [ ] `src-tauri/src/sync/queue.rs` — Priority queue (BinaryHeap, max 3 concurrent)
- [ ] `src-tauri/src/sync/engine.rs` — Main loop, state machine, mpsc consumer
- [ ] `src-tauri/src/commands/sync.rs` — sync_start, sync_stop, sync_get_status, sync_force_sync_file
- [ ] Update `lib.rs` — spawn engine in setup(), store mpsc::Sender
- [ ] Update `watcher.rs` — send LocalFileChanged to engine channel

### TypeScript
- [ ] `packages/platform/src/interfaces/Sync.ts` — Sync interface
- [ ] `packages/ipc/src/Sync.ts` — IPC wrapper + event listeners
- [ ] `packages/core/src/stores/syncStore.ts` — Zustand sync store
- [ ] `packages/sync-client/package.json` — new package
- [ ] `packages/sync-client/src/index.ts` — barrel export
- [ ] `packages/sync-client/src/eventBridge.ts` — Tauri events → syncStore

### Verification
- [ ] Engine starts → state transitions visible in syncStore
- [ ] File watcher changes reach engine via mpsc channel

---

## Phase 3: SSE + File Upload/Download + E2EE

### Rust
- [ ] `src-tauri/src/sync/crypto.rs` — AES-256-GCM encrypt/decrypt, VEK generation
- [ ] `src-tauri/src/sync/sse.rs` — SSE client (reqwest streaming, backoff, polling fallback)
- [ ] `src-tauri/src/sync/uploader.rs` — Hash check → encrypt → POST /files, delta-first strategy
- [ ] `src-tauri/src/sync/downloader.rs` — GET /files → decrypt → pre-write ack → write
- [ ] `src-tauri/src/sync/ignore.rs` — should_ignore() for excluded paths
- [ ] Wire SSE + uploader + downloader into engine.rs
- [ ] Update `Cargo.toml` — add dmp crate

### TypeScript
- [ ] `apps/desktop/src/features/statusbar/SyncIndicator.tsx` — status bar sync icon
- [ ] Update syncStore — per-file status tracking
- [ ] Update eventBridge — file sync event listeners
- [ ] Update noteCache.ts — handle sync-pre-write → snapshot → ack

### Verification
- [ ] Local file change → encrypted upload to server
- [ ] Remote file change → SSE event → encrypted download
- [ ] Server stores only encrypted blobs (verify via API)
- [ ] X-Local-Hash deduplication prevents unnecessary uploads

---

## Phase 4: Initial Sync + Conflict Resolution

### Rust
- [ ] `src-tauri/src/sync/initial.rs` — GET /files/list → compare → enqueue ops (concurrency 3)
- [ ] `src-tauri/src/sync/merge.rs` — Three-way merge (markdown: dmp, binary: last-modified, JSON: key merge)
- [ ] `src-tauri/src/sync/conflict.rs` — Detection (triple-hash) + resolution dispatch
- [ ] Extend commands/sync.rs — sync_resolve_conflict, sync_get_conflicts, sync_get_version_history, sync_restore_version

### TypeScript
- [ ] `apps/desktop/src/features/sync/ConflictBanner.tsx` — editor conflict banner
- [ ] `apps/desktop/src/features/sync/ConflictDiffView.tsx` — side-by-side diff viewer
- [ ] `apps/desktop/src/features/sync/InitialSyncProgress.tsx` — progress overlay
- [ ] Update syncStore — conflicts map, initialSyncProgress, resolveConflict(), getVersionHistory()

### Verification
- [ ] New device: full initial sync downloads all files
- [ ] Non-overlapping edits: auto-merged cleanly
- [ ] Overlapping edits: conflict markers inserted, UI shows conflict banner
- [ ] Keep Local / Keep Remote / manual merge all work
- [ ] Version history: list + restore works

---

## Phase 5: Vault + Device + Member Management (CRUD)

_Can parallelize with Phases 2-4 (depends only on Phase 1)_

### Rust
- [ ] `src-tauri/src/commands/remote_vault.rs` — remote_vault_create, remote_vault_list, remote_vault_link, remote_vault_unlink
- [ ] `src-tauri/src/commands/members.rs` — vault_members_list, vault_invite_create, vault_invites_list, vault_invite_delete, vault_my_invites, vault_invite_accept, vault_member_update_role, vault_member_remove
- [ ] `src-tauri/src/commands/devices.rs` — devices_list, device_rename, device_revoke

### TypeScript
- [ ] `packages/platform/src/interfaces/RemoteVault.ts` — RemoteVault interface
- [ ] `packages/platform/src/interfaces/Members.ts` — Members interface
- [ ] `packages/ipc/src/RemoteVault.ts` — IPC wrapper
- [ ] `packages/ipc/src/Members.ts` — IPC wrapper
- [ ] `packages/ipc/src/Devices.ts` — IPC wrapper
- [ ] `packages/core/src/stores/deviceStore.ts` — device list + actions
- [ ] `packages/core/src/stores/membersStore.ts` — members + invites per vault
- [ ] `apps/desktop/src/features/sync/SyncSettings.tsx` — sync settings panel
- [ ] `apps/desktop/src/features/sync/VaultLinkModal.tsx` — create/link remote vault
- [ ] `apps/desktop/src/features/sync/DeviceManager.tsx` — device list + actions
- [ ] `apps/desktop/src/features/sync/MembersPanel.tsx` — members + invite
- [ ] `apps/desktop/src/features/sync/InvitesPanel.tsx` — pending invites accept/decline

### Verification
- [ ] Create remote vault + link to local
- [ ] Invite user by email → accept from other device
- [ ] Change member role, remove member
- [ ] List devices, rename, revoke

---

## Phase 6: Reconnection + Long Offline + Retry Hardening

### Rust
- [ ] `src-tauri/src/sync/reconcile.rs` — Full vault reconciliation for long offline (>30 day gap)
- [ ] Update engine.rs — retry backoff (30s→6h cap), 10 failures → failed_permanent
- [ ] Update sse.rs — consecutive failure tracking, polling mode switch
- [ ] Update queue.rs — persist to SQLite sync_queue table for crash recovery

### Verification
- [ ] Kill network mid-sync → restore → reconciles correctly
- [ ] 30+ day offline → full reconciliation works
- [ ] App crash mid-sync → restart → queue resumes
- [ ] SSE fails 5 times → switches to polling → recovers to SSE

---

## Phase 7 (Layer 2): Real-time Collaboration — Yjs + WebSocket

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
Phase 0 (Foundation)
  │
  v
Phase 1 (Auth)
  │
  ├───────────────────┐
  v                   v
Phase 2 (Engine)      Phase 5 (CRUD)  ← parallelizable
  │                   │
  v                   │
Phase 3 (SSE+Sync)    │
  │                   │
  v                   │
Phase 4 (Conflicts)   │
  │                   │
  ├───────────────────┘
  v
Phase 6 (Hardening)
  │
  v
Phase 7 (Collab)
```

### Rust Cargo Dependencies
| Crate | Phase | Purpose |
|-------|-------|---------|
| rusqlite (bundled) | 0 | sync.db SQLite |
| keyring | 0 | Cross-platform keychain |
| gethostname | 0 | Device name |
| aes-gcm | 0 | AES-256-GCM encryption |
| rand | 0 | IV generation |
| reqwest (rustls-tls, stream, json) | 1 | HTTP client |
| jsonwebtoken | 1 | JWT decode (exp check) |
| dmp | 3 | diff-match-patch merge |
| tokio-tungstenite | 7 | WebSocket for collab |

### Key Design Decisions
- Sync engine as tokio task (not separate OS thread)
- 5s upload debounce lives in Rust
- NoteCache pre-sync snapshots via Tauri event round-trip
- VEK stored in keychain as `(cortex, vek_{vault_id})`
- `packages/sync-client/` is thin event bridge only
- All interfaces in `packages/platform/` for future mobile reuse
