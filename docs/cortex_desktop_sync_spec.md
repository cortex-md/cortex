# Cortex Desktop Sync --- Client Implementation Specification

## 1. Objetivo

Este documento define **como o cliente desktop Cortex implementa
sincronização completa com o servidor Cortex Sync API**.

Inclui:

-   autenticação
-   gerenciamento de devices
-   gerenciamento de vaults
-   compartilhamento
-   sincronização incremental
-   resolução de conflitos
-   histórico de notas
-   real-time collaboration
-   UI necessária para administrar o sistema

O cliente desktop é construído sobre:

-   **Tauri**
-   **Rust (camada nativa + sync engine)**
-   **React UI**
-   **Zustand (estado)**
-   **SSE + HTTP**
-   **WebSocket (Yjs)**

------------------------------------------------------------------------

# 2. Arquitetura Geral do Sync Client

## Componentes principais

Desktop App ├─ UI Layer (React) ├─ State Layer (Zustand) ├─ Sync Engine
│ ├─ Event Stream Manager (SSE) │ ├─ Delta Manager │ ├─ Snapshot Manager
│ ├─ Conflict Resolver │ ├─ Sync Queue │ ├─ Change Detector (FS watcher)
│ └─ Sync Logger ├─ Vault Manager ├─ Auth Manager ├─ Device Manager └─
Secure Storage └─ Native Keyring

------------------------------------------------------------------------

# 3. Identidade do Device

Cada instalação do app gera:

device_id: UUID

Persistido localmente em:

\~/.cortex/device.json

Conteúdo:

{ device_id, device_name, device_type }

Tipos possíveis:

-   desktop
-   mobile
-   server

Esse ID é enviado em:

X-Device-ID

para toda request autenticada.

------------------------------------------------------------------------

# 4. Armazenamento Seguro

Tokens **nunca ficam em disco plano**.

Devem ir para **keyring nativo**:

### macOS

Keychain

### Windows

Credential Manager

### Linux

Secret Service / libsecret

Armazenar:

-   refresh_token
-   access_token
-   vault_keys

Estrutura:

service: cortex\
account: user_email

------------------------------------------------------------------------

# 5. Autenticação

Endpoint:

POST /auth/v1/login

Request:

-   email
-   password
-   device_id
-   device_name
-   device_type

Resposta:

-   access_token
-   refresh_token

Fluxo:

User login → Device ID enviado → Server cria sessão device → retorna
tokens → cliente salva no keyring.

------------------------------------------------------------------------

# 6. Refresh Token Rotativo

Endpoint:

POST /auth/v1/token/refresh

Fluxo:

access_token expira → client usa refresh_token → server retorna novo
access_token + refresh_token → cliente substitui tokens.

Caso erro **token_reuse** → logout global obrigatório.

------------------------------------------------------------------------

# 7. Logout

Endpoint:

POST /auth/v1/logout

Opções:

-   logout current device
-   logout all devices

------------------------------------------------------------------------

# 8. Device Management

Endpoints:

-   GET /devices/v1/
-   GET /devices/v1/{id}
-   PATCH /devices/v1/{id}
-   DELETE /devices/v1/{id}

Funções:

-   listar devices conectados
-   renomear device
-   revogar device
-   mostrar último sync

------------------------------------------------------------------------

# 9. Vault Management

Endpoints:

-   POST /vaults/v1/
-   GET /vaults/v1/
-   GET /vaults/v1/{id}
-   PATCH /vaults/v1/{id}
-   DELETE /vaults/v1/{id}

Vault possui:

vault_key

Criptografado como:

encrypted_vault_key

------------------------------------------------------------------------

# 10. Vault Members

Endpoints:

-   GET /vaults/{vault}/members
-   PATCH member role
-   DELETE member

Roles:

-   owner
-   admin
-   editor
-   viewer

  role     read   write   invite
  -------- ------ ------- --------
  owner    yes    yes     yes
  admin    yes    yes     yes
  editor   yes    yes     no
  viewer   yes    no      no

------------------------------------------------------------------------

# 11. Vault Invites

Endpoints:

-   POST /vaults/{vault}/invites
-   GET invites
-   POST invites/accept
-   DELETE invite

Convite inclui:

encrypted_vault_key

------------------------------------------------------------------------

# 12. Estrutura de Arquivos do Vault

Vault/ notes/ attachments/ tags.json bookmarks.json

Cada item vira **arquivo sincronizável**.

------------------------------------------------------------------------

# 13. File Sync Model

Servidor usa **versioned snapshots + deltas**.

Arquivo possui:

-   version
-   checksum
-   snapshot_id

------------------------------------------------------------------------

# 14. Upload Snapshot

Endpoint:

POST /sync/v1/vaults/{vault}/files

Usado quando:

-   novo arquivo
-   delta chain grande
-   cliente pede snapshot

------------------------------------------------------------------------

# 15. Upload Delta

Endpoint:

POST /files/deltas

Payload:

-   base_version
-   encrypted_delta
-   checksum

------------------------------------------------------------------------

# 16. Download Delta

Endpoint:

GET /files/deltas

------------------------------------------------------------------------

# 17. Download Snapshot

Endpoint:

GET /files

------------------------------------------------------------------------

# 18. Renomear Arquivo

POST /files/rename

------------------------------------------------------------------------

# 19. Deletar Arquivo

DELETE /files

------------------------------------------------------------------------

# 20. Lista de Arquivos

