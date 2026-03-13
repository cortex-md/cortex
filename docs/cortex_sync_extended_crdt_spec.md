# Cortex Desktop Sync --- Extended Client Implementation Specification (CRDT-First)

Version: 2.0\
Audience: Desktop client engineers, sync engine developers, backend
engineers\
Primary Goal: **CRDT-first synchronization architecture guaranteeing
high performance, low latency collaboration and minimal conflict
resolution overhead.**

------------------------------------------------------------------------

# 1. Core Principle --- CRDT Always First

The Cortex client **must always prefer CRDT-based synchronization**
instead of snapshot/delta mechanisms whenever possible.

CRDT guarantees:

-   no merge conflicts
-   deterministic convergence
-   real-time collaboration
-   low bandwidth incremental updates
-   offline editing without conflicts

Snapshot/delta mechanisms exist **only as fallback mechanisms**.

Priority order:

1.  **CRDT sync (primary)**
2.  delta chain recovery
3.  snapshot recovery

------------------------------------------------------------------------

# 2. CRDT Model

Cortex uses:

**Yjs (Y‑CRDT)**

Each note file is mapped to:

Y.Doc

Structure:

    Vault
     ├─ File
     │   └─ YDoc
     │        ├─ text (Y.Text)
     │        ├─ metadata (Y.Map)
     │        └─ blocks (Y.Array)

------------------------------------------------------------------------

# 3. CRDT Update Model

Each edit produces:

    Yjs Update

Binary encoded.

Client sends updates immediately.

Payload example:

    {
      file_id,
      update_binary,
      clock,
      device_id
    }

------------------------------------------------------------------------

# 4. Sync Transport Layers

Layer stack:

    Editor
     ↓
    CRDT Adapter
     ↓
    Sync Engine
     ↓
    Transport
     ↓
    Server

Transport types:

-   WebSocket (primary)
-   HTTP batch fallback
-   Event Stream recovery

------------------------------------------------------------------------

# 5. WebSocket Collaboration Channel

Endpoint:

    /collab

Protocol:

    Yjs sync protocol

Events:

    sync_step1
    sync_step2
    update
    awareness

Awareness contains:

    cursor
    user presence
    selection
    device

------------------------------------------------------------------------

# 6. Client CRDT Pipeline

    User Edit
     ↓
    Editor Transaction
     ↓
    Yjs Update Generated
     ↓
    Broadcast Locally
     ↓
    Queue Update
     ↓
    Send to WebSocket
     ↓
    Server Fan-out
     ↓
    Other Clients Apply Update

------------------------------------------------------------------------

# 7. Offline CRDT Queue

When offline:

updates stored locally.

Local DB:

SQLite

Table:

    crdt_updates

Columns:

    update_id
    file_id
    binary_update
    clock
    device_id
    sent

When connection returns:

queue flush.

------------------------------------------------------------------------

# 8. CRDT State Persistence

Each file stores:

    ydoc_snapshot

periodically.

Snapshot interval:

    30 seconds
    or
    100 updates

------------------------------------------------------------------------

# 9. Local Storage Architecture

SQLite database:

    cortex_sync.db

Tables:

    devices
    vaults
    files
    crdt_updates
    snapshots
    sync_events
    sync_queue

------------------------------------------------------------------------

# 10. File Metadata Model

    file_id
    vault_id
    path
    created_at
    updated_at
    deleted_at
    version_vector
    snapshot_id

------------------------------------------------------------------------

# 11. Version Vector

CRDT uses vector clocks:

    device_id -> counter

Example:

    {
     deviceA: 45,
     deviceB: 12
    }

Used for:

-   ordering updates
-   preventing replay

------------------------------------------------------------------------

# 12. Snapshot Fallback

Used when:

    missing updates
    client too far behind

Endpoint:

    GET /files/snapshot

------------------------------------------------------------------------

# 13. CRDT Update Upload

Endpoint fallback:

    POST /crdt/updates

Batch format:

    {
     updates: []
    }

------------------------------------------------------------------------

# 14. Real-time Event Stream

Endpoint:

    /sync/events

Events:

    device_join
    device_leave
    vault_update
    file_update
    snapshot_required

------------------------------------------------------------------------

# 15. Initial Sync Flow (CRDT)

    Open Vault
     ↓
    Fetch Vault Metadata
     ↓
    Download CRDT Snapshots
     ↓
    Load YDocs
     ↓
    Connect WebSocket
     ↓
    Sync Updates

------------------------------------------------------------------------

# 16. Device Identity

Each install generates:

    device_id = UUIDv7

Stored:

    ~/.cortex/device.json

------------------------------------------------------------------------

# 17. Authentication Flow

Login endpoint:

    POST /auth/v1/login

Response:

    access_token
    refresh_token

Tokens stored in:

Native OS Keyring

------------------------------------------------------------------------

# 18. Token Refresh Strategy

Refresh window:

    5 minutes before expiry

Flow:

    client timer
     ↓
    refresh token call
     ↓
    update keyring

------------------------------------------------------------------------

# 19. Device Management

Endpoints:

    GET /devices
    DELETE /devices/{id}
    PATCH /devices/{id}

UI shows:

-   device name
-   last active
-   last sync
-   device type

------------------------------------------------------------------------

# 20. Vault Architecture