GET /files/list

Usado em **initial sync**.

------------------------------------------------------------------------

# 21. Initial Sync Flow

Open vault → GET /files/list → comparar com arquivos locais → baixar
faltantes → subir novos.

------------------------------------------------------------------------

# 22. Change Detection

Rust FS watcher monitora:

-   create
-   modify
-   rename
-   delete

Eventos entram na **Sync Queue**.

------------------------------------------------------------------------

# 23. Sync Queue

Fila persistente.

Operações:

-   upload_snapshot
-   upload_delta
-   delete_file
-   rename_file

------------------------------------------------------------------------

# 24. Real-time Sync (SSE)

Endpoint:

GET /sync/v1/vaults/{vault}/events

Eventos:

-   file_created
-   file_updated
-   file_deleted
-   file_renamed

------------------------------------------------------------------------

# 25. Reconexão SSE

Exponential backoff:

1s → 2s → 4s → 8s → max 60s

Usa header:

Last-Event-ID

------------------------------------------------------------------------

# 26. Polling Fallback

GET /changes?since=`<event_id>`{=html}

Intervalo:

30s

------------------------------------------------------------------------

# 27. Sync Cursor

PUT /devices/{device}/sync-cursor

Body:

last_sync_event_id

------------------------------------------------------------------------

# 28. Resolução de Conflitos

Quando:

base_version mismatch

Servidor retorna:

409 conflict

Cliente:

1.  baixa snapshot
2.  cria branch local
3.  gera diff
4.  abre UI

------------------------------------------------------------------------

# 29. Diff de Notas

Sistema:

-   line-based diff
-   markdown-aware diff

UI:

local \| remote

------------------------------------------------------------------------

# 30. Histórico de Arquivos

Endpoint:

GET /files/history

Mostra:

-   versão
-   autor
-   device
-   timestamp

------------------------------------------------------------------------

# 31. Real-time Collaboration

Endpoint:

/collab (WebSocket)

Usa:

Yjs CRDT

Eventos:

-   sync_step1
-   sync_step2
-   update
-   awareness

------------------------------------------------------------------------

# 32. Sync Logger

Eventos registrados:

-   connection_open
-   connection_closed
-   sync_start
-   sync_complete
-   file_uploaded
-   file_downloaded
-   conflict_detected
-   delta_uploaded
-   snapshot_uploaded

------------------------------------------------------------------------

# 33. Telas Necessárias

Baseado em apps como Obsidian Sync.

------------------------------------------------------------------------

# 34. Tela: Login

Campos:

-   email
-   password

Botões:

-   login
-   create account

------------------------------------------------------------------------

# 35. Tela: Devices

Lista:

-   device name
-   device type
-   last seen
-   last sync

Ações:

-   rename
-   revoke
-   logout device

------------------------------------------------------------------------

# 36. Tela: Vault Manager

Lista:

-   vault name
-   role
-   members
-   last sync

Ações:

-   create vault
-   delete vault
-   open vault

------------------------------------------------------------------------

# 37. Tela: Vault Members

Lista:

-   user
-   role
-   joined_at

Ações:

-   change role
-   remove member

------------------------------------------------------------------------

# 38. Tela: Invites

Lista:

-   vault
-   role
-   inviter
-   expires

Botões:

-   accept
-   decline

------------------------------------------------------------------------

# 39. Tela: Sync Status

Mostra:

-   connected
-   last event id
-   sync progress
-   pending uploads
-   pending downloads

------------------------------------------------------------------------

# 40. Tela: Sync Logs

Tabela:

-   timestamp
-   event
-   file
-   device
-   details

------------------------------------------------------------------------

# 41. Tela: File History

Lista:

-   version
-   user
-   device
-   timestamp

Ações:

-   view diff
-   restore version

------------------------------------------------------------------------

# 42. Tela: Diff Viewer

Layout split:

local \| remote

------------------------------------------------------------------------

# 43. Tela: Conflict Resolver

Mostra:

-   local version
-   remote version
-   merge result

Botões:

-   use local
-   use remote
-   merge manually

------------------------------------------------------------------------

# 44. Tela: Sync Settings

Opções:

-   enable sync
-   selective sync
-   max upload size
-   delta threshold

------------------------------------------------------------------------

# 45. Tela: Activity Feed

Mostra:

-   user edits
-   file updates
-   vault activity

------------------------------------------------------------------------

# 46. Tela: Shared Vault Activity

Mostra:

-   user
-   action
-   file
-   timestamp

------------------------------------------------------------------------

# 47. Tela: Vault Key Recovery

Permite:

reimport vault key

------------------------------------------------------------------------

# 48. Tela: Storage Usage

Mostra:

-   vault size
-   files count
-   delta usage

------------------------------------------------------------------------

# 49. Arquitetura do Sync Engine

SyncEngine ├─ AuthManager ├─ DeviceManager ├─ VaultManager ├─ FileSync │
├─ SnapshotManager │ ├─ DeltaManager │ └─ ConflictResolver ├─
EventStream └─ Logger

------------------------------------------------------------------------

# 50. Fluxo Completo de Sync

Login → Load vault list → Select vault → Initial sync → Open SSE → Watch
filesystem → Upload changes → Receive events → Apply changes

------------------------------------------------------------------------

# 51. Garantias do Sistema

-   offline first
-   eventual consistency
-   encrypted vault data
-   device identity
-   versioned snapshots
-   CRDT collaboration