Vault structure:

    Vault
     ├ notes
     ├ attachments
     ├ tags
     └ bookmarks

Each note mapped to CRDT.

------------------------------------------------------------------------

# 21. Tags Sync

Tags stored as:

    tags.json

Converted to:

Y.Map

CRDT synced.

------------------------------------------------------------------------

# 22. Bookmarks Sync

Bookmarks stored:

    bookmarks.json

CRDT object:

Y.Array

------------------------------------------------------------------------

# 23. Attachment Sync

Attachments do not use CRDT.

Instead:

    content hash
    chunk upload

Chunks:

    4MB

------------------------------------------------------------------------

# 24. File Watcher

Rust watcher monitors:

    create
    modify
    delete
    rename

Updates CRDT layer.

------------------------------------------------------------------------

# 25. Sync Engine State Machine

States:

    Idle
    Authenticating
    Connecting
    Syncing
    Live
    Offline
    Recovering

------------------------------------------------------------------------

# 26. Conflict Prevention Strategy

Because CRDT is primary:

    conflicts nearly impossible

Only possible when:

    schema change
    file deleted concurrently

Resolution UI available.

------------------------------------------------------------------------

# 27. Sync Logging

Log types:

    connection_open
    connection_closed
    update_sent
    update_received
    snapshot_downloaded
    device_join
    device_leave

------------------------------------------------------------------------

# 28. Sync Log Storage

Local table:

    sync_logs

Columns:

    timestamp
    event
    file_id
    details

------------------------------------------------------------------------

# 29. UI Screens

Full desktop client requires the following interfaces.

------------------------------------------------------------------------

# 30. Login Screen

Fields:

    email
    password

Buttons:

    login
    create account

------------------------------------------------------------------------

# 31. Vault Selection Screen

Displays:

-   vault list
-   role
-   member count

Actions:

-   open vault
-   create vault

------------------------------------------------------------------------

# 32. Vault Members Screen

Shows:

-   user avatar
-   role
-   join date

Actions:

-   change role
-   remove member

------------------------------------------------------------------------

# 33. Vault Invite Screen

Displays invites:

    vault
    role
    inviter
    expiration

Actions:

    accept
    decline

------------------------------------------------------------------------

# 34. Device Manager Screen

List devices:

    name
    type
    last sync
    last activity

Actions:

    rename
    revoke

------------------------------------------------------------------------

# 35. Sync Status Screen

Displays:

    connection status
    update queue size
    websocket latency
    pending updates

------------------------------------------------------------------------

# 36. Sync Logs Screen

Shows timeline:

    timestamp
    event
    file
    device

------------------------------------------------------------------------

# 37. File History Screen

CRDT snapshots displayed as history points.

Allows:

    restore snapshot
    view diff

------------------------------------------------------------------------

# 38. Diff Viewer

Markdown aware diff viewer.

Shows:

    local
    remote
    merged

------------------------------------------------------------------------

# 39. Activity Feed

Displays collaboration events:

    user edited note
    user created file
    user renamed file

------------------------------------------------------------------------

# 40. Storage Usage Screen

Displays:

    vault size
    attachment usage
    update history size

------------------------------------------------------------------------

# 41. Sync Engine Module Architecture

Rust modules:

    sync_engine
     ├ auth_manager
     ├ device_manager
     ├ vault_manager
     ├ crdt_engine
     ├ websocket_client
     ├ event_stream
     ├ file_watcher
     ├ queue_manager
     └ logger

------------------------------------------------------------------------

# 42. CRDT Engine Modules

    crdt_engine
     ├ ydoc_store
     ├ update_encoder
     ├ update_decoder
     ├ snapshot_manager
     └ vector_clock

------------------------------------------------------------------------

# 43. Performance Guarantees

Target metrics:

    update latency < 100ms
    sync convergence < 1s
    snapshot load < 200ms

------------------------------------------------------------------------

# 44. Reliability Guarantees

System ensures:

-   offline edits never lost
-   deterministic state convergence
-   encrypted vault data
-   secure device identity

------------------------------------------------------------------------

# 45. Security Model

Encryption layers:

    TLS transport
    vault key encryption
    attachment hashing
    device authentication

------------------------------------------------------------------------

# 46. Observability

Metrics exported:

    sync_latency
    queue_depth
    websocket_reconnects
    update_rate

------------------------------------------------------------------------

# 47. Recovery Procedures

Client detects:

    missing update
    snapshot divergence

Then:

    request snapshot
    rebuild ydoc
    rejoin websocket

------------------------------------------------------------------------

# 48. End-to-End Sync Flow

    User Login
     ↓
    Load Devices
     ↓
    Load Vaults
     ↓
    Open Vault
     ↓
    Load Snapshots
     ↓
    Initialize YDocs
     ↓
    Open WebSocket
     ↓
    Live CRDT Sync

------------------------------------------------------------------------

# 49. System Guarantees

Cortex Sync provides:

-   real-time collaboration
-   offline-first editing
-   deterministic merges
-   minimal bandwidth usage

------------------------------------------------------------------------

# 50. Final Design Principle

The Cortex client must **always operate as a CRDT‑first collaborative
editor**.

Traditional sync methods are used only for:

-   recovery
-   attachments
-   legacy compatibility

CRDT ensures Cortex delivers **Google Docs--level collaboration with
Obsidian‑level local performance.**
