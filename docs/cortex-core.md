# Cortex — Especificação de Implementação do Core

> Documento de implementação técnica para uso com Claude Code.  
> Versão 1.0 — Sem exemplos de código — Nível de detalhe: arquitetura + comportamento esperado por feature.  
> Decisões arquiteturais resolvidas: MiniSearch (busca), Zustand (estado), tauri-specta (IPC tipado), vault-id por UUID, plugin hot-reload via file watch + reimport, JWT com refresh token rotativo (auth), SSE + HTTP REST (protocolo sync), Device ID + Device Token (identity), Tags como entidades UUID com merge por campo no sync.  
> Adicionado: Gerenciamento de Tabs (seção 18 expandida), Note Cache Layer (seção 23), Sync e Resolução de Conflitos (seção 24), Theme Token Bridge — CSS → React Native (seção 25), Autenticação + Protocolo + Device Identity (seção 26), Sistema de Tags — Tag Manager (seção 27), UI Nativa — Princípios, Context Menus e macOS Menubar (seção 28), Layout da Sidebar + vibrancy macOS + traffic lights (seção 29), Plugin API Referência Completa para Desenvolvedores (seção 30), Sync — Aprofundamento: Merge, Fila, E2EE e Edge Cases (seção 31), Syntax Highlighting em Blocos de Código (seção 32).  
> Atualizado: Seção 1 com árvore de pastas completa. Seção 2 com módulos Rust do sync e keychain. Seção 13 (busca) e Seção 24 (sync) referenciadas pela seção 27.

---

## Índice

1. [Arquitetura do Monorepo (Bun)](#1-arquitetura-do-monorepo-bun)
2. [Camada Rust/Nativa — Fronteira de Responsabilidades](#2-camada-rustnativa--fronteira-de-responsabilidades)
3. [IPC Layer — tauri-specta e Tipos Gerados](#3-ipc-layer--tauri-specta-e-tipos-gerados)
4. [Abstração de Plataforma — Compatibilidade Futura com React Native](#4-abstração-de-plataforma--compatibilidade-futura-com-react-native)
5. [Arquitetura Modular e Sistema de Plugins](#5-arquitetura-modular-e-sistema-de-plugins)
6. [Plugin Hot-Reload em Desenvolvimento](#6-plugin-hot-reload-em-desenvolvimento)
7. [Gerenciamento de Estado — Zustand](#7-gerenciamento-de-estado--zustand)
8. [Sistema de Temas com Variáveis CSS](#8-sistema-de-temas-com-variáveis-css)
9. [Gerenciamento de Configurações — Cache e Disco](#9-gerenciamento-de-configurações--cache-e-disco)
10. [Vault Identity — UUID Persistido](#10-vault-identity--uuid-persistido)
11. [Modos do Editor — Preview, Side-by-Side e Live Preview](#11-modos-do-editor--preview-side-by-side-e-live-preview)
12. [Live Preview — Comportamento por Tag Markdown](#12-live-preview--comportamento-por-tag-markdown)
13. [Motor de Busca — MiniSearch](#13-motor-de-busca--minisearch)
14. [Busca com Filtros na Sidebar](#14-busca-com-filtros-na-sidebar)
15. [Navegação Rápida (Quick Switcher)](#15-navegação-rápida-quick-switcher)
16. [Command Palette](#16-command-palette)
17. [Sistema de Shortcuts](#17-sistema-de-shortcuts)
18. [Sistema de Views e Split de Panes](#18-sistema-de-views-e-split-de-panes)
19. [Sistema de Ícones com Lucide React](#19-sistema-de-ícones-com-lucide-react)
20. [Configurações de Plugins — Auto-registro na Settings UI](#20-configurações-de-plugins--auto-registro-na-settings-ui)
21. [Tela de Configurações Globais](#21-tela-de-configurações-globais)
22. [Troca Rápida de Vault](#22-troca-rápida-de-vault)
23. [Note Cache Layer — Cache de Notas em Memória](#23-note-cache-layer--cache-de-notas-em-memória)
24. [Sync e Resolução de Conflitos](#24-sync-e-resolução-de-conflitos)
25. [Theme Token Bridge — CSS → React Native](#25-theme-token-bridge--css--react-native)
26. [Autenticação, Protocolo de Comunicação e Identidade de Device](#26-autenticação-protocolo-de-comunicação-e-identidade-de-device)
27. [Sistema de Tags — Tag Manager](#27-sistema-de-tags--tag-manager)
28. [UI Nativa — Princípios e Implementação](#28-ui-nativa--princípios-e-implementação)
29. [Layout da Sidebar Esquerda e Integração Nativa macOS](#29-layout-da-sidebar-esquerda-e-integração-nativa-macos)
30. [Plugin API — Referência Completa para Desenvolvedores](#30-plugin-api--referência-completa-para-desenvolvedores)
31. [Sync — Aprofundamento: Merge, Fila, Criptografia e Edge Cases](#31-sync--aprofundamento-merge-fila-criptografia-e-edge-cases)
32. [Syntax Highlighting em Blocos de Código](#32-syntax-highlighting-em-blocos-de-código)
33. [Apêndice A — Decisões Arquiteturais Resolvidas](#apêndice-a--decisões-arquiteturais-resolvidas)
34. [Apêndice B — Operações por Responsabilidade](#apêndice-b--operações-por-responsabilidade)

---

## 1. Arquitetura do Monorepo (Bun)

### Estrutura de pacotes

O projeto é um monorepo gerenciado com Bun Workspaces. A separação em pacotes é obrigatória para que cada camada seja independente, testável e extensível por plugins.

```
cortex/
├── apps/
│   ├── desktop/                    # App Tauri (shell Rust + frontend React/Vite)
│   │   ├── src-tauri/              # Camada nativa Rust
│   │   │   ├── src/
│   │   │   │   ├── commands/       # Handlers IPC expostos ao frontend via tauri-specta
│   │   │   │   │   ├── vault.rs    # open_vault, close_vault, scan_vault, get_vault_metadata
│   │   │   │   │   ├── fs.rs       # read_file, write_file, delete_file, rename_file, hash_file
│   │   │   │   │   ├── watcher.rs  # start_watching, stop_watching (emite eventos Tauri)
│   │   │   │   │   ├── window.rs   # open_vault_in_new_window, get_window_label
│   │   │   │   │   ├── dialog.rs   # pick_folder, show_confirm_dialog
│   │   │   │   │   ├── shell.rs    # open_in_system_explorer, reveal_file
│   │   │   │   │   ├── registry.rs # update_vault_registry, read_vault_registry
│   │   │   │   │   ├── auth.rs     # keychain read/write para tokens e device identity
│   │   │   │   │   └── menu.rs     # show_context_menu, update_menu_item, menubar setup
│   │   │   │   ├── sync/           # Engine de sync — roda em thread Rust separada
│   │   │   │   │   ├── engine.rs   # Loop principal: detecta mudanças, enfileira ops, executa
│   │   │   │   │   ├── uploader.rs # Upload de arquivos via HTTP POST com retry e backoff
│   │   │   │   │   ├── downloader.rs # Download e aplicação de versões remotas
│   │   │   │   │   ├── sse.rs      # Cliente SSE persistente: conecta, reconecta, emite eventos Tauri
│   │   │   │   │   ├── merge.rs    # Three-way merge via diff-match-patch (Markdown) e JSON merge
│   │   │   │   │   ├── conflict.rs # Detecção de conflito via hash triplo (local/remote/ancestor)
│   │   │   │   │   ├── db.rs       # Interface com sync.db (SQLite): leitura e escrita de sync_state
│   │   │   │   │   └── auth.rs     # Refresh de access token, fluxo de device token
│   │   │   │   ├── keychain/       # Abstração cross-platform para keychain do OS
│   │   │   │   │   └── mod.rs      # macOS Keychain, Windows Credential Manager, Linux libsecret
│   │   │   │   ├── protocol/       # Protocolo cortex:// para servir assets do vault ao webview
│   │   │   │   │   └── mod.rs
│   │   │   │   └── main.rs         # Entry point Tauri: registra comandos, plugins, setup inicial
│   │   │   └── Cargo.toml
│   │   └── src/                    # Entrada React — composição dos packages
│   │       ├── main.tsx            # initPlatform(tauriAdapter), monta React app
│   │       └── App.tsx             # Composição de layout, providers, workspace
│   └── mobile/                     # (futuro) React Native — consome packages/core e packages/platform
├── packages/
│   ├── core/                       # Lógica pura: vault, metadata, eventos, Note Cache, índice, utiliza o plataform que sera adaptado para cada sistema.
│   ├── editor/                     # Motor de edição: CodeMirror 6 + extensões Markdown + Live Preview
│   ├── ui/                         # Componentes React compartilhados, design system
│   ├── plugin-api/                 # Contratos públicos que plugins podem importar
│   ├── platform/                   # Abstração de plataforma: adapters para Tauri e RN, definição dos tipos principais do filesystem, dialogs e etc.
│   ├── settings/                   # Engine de configurações, cache em memória, persistência
│   ├── search/                     # MiniSearch: indexação, serialização, queries
│   ├── theme/                      # Engine de temas, variáveis CSS, Theme Token Bridge (CSS→RN)
│   ├── sync-client/                # Estado reativo do sync no frontend: status, conflitos, UI bridge
│   └── ipc/                        # Implementação do pacote plataform para o tauri, utilizando suas dependencias e implementações
├── plugins/                        # Plugins core bundled
│   ├── file-explorer/
│   ├── quick-switcher/
│   └── ...
├── bun.lockb
└── bunfig.toml
```

### O que fica no Rust vs. no TypeScript para o Sync

A divisão do sync segue o mesmo princípio do restante do app: Rust cuida de tudo que é I/O nativo, rede, criptografia e persistência local pesada. TypeScript cuida do estado reativo, da UI de conflitos e da ponte com o restante do frontend.

**Rust ()** — o engine de sync completo:
- Toda comunicação de rede: cliente SSE, HTTP uploads/downloads, refresh de tokens.
- Leitura e escrita de arquivos do vault para operações de sync.
-  via SQLite: tabela  com status por arquivo.
- Three-way merge de Markdown () e merge de JSON de configurações.
- Detecção de conflito via comparação de hashes.
- Gestão do keychain nativo para tokens e device identity ().
- O engine roda em thread Rust separada — nunca bloqueia a UI.

**TypeScript ()** — a camada reativa do frontend:
- Assina os eventos Tauri emitidos pelo engine Rust (, , , ).
- Mantém uma Zustand store () com o estado visível: status por vault, lista de conflitos pendentes, log de operações recentes.
- Expõe para componentes React o estado de sync sem nenhum acesso direto à rede ou ao .
- Contém a UI de resolução de conflito, o diff viewer e o painel de histórico de versões.
- Expõe via  os eventos de sync que plugins podem assinar (ex: um plugin pode reagir a ).

### Regras de dependência entre pacotes

- `packages/core` não depende de nenhum pacote interno. Toda operação de I/O é feita via contratos do `packages/platform` — nunca diretamente via Node/Bun APIs ou Tauri.
- `packages/platform` define interfaces abstratas e provê implementações concretas por plataforma (Tauri para desktop, adapters para React Native no futuro).
- `packages/editor` depende de `core` e `plugin-api`. Nunca depende de `ui` diretamente.
- `packages/ui` depende de `core` e `plugin-api`. Fornece primitivos visuais sem conhecimento de plataforma.
- `packages/plugin-api` é o único pacote que plugins externos importam. Re-exporta contratos estáveis de `core`, `editor`, `ui`, `platform` e eventos públicos do `sync-client`. Nunca exporta implementações internas.
- `packages/settings` depende de `core` e `platform`.
- `packages/search` depende de `core`. Não depende de `platform` — opera puramente em memória.
- `packages/sync-client` depende de `core` e `ipc`. Não acessa rede diretamente — toda comunicação de sync é via eventos Tauri do engine Rust.
- `packages/ipc` contém apenas os tipos gerados pelo tauri-specta e os wrappers que chamam os comandos Tauri. Nenhum outro pacote chama Tauri diretamente — apenas o adapter Tauri em `packages/platform` e o `packages/sync-client` (para eventos de sync).
- `apps/desktop` é o único consumidor de `packages/ipc` e de código Tauri.
- `plugins/*` dependem apenas de `packages/plugin-api`.

### Convenção de build

Cada pacote tem seu próprio `package.json` com `exports` explícitos. O Bun resolve workspaces via `workspace:*`. O bundler é Vite (em `apps/desktop`) com `@vitejs/plugin-react`. Pacotes são importados como source TypeScript — não como builds intermediários — para que o Vite faça tree-shaking e HMR de forma unificada em desenvolvimento.

O módulo `sync/` em `src-tauri` não é um crate separado — faz parte do binário Tauri único. Isso simplifica o build e evita overhead de comunicação inter-processo. A thread de sync é spawned internamente no processo Tauri e se comunica com o thread principal via canais Rust (`tokio::sync::mpsc`).

---

## 2. Camada Rust/Nativa — Fronteira de Responsabilidades

### Princípio

O Rust é usado somente onde oferece vantagem real sobre TypeScript: acesso nativo ao OS, performance de I/O e operações que requerem APIs do sistema. O objetivo não é "colocar tudo no Rust", mas delegar ao Rust o que genuinamente precisa de execução nativa. Se pode rodar eficientemente no frontend sem sacrifício perceptível de UX, fica em TypeScript.

### O que é responsabilidade do Rust

**Operações de sistema de arquivos:**
- Leitura e escrita de arquivos do vault (`read_file`, `write_file`, `delete_file`, `rename_file`, `create_dir`).
- Listagem de diretório recursiva (`list_vault_files`).
- File watching via crate `notify`: detecta mudanças no sistema de arquivos e emite eventos Tauri ao frontend. O frontend nunca implementa polling — toda reatividade de arquivo vem daqui.

**Operações de janela e OS:**
- Gerenciamento de múltiplas janelas (uma por vault aberto em nova janela).
- Diálogos nativos: seleção de pasta (`pick_folder`), confirmações, "salvar como".
- Tray icon e notificações nativas.
- Protocolo customizado `cortex://` para servir assets e imagens do vault sem expor paths locais ao webview.

**Operações computacionalmente intensivas delegadas ao Rust:**
- Hash de arquivo via `blake3` para detecção de mudanças — extremamente rápido em Rust nativo.
- Scan inicial do vault: ao abrir um vault grande, o Rust percorre todo o filesystem, coleta paths, tamanhos e mtimes, e retorna a estrutura eficientemente. O TypeScript indexa essa estrutura no MiniSearch.
- Operações de zip/unzip para importação/exportação de vaults.

### O que NÃO é responsabilidade do Rust

- Parser de Markdown (feito no frontend via Lezer/CodeMirror).
- Lógica de busca e indexação (MiniSearch, no frontend).
- Gerenciamento de estado da UI (Zustand, no frontend).
- Lógica de plugins.
- Sistema de shortcuts, command palette, settings.
- Qualquer lógica de negócio que não precise de I/O nativo.

### Organização dos comandos Rust

**Comandos IPC** (em `src-tauri/src/commands/`) — expostos ao frontend via tauri-specta:

- `vault.rs`: `open_vault`, `close_vault`, `list_vault_files`, `scan_vault`, `get_vault_metadata`
- `fs.rs`: `read_file`, `write_file`, `delete_file`, `rename_file`, `create_dir`, `hash_file`
- `watcher.rs`: `start_watching`, `stop_watching` (emite eventos Tauri — não usa retorno de comando)
- `window.rs`: `open_vault_in_new_window`, `get_window_label`
- `dialog.rs`: `pick_folder`, `show_confirm_dialog`
- `shell.rs`: `open_in_system_explorer`, `reveal_file`
- `registry.rs`: `update_vault_registry`, `read_vault_registry`
- `auth.rs`: `sync_login`, `sync_logout`, `get_sync_status` — lê/escreve tokens e device identity no keychain; refresh transparente de access token

**Módulo de sync** (em `src-tauri/src/sync/`) — interno ao processo Tauri, sem exposição IPC direta:

- `engine.rs`: loop principal da thread de sync. Consome eventos do file watcher, mantém fila de uploads/downloads pendentes, coordena os demais módulos. Comunica-se com o thread Tauri principal via `tokio::sync::mpsc`.
- `uploader.rs`: executa uploads via HTTP POST com retry exponencial. Lê arquivos do disco, envia com metadata (`file_path`, `local_hash`, `ancestor_hash`, `mtime`). Aguarda `dirty === false` no Note Cache antes de uplodar.
- `downloader.rs`: executa downloads de versões remotas, aplica ao disco, notifica o frontend via evento Tauri `SyncFileUpdated`.
- `sse.rs`: cliente SSE persistente autenticado. Mantém conexão com o servidor, reconecta com backoff exponencial e `Last-Event-ID`, converte eventos SSE em mensagens para o `engine.rs`.
- `merge.rs`: three-way merge de arquivos Markdown via `diff-match-patch`; merge de objetos JSON para configurações.
- `conflict.rs`: detecção de conflito via comparação de hashes (local, remote, ancestor). Decide a estratégia de resolução conforme configuração do usuário.
- `db.rs`: interface com `vault/.cortex/sync.db` via SQLite (crate `rusqlite`). Lê e escreve a tabela `sync_state`. Único módulo que toca o banco de dados de sync.
- `auth.rs` (interno ao sync): gerencia o ciclo de vida do access token em memória, detecta expiração, chama refresh via HTTP, comunica `SyncAuthRequired` ao frontend quando refresh também falha.

**Módulo de keychain** (em `src-tauri/src/keychain/`) — abstração cross-platform:

Abstrai as APIs nativas de armazenamento seguro de credenciais. A implementação varia por OS mas a interface interna é uniforme: `get(key)`, `set(key, value)`, `delete(key)`. Usada pelos módulos `commands/auth.rs` e `sync/auth.rs`.

- macOS: `Security.framework` (Keychain Services)
- Windows: `Windows Credential Manager` via `credentialmanager` crate
- Linux: `libsecret` via D-Bus (Secret Service API)

---

## 3. IPC Layer — tauri-specta e Tipos Gerados

### Decisão

Usamos **tauri-specta v2** para geração automática de tipos TypeScript a partir das assinaturas dos comandos e eventos Rust. Isso garante type safety ponta a ponta: se o tipo de retorno de um comando Rust muda, o TypeScript compila com erro imediatamente — sem contratos manuais para manter.

### Como funciona

O tauri-specta instrumenta os comandos Tauri com a macro `#[specta::specta]` e registra todos os comandos via `tauri_specta::collect_commands!`. Em modo debug (`#[cfg(debug_assertions)]`), ao iniciar o app, o tauri-specta gera automaticamente o arquivo `packages/ipc/src/bindings.ts` com funções tipadas que chamam os comandos Rust via `invoke`.

O arquivo `bindings.ts` **nunca é editado manualmente**. É gerado em desenvolvimento e commitado para que o CI e outros desenvolvedores possam usar os tipos sem rodar o app localmente. Uma tarefa de CI verifica que o arquivo está atualizado.

### Estrutura do packages/ipc

```
packages/ipc/
├── src/
│   ├── bindings.ts     # AUTO-GERADO pelo tauri-specta. Jamais editar manualmente.
│   └── index.ts        # Re-exporta bindings + wrappers de conveniência
```

**Wrappers de conveniência** em `index.ts`: encapsulam padrões recorrentes, como operações que devem emitir eventos Zustand antes/depois, ou retry automático em falhas de lock de arquivo. A lógica de chamada fica nos wrappers — não em `bindings.ts`.

### Eventos Tauri tipados (Rust → Frontend)

Eventos emitidos pelo Rust também são tipados via tauri-specta. O `packages/ipc` exporta funções `subscribe<EventName>(callback)` com os tipos corretos.

O principal evento é `VaultFileChanged { path: string, kind: "created" | "modified" | "deleted" | "renamed" }`. O frontend assina esse evento na inicialização do vault e usa para atualizar o índice MiniSearch e invalidar caches de leitura.

---

## 4. Abstração de Plataforma — Compatibilidade Futura com React Native

### O problema

`packages/core` precisa executar no Tauri desktop hoje e no React Native mobile no futuro. As APIs de I/O são completamente diferentes: Tauri usa IPC para Rust; React Native usaria `react-native-fs` ou similar. Se o `core` chamasse o IPC Tauri diretamente, nunca poderia rodar no React Native.

### Solução: Platform Adapter

`packages/platform` define **interfaces TypeScript puras** para operações nativas e provê implementações concretas por plataforma:

```
packages/platform/
├── src/
│   ├── interfaces/
│   │   ├── FileSystem.ts     # readFile, writeFile, deleteFile, listDir, watchDir, hashFile...
│   │   ├── Dialog.ts         # pickFolder, showConfirm...
│   │   └── Storage.ts        # getAppDataDir, getVaultConfigDir...
│   ├── adapters/
│   │   ├── tauri/            # Implementação via packages/ipc (comandos Rust)
│   │   └── react-native/     # (futuro) Implementação via react-native-fs etc.
│   └── index.ts              # Exporta initPlatform(), platform singleton
```

### Como é consumido

`apps/desktop/src/main.tsx` chama `initPlatform(tauriAdapter)` na inicialização. Isso registra o adapter ativo numa singleton interna do `packages/platform`.

`packages/core` importa de `packages/platform`:
```
import { platform } from '@cortex/platform'
const content = await platform.fs.readFile(path)
```

No desktop, isso chama Rust via IPC. No futuro React Native, chamaria a API nativa equivalente. Nenhuma mudança necessária em `packages/core`.

### Regra de abstração mínima

Só criamos abstrações em `packages/platform` para operações que **genuinamente diferem entre plataformas** e que o `core` precisa realizar. Operações idênticas entre plataformas (parsear Markdown, busca MiniSearch, estado Zustand) nunca passam pelo adapter. A abstração existe onde é necessária — sem overhead desnecessário.

---

## 5. Arquitetura Modular e Sistema de Plugins

### Princípio central

Toda feature do Cortex é implementada como se fosse um plugin de primeira classe. O core não tem tratamento especial. A distinção entre "core plugin" e "community plugin" é apenas de origem (bundled vs. instalado), não de capacidade de API.

> Esta seção documenta a visão de alto nível. A especificação completa e canônica da Plugin API — incluindo todas as assinaturas de métodos, o sistema de permissões, ciclo de vida detalhado, acesso ao CM6, secret storage, React cross-platform e distribuição — está na **seção 30**.

### Ciclo de vida de um plugin

Estados: `unloaded → loading → loaded → unloading → unloaded`. O Plugin Manager em `packages/core` controla as transições.

**Fase `loading`:** O plugin recebe uma instância da `PluginAPI` e registra seus recursos. Deve ser síncrono ou assíncrono mínimo — apenas declarações de intenção (comandos, views, settings, event handlers).

**Fase `loaded`:** Plugin ativo. Todos os recursos registrados funcionando. O plugin reage a eventos do sistema.

**Fase `unloading`:** O Plugin Manager chama o cleanup. Recursos registrados via `PluginAPI` são automaticamente desregistrados pelo framework. Recursos externos (timers, sockets, DOM nodes não-gerenciados) devem ser limpos pelo plugin.

### O que a PluginAPI expõe

A `PluginAPI` é dividida em namespaces:

- **`api.vault`** — leitura/escrita de arquivos, listagem, watch de mudanças (via platform adapter — nunca Tauri diretamente)
- **`api.editor`** — acesso ao editor ativo, registrar extensões CodeMirror, decorações, post-processors de Reading View
- **`api.workspace`** — abrir/fechar views, registrar tipos de view, manipular panes, split, Quick Switcher providers
- **`api.commands`** — registrar comandos no Command Palette com hotkeys padrão sugeridos
- **`api.settings`** — registrar schema de configurações (auto-gera UI na Settings)
- **`api.ui`** — registrar itens no ribbon, status bar, context menus, modais customizados
- **`api.events`** — pub/sub de eventos do sistema (nota aberta, arquivo modificado, vault trocado, etc.)
- **`api.icons`** — resolver ícones Lucide pelo nome ou registrar ícones SVG customizados
- **`api.search`** — registrar indexers customizados ou filtros adicionais na sidebar de busca

### Manifest do plugin

Cada plugin tem um `manifest.json`:
- `id`: identificador único (ex: `cortex-daily-notes`)
- `name`: nome legível
- `version`: semver
- `minCortexVersion`: versão mínima requerida
- `author`, `description`, `homepage`
- `permissions`: array declarativo (`["vault:write", "network"]`) — exibido ao usuário na instalação

### Sandbox e segurança

Community plugins são carregados como módulos ES em contexto controlado. Isolamento v1 é por contrato: a PluginAPI é a única interface exposta — os namespaces são objetos com métodos, não proxies de módulos internos. Plugins não têm acesso a stores Zustand diretamente nem a `packages/ipc`. No roadmap futuro: sandbox via worker thread com postMessage.

### Localização dos plugins

```
vault/.cortex/plugins/<plugin-id>/
├── manifest.json
├── main.js          # Bundle ESM do plugin
└── styles.css       # Opcional
```

Plugins bundled (core) ficam em `plugins/` na raiz do monorepo, compilados junto com o app no bundle Vite — não dependem de disco em runtime.

---

## 6. Plugin Hot-Reload em Desenvolvimento

### Objetivo

Desenvolvedores de plugins precisam de ciclo de feedback rápido: editar código do plugin e ver o efeito imediatamente no app, sem reiniciar o Cortex inteiro.

### Implementação para plugins externos

O Cortex expõe um **modo de desenvolvimento de plugin** nas configurações de desenvolvedor. Nesse modo:

1. O usuário especifica um `devPluginPath`: path de pasta local contendo o plugin em desenvolvimento, com bundler do plugin rodando em watch mode.
2. O Cortex usa o file watcher Rust (`notify`) para monitorar o `main.js` nessa pasta.
3. Quando `main.js` muda:
   - Plugin Manager executa ciclo `unloading` do plugin atual.
   - Invalida o módulo do plugin no cache ES via query string de cache-busting: `import(path + '?t=' + Date.now())`.
   - Reimporta e executa o novo `main.js`.
   - Executa ciclo `loading` com a nova versão.
4. Toast notifica: "Plugin `nome` recarregado (Xms)".

**Por que não usar HMR do Vite para plugins externos:** O Vite HMR só funciona para módulos dentro do grafo de build do Vite. Plugins externos têm seu próprio bundler. A solução de reimport via file watch é agnóstica ao bundler do plugin.

### Para plugins core (no monorepo)

Fazem parte do grafo de build do Vite. O HMR nativo do Vite funciona automaticamente. Mudanças em componentes React de plugins core são refletidas instantaneamente sem recarregar o plugin.

### Template de plugin

O repositório Cortex inclui `plugins/_template/` configurado com Vite em watch mode, com output apontando para uma pasta registrável como `devPluginPath`. O README do template descreve o fluxo completo para o desenvolvedor.

---

## 7. Gerenciamento de Estado — Zustand

### Decisão e justificativa

O Cortex usa **Zustand** como gerenciador de estado global do frontend.
- API mínima sem boilerplate — stores são objetos simples com métodos.
- Sem Provider wrapper — stores são singletons acessíveis de qualquer componente ou função fora do React.
- Suporte nativo a middleware (immer para mutações imutáveis, devtools para debug).
- Performance superior ao Context API para atualizações frequentes (ex: posição do cursor no editor).
- Compatível com React Native sem alteração.

### Organização das stores

Cada domínio tem sua própria store. Stores não se importam diretamente — comunicam via eventos do `packages/core` (pub/sub) ou via actions que um componente chama em sequência. Isso evita acoplamento circular.

```
packages/core/src/stores/
├── vaultStore.ts         # Vault ativo, lista de arquivos, metadata do vault
├── workspaceStore.ts     # Layout de panes, árvore de splits, tabs por pane
├── editorStore.ts        # Estado do editor ativo, modo (live/source/preview), cursor
├── searchStore.ts        # Query ativa, resultados, filtros ativos, loading state
├── settingsStore.ts      # Espelho reativo do SettingsManager
├── pluginStore.ts        # Plugins carregados, status de cada plugin
└── uiStore.ts            # Estado global de UI: modais abertos, sidebar collapsed, etc.
```

### Padrão de uso

- **State:** dados reativos acessados via `useStore(s => s.field)`.
- **Actions:** funções que modificam o estado. Podem ser assíncronas e chamar o IPC layer.
- **Selectors:** funções derivadas (com `zustand/middleware/computed`).

O sistema de plugins acessa stores via `api.events` (pub/sub) — não importa stores diretamente. Isso garante que mudanças internas de stores não quebrem plugins.

### Middleware em todas as stores

- **`immer`**: permite escrever mutações diretas que produzem estado imutável.
- **`devtools`**: em `development`, conecta ao Redux DevTools Extension para inspeção de estado.

---

## 8. Sistema de Temas com Variáveis CSS

### Filosofia

O Cortex não usa valores hardcoded em CSS. 100% das decisões visuais são controladas via custom properties CSS definidas no elemento `.cortex-app` (raiz do app React).

### Hierarquia de variáveis

**Nível 1 — Primitivos:** valores brutos sem semântica de contexto.
```
--color-gray-50 até --color-gray-950
--color-blue-500, --color-green-500, etc.
--font-size-xs, sm, md, lg, xl, 2xl
--spacing-1 até --spacing-16
--radius-sm, md, lg, full
--shadow-sm, md, lg
```

**Nível 2 — Semânticos:** apontam para primitivos e têm contexto de uso claro.
```
--color-background-primary      (fundo principal do app)
--color-background-secondary    (sidebars, painéis)
--color-background-elevated     (modais, dropdowns, tooltips)
--color-background-hover        (hover state de itens interativos)
--color-text-primary
--color-text-secondary
--color-text-muted
--color-text-on-accent
--color-accent-primary          (links, seleções, botões primários)
--color-accent-secondary
--color-border-default
--color-border-subtle
--color-error
--color-warning
--color-success
--editor-font-family
--editor-font-size
--editor-line-height
--ui-font-family
--ui-font-size
--ui-border-radius
--icon-size                     (tamanho padrão de ícones — herdado por currentColor)
```

### Como temas funcionam

Um tema é um arquivo CSS que redefine variáveis semânticas apenas — nunca sobreescreve classes internas. O `packages/theme`:
1. Carrega o CSS do tema (disco ou cache do `packages/settings`).
2. Injeta via `<style id="cortex-theme">` no `<head>`.
3. Aplica a classe do tema em `.cortex-app` (ex: `.theme-dark`, `.theme-<id>`).
4. Remove o CSS anterior antes de aplicar o novo.

### Temas dark/light automático

O tema padrão tem variantes `.theme-dark` e `.theme-light`. Quando "Automático", usa `window.matchMedia('(prefers-color-scheme: dark)')` e reage a mudanças do sistema em tempo real.

### Temas customizados de usuário

Arquivos `.css` em `vault/.cortex/themes/` são detectados pelo file watcher e listados nas configurações de aparência.

### CSS Snippets

Arquivos `.css` em `vault/.cortex/snippets/` são ativáveis/desativáveis individualmente. Injetados após o tema. Cada snippet tem sua própria `<style>` tag com id único.

### Integração com plugins

Plugins registram CSS via `api.ui.registerStyle(css)`. O CSS é automaticamente escopado com prefixo do `plugin-id`. Plugins devem usar variáveis semânticas do sistema — não valores hardcoded — para responder a mudanças de tema.

### Compatibilidade Cross-Platform (Desktop + React Native)

Temas que usam apenas variáveis semânticas são automaticamente compatíveis com o React Native. O `packages/theme` mantém um pipeline de extração que converte variáveis CSS em um `ThemeTokenMap` (objeto JS) consumível pelo mobile sem nenhuma ação adicional do criador do tema. Ver **seção 25** para a especificação completa da Theme Token Bridge.

---

## 9. Gerenciamento de Configurações — Cache e Disco

### Arquitetura de duas camadas

O `packages/settings` implementa uma store com duas camadas: **memória (cache)** e **disco**.

**Regra fundamental:** Toda leitura vai ao cache primeiro. Escrita vai ao cache imediatamente (síncrono do ponto de vista do chamador) e agenda flush em disco com debounce de 1 segundo. Múltiplas escritas no mesmo segundo são agrupadas em um único write.

### Localização dos arquivos

```
vault/.cortex/
├── app.json              # Configurações gerais: editor, comportamento
├── appearance.json       # Tema ativo, snippets ativos, zoom, fonte
├── hotkeys.json          # Overrides de shortcuts do usuário
├── workspace.json        # Estado do workspace: panes, tabs, splits
├── vault-id.json         # UUID do vault (ver seção 10)
└── plugins/
    └── <plugin-id>/
        └── data.json     # Dados e configurações de cada plugin
```

Configurações globais (todos os vaults) em `app_data_dir` (gerenciado pelo Tauri via `platform.storage`):
```
~/.cortex/
├── vaults.json           # Lista de vaults (uuid, path, nome, lastOpened, ícone, cor)
└── global.json           # Língua, dimensões de janela, telemetria
```

### Estrutura interna do SettingsManager

Singleton por vault. Na inicialização:
1. Lê todos os `.json` do `.cortex/` via `platform.fs`.
2. Valida cada arquivo via Zod. Valores inválidos → defaults (nunca crasha o app).
3. Popula o cache em memória.
4. Sincroniza com a `settingsStore` Zustand — valores disponíveis reativamente nos componentes.

**Flush:** debounce de 1 segundo em operações normais. No `beforeunload` (fechamento do app): flush síncrono imediato via `platform.fs.writeFile`.

### API pública

- `get(section, key)` → valor do cache
- `set(section, key, value)` → cache + agenda flush + atualiza `settingsStore`
- `getSection(section)` → objeto completo da seção
- `subscribe(section, callback)` → callback em qualquer mudança na seção
- `reset(section)` → restaura defaults e persiste

### Configurações de plugins

Plugins registram schema via `api.settings.register(schema)`. O SettingsManager cria `plugins/<plugin-id>` automaticamente. Plugins acessam via `api.settings.get(key)` sem gerenciar paths. Persistência segue o mesmo mecanismo (cache + flush).

---

## 10. Vault Identity — UUID Persistido

### Decisão

Vaults são identificados por um **UUID v4 gerado na primeira abertura**, persistido em `vault/.cortex/vault-id.json`. O UUID é a identidade permanente — o path é mutável.

### Por que não usar o path como ID

Usar path quebra quando o usuário move o vault, renomeia a pasta, ou sincroniza entre devices com estruturas de diretório diferentes. O UUID garante reconhecimento estável independente do path.

### Fluxo de identificação

**Primeira abertura:**
1. Rust lê `vault/.cortex/vault-id.json`.
2. Se não existe: Rust gera UUID v4, escreve o arquivo, retorna ao frontend.
3. Se existe: retorna o UUID existente.
4. Frontend registra `{ uuid, path, name, lastOpened }` em `~/.cortex/vaults.json`.

**Abertura subsequente:** O Cortex usa o path registrado. Se não encontrado: diálogo "Vault não encontrado. Deseja localizar manualmente?" — o usuário seleciona a nova pasta, o path é atualizado mantendo o UUID.

### Sync entre devices

O `vault-id.json` viaja junto com os outros arquivos do vault no sync. O device que abrir pela primeira vez lê o UUID existente e registra localmente com o path local correto — sem gerar novo UUID.

---

## 11. Modos do Editor — Preview, Side-by-Side e Live Preview

### Os três modos

**Modo Preview Only (Reading View):**
Markdown renderizado como HTML read-only via pipeline `remark` + `rehype`. Sem instância CodeMirror ativa. Links internos navegam. Embeds resolvidos inline. Sem cursor de edição.

**Modo Side-by-Side (Source + Preview):**
Dois painéis com o mesmo arquivo. Esquerdo: CodeMirror em Source Mode (sem decorações live preview). Direito: Reading View. Scroll sincronizado por linha: Source Mode expõe linha no topo da viewport; Reading View calcula o elemento HTML correspondente e faz scroll proporcional, e vice-versa.

**Modo Live Preview:**
Única instância CodeMirror 6 com decorações in-place. Modo principal e padrão. Descrito em detalhe na seção 12.

### Persistência do modo por nota

Modo de cada nota armazenado em `workspace.json`. Reabrir uma nota restaura o último modo.

### Transição entre modos

O componente `NoteView` gerencia qual sub-componente renderizar sem recriar o componente raiz. O arquivo é o mesmo — só a apresentação muda. A transição não causa perda de posição de scroll.

---

## 12. Live Preview — Comportamento por Tag Markdown

### Fundação: CodeMirror 6 com Lezer

Live Preview é construído sobre CodeMirror 6. O parser Lezer gera uma syntax tree em tempo real. Extensões `ViewPlugin` operam sobre essa tree para adicionar `Decoration`s que transformam a aparência sem modificar o documento.

### Princípio central: "Escopo de cursor"

> **Um token de syntax (ex: `**`, `#`, `[`) só é ocultado/transformado se o cursor NÃO estiver dentro do escopo daquele elemento.**

O "escopo" é o range completo do elemento na syntax tree. Para `**texto em negrito**`, o escopo vai do primeiro `*` até o último `*`. Cursor dentro do range = tokens visíveis. Cursor fora = tokens ocultos, conteúdo renderizado.

Implementado como `ViewPlugin` que:
1. Reconstrui decorações em `update.docChanged` e `update.selectionSet`.
2. Para cada elemento Markdown na syntax tree, verifica se alguma seleção intersecta o range.
3. Itera `view.visibleRanges` para performance — não processa o documento inteiro por keystroke.
4. Usa `RangeSetBuilder` para construir decorações em ordem ascendente (requisito CM6).

### Como tokens são ocultos (sem quebrar o cursor)

**NUNCA usar `display: none`** — quebra posicionamento do cursor do CM6.

Técnica correta: `Decoration.mark` com classe CSS:
```css
.cm-syntax-hidden {
  font-size: 0 !important;
  width: 0 !important;
}
```

Para casos onde zero-width não é suficiente:
```css
font-family: monospace;
font-size: 1px;
letter-spacing: -1ch;
color: transparent;
```

### Implementação por tipo de elemento

**Headings (`#` a `######`)**
- Fora do escopo: `#` ocultos. Linha recebe `Decoration.line` com classe `.cm-heading-1` a `.cm-heading-6`, aplicando tamanho/peso/cor via variáveis CSS `--heading-N-*`.
- Dentro do escopo (cursor na linha): `#` visíveis com cor de syntax. Classe de heading permanece para manter o tamanho visual.

**Negrito (`**texto**` ou `__texto__`)**
- Fora: `**`/`__` ocultos, texto recebe `.cm-bold`.
- Dentro: tokens visíveis, texto permanece em negrito.

**Itálico (`*texto*` ou `_texto_`)**
- Fora: `*`/`_` ocultos, texto recebe `.cm-italic`.
- Dentro: tokens visíveis.

**Negrito+Itálico (`***texto***`)**
- Escopo único dos 3 asteriscos. Fora: todos ocultos, texto bold+italic. Dentro: todos visíveis.

**Strikethrough (`~~texto~~`)**
- Fora: `~~` ocultos, texto recebe `.cm-strikethrough`.
- Dentro: tokens visíveis.

**Código inline (`` `código` ``)**
- Fora: backticks ocultas, texto recebe estilo monospace + background sutil.
- Dentro: backticks visíveis.

**Links (`[texto](url)`)**
- Fora: `[`, `]`, `(`, url e `)` ocultos. Apenas o texto do link visível com estilo de link. `Ctrl/Cmd+Click` abre o link.
- Dentro: toda a syntax visível.

**Links internos Wiki-style (`[[nome da nota]]`)**
- Fora: `[[` e `]]` ocultos. Nome da nota visível como link. Cor diferente se nota não existe (link quebrado). `Ctrl/Cmd+Click` navega para a nota.
- Dentro: `[[` e `]]` visíveis.

**Imagens (`![alt](url)` e `![[arquivo]]`)**
- Fora: syntax substituída por `Decoration.widget` que renderiza a imagem inline. Para paths locais, resolve via protocolo `cortex://`. Para URLs, fetch normal.
- Dentro: widget removido, syntax raw aparece.
- Se a imagem não carrega: ícone de fallback + texto do alt.

**Blocos de código (` ```lang ... ``` `)**
- Cursor dentro do bloco: linhas de ` ``` ` visíveis, conteúdo com syntax highlight da linguagem.
- Cursor fora: linhas de ` ``` ` ocultas, badge da linguagem no canto superior direito do bloco.
- Blocos de código usam word-wrap com preservação de espaços — sem scroll horizontal.

**Blockquotes (`>`)**
- Fora da linha: `>` oculto, linha recebe `.cm-blockquote` via `Decoration.line` (borda esquerda via CSS).
- Dentro da linha: `>` visível.

**Listas não-ordenadas (`-`, `*`, `+`)**
- Fora da linha: caractere substituído por `Decoration.widget` com bullet visual (ponto, círculo, quadrado por nível).
- Dentro da linha: caractere original visível.

**Listas ordenadas (`1.`, `2.`)**
- Número e ponto visíveis com estilo `.cm-list-number`.

**Checkboxes (`- [ ]` e `- [x]`)**
- Sempre renderizados como widget checkbox clicável, independente do cursor.
- Clicar edita o documento diretamente (`[ ]` ↔ `[x]`).
- Texto da task riscado quando `[x]`.

**Horizontal rule (`---`, `***`, `___`)**
- Fora: substituído por `Decoration.widget` com `<hr>` visual.
- Dentro: widget removido, raw text visível.

**Highlight (`==texto==`)**
- Fora: `==` ocultos, texto recebe `.cm-highlight` (background via `--color-highlight`).
- Dentro: `==` visíveis.

**Footnotes (`[^1]` e `[^1]: definição`)**
- Referências `[^1]` no corpo: renderizadas como superscript clicável fora do escopo.
- Definições no rodapé: estilo diferenciado fora do escopo.

**Tabelas Markdown**
- Fora: pipes `|` e hifens de separação substituídos por `Decoration.widget` que renderiza tabela HTML interativa (células editáveis via click).
- Dentro de qualquer célula: tabela inteira volta a raw text para edição.

**Math — LaTeX inline (`$...$`) e bloco (`$$...$$`)**
- Fora: renderizado via KaTeX como widget inline ou block.
- Dentro: raw text visível, widget removido.

**Frontmatter YAML (`---` no início)**
- Cursor fora do bloco: colapsado e substituído por widget "Properties" exibindo propriedades em formato legível, editável por campo.
- Cursor dentro: widget some, YAML raw aparece para edição direta.

### Performance

- Decorações reconstruídas apenas em `update.docChanged` ou `update.selectionSet`.
- `syntaxTree(state)` acessa a árvore sem re-parse.
- Iteração sobre `view.visibleRanges` para elementos de linha.
- `RangeSetBuilder` garante ordem ascendente obrigatória pelo CM6.
- Widgets de imagem e LaTeX são lazy: só renderizam quando entram no viewport.

---

## 13. Motor de Busca — MiniSearch

### Decisão

Usamos **MiniSearch** como motor de busca full-text. Roda inteiramente em memória no processo do frontend — sem dependências nativas, sem WASM complexo, sem round-trips IPC por query.

**Por que MiniSearch em vez de SQLite:**
- Vault pessoal tem tipicamente centenas a alguns milhares de notas. MiniSearch é ideal para esse volume: queries abaixo de 5ms para 10.000 documentos.
- SQLite em Tauri/webview requer bridges complexas (WASM + VFS ou IPC por query). MiniSearch opera direto no processo JS.
- O índice MiniSearch serializa/deserializa via JSON — persistência simples sem deps adicionais.
- SQLite traria valor real para queries relacionais complexas (JOINs, aggregations) — o que não é o caso para busca de notas. Para a feature futura de database/dashboards, SQLite ou similar será avaliado separadamente em `packages/database`, fora do escopo core.

### Estrutura do índice

Cada nota indexada tem os campos:
- `id`: path relativo da nota no vault (chave única e estável)
- `title`: nome do arquivo sem extensão
- `content`: conteúdo textual sem syntax Markdown (pré-processado)
- `tags`: array de tags extraídas (`#tag` no corpo e `tags:` no frontmatter)
- `aliases`: array de aliases do frontmatter
- `properties`: objeto com propriedades do frontmatter (para filtros)
- `mtime`: timestamp de modificação (para filtro por data)
- `folder`: path da pasta pai (para filtro por localização)

Campos com boost no MiniSearch: `title` (x3), `aliases` (x2), `tags` (x2), `content` (x1).

### Inicialização e persistência

**Na abertura do vault:**
1. Rust executa `scan_vault` → lista de arquivos com paths, tamanhos e mtimes (mais rápido que listagem via JS).
2. Frontend compara com índice serializado em `vault/.cortex/search-index.json`.
3. Arquivos novos ou com mtime diferente são lidos e (re)indexados.
4. Arquivos deletados são removidos do índice.
5. Índice atualizado serializado e salvo.

**Durante uso:**
File watcher Rust emite `VaultFileChanged`. O handler em `packages/search`:
- `created`/`modified`: lê o arquivo, remove versão anterior do índice, indexa a nova.
- `deleted`: remove do índice.
- `renamed`: remove path antigo, indexa com novo path.

Serialização do índice: debounce de 5 segundos para evitar escrita excessiva em sessões de edição intensa.

### Pré-processamento de conteúdo para indexação

Antes de indexar, o conteúdo passa por processador que:
1. Remove bloco de frontmatter YAML.
2. Remove links wiki `[[...]]` preservando o texto do alias/nome.
3. Remove syntax Markdown preservando o texto.
4. Remove URLs de links preservando o texto.
5. Remove blocos de código (não indexa código — apenas prosa).

### API do packages/search

- `search(query, options)` → resultados com score, snippets destacados, campos matched
- `searchTitles(query)` → busca somente em títulos (usado pelo Quick Switcher)
- `addDocument(note)` → indexa ou reindexação uma nota
- `removeDocument(id)` → remove do índice
- `getDocument(id)` → retorna campos armazenados de uma nota
- `serialize()` → retorna string JSON do índice completo
- `deserialize(json)` → restaura índice de string JSON

---

## 14. Busca com Filtros na Sidebar

### Arquitetura

A Sidebar de Busca é um core plugin registrado no workspace. Toda lógica de busca é delegada ao `packages/search`. A sidebar é apenas UI que compõe queries e exibe resultados.

### UI da Sidebar

**Campo de busca:**
- Input com debounce de 150ms.
- Operadores inline: `tag:nome`, `path:pasta/`, `"frase exata"`, `-palavra` (excluir).
- Botão de opções → expande painel de filtros.

**Painel de filtros (expansível):**
- **Localização:** input com autocomplete de pastas do vault (lista derivada do índice).
- **Tags:** chips selecionáveis. Todas as tags únicas do índice, ordenadas por frequência.
- **Data de modificação:** Hoje, Esta semana, Este mês, Range customizado.
- **Extensão:** toggle incluir/excluir arquivos não-`.md`.
- **Correspondência:** toggle maiúsculas/minúsculas, toggle expressão regular.

**Lista de resultados:**
- Cada item: nome do arquivo, caminho relativo, snippet com termos destacados (±60 chars de contexto).
- Clicar abre a nota e destaca ocorrências (extensão CM6 de highlight temporário, removido ao primeiro keystroke).
- Contador de resultados ("X notas encontradas").
- Botão "Substituir em todos" para busca e substituição multi-arquivo.

**Resultados incrementais:**
Query executada imediatamente após debounce. Para muitos resultados: primeiros 50 renderizados imediatamente, restante virtualizado via `react-virtual` ou similar.

### Extensibilidade por plugins

Plugins registram indexers via `api.search.registerIndexer(indexer)` — recebe arquivo, retorna campos adicionais. Registram filtros via `api.search.registerFilter(filter)` — adiciona chip no painel com lógica customizada.

---

## 15. Navegação Rápida (Quick Switcher)

### Comportamento

Modal overlay via `Ctrl+O`. Busca fuzzy somente sobre títulos de arquivos (não conteúdo) usando `packages/search.searchTitles`.

**Estrutura:**
- Input com placeholder "Buscar ou criar nota...".
- Lista de resultados navegável com setas e Enter.
- Notas recentes no topo quando campo vazio (máximo 15, persistido em `app.json`).

**Scoring de resultados:**
1. Match exato no início do nome.
2. Match exato em qualquer posição.
3. Match em aliases do frontmatter (indicado: "via alias: *nome*").
4. Match fuzzy no nome.
5. Match no path (pasta).

**Ações:**
- `Enter`: abre no pane ativo.
- `Ctrl+Enter`: abre em novo pane (split vertical automático).
- `Shift+Enter`: cria nota com o texto digitado como nome.
- `Alt+Enter`: abre em split horizontal.
- `Ctrl+Shift+Enter`: abre em nova janela.

**Providers de plugins:**
Plugins registram via `api.workspace.registerQuickSwitcherProvider(provider)`. Um provider recebe a query e retorna items com label, descrição, ícone e callback. Separação visual por categoria no modal.

---

## 16. Command Palette

### Comportamento

Modal overlay via `Ctrl+P`. Lista todos os comandos de todos os plugins ativos com busca fuzzy.

**Estrutura:**
- Campo de busca fuzzy.
- Cada resultado: nome do comando, plugin de origem, shortcut associado.
- Comandos recentes no topo quando campo vazio (últimos 20, seção "Recentes").
- Comandos pinados acima dos recentes.

**Pinar comandos:**
Context menu em qualquer item (`clique direito → Pinar`). Gerenciável também nas Settings → Shortcuts. Pinados persistem em `app.json`.

**checkCallback:**
Comandos podem definir `checkCallback(checking: boolean)`. O Command Palette usa isso para desabilitar itens (exibidos em cinza) que não fazem sentido no contexto atual.

**Execução:**
- `Enter`: executa o selecionado.
- `Esc`: fecha sem executar.

---

## 17. Sistema de Shortcuts

### Estrutura de dados

Dois layers em sobreposição:

**Layer 1 — Default Hotkeys:** `Map<command-id, Hotkey[]>` definido por plugins ao registrar comandos. Imutável em runtime.

**Layer 2 — User Overrides:** `Map<command-id, Hotkey[]>` lido de `vault/.cortex/hotkeys.json`. Sobrescreve o Layer 1 para as entradas presentes.

Hotkey efetivo: User Override se existir, senão Default Hotkey.

### Formato de hotkey

String normalizada: `Mod+Shift+K`.
- `Mod`: `Ctrl` no Windows/Linux, `Cmd` no macOS — abstraído automaticamente.
- Teclas especiais: `Enter`, `Escape`, `Tab`, `Backspace`, `Delete`, `ArrowUp/Down/Left/Right`, `F1`–`F12`, `Space`.
- Múltiplos hotkeys para um comando: array de strings.

### Keymap engine

Intercepta `keydown` globalmente em `.cortex-app`. Normaliza o evento para string. Consulta mapa de hotkeys efetivos. Verifica `checkCallback`. Se disponível, executa e chama `event.preventDefault()`.

**Prioridade de contexto:** Hotkeys dentro do editor (CM6) são processados pelo CM6 primeiro — não propagam para o keymap global. Permite que o editor tenha seus próprios bindings (`Tab`, `Enter`, `Backspace`) sem conflitar com shortcuts globais.

### Detecção de conflitos

Ao registrar um hotkey, o engine verifica conflitos. Conflito detectado:
1. O novo hotkey vence.
2. O comando anterior perde o hotkey.
3. Toast notifica: "Atalho `Ctrl+K` foi reassociado de 'Comando A' para 'Comando B'." com botão "Desfazer".

### UI de gerenciamento

Settings → Shortcuts:
- Lista completa de todos os comandos de todos os plugins.
- Campo de filtro de texto.
- Para cada comando: nome, plugin de origem, hotkey atual (editável inline), ícone de reset para default.
- Indicação visual de conflitos (ícone de aviso).
- Clicar no campo de hotkey → modo capture: próximo keydown que não seja Escape vira o novo hotkey.

---

## 18. Sistema de Views e Split de Panes

### Modelo de workspace

Três zonas:
- **Sidebar esquerda:** views de navegação (File Explorer, Search, Bookmarks, Tags).
- **Área central (editor area):** árvore de panes com notas e views abertas.
- **Sidebar direita:** views de contexto (Outline, Backlinks, Propriedades).

Cada sidebar é colapsável e pode ser dividida em seções via drag de abas.

### Árvore de panes

A área central é uma árvore de nós gerenciada na `workspaceStore`:

```
SplitNode: { id, direction: 'h' | 'v', children: Node[], sizes: number[] }
LeafNode:  { id, tabs: Tab[], activeTabId: string }
Tab:       { id, viewType: string, state: object, title: string, icon: string }
```

Redimensionamento: `sizes` em `SplitNode` são percentuais (0–100). Drag do divider atualiza `workspaceStore` e `workspace.json` (debounce 500ms).

### Gerenciamento de Tabs — Notas Sempre Carregadas

O comportamento central das tabs do Cortex é o mesmo do Obsidian: **cada tab mantém sua instância de editor viva em memória enquanto estiver aberta**. Alternar entre tabs é instantâneo — sem reload, sem re-fetch de arquivo, sem re-parse de Markdown.

#### Como isso funciona

Cada `LeafNode` tem um array de `Tab`, e cada `Tab` tem uma instância `EditorView` (CodeMirror 6) correspondente. Quando o usuário abre uma nota, o Cortex:

1. Lê o conteúdo do arquivo via `platform.fs.readFile` (ou do Note Cache, seção 23).
2. Cria um `EditorState` com o conteúdo e todas as extensões configuradas.
3. Cria um `EditorView` montado num container DOM. Esse container **não é destruído** ao trocar de tab — é apenas escondido via CSS (`display: none` ou `visibility: hidden` + `position: absolute`).
4. Registra a instância `EditorView` na tab correspondente.

Ao trocar de tab:
- O container da tab anterior recebe `display: none`.
- O container da tab ativa recebe `display: block`.
- Nenhuma re-criação de editor, nenhum re-parse, nenhuma leitura de disco.

#### Por que não usar React para montar/desmontar o editor a cada troca

Se o componente do editor for desmontado do React tree ao trocar de tab, o CM6 `EditorView` é destruído e toda a sessão de edição (undo history, posição de scroll, estado de seleção, estado das extensões) é perdida. O editor deve ser montado uma única vez e permanecer na DOM enquanto a tab existir.

A abordagem correta é: o React gerencia a **existência** da tab (criar / destruir), mas não o **show/hide**. Show/hide é feito diretamente no DOM via classe CSS, fora do ciclo de render do React.

#### Ciclo de vida completo de uma tab

**Abertura de nota (nova tab):**
1. Cortex verifica se a nota já está aberta em alguma tab do mesmo `LeafNode`.
   - Se sim: apenas ativa essa tab (não abre duplicata). Comportamento configurável: "sempre nova tab" ou "reutilizar tab existente".
2. Lê conteúdo da nota via Note Cache (seção 23) — se cache hit, leitura em memória (< 1ms). Se cache miss, lê do disco e popula o cache.
3. Cria `EditorState` + `EditorView` em container DOM oculto.
4. Adiciona `Tab` ao `LeafNode` na `workspaceStore`.
5. Ativa a nova tab: torna o container visível, devolve foco ao editor.

**Ativação de tab existente:**
1. Container da tab anterior → `display: none`.
2. Container da tab ativa → `display: block`.
3. Devolve foco ao `EditorView` ativo via `editorView.focus()`.
4. Restaura posição de scroll (armazenada no estado da tab).
5. Atualiza `activeTabId` na `workspaceStore`.

**Fechamento de tab:**
1. Verifica se há modificações não salvas (dirty state). Se sim, flush imediato via `platform.fs.writeFile`.
2. Chama `editorView.destroy()` para liberar event listeners e recursos do CM6.
3. Remove o container DOM do editor.
4. Remove `Tab` do `LeafNode`. Se `LeafNode` fica vazio: comportamento configurável (mostrar tela de boas-vindas, ou remover o `LeafNode` do split).
5. Ativa a tab adjacente (à esquerda ou à direita, configurável).

#### Estado de uma Tab

Cada `Tab` persiste em `workspace.json`:
```
Tab: {
  id: string,           // UUID da tab
  viewType: string,     // 'markdown' | 'image' | 'pdf' | custom plugin view type
  filePath: string,     // path relativo da nota no vault (nullable para views sem arquivo)
  editorMode: string,   // 'live' | 'source' | 'preview'
  scrollTop: number,    // posição de scroll salva ao esconder a tab
  title: string,        // calculado a partir do nome do arquivo
  icon: string,         // ícone Lucide
  dirty: boolean,       // há mudanças não salvas (não persiste — sempre false ao reabrir)
  pinnedTab: boolean,   // tab pinada não é fechada por Ctrl+W
}
```

Ao restaurar o workspace (abertura do vault), todas as tabs de `workspace.json` são recriadas na ordem e com o `editorMode` preservado. A tab que estava ativa é restaurada como ativa.

#### Limite de tabs e gerenciamento de memória

Não há limite fixo de tabs abertas, mas o Cortex implementa uma política de **suspensão de tabs inativas** para controlar uso de memória em vaults com muitas tabs abertas:

- Tabs não visitadas há mais de **30 minutos** (configurável) são suspensas.
- Suspensão: `editorView.destroy()` + container DOM removido. O estado da tab (scroll, modo, dirty) é serializado em memória. O conteúdo sujo (dirty) é salvo em disco se necessário.
- Ao reativar uma tab suspensa: re-lê o arquivo (do Note Cache se disponível), recria `EditorState` + `EditorView`, restaura posição de scroll.
- Tabs pinadas (`pinnedTab: true`) nunca são suspensas.
- A reativação de tab suspensa é perceptível como uma pequena pausa (~50–150ms). Um spinner micro no ícone da tab avisa o usuário visualmente se necessário.

#### Tabs pinadas

`Ctrl+Click` no ícone da tab → pina/desina. Tab pinada:
- Exibe ícone de pin no lugar do botão de fechar.
- Não é fechada por `Ctrl+W` (atalho de fechar tab).
- Não é suspensa por inatividade.
- Ao abrir um link que normalmente abriria na tab pinada, Cortex abre uma nova tab adjacente.

#### Navegação entre tabs

- `Ctrl+Tab` / `Ctrl+Shift+Tab`: navega entre tabs do `LeafNode` ativo em ordem de uso recente (MRU — Most Recently Used), não em ordem de posição.
- `Ctrl+1` a `Ctrl+9`: vai para a Nth tab do `LeafNode` ativo.
- `Ctrl+W`: fecha tab ativa (exceto pinadas).
- `Ctrl+Shift+T`: reabre última tab fechada (histórico de fechamento por vault, máximo 20 entradas, em memória apenas — não persiste entre sessões).
- Drag de tab entre `LeafNode`s: move a tab. Drag para fora da janela: (futuro) abre em nova janela.

#### Indicadores visuais

- Ponto ou asterisco no título da tab: arquivo tem modificações não salvas (dirty).
- Tab escurecida / com opacity reduzida: tab suspensa (aguardando reativação).
- Ícone de pin: tab pinada.
- Tooltip no hover da tab: caminho relativo completo da nota + atalhos disponíveis.

### Operações de pane

- **Split vertical/horizontal:** cria `SplitNode` substituindo o `LeafNode` ativo, com dois filhos.
- **Fechar tab:** remove da lista. Se `LeafNode` fica vazio e tem irmãos: é removido. Se `SplitNode` fica com um filho: é colapsado.
- **Mover tab:** drag para outro `LeafNode` ou para criar novo split.

### Tabs

Barra de tabs no topo de cada `LeafNode`. Click simples ativa. Click do meio fecha. Drag move. Context menu: "Fechar", "Fechar outras", "Abrir em split vertical/horizontal", "Mover para...".

### Ribbon

Barra vertical na extrema esquerda.

- Ícones de views core (File Explorer, Search, Tags, Bookmarks) no topo — fixos.
- Ícones de plugins via `api.ui.registerRibbonIcon(icon, tooltip, callback)` — aparecem após divisor visual.
- Usuário reordena e oculta ícones de plugins via drag ou clique direito → "Ocultar do ribbon".
- Estado do ribbon persiste em `appearance.json`.

### Registro de views por plugins

`api.workspace.registerViewType(id, factory)`. Factory recebe container DOM e retorna `{ onOpen, onClose, getDisplayText, getIcon }`.

Views de sidebar especificam `defaultSide: 'left' | 'right'` no registro.

---

## 19. Sistema de Ícones com Lucide React

### Fonte primária

Lucide React é a única biblioteca de ícones. Versão fixada no `packages/ui/package.json`. Plugins não instalam sua própria versão — importam do `packages/plugin-api`, que re-exporta a instância compartilhada. Isso evita múltiplas instâncias do Lucide no bundle.

### API de ícones

`packages/plugin-api` exporta `getIcon(name: string, props?: IconProps): ReactNode`.

1. Verifica se `name` é um ícone Lucide válido no mapa estático.
2. Se sim: retorna o componente Lucide com `props` aplicados.
3. Se não: verifica registro de ícones customizados de plugins.
4. Se ainda não encontrar: retorna ícone de fallback (`Square`).

### Ícones customizados por plugins

`api.icons.register(name, svgString)`. Sistema injeta o SVG como símbolo num sprite embutido no DOM (`<svg style="display:none"><symbol id="cortex-icon-<plugin-id>-<name>">...</symbol></svg>`). Disponível via `getIcon()` com o nome registrado.

### Tamanho e cor controlados por CSS

```css
.cortex-icon {
  width: var(--icon-size, 16px);
  height: var(--icon-size, 16px);
  color: currentColor;
}
```

Temas e plugins customizam ícones via variáveis CSS ou herança de `color` — nunca via props diretas.

---

## 20. Configurações de Plugins — Auto-registro na Settings UI

### Filosofia

Plugins declaram um schema de configurações. O Cortex gera automaticamente a UI correspondente na Settings. Plugins não constroem sua própria tela.

### Tipos de campo suportados

| Tipo | UI gerada | Valor |
|------|-----------|-------|
| `toggle` | Switch on/off | boolean |
| `text` | Input de texto | string |
| `textarea` | Textarea multiline | string |
| `number` | Input numérico (min/max/step) | number |
| `dropdown` | Select com opções fixas | string |
| `color` | Color picker nativo | string hex |
| `hotkey` | Campo de capture de hotkey | string |
| `slider` | Slider com labels min/max | number |
| `folder` | Input com autocomplete de pastas | string |
| `heading` | Separador de seção (sem valor) | — |
| `multiselect` | Lista de checkboxes | string[] |

Cada campo tem: `key`, `label`, `description?`, `default`, `type`, `validate?: (v) => string | null`.

### Geração de UI

Quando o usuário navega para o plugin nas Settings, o Cortex lê o schema registrado e renderiza dinamicamente. Cada campo lê via `api.settings.get(key)` e escreve via `api.settings.set(key, value)` on change. Validadores bloqueiam a escrita e exibem mensagem de erro inline.

### onChange callback

O plugin pode registrar `onChange(key, value)` no schema. Chamado após cada mudança válida — permite que o plugin reaja imediatamente.

---

## 21. Tela de Configurações Globais

### Estrutura

Modal full-screen com coluna de navegação (esquerda) e conteúdo da seção (direita). Campo de busca no topo da navegação filtra seções e campos.

### Seções core

**1. Geral**
- Nome do vault (editável — renomeia o entry em `vaults.json`, não a pasta).
- Língua da interface.
- Modo padrão do editor (Live Preview / Source / Preview).
- Auto-save: contínuo (default) ou manual.
- Confirmação ao excluir arquivos.
- Mostrar arquivos ocultos (`.cortex/`, etc.).

**2. Aparência**
- Seletor de tema (lista de temas instalados + "Automático").
- Preferência dark/light quando não "Automático".
- Zoom da interface (80%–150%, default 100%).
- Fonte do editor (dropdown de fontes monospace disponíveis).
- Tamanho da fonte e altura de linha do editor.
- CSS Snippets: lista de arquivos em `.cortex/snippets/` com toggle on/off individual.

**3. Editor**
- Indentação: tabs vs. espaços, tamanho (2 ou 4).
- Spell check (on/off + seletor de idioma).
- Auto-par de brackets e aspas.
- Format on paste (converte HTML para Markdown).
- Fold de cabeçalhos por padrão.
- Vim mode (on/off — integra extensão CM6 de vim keybindings).

**4. Arquivos e Links**
- Pasta default para novas notas.
- Pasta para attachments.
- Formato de link: Wiki `[[]]` ou Markdown `[]()`.
- Path em links: relativo ou absoluto.
- Incluir extensão `.md`: sempre / só quando ambíguo / nunca.

**5. Shortcuts**
Ver seção 17.

**6. Plugins Core**
Lista de plugins bundled com toggle on/off e link para configurações de cada um.

**7. Community Plugins**
Lista de plugins instalados: toggle on/off, versão, configurações, atualizar, desinstalar. Botão "Instalar via URL" (repositório GitHub). Botão "Abrir marketplace" (versão futura).

**8. Sobre**
Versão do Cortex, repositório, licença, créditos.

### Navegação dinâmica

Plugins com schema registrado aparecem automaticamente como subitens em "Plugins Core" ou "Community Plugins" na navegação. UI gerada pelo schema renderizada na coluna direita ao selecionar o plugin.

---

## 22. Troca Rápida de Vault

### Lista de vaults conhecidos

`~/.cortex/vaults.json` — mantida pelo Rust via `update_vault_registry`:
```json
[
  {
    "uuid": "...",
    "path": "/Users/.../MeuVault",
    "name": "Meu Vault",
    "lastOpened": 1234567890,
    "icon": "book",
    "color": "#58A6FF"
  }
]
```

### Vault Switcher Modal

Acessado via:
- Ícone do vault atual no topo do ribbon.
- Command Palette: "Trocar de Vault".
- Shortcut customizável (sem default para evitar conflito).

**Conteúdo do modal:**
- Lista de vaults por `lastOpened` decrescente.
- Cada item: ícone/cor, nome, path abreviado, "há X dias".
- Campo de busca para filtrar.
- Botão "Adicionar vault existente" → diálogo nativo de seleção de pasta.
- Botão "Criar novo vault" → input de nome + seleção de pasta.
- Context menu por vault: "Renomear", "Alterar ícone/cor", "Remover da lista".

### Processo de troca de vault

Troca na **mesma janela** por padrão. `Ctrl+Click` no item → abre em nova janela Tauri.

**Sequência:**
1. Flush imediato do `SettingsManager` (write síncrono via `platform.fs` antes de descarregar).
2. Serialize e persiste índice MiniSearch do vault atual.
3. Unload de todos os plugins do vault atual (ciclo `unloading`).
4. Stop no file watcher Rust (`stop_watching`).
5. Reset das stores Zustand: `vaultStore`, `workspaceStore`, `editorStore`, `searchStore`.
6. Leitura de configurações do novo vault via `packages/settings`.
7. Start do file watcher no novo vault (`start_watching`).
8. Scan inicial via Rust (`scan_vault`).
9. Restaura/inicializa índice MiniSearch do novo vault.
10. Load dos plugins configurados para o novo vault.
11. Restaura workspace do novo vault de `workspace.json`.
12. Atualiza `lastOpened` do novo vault em `vaults.json`.

Loading state: overlay com spinner e nome do vault sendo carregado. Timeout de 10s com mensagem de erro se algo falhar.

### Configurações globais vs. por vault

**Global (`~/.cortex/global.json`):**
- Língua da interface.
- Dimensões e posição da janela por vault (indexado por UUID).
- Preferências de privacidade/telemetria.

**Por vault (`vault/.cortex/`):**
- Tema e snippets CSS.
- Plugins instalados e suas configurações.
- Shortcuts customizados.
- Estado do workspace.
- Todas as preferências de editor e comportamento.

**Importar configurações de outro vault:**
Ao criar um novo vault, botão "Copiar configurações do vault X" copia `.cortex/` do vault origem excluindo `workspace.json`, `vault-id.json` e `plugins/*/data.json`.

---

## 23. Note Cache Layer — Cache de Notas em Memória

### Por que existe

O Note Cache resolve dois problemas distintos:

1. **Performance de tabs:** tabs abertas precisam de conteúdo instantâneo ao serem reativadas após suspensão. Ler do disco a cada reativação introduz latência perceptível.
2. **Base para sync futuro:** o cache é o ponto único onde o estado local de uma nota é conhecido e versionado antes de qualquer operação de merge com o servidor de sync.

O Note Cache não substitui o disco — o disco é sempre a fonte de verdade. O cache é uma camada de aceleração e de rastreamento de estado local.

### Estrutura do NoteCache

O `packages/core` mantém um `NoteCache` singleton por vault ativo:

```
NoteCache: {
  entries: Map<filePath, NoteCacheEntry>
}

NoteCacheEntry: {
  filePath: string,         // path relativo no vault
  content: string,          // conteúdo atual em memória
  diskContent: string,      // conteúdo tal como foi lido do disco pela última vez
  mtime: number,            // mtime do arquivo no momento da leitura
  hash: string,             // blake3 do diskContent — calculado pelo Rust no momento da leitura
  dirty: boolean,           // content !== diskContent (há modificações não salvas)
  lastAccessed: number,     // timestamp de último acesso (para política de eviction)
  openTabCount: number,     // quantas tabs estão usando esta entrada
  snapshots: Snapshot[],    // histórico local (File Recovery)
}

Snapshot: {
  timestamp: number,
  content: string,
  trigger: 'auto' | 'manual' | 'pre-save' | 'pre-sync',
}
```

### Ciclo de leitura (cache-first)

Quando qualquer parte do sistema precisa do conteúdo de uma nota (abertura de tab, busca, backlinks, etc.):

1. Verifica se `filePath` existe em `NoteCache.entries` **e** `entry.dirty === false`.
2. **Cache hit:** retorna `entry.content` imediatamente. Atualiza `lastAccessed`.
3. **Cache miss ou dirty em disco:** lê arquivo via `platform.fs.readFile`. Recebe também `mtime` e `hash` do Rust (retornados junto com o conteúdo no mesmo IPC call). Cria ou atualiza a entrada no cache com `content = diskContent = conteúdo lido`.

### Ciclo de escrita (editor → cache → disco)

Quando o usuário digita no editor (CodeMirror 6 `update.docChanged`):

1. O documento CM6 é convertido para string.
2. `NoteCache.entries[filePath].content` é atualizado imediatamente.
3. `dirty` é marcado como `true` se `content !== diskContent`.
4. Um debounce de **2 segundos** de inatividade de digitação agenda o flush para disco.
5. No flush: `platform.fs.writeFile(filePath, content)` → Rust escreve o arquivo. Ao completar: `diskContent = content`, `dirty = false`, `mtime` e `hash` atualizados com os valores retornados pelo Rust.

**Auto-save contínuo:** é o modo padrão. O debounce de 2s garante que o usuário que para de digitar por 2 segundos sempre tem o arquivo salvo.

**Antes de fechar uma tab:** flush imediato síncrono (sem aguardar debounce) se `dirty === true`.

**Antes de fechar o app:** flush imediato de todas as entradas com `dirty === true`.

### Detecção de mudança externa

O file watcher Rust emite `VaultFileChanged { path, kind, mtime, hash }` quando um arquivo muda externamente (outro editor, sync de terceiros, etc.).

Ao receber o evento `modified` para um arquivo que está no cache:

1. Compara o `hash` do evento com `entry.hash`.
2. Se são iguais: mudança foi causada pelo próprio Cortex (write recente). Ignora.
3. Se são diferentes: arquivo foi modificado externamente.
   - Se `entry.dirty === false`: atualiza o cache lendo o novo conteúdo do disco. Notifica a tab via evento `external-change` — o editor recarrega o conteúdo transparentemente.
   - Se `entry.dirty === true`: **conflito local vs. externo**. Notifica o usuário via banner no topo da nota: "Este arquivo foi modificado externamente. Suas edições locais não salvas podem divergir." com botões: "Manter minhas edições" / "Carregar versão do disco" / "Comparar diff". Antes de qualquer ação, um snapshot do conteúdo atual é salvo em `entry.snapshots`.

### Política de eviction (controle de memória)

Entradas no cache que não têm tabs abertas (`openTabCount === 0`) e não foram acessadas recentemente são removidas da memória:

- Threshold: entradas não acessadas há mais de **15 minutos** sem tabs abertas são removidas.
- Antes de remover: se `dirty === true`, flush imediato para disco.
- Eviction é executada periodicamente (a cada 5 minutos) em idle.
- Entradas com tabs abertas (`openTabCount > 0`) nunca são removidas do cache — independente do tempo.

### File Recovery — Snapshots Locais

O `NoteCache` mantém um histórico de snapshots para cada nota aberta. Isso é análogo ao plugin "File Recovery" do Obsidian, mas integrado ao core.

**Quando um snapshot é criado:**
- A cada 5 minutos de edição ativa (auto, configurável).
- Antes de qualquer operação de sync (trigger: `pre-sync`).
- Antes de carregar uma versão externa que sobrescreve edições locais (trigger: `pre-save`).
- Via comando manual "Salvar snapshot agora" (trigger: `manual`).

**Onde snapshots são persistidos:**
Snapshots são armazenados em `vault/.cortex/snapshots/<hash-do-path>/`. Cada arquivo de snapshot é um JSON com o conteúdo e metadados. Não são synced via Cortex Sync (análogo ao comportamento do Obsidian — snapshots são locais por device).

**Retenção:** configurável. Padrão: manter snapshots dos últimos 30 dias, máximo 50 snapshots por arquivo. Snapshots mais antigos são purgados automaticamente.

**UI de File Recovery:** comando "Ver histórico de snapshots" abre modal com lista cronológica de snapshots da nota ativa. Preview do diff entre snapshot e versão atual. Botão "Restaurar esta versão".

### Preparação para Sync — Estado Local

O `NoteCacheEntry` carrega o `hash` do conteúdo em disco como o "baseline" que o sync engine usará como ancestor para o three-way merge. Quando o sync server enviar uma versão remota de um arquivo, o engine de merge terá:

- **Ancestor:** `entry.hash` (estado do arquivo quando foi lido pela última vez do disco, antes de edições locais)
- **Local:** `entry.content` (estado atual em memória, com edições do usuário)
- **Remote:** conteúdo recebido do sync server

Essa tripla (ancestor, local, remote) é a estrutura necessária para three-way merge — detalhada na seção 24.

---

## 24. Sync e Resolução de Conflitos

> Esta seção documenta a arquitetura de sync planejada para o Cortex. A implementação do sync não faz parte do MVP — mas a arquitetura de dados do core (Note Cache, UUID de vault, snapshots) já é construída para suportá-la sem refatorações.

### Filosofia do Sync do Cortex

O Obsidian Sync usa uma arquitetura de remote vault centralizado onde cada device mantém uma cópia local completa. O Cortex seguirá uma arquitetura similar, com melhorias:

- **Local-first:** o vault funciona 100% offline. O sync é uma extensão opcional, não uma dependência.
- **File-level tracking:** mudanças são rastreadas por arquivo, não por vault inteiro.
- **Three-way merge para Markdown:** usando diff-match-patch (mesmo algoritmo do Obsidian) com ancestor explícito armazenado no Note Cache.
- **Histórico de versões:** cada arquivo tem versões retidas no servidor (configurável por plano).
- **Transparência:** o usuário vê o log de sync em tempo real e pode resolver conflitos manualmente.

### Arquitetura de dados para Sync

#### O que o Rust rastreia localmente

O `src-tauri` mantém um banco SQLite local em `vault/.cortex/sync.db` (usado apenas pelo engine de sync — não exposto ao frontend diretamente):

```sql
-- Tabela de estado de sync por arquivo
sync_state (
  file_path TEXT PRIMARY KEY,
  local_hash TEXT,         -- blake3 do conteúdo local atual
  remote_hash TEXT,        -- blake3 da última versão baixada do servidor
  ancestor_hash TEXT,      -- blake3 do conteúdo no momento do último sync bem-sucedido
  local_mtime INTEGER,     -- mtime local
  remote_mtime INTEGER,    -- mtime da versão remota
  sync_status TEXT,        -- 'synced' | 'local_ahead' | 'remote_ahead' | 'conflict' | 'pending_upload' | 'pending_download'
  last_synced_at INTEGER,  -- timestamp do último sync bem-sucedido
  server_version_id TEXT   -- ID da versão no servidor (para histórico)
)
```

Esta tabela é atualizada:
- Após cada upload bem-sucedido: `ancestor_hash = local_hash`, `sync_status = 'synced'`.
- Após cada download bem-sucedido sem conflito: `ancestor_hash = remote_hash`, `sync_status = 'synced'`.
- Quando o file watcher detecta mudança local: `sync_status = 'local_ahead'`.
- Quando o servidor notifica nova versão: `sync_status = 'remote_ahead'` ou `'conflict'`.

#### Detecção de conflito

Um conflito ocorre quando:
- `local_hash !== ancestor_hash` (arquivo foi editado localmente desde o último sync) **E**
- `remote_hash !== ancestor_hash` (arquivo foi editado remotamente por outro device)

Se apenas um lado mudou, não há conflito — o lado que mudou vence (fast-forward).

### Estratégias de resolução por tipo de arquivo

#### Arquivos Markdown (`.md`)

**Three-way merge automático** via `diff-match-patch`:

O algoritmo recebe três inputs:
1. **Ancestor:** conteúdo do arquivo no momento do último sync bem-sucedido (recuperado do servidor via `server_version_id` ou do `ancestor_hash` local).
2. **Local:** conteúdo atual do arquivo no device.
3. **Remote:** conteúdo do arquivo no servidor (versão de outro device).

O diff-match-patch calcula os patches do ancestor→local e ancestor→remote, e tenta aplicar ambos ao ancestor. Se os patches não se sobrepõem (editaram partes diferentes do texto), o merge é automático e sem conflitos. Se se sobrepõem (editaram as mesmas linhas), o merge produz marcadores de conflito inline no texto.

**Modos de resolução (configurável por device, como no Obsidian):**

- **Merge automático (padrão):** O resultado do three-way merge é aplicado diretamente. Se houve sobreposição, os marcadores de conflito ficam no texto — o usuário resolve manualmente quando abrir a nota. A nota com conflito aparece destacada no File Explorer (ícone de aviso).

- **Criar arquivo de conflito:** Quando há sobreposição, o Cortex **não** sobrescreve o arquivo local. Ao invés disso, cria `Nome da Nota (conflito de DEVICE em YYYY-MM-DD).md` com o conteúdo remoto. O arquivo original mantém o conteúdo local. O usuário compara e merge manualmente.

- **Versão local vence:** Local sobrescreve remoto. Remoto vai para o histórico de versões no servidor.

- **Versão remota vence:** Remoto sobrescreve local. Local vai para snapshots locais antes de ser substituído.

**Snapshot pré-sync:** antes de qualquer operação de merge, o Note Cache cria automaticamente um snapshot do conteúdo local (`trigger: 'pre-sync'`). Isso garante que nenhuma edição local é perdida sem possibilidade de recuperação.

#### Arquivos não-Markdown (imagens, PDFs, attachments)

**Last-modified-wins:** o arquivo com `mtime` mais recente vence. O arquivo perdedor vai para o histórico de versões no servidor (se habilitado). Sem tentativa de merge binário.

#### Arquivos de configuração JSON (`.cortex/*.json`)

**Merge de objetos JSON:** o engine aplica as chaves do JSON local sobre o JSON remoto (local-wins por chave). Isso permite que configurações diferentes em devices diferentes coexistam quando possível (ex: tema diferente em cada device). Chaves que existem apenas no remoto são preservadas.

#### `workspace.json`

**Device-specific — não sincronizado.** O estado do workspace (panes, tabs abertas, splits) é específico de cada device. Sincronizar workspace causaria abertura indesejada de notas no outro device.

### Fluxo de Sync

#### Upload (local → servidor)

1. File watcher detecta mudança local → `sync_status = 'local_ahead'` na `sync.db`.
2. Sync engine (rodando em Rust, thread separada) detecta arquivos `local_ahead`.
3. Aguarda debounce de 5 segundos após última mudança no arquivo (evita uploads de edições incompletas).
4. Verifica se `dirty === false` no Note Cache (aguarda flush para disco antes de fazer upload).
5. Lê o arquivo do disco, calcula hash, compara com `local_hash` na `sync.db`.
6. Faz upload para o servidor com metadata: `file_path`, `local_hash`, `ancestor_hash`, `mtime`.
7. Servidor retorna `server_version_id`. Atualiza `sync.db`: `sync_status = 'synced'`, `ancestor_hash = local_hash`.

#### Download (servidor → local)

1. Sync engine recebe notificação de nova versão do servidor (WebSocket ou polling).
2. Verifica `sync_status` do arquivo afetado:
   - `'synced'` ou `'remote_ahead'`: sem conflito local. Baixa o arquivo. Atualiza disco e Note Cache. Atualiza `sync.db`.
   - `'local_ahead'` ou `'conflict'`: conflito detectado. Executa estratégia de resolução configurada.
3. Emite evento Tauri ao frontend: `SyncFileUpdated { path, status }`.
4. Frontend atualiza tabs abertas afetadas (recarrega conteúdo se não há edições locais, ou exibe banner de conflito se há).

#### Sync em background

O sync roda em thread Rust separada, com backoff exponencial em caso de falha de rede. O frontend não bloqueia — o sync é completamente assíncrono do ponto de vista do usuário.

**Status do sync** é comunicado ao frontend via evento Tauri contínuo e alimenta um ícone de status no status bar:
- `⬡` Sincronizado (verde)
- `⬆` Upload em progresso
- `⬇` Download em progresso
- `⚠` Conflito pendente de resolução (amarelo)
- `✗` Erro de conexão (vermelho)
- `○` Offline (cinza)

### UI de resolução de conflito

Quando um arquivo tem conflito não resolvido:
- Ícone de aviso (⚠) no File Explorer ao lado do nome do arquivo.
- Banner no topo do editor quando a nota com conflito é aberta: "Este arquivo tem um conflito de sync não resolvido."
- Botões no banner: "Abrir comparação de diff" / "Resolver manualmente" / "Aceitar local" / "Aceitar remoto".
- "Abrir comparação de diff": abre um view side-by-side (read-only à esquerda, editável à direita) com o diff inline destacado em vermelho/verde. Botão "Aplicar merge" ao confirmar.

### Histórico de versões (Version History)

O servidor de sync do Cortex mantém versões históricas de cada arquivo. O usuário pode acessar via comando "Ver histórico de versões" na nota ativa:

- Lista cronológica de versões com: device de origem, timestamp, tamanho.
- Preview de cada versão.
- Diff entre versões adjacentes.
- Botão "Restaurar esta versão" → cria um snapshot local pré-restauração e aplica a versão selecionada como conteúdo atual.

A retenção de versões depende do plano do usuário (ex: 30 dias no plano básico, 1 ano no plano pro).

### Sync de configurações

**Configurações que sincronizam:** `app.json`, `appearance.json`, `hotkeys.json`, arquivos de tema, snippets CSS, manifests de plugins.

**Configurações que NÃO sincronizam:**
- `workspace.json` (device-specific)
- `vault-id.json` (imutável)
- `sync.db` (interno do engine)
- Snapshots de File Recovery (locais por design, como no Obsidian)
- Dados de plugins que o plugin marcar como `syncable: false` no schema

### Suporte a sync de terceiros (Syncthing, iCloud, etc.)

Para usuários que usam serviços de sync de terceiros (não o Cortex Sync), o `vault-id.json` garante que o vault é reconhecido corretamente em todos os devices. O Note Cache e os snapshots locais funcionam normalmente. O engine de sync nativo do Cortex **não** roda nesse modo.

Nesses casos, conflitos são gerenciados pelo serviço de terceiros. Se o serviço criar arquivos de conflito (como o Syncthing faz com `.sync-conflict-*`), o file watcher detecta esses arquivos e o Cortex os exibe com ícone diferenciado no File Explorer para que o usuário resolva manualmente.

---

## 25. Theme Token Bridge — CSS → React Native

### O Problema

O sistema de temas do Cortex usa **variáveis CSS** (`--color-background-primary`, `--color-accent-primary`, etc.) como fonte de verdade. No desktop (Tauri + WebView), isso funciona nativamente — o browser resolve `var()` em tempo real.

O React Native **não tem CSS engine**. Estilos são objetos JavaScript (`StyleSheet.create()`), sem suporte a `var()`, seletores, cascata ou herança. Porém, temas customizados de usuários precisam funcionar em ambas as plataformas — seria inaceitável exigir que criadores de temas mantenham dois arquivos separados (um `.css` para desktop, um `.json` para mobile).

**A solução não pode:**
- Introduzir overhead em runtime no desktop (que já funciona perfeitamente com CSS puro).
- Introduzir overhead em runtime no mobile além do carregamento inicial do tema.
- Exigir que criadores de temas escrevam qualquer coisa além de CSS puro.
- Requerer um servidor ou processo externo durante uso normal do app.

### Arquitetura: Token Bridge como Build-time + Load-time Pipeline

A solução é um **pipeline de dois estágios** encapsulado em `packages/theme`:

```
Arquivo .css do tema (usuário escreve apenas isso)
        │
        ▼
┌─────────────────────────────────────┐
│  ESTÁGIO 1 — CSS Token Extractor    │  (roda uma vez ao instalar/carregar tema)
│                                     │
│  PostCSS parser lê o .css           │
│  Resolve var() transitivos          │
│  Extrai apenas variáveis --*        │
│  Saída: ThemeTokenMap (JS object)   │
└────────────────┬────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
  DESKTOP (Tauri)    MOBILE (RN)
  ─────────────────  ──────────────────
  Injeta o .css      Usa ThemeTokenMap
  original no        diretamente como
  <head> via         objeto de tema
  <style> tag        via ThemeContext
  (zero overhead)    (zero overhead
                      após carga)
```

### Estágio 1 — CSS Token Extractor (`packages/theme/extractor`)

O extrator é um módulo TypeScript puro que roda no processo do frontend (desktop ou mobile) uma única vez ao **carregar um tema novo**. Não usa Puppeteer, não usa browser headless — usa PostCSS como parser de AST puro.

**Algoritmo:**

1. Recebe o conteúdo do arquivo `.css` como string.
2. Usa `postcss` para parsear o CSS em AST (Abstract Syntax Tree).
3. Percorre o AST coletando todas as declarações dentro de `:root` e seletores de tema (`.theme-dark`, `.theme-light`, `.theme-<id>`).
4. Constrói um `Map<variableName, rawValue>` com os valores brutos (pode conter `var()` referenciando outras variáveis).
5. Executa resolução transitiva: substitui `var(--x)` recursivamente usando o mapa construído, até que todos os valores sejam valores computados (hex, rgb, número, string de fonte, etc.).
6. Detecta referências circulares (A → B → A) e substitui pelo valor fallback declarado ou pelo valor do tema base.
7. Retorna o `ThemeTokenMap` final — um objeto plain JS `Record<string, string>` sem nenhuma referência `var()` restante.

**Por que PostCSS e não regex:**
PostCSS produz um AST completo com preservação de comentários, media queries e seletores complexos. Regex quebraria em valores com parênteses aninhados (ex: `rgba(var(--r), var(--g), var(--b), 0.5)`). O PostCSS resolve isso corretamente percorrendo a árvore.

**Por que não Puppeteer (abordagem do Inkdrop):**
Puppeteer lança um browser headless completo — inaceitável como dependência de runtime em um app mobile. Nossa abordagem resolve as variáveis via algoritmo de resolução transitiva em TypeScript puro, que é suficiente para o subset de CSS que temas do Cortex usam (apenas variáveis semânticas em `:root` e seletores de tema — sem media queries, sem pseudo-classes, sem herança de seletores complexos).

**Limitações aceitas do extrator:**
- Não resolve `calc()` — valores numéricos com cálculo ficam como string literal (ex: `"calc(var(--space-4) + 2px)"`). No RN, o `useTheme()` hook aplica `parseFloat()` quando o token é usado em propriedades numéricas.
- Não resolve `color-mix()`, `oklch()` e outras funções CSS modernas — ficam como strings. O RN ignora valores não suportados silenciosamente.
- Não suporta `@layer` ou `@media` dentro do arquivo de tema — o Cortex documenta que temas devem ser apenas variáveis em `:root` e seletores de classe de tema.

### ThemeTokenMap — Formato e Armazenamento

O `ThemeTokenMap` é o objeto central da bridge:

```
ThemeTokenMap: {
  // Metadados
  themeId: string,              // id do tema
  themeName: string,
  variant: 'light' | 'dark' | 'auto',
  extractedAt: number,          // timestamp de quando foi extraído
  sourceHash: string,           // blake3 do .css original — invalida cache
  
  // Tokens resolvidos (sem var() restante)
  tokens: Record<string, string>  // ex: { "--color-background-primary": "#FAFAF8" }
}
```

**Persistência do ThemeTokenMap:**
O mapa extraído é salvo em `vault/.cortex/themes/<theme-id>.tokens.json`. Isso garante que a extração só roda **uma vez por versão do tema**:

- Ao carregar um tema: verifica se o arquivo `.tokens.json` existe e se o `sourceHash` bate com o hash do `.css` atual.
- Se bate: lê o cache. Zero custo de extração.
- Se não bate (tema atualizado) ou não existe: roda o extrator e salva o novo `.tokens.json`.

No mobile, os `.tokens.json` dos temas bundled são incluídos no bundle do app. Temas customizados instalados via sync têm seus `.tokens.json` gerados após o download.

### Estágio 2A — Desktop: CSS Nativo (Zero Overhead)

No Tauri, o fluxo **não muda em nada** em relação ao design atual:

1. `packages/theme` lê o arquivo `.css` do tema do disco.
2. Injeta via `<style id="cortex-theme">` no `<head>`.
3. O browser (WebView) resolve todas as variáveis CSS nativamente.

O `ThemeTokenMap` é extraído silenciosamente em background **apenas para fins de persistência** (para que o mobile possa usá-lo via sync). No desktop, o objeto JS nunca é consultado para renderizar componentes.

**Impacto de performance no desktop: zero.** O CSS engine do browser continua sendo o único responsável pela resolução de variáveis.

### Estágio 2B — Mobile: ThemeContext + useTheme()

No React Native, a ausência de CSS engine é compensada por um `ThemeContext` que expõe o `ThemeTokenMap` resolvido para todos os componentes via hook.

**`ThemeProvider` em `packages/theme/mobile`:**
- Carrega o `ThemeTokenMap` do tema ativo (do `.tokens.json` em cache).
- Expõe via React Context.
- Quando o tema troca: substitui o contexto — todos os componentes que consomem `useTheme()` re-renderizam uma única vez.

**`useTheme()` hook:**
```
// Retorna o ThemeTokenMap resolvido e funções de conveniência
const { tokens, t } = useTheme()

// Acesso direto por nome de variável CSS
const bgColor = tokens['--color-background-primary']   // '#FAFAF8'

// Função t() para acesso type-safe com fallback
const bgColor = t('--color-background-primary', '#FAFAF8')
```

**Como componentes compartilhados em `packages/ui` usam o theme:**

Componentes de UI precisam funcionar em ambas as plataformas. A estratégia é usar o mesmo nome de token, mas via mecanismo diferente por plataforma:

```
packages/ui/src/tokens.ts
  → No desktop (Web): retorna 'var(--color-background-primary)'
    (CSS engine resolve em runtime — perfeito)
  → No mobile (RN): retorna tokens['--color-background-primary']
    (valor já resolvido do ThemeTokenMap)
```

O arquivo `packages/ui/src/tokens.ts` usa `Platform.OS` do React Native para decidir qual caminho tomar. Componentes em `packages/ui` importam tokens deste arquivo — nunca hardcodam valores nem fazem distinção de plataforma diretamente.

**Resultado:** um único componente em `packages/ui` funciona em ambas as plataformas sem `if (Platform.OS === 'web')` espalhado pelo código de componente.

### Organização de arquivos em `packages/theme`

```
packages/theme/
├── src/
│   ├── extractor/
│   │   ├── index.ts          # Ponto de entrada: extractTokens(cssString) → ThemeTokenMap
│   │   ├── parser.ts         # PostCSS AST walker — coleta variáveis brutas por seletor
│   │   ├── resolver.ts       # Resolução transitiva de var() + detecção de ciclos
│   │   └── types.ts          # ThemeTokenMap, RawTokenMap, ExtractorOptions
│   │
│   ├── loader/
│   │   ├── desktop.ts        # Carrega .css, injeta no <head>, extrai tokens em bg
│   │   ├── mobile.ts         # Carrega .tokens.json, disponibiliza ThemeTokenMap
│   │   └── cache.ts          # Lógica de invalidação por hash
│   │
│   ├── context/
│   │   ├── ThemeProvider.tsx # React Context Provider (usado pelo mobile e opcionalmente desktop)
│   │   ├── useTheme.ts       # Hook: retorna tokens + função t()
│   │   └── ThemeContext.ts   # Definição do Context
│   │
│   ├── tokens.ts             # Re-exporta acessores por plataforma (web vs RN)
│   └── index.ts              # API pública do pacote
│
└── bundled-tokens/           # .tokens.json dos temas Paper e Ink (gerados no build)
    ├── paper.tokens.json
    └── ink.tokens.json
```

### Fluxo completo — Usuário instala um tema customizado

**Desktop:**
1. Usuário baixa `meu-tema.css` e coloca em `vault/.cortex/themes/`.
2. File watcher detecta o novo arquivo → `ThemeLoader.desktop` é notificado.
3. `ThemeLoader` lê o CSS, injeta no `<head>` (desktop já está funcionando).
4. Em background, `extractTokens(cssString)` roda e salva `meu-tema.tokens.json`.
5. Se o vault está em sync: `meu-tema.tokens.json` é incluído no próximo upload de configs.

**Mobile (após sync):**
1. `meu-tema.css` e `meu-tema.tokens.json` chegam via sync.
2. `ThemeLoader.mobile` detecta novo tema disponível.
3. Se usuário ativar o tema: lê `meu-tema.tokens.json` diretamente (sem precisar rodar o extrator).
4. `ThemeProvider` atualiza o contexto → UI re-renderiza com as novas cores.

**Mobile (sem sync, tema bundled):**
- `paper.tokens.json` e `ink.tokens.json` estão no bundle do app.
- Carregamento instantâneo, zero I/O.

### Tratamento de tokens não-suportados no React Native

Nem todos os valores CSS têm equivalente em RN. O `ThemeTokenMap` carrega valores como strings — é responsabilidade do consumidor (componente ou `useTheme()`) fazer o parse correto:

| Tipo de valor CSS | Exemplo | Comportamento no RN |
|---|---|---|
| Hex color | `#FAFAF8` | Usado diretamente |
| RGB/RGBA | `rgb(250, 250, 248)` | Usado diretamente |
| HSL | `hsl(40deg 20% 95%)` | Convertido para hex pelo `useTheme()` |
| Número sem unidade | `16` | `parseFloat()` |
| `px` value | `16px` | `parseFloat()` — RN usa dp unitless |
| `rem` value | `1rem` | `parseFloat() * baseFontSize` |
| `calc()` | `calc(16px + 4px)` | Avaliado pelo `t()` helper se possível |
| `var()` residual | (não deve existir) | Log de aviso + fallback |
| `linear-gradient()` | — | Ignorado silenciosamente |
| Font family string | `'Geist', sans-serif` | Primeiro nome extraído |

A função `t(tokenName, fallback)` do `useTheme()` encapsula toda essa lógica de conversão — componentes nunca fazem parse manual.

### Criação de Temas — Experiência do Desenvolvedor

Para o criador de temas, **nada muda**. A documentação para criadores instrui apenas:

1. Criar um arquivo `.css`.
2. Definir variáveis CSS em `:root` (overrides dos tokens semânticos do Cortex).
3. Opcionalmente, criar variantes `.theme-light` e `.theme-dark` dentro do mesmo arquivo.

O tema funcionará automaticamente no desktop e mobile. A bridge é completamente transparente para quem cria temas.

**O que temas NÃO devem fazer** (documentado na spec de plugins):
- Usar `calc()` com múltiplos `var()` aninhados em contextos que o mobile consumirá como número (o `t()` helper não avalia expressões complexas).
- Usar `@media`, `@layer`, pseudo-classes (`:hover`, `:focus`) — essas regras são ignoradas pelo extrator (só extrai variáveis de `:root` e seletores de tema).
- Definir estilos de componente diretamente (`.cm-editor { ... }`) — isso só afeta o desktop de qualquer forma.

### Dependências adicionais

`packages/theme` adiciona ao seu `package.json`:

- `postcss` — parser de CSS para o extrator (já é uma dep comum no ecossistema, ~100KB)
- Nenhuma outra dep nova

`postcss` roda apenas no processo de extração (uma vez por tema). Não é importado no hot path de renderização.

---

## 26. Autenticação, Protocolo de Comunicação e Identidade de Device

> Esta seção complementa a seção 24 (Sync) com as decisões de infraestrutura do lado do cliente: como o usuário autentica, como o sync engine se comunica com o servidor, e como devices são identificados e validados. A implementação do servidor em si (endpoints, stack, storage) será especificada separadamente quando o desenvolvimento do servidor iniciar.

---

### 26.1 Autenticação — JWT com Refresh Token Rotativo

#### Filosofia

O usuário faz login **uma única vez**. A partir daí, o app gerencia a renovação de tokens de forma completamente transparente. Nunca exibir tela de login por expiração de sessão enquanto o usuário estiver usando o app regularmente.

#### Dois tokens, duas responsabilidades

**Access Token (JWT, curta duração)**
- Formato: JWT assinado pelo servidor (HS256 ou RS256).
- Duração: **15 minutos**.
- Conteúdo do payload: `sub` (user ID), `device_id`, `iat`, `exp`, `vault_uuids[]` (vaults autorizados para o usuário).
- Armazenamento: **somente em memória** no processo Rust do sync engine. Nunca escrito em disco, nunca exposto ao frontend.
- Uso: header `Authorization: Bearer <access_token>` em toda request de upload/download ao servidor de sync.

**Refresh Token (opaco, longa duração)**
- Formato: string aleatória opaca (não JWT) — o servidor é o único que conhece seu significado.
- Duração: **90 dias**, renovado a cada uso.
- Armazenamento: **keychain do OS** via `tauri-plugin-keychain` (macOS Keychain, Windows Credential Manager, Linux Secret Service/libsecret). Chave de acesso: `cortex.sync.refresh_token.<vault_uuid>`.
- Uso: exclusivamente para obter um novo access token quando o atual expirar.

#### Rotação de Refresh Token

A cada uso do refresh token, o servidor:
1. Invalida o refresh token recebido.
2. Emite um novo refresh token.
3. Emite um novo access token.
4. Retorna ambos ao cliente.

O cliente armazena o novo refresh token no keychain, substituindo o anterior.

**Detecção de reuso (proteção contra token roubado):** se um refresh token já invalidado for usado novamente, o servidor detecta reuso e invalida **toda a família de tokens** daquele device — forçando re-login naquele device. Isso protege contra cenários onde um refresh token vazou.

#### Fluxo transparente de renovação

O sync engine Rust intercepta respostas `401 Unauthorized`:
1. Pausa a fila de uploads/downloads pendentes.
2. Lê o refresh token do keychain.
3. Faz request de refresh ao servidor.
4. Se bem-sucedido: armazena novo refresh token no keychain, atualiza access token em memória, retoma a fila.
5. Se o refresh token também expirou ou foi revogado: emite evento Tauri `SyncAuthRequired` ao frontend. O frontend exibe modal de re-login. Nenhuma operação de sync ocorre até nova autenticação.

#### Quando o usuário precisa fazer login

- Primeira vez que ativa o Cortex Sync.
- Após 90 dias sem usar o app (refresh token expirado por inatividade).
- Se o usuário revogou o device manualmente na UI de gerenciamento de conta.
- Se o servidor detectou reuso de refresh token (possível comprometimento).

#### Logout

Remove o refresh token do keychain. Invalida o access token em memória. Notifica o servidor para revogar o refresh token no lado do servidor. O vault continua funcionando offline normalmente.

---

### 26.2 Protocolo de Comunicação — SSE + HTTP REST

#### Decisão

O sync engine usa dois canais distintos e complementares:

| Canal | Tecnologia | Direção | Finalidade |
|-------|-----------|---------|-----------|
| Notificações | SSE sobre HTTP/2 | Servidor → Cliente | Avisar que um arquivo foi atualizado por outro device |
| Transferência | HTTP REST | Bidirecional | Upload e download dos arquivos em si |

#### Por que SSE e não WebSocket

O sync do Cortex só precisa de notificação **servidor → cliente** ("o arquivo X foi atualizado"). O cliente nunca precisa enviar dados pelo canal de notificação — uploads são feitos via HTTP POST separado. Dado isso:

- SSE sobre HTTP/2 opera sobre HTTP padrão: funciona com qualquer load balancer, CDN ou proxy reverso sem configuração especial.
- WebSocket requer protocolo próprio (`ws://`/`wss://`), proxies TCP dedicados e sticky sessions para escalar horizontalmente — custo operacional significativamente maior.
- SSE tem reconexão automática nativa (o cliente reabre a conexão com `Last-Event-ID` e o servidor reemite eventos perdidos).
- Performance equivalente para este caso de uso: a diferença de latência entre SSE e WebSocket em notificações é imperceptível para sync de arquivos.

#### Canal SSE — Notificações

O sync engine Rust mantém uma conexão SSE persistente autenticada com o servidor enquanto o app está aberto e há conectividade.

**Eventos recebidos pelo cliente via SSE:**

```
event: file_updated
data: {"vault_uuid":"...","file_path":"notas/diario.md","remote_hash":"abc123","remote_mtime":1234567890,"server_version_id":"v_xyz"}

event: file_deleted
data: {"vault_uuid":"...","file_path":"notas/old.md"}

event: file_renamed
data: {"vault_uuid":"...","old_path":"notas/rascunho.md","new_path":"notas/publicado.md"}

event: ping
data: {}
```

O servidor emite `ping` a cada 30 segundos para manter a conexão viva através de proxies com timeout curto.

**Reconexão:** se a conexão SSE cair, o cliente reabre automaticamente com backoff exponencial (1s, 2s, 4s, 8s, teto de 60s). O header `Last-Event-ID` é enviado para que o servidor reemita eventos perdidos durante a desconexão — nenhum evento de atualização é perdido.

#### Canal HTTP REST — Transferência

Todas as operações de transferência são requests HTTP padrão com o access token no header `Authorization`.

**Upload de arquivo:**
```
POST /sync/v1/vaults/{vault_uuid}/files
Authorization: Bearer <access_token>
Content-Type: application/octet-stream
X-File-Path: notas/diario.md
X-Local-Hash: <blake3>
X-Ancestor-Hash: <blake3>
X-Local-Mtime: <timestamp>

<conteúdo do arquivo>
```

**Download de arquivo:**
```
GET /sync/v1/vaults/{vault_uuid}/files?path=notas/diario.md&version_id=v_xyz
Authorization: Bearer <access_token>
```

**Refresh de token:**
```
POST /auth/v1/token/refresh
Content-Type: application/json

{"refresh_token": "<opaque_token>", "device_id": "<uuid>"}
```

#### Fallback para polling

Se a conexão SSE falhar repetidamente (ambiente de rede restritivo, proxy incompatível), o sync engine entra em **modo de polling**:
- Poll a cada **30 segundos**: `GET /sync/v1/vaults/{vault_uuid}/changes?since=<last_synced_at>`.
- O servidor retorna lista de arquivos modificados desde `since`.
- Comportamento funcional idêntico ao SSE — apenas com latência maior.
- O ícone de status no status bar exibe indicador de "modo polling" (sem afetar a experiência de sync).

---

### 26.3 Identidade de Device — Registro e Validação no Cliente

> O servidor e seus endpoints serão especificados futuramente. Esta seção documenta exclusivamente o comportamento do **cliente** no registro e validação de devices.

#### Estrutura de identidade do device

O cliente mantém dois identificadores persistentes no keychain, separados do refresh token:

**Device ID**
- UUID v4 gerado na primeira execução do app no device.
- Chave de keychain: `cortex.device.id`.
- **Nunca muda**, nunca é regenerado (exceto se o usuário desinstalar completamente e reinstalar).
- Enviado em toda request de sync no header `X-Device-ID`.
- É o identificador estável que o servidor usa para associar eventos a devices (ex: "modificado pelo device X" no histórico de versões).

**Device Token**
- Token opaco emitido pelo servidor no momento do registro.
- Chave de keychain: `cortex.device.token`.
- Serve como "prova de que este device foi aprovado" para a conta do usuário.
- Enviado junto com o refresh token flow para validar que o device ainda está autorizado.

#### Ciclo de vida do device no cliente

**Primeira execução (device não registrado):**
1. O sync engine verifica o keychain: `cortex.device.id` não existe.
2. Gera UUID v4 → salva em `cortex.device.id` no keychain.
3. Coleta metadata do device: nome legível (`"MacBook Pro de João"`, derivado do hostname do OS), plataforma (`"macos"`, `"windows"`, `"linux"`), versão do app.
4. Após o usuário fazer login (access token obtido): registra o device no servidor com o device ID e metadata.
5. Servidor retorna device token → salvo em `cortex.device.token` no keychain.
6. Device está registrado e pronto para sync.

**Execuções subsequentes (device já registrado):**
1. O sync engine verifica o keychain: `cortex.device.id` e `cortex.device.token` existem.
2. No refresh de access token: envia `device_id` + `device_token` junto com o refresh token.
3. Servidor valida que o device token é válido e associado à conta — se sim, emite novos tokens normalmente.
4. Se o device token foi revogado (usuário removeu o device pela UI de gerenciamento): servidor retorna erro específico (`device_revoked`). O sync engine remove `cortex.device.token` do keychain, emite evento `SyncDeviceRevoked` ao frontend. Frontend exibe mensagem: "Este device foi removido da sua conta. Faça login novamente para reconectar."

**Revogação local (logout ou "desconectar este device"):**
1. Remove `cortex.device.token` do keychain (mantém `cortex.device.id` — o device continua existindo).
2. Notifica o servidor para invalidar o device token.
3. O device ID persiste: se o usuário fizer login novamente no mesmo device, o servidor reconhece o device ID existente e emite um novo device token em vez de criar um device duplicado.

#### Metadata do device (gerenciamento de conta)

O nome legível do device é editável pelo usuário na UI de gerenciamento de conta. O cliente armazena o nome customizado em `~/.cortex/global.json` sob `deviceName`. A cada registro ou refresh, o nome atual é enviado ao servidor para manter o display atualizado.

Informações que o servidor associa ao device (para exibição na UI de gerenciamento):
- Device ID (interno)
- Nome legível (editável)
- Plataforma e versão do app
- Último sync em (timestamp)
- Vaults sincronizados por este device

---

## 27. Sistema de Tags — Tag Manager

> Tags no Cortex são entidades de primeira classe do vault, não strings extraídas de texto. Cada tag tem identidade própria, gerenciada num único arquivo de configuração do vault. Isso é o diferencial central em relação ao Obsidian: renomear uma tag não toca em nenhum arquivo de nota, a UI de gerenciamento é visual e dedicada, e associar tags a notas nunca exige editar YAML manualmente.

---

### 27.1 Filosofia e Diferencial em Relação ao Obsidian

**O que o Obsidian faz:** tags são strings planas extraídas do conteúdo (`#projeto`, `#importante`) e do frontmatter `tags:`. O painel de Tags lista todas as tags únicas do vault em ordem alfabética. Não há cor, não há ícone, não há descrição, não há gerenciamento centralizado. Renomear uma tag exige editar manualmente todos os arquivos que a contêm (ou usar um plugin de terceiros). Adicionar uma tag a uma nota exige abrir o frontmatter e digitar.

**O que o Cortex faz de diferente:**

- **Tags são entidades, não strings.** Cada tag tem UUID, nome, cor, ícone opcional e descrição. Vivem em `vault/.cortex/tags.json`, não nos arquivos de nota.
- **Renomear é instantâneo e sem efeitos colaterais.** Como as notas armazenam o UUID da tag (não o nome), alterar o nome de uma tag atualiza apenas `tags.json` — zero arquivos de nota são tocados.
- **Tag Manager é uma view dedicada.** Não uma lista de texto — um painel visual com chips coloridos, estatísticas de uso, busca e bulk-actions.
- **Associar tags é fluido.** `Cmd+T` na nota ativa, drag de uma tag sobre um arquivo no File Explorer, ou seleção múltipla no File Explorer + assign. Nunca é necessário abrir o frontmatter manualmente.
- **Tags aparecem visualmente em todo o app.** Chips coloridos no File Explorer ao lado de cada nota, no editor (abaixo do título na view de Properties), nos resultados de busca, no Quick Switcher.

---

### 27.2 Modelo de Dados

#### Estrutura de uma Tag

```typescript
interface Tag {
  id: string           // UUID v4, gerado na criação, nunca muda
  name: string         // Nome exibido ao usuário (ex: "Projeto Alpha")
  slug: string         // Versão normalizada para uso em #tags inline (ex: "projeto-alpha")
  color: TagColor      // Cor da tag (ver paleta abaixo)
  icon?: string        // Ícone Lucide opcional (ex: "folder", "star", "zap")
  description?: string // Descrição opcional (exibida no hover)
  createdAt: number    // Timestamp de criação
  updatedAt: number    // Timestamp da última edição
  sortOrder: number    // Posição na lista do Tag Manager (drag para reordenar)
}
```

#### Paleta de Cores

As cores de tag são um conjunto fixo de 16 opções derivadas do design system Cortex — não hex arbitrários. Isso garante que chips de tag nunca conflitem com o tema e tenham contraste adequado tanto no Paper (light) quanto no Ink (dark).

```typescript
type TagColor =
  | 'amber'    | 'orange'  | 'red'     | 'pink'
  | 'purple'   | 'violet'  | 'blue'    | 'cyan'
  | 'teal'     | 'green'   | 'lime'    | 'yellow'
  | 'slate'    | 'stone'   | 'zinc'    | 'neutral'
```

Cada cor tem dois tokens no design system: `--tag-{color}-bg` (fundo do chip) e `--tag-{color}-text` (texto do chip), ajustados por tema para garantir contraste mínimo de 4.5:1.

#### Armazenamento em `tags.json`

```
vault/.cortex/tags.json
```

Estrutura do arquivo:

```json
{
  "version": 1,
  "tags": [
    {
      "id": "a1b2c3d4-...",
      "name": "Projeto Alpha",
      "slug": "projeto-alpha",
      "color": "blue",
      "icon": "folder",
      "description": "Tudo relacionado ao Projeto Alpha",
      "createdAt": 1710000000000,
      "updatedAt": 1710000000000,
      "sortOrder": 0
    }
  ]
}
```

#### Como tags são associadas a notas

Cada nota armazena os **UUIDs** das suas tags no frontmatter, sob a chave `cortex-tags`:

```yaml
---
cortex-tags: [a1b2c3d4-..., e5f6g7h8-...]
---
```

Essa chave coexiste com `tags:` do Obsidian — o Cortex interpreta ambas. Tags do `tags:` nativo do Obsidian são tratadas como "tags legadas" e aparecem no sistema com uma marcação especial (ver seção 27.6 sobre migração).

**Por que UUID e não slug:** o slug pode mudar se o usuário renomear a tag. O UUID nunca muda. Isso garante que renomear "Projeto Alpha" para "Alpha 2025" não exige tocar em nenhum arquivo de nota.

---

### 27.3 Tag Manager — View Dedicada

O Tag Manager é um core plugin que ocupa uma view na sidebar esquerda (ícone de tag no activity bar). É a interface central para criar, editar, organizar e explorar tags.

#### Layout do Tag Manager

```
┌─────────────────────────────────┐
│  Tags                   [+] [⋮] │  ← header com botão criar e menu
├─────────────────────────────────┤
│  🔍 Filtrar tags...             │  ← busca inline
├─────────────────────────────────┤
│  ● Projeto Alpha          (12)  │  ← chip com cor + nome + contagem de notas
│  ● Referência              (8)  │
│  ● Inbox                  (34)  │
│  ● Em progresso            (5)  │
│  ● Revisão                 (2)  │
├─────────────────────────────────┤
│  Ordenar: Manual ▾              │  ← ordenação: manual, alfabética, por uso
└─────────────────────────────────┘
```

Cada item da lista é um **chip de tag** com:
- Indicador de cor (círculo ou barra lateral colorida de 3px, seguindo o design system)
- Ícone (se configurado)
- Nome da tag
- Contagem de notas associadas
- Ao hover: ações rápidas `✎` (editar) e `⋯` (menu: renomear, mudar cor, deletar, selecionar todas as notas)

#### Criação de Tag

Ao clicar em `[+]` ou usar o comando `Criar tag` (Command Palette):
- Modal compacto aparece in-context (não página separada):
  - Input de nome (obrigatório, máx 50 chars)
  - Grid de 16 cores para escolha (destaca a cor selecionada com checkmark)
  - Grid de ícones Lucide por categoria (opcional — busca de ícone por nome)
  - Input de descrição (opcional, máx 200 chars)
- Botão "Criar" habilitado ao digitar o nome.
- A tag é criada instantaneamente no `tagsStore` e persistida em `tags.json`.

#### Edição de Tag

Mesmo modal de criação, pré-preenchido. Campos editáveis: nome, cor, ícone, descrição. O UUID nunca é editável. A mudança de nome atualiza apenas `tags.json` — nenhum arquivo de nota é tocado.

#### Deleção de Tag

Ao deletar uma tag:
1. Modal de confirmação mostra quantas notas perderão essa tag.
2. Se confirmado: remove o UUID de `cortex-tags` em todos os arquivos afetados (operação em batch via `platform.fs.writeFile` para cada nota).
3. Remove a entrada de `tags.json`.
4. O `tagsStore` atualiza reativamente — chips somem de toda a UI.

A deleção de uma tag com muitas notas é a única operação de tag que toca arquivos de nota. O frontend exibe progresso para vaults grandes ("Removendo tag de 34 notas...").

#### Reordenação

Drag-and-drop na lista do Tag Manager reordena o `sortOrder` das tags. A ordem é respeitada em todos os dropdowns e listas de tags do app.

---

### 27.4 Atribuição de Tags — Fluxo do Usuário

Quatro formas de associar tags a uma nota, todas sem editar YAML manualmente:

**1. `Cmd+T` na nota ativa — Tag Picker**

Abre um popover de tag picker ancorado abaixo do cursor ou no topo do editor:
- Lista scrollável de todas as tags do vault com chips coloridos.
- Campo de busca no topo (filtra por nome em tempo real).
- Tags já associadas à nota aparecem no topo com checkmark.
- Clicar em uma tag toggle sua associação (adiciona ou remove).
- `Enter` confirma e fecha. `Escape` cancela.
- Ação "Criar nova tag" no rodapé se nenhum match exato for encontrado.

**2. Drag de tag para arquivo no File Explorer**

Arrastar um chip do Tag Manager sobre um arquivo no File Explorer atribui a tag a esse arquivo. Visual feedback: highlight do arquivo ao entrar na drop zone, chip ghost durante o drag.

**3. Seleção múltipla no File Explorer + assign**

Selecionar múltiplos arquivos no File Explorer (Shift+click ou Cmd+click), clicar com botão direito → "Adicionar tag" → Tag Picker. Atribui a todas as notas selecionadas em batch.

**4. Editor inline — `#slug` no corpo da nota**

Digitar `#` no corpo do texto abre um autocomplete dropdown com as tags existentes (mesma UX de `[[` para links). Selecionar uma tag insere `#slug` no texto como texto decorativo (não como tag de sistema — é apenas visual no conteúdo) **E** adiciona o UUID ao `cortex-tags` do frontmatter automaticamente. Isso mantém compatibilidade com a convenção do Obsidian de `#tag` inline enquanto o sistema interno usa UUID.

---

### 27.5 Visualização de Tags na Interface

#### No File Explorer

Cada arquivo exibe seus chips de tag à direita do nome, no estilo de uma linha de badges:

```
  📄 Reunião Q1 2025.md    ● Projeto Alpha  ● Inbox
  📄 Decisões técnicas.md  ● Referência
```

Comportamento configurável: mostrar sempre / mostrar ao hover / nunca mostrar (para vaults com muitas tags onde o File Explorer ficaria poluído).

#### No Editor — Painel de Properties

A sidebar direita tem a view "Properties" (ativável via ribbon ou `Cmd+P`). Dentro dela, a seção "Tags" exibe os chips da nota ativa com botão `[+ Adicionar tag]` que abre o Tag Picker.

#### Nos Resultados de Busca

Cada resultado na Search Sidebar exibe os chips de tag da nota abaixo do snippet. Permite identificar rapidamente o contexto sem abrir a nota.

#### No Quick Switcher

Ao lado do nome do arquivo, chips de tag em tamanho reduzido (apenas o indicador de cor circular, sem texto, com tooltip ao hover).

---

### 27.6 Tag Manager — Funcionalidades Adicionais

#### Filtrar notas por tag

Clicar em uma tag no Tag Manager abre um painel de resultados (similar à Search Sidebar) listando todas as notas com aquela tag. Suporta `Cmd+click` para filtro multi-tag (mostra notas que têm **todas** as tags selecionadas — lógica AND).

#### Estatísticas de uso

No hover de uma tag, tooltip exibe:
- Contagem de notas
- Data de criação da tag
- Última nota associada (nome + data)

#### Bulk actions via menu `[⋮]` do Tag Manager

- "Selecionar todas as notas com tag X" → seleciona no File Explorer.
- "Mesclar tag X em Y" → substitui todas as ocorrências de X por Y nos frontmatters (batch write), depois deleta X. Útil para consolidar tags duplicadas.
- "Exportar lista de tags" → copia JSON para clipboard.

#### Migração de tags legadas (Obsidian)

Na primeira abertura de um vault com tags no formato Obsidian (`#tag` no corpo ou `tags:` no frontmatter), o Cortex oferece um modal de migração:

1. Scana todo o vault e coleta todas as tags únicas no formato Obsidian.
2. Exibe lista com contagem por tag.
3. Usuário pode: criar tags Cortex correspondentes para cada uma (com cor padrão atribuída automaticamente), ou ignorar (tags legadas continuam funcionando como texto, mas não aparecem como chips coloridos).
4. Se o usuário confirmar a migração: cria as tags em `tags.json`, substitui `#tag` / `tags: [tag]` por `cortex-tags: [uuid]` em todos os arquivos afetados.

A migração é não-destrutiva: as tags originais no texto não são removidas — apenas o `cortex-tags` é adicionado ao frontmatter.

---

### 27.7 TagStore — Estado Reativo

`packages/core` exporta o `tagsStore` (Zustand), a fonte de verdade de tags no frontend.

```typescript
interface TagsState {
  // Dados
  tags: Map<string, Tag>           // UUID → Tag
  noteTagIndex: Map<string, string[]> // notePath → UUID[]
  tagNoteIndex: Map<string, string[]> // UUID → notePath[]

  // Ações
  createTag(data: Omit<Tag, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>): Tag
  updateTag(id: string, patch: Partial<Tag>): void
  deleteTag(id: string): Promise<void>  // async: precisa escrever em arquivos de nota
  assignTag(tagId: string, notePath: string): void
  removeTag(tagId: string, notePath: string): void
  assignTagsBatch(tagId: string, notePaths: string[]): Promise<void>
  mergeTag(sourceId: string, targetId: string): Promise<void>
  reorder(orderedIds: string[]): void

  // Queries (derivadas, sem re-render desnecessário via Zustand selectors)
  getTagsForNote(notePath: string): Tag[]
  getNotesForTag(tagId: string): string[]
  getAllTagsSorted(): Tag[]
}
```

**Persistência:** toda ação que muta tags dispara um flush de `tags.json` (debounce de 500ms, flush imediato no `beforeunload`). Ações que mutam arquivos de nota (`deleteTag`, `assignTagsBatch`, `mergeTag`) usam `platform.fs.writeFile` para cada arquivo afetado.

**Inicialização:**
1. Lê `vault/.cortex/tags.json` na abertura do vault.
2. Durante o scan inicial de notas (seção 13), extrai `cortex-tags` de cada frontmatter.
3. Popula `noteTagIndex` e `tagNoteIndex` em memória.
4. Tags referenciadas em notas mas ausentes de `tags.json` (tags órfãs, ex: após sync parcial) são marcadas com `{ id, name: '[tag removida]', color: 'neutral' }` e exibidas com estilo degradado.

---

### 27.8 Integração com Sync

Tags seguem a arquitetura de sync já estabelecida na seção 24, com comportamento específico para o tipo de dado.

#### O que sincroniza

`vault/.cortex/tags.json` é incluído no sync como arquivo de configuração. Segue a estratégia **merge de objetos JSON** já definida: em caso de conflito, o engine de sync faz merge chave a chave usando o `id` (UUID) como chave de merge do array de tags.

**Lógica de merge específica para tags:**

O merge padrão de `tags.json` é por UUID:

- Tag presente em local mas ausente no remoto → **preservada** (foi criada localmente).
- Tag presente em remoto mas ausente no local → **adicionada** (foi criada em outro device).
- Tag presente em ambos com campos diferentes → **merge por campo**:
  - `name`, `color`, `icon`, `description`: **versão mais recente vence** (campo `updatedAt` como tiebreaker).
  - `sortOrder`: **local vence** (a ordem de tags é uma preferência de display — cada device pode ter sua ordem).
  - `createdAt`: preservado o menor valor (data de criação original).

Esse comportamento evita que criar uma tag no desktop e outra no mobile simultaneamente cause perda de dados — ambas são preservadas após o merge.

#### Eventos SSE para tags

O servidor emite evento SSE específico quando `tags.json` é atualizado por outro device:

```
event: file_updated
data: {"vault_uuid":"...","file_path":".cortex/tags.json","remote_hash":"...","server_version_id":"..."}
```

O sync engine trata `.cortex/tags.json` como qualquer outro arquivo de configuração: baixa, aplica merge JSON, persiste. O frontend é notificado via evento Tauri `SyncFileUpdated` com o path `.cortex/tags.json`. O `tagsStore` recarrega e reconcilia o estado em memória com o arquivo atualizado.

#### Notas com `cortex-tags` sincronizadas

Quando uma nota é sincronizada entre devices, os UUIDs em `cortex-tags` viajam com ela. Como os UUIDs apontam para entradas em `tags.json` (também sincronizado), as tags aparecem corretamente em todos os devices após o sync convergir.

**Caso de borda — UUID órfão após sync parcial:** se uma nota com `cortex-tags: [uuid-x]` chegar via sync antes de `tags.json` ser atualizado com `uuid-x`, o `tagsStore` cria uma entrada temporária `{ id: uuid-x, name: '[carregando...]', color: 'neutral' }`. Quando `tags.json` sincronizar, a entrada é substituída pela tag real sem nenhuma ação do usuário.

---

### 27.9 Integração com Busca

O `packages/search` é atualizado para indexar `cortex-tags` (UUIDs) além das tags textuais legadas.

**No índice MiniSearch:**

```typescript
// Campo adicionado à estrutura do índice (seção 13)
tags: string[]          // UUIDs de cortex-tags + slugs de tags legadas
tagNames: string[]      // Nomes resolvidos das tags (para busca textual por nome)
```

**Queries por tag:**

- `tag:projeto-alpha` → resolve o slug para UUID, filtra por UUID no índice (match exato).
- `tag:"Projeto Alpha"` → busca pelo nome completo, resolve para UUID.
- Filtro visual no painel de filtros da Search Sidebar: chips selecionáveis agora mostram as tags com suas cores reais (não apenas texto).

**No Quick Switcher:** digitar `#` no Quick Switcher ativa modo de busca por tag — lista tags cujo nome começa com o que foi digitado, com preview de contagem de notas.

---

### 27.10 Integração com a Arquitetura de Packages

**`packages/core`:**
- `TagsStore` (Zustand) com toda a lógica reativa.
- Parser de `cortex-tags` no frontmatter integrado ao scan de notas.
- Utilitário `resolveTagsForNote(frontmatter, tagsStore): Tag[]`.

**`packages/search`:**
- Campo `tagNames` adicionado ao índice MiniSearch.
- Operador `tag:` no query parser.

**`packages/editor`:**
- Extensão CodeMirror 6 para autocomplete de `#slug` no corpo da nota (abre dropdown de tags ao digitar `#`).
- Extensão de decoração para renderizar `#slug` como chip colorido no Live Preview (a string `#projeto-alpha` no Markdown aparece como chip visual no modo preview, substituindo o texto plano).

**`packages/ui`:**
- Componente `<TagChip tag={Tag} size="sm|md|lg" />` — chip colorido reutilizável.
- Componente `<TagPicker open value tags onToggle />` — popover de seleção de tags.
- Componente `<TagColorPicker value onChange />` — grid de 16 cores.

**`packages/plugin-api`:**
- Expõe `api.tags.getAll()`, `api.tags.getForNote(path)`, `api.tags.assign(tagId, path)`, `api.tags.onChanged(callback)` para plugins externos.

**Arquivo `vault/.cortex/tags.json`:** adicionado à lista de arquivos sincronizados (seção 24 — "Configurações que sincronizam").

---

## 28. UI Nativa — Princípios e Implementação

> O Cortex adota uma política clara: **sempre que o OS oferece uma superfície nativa equivalente, usamos ela.** Isso garante que o app se comporte como um cidadão de primeira classe em cada plataforma — respeitando shortcuts do sistema, integração com acessibilidade, suporte a temas do OS (light/dark automático), e expectativas do usuário formadas por anos de uso de apps nativos. Componentes React de UI são reservados para interfaces que precisam mostrar muitos dados de forma estruturada ou que não têm equivalente nativo adequado.

---

### 28.1 Política: Nativo vs. React

#### Sempre nativo (nunca substituir por componente React)

| Superfície | Implementação | Exemplos de uso |
|-----------|--------------|----------------|
| Context menus | Tauri `Menu` API (Rust) | Click direito em arquivo, pasta, tab, nota aberta |
| Diálogos de confirmação simples | `tauri-plugin-dialog` (`message`, `ask`, `confirm`) | "Tem certeza que deseja excluir?" |
| Diálogos de seleção de arquivo/pasta | `tauri-plugin-dialog` (`open`, `save`) | Pick folder ao adicionar vault, "Salvar como" |
| Diálogos de alerta | `tauri-plugin-dialog` (`message`) | Erros críticos, avisos de operação irreversível |
| macOS Menubar | Tauri `Menu` + `app.set_menu()` | File, Edit, View, Window, Help |
| Tray icon | `tauri-plugin-shell` + `SystemTray` | Acesso rápido sem abrir janela principal |
| Notificações do sistema | `tauri-plugin-notification` | Sync concluído, conflito detectado |
| Drag nativo de arquivos (para fora do app) | Tauri `drag` plugin | Arrastar nota para Finder/Explorer |

#### Sempre React (componentes customizados justificados)

| Componente | Justificativa |
|-----------|--------------|
| Command Palette | Lista virtualizada, scoring fuzzy em tempo real, preview, categorias — não há equivalente nativo |
| Quick Switcher | Idem — busca incremental com ranking |
| Tag Picker | Grid de cores, busca, estado de seleção múltipla — nativo não comporta |
| Tag Manager (sidebar) | Drag-and-drop de reordenação, chips coloridos, estatísticas |
| Modal de Mover Arquivo | Busca de pasta, árvore navegável — estrutura rica demais para nativo |
| Modal de criação/edição de tag | Formulário com grid de cores e ícones |
| Diff Viewer (conflito de sync) | Side-by-side com highlight inline |
| Settings | Formulário complexo, seções, toggles, sliders |
| Histórico de versões | Lista paginada com preview de diff |
| Vault Switcher | Lista com busca, ícones customizados, ações por item |

#### Nunca React onde nativo existe

- ❌ Tooltip genérico de confirmação de deleção em React — usar `dialog.ask()` nativo
- ❌ Menu de opções custom em React ao clicar com botão direito — usar Tauri `Menu` nativo
- ❌ Alert customizado para erros críticos — usar `dialog.message()` nativo
- ❌ Menubar implementado como componente React no topo da janela — usar macOS menubar nativo

---

### 28.2 Context Menus Nativos via Tauri

#### Arquitetura

Context menus são criados e gerenciados inteiramente no Rust via Tauri `Menu` API. O frontend **nunca** renderiza um `<div>` simulando um context menu. O fluxo é:

1. O frontend captura o evento `contextmenu` no elemento HTML correspondente.
2. Chama o comando IPC `show_context_menu(menu_id, context_payload)` passando o tipo de menu e os dados de contexto (ex: `file_path`, `tab_id`).
3. O Rust constrói o `Menu` nativo com os itens apropriados para aquele contexto, leva em conta o estado atual (ex: se o sync está ativo, exibe "Histórico de versões"; se não, o item fica desabilitado).
4. O menu nativo é exibido na posição do cursor.
5. Ao selecionar um item, o Rust emite um evento Tauri ao frontend com o `action_id` e o contexto. O frontend executa a ação correspondente.

O módulo Rust responsável é `src-tauri/src/commands/menu.rs`.

#### Eventos de contexto que o frontend intercepta

```
contextmenu em .file-explorer-item  → show_context_menu("file", { path, kind: "file"|"folder" })
contextmenu em .tab-header           → show_context_menu("tab", { tab_id, view_type })
contextmenu em .editor-area          → show_context_menu("editor", { path, selection })
contextmenu em .tag-chip             → show_context_menu("tag", { tag_id, note_path? })
contextmenu em .vault-switcher-item  → show_context_menu("vault", { vault_uuid })
```

O evento `contextmenu` padrão do browser é sempre suprimido via `preventDefault()` para que o menu nativo do Tauri substitua o menu padrão do WebView em toda a aplicação.

---

### 28.3 Context Menu de Arquivo (File Explorer)

O context menu de arquivo é o mais completo do app. Abaixo está a especificação completa de itens, separadores e comportamento de cada ação.

```
┌──────────────────────────────────┐
│  Abrir em nova tab               │
│  Abrir à direita                 │
├──────────────────────────────────┤
│  Duplicar                        │
│  Mover para...                   │
├──────────────────────────────────┤
│  Adicionar tag                   │
│  Copiar caminho              ▶   │
├──────────────────────────────────┤
│  Histórico de versões            │
├──────────────────────────────────┤
│  Abrir no app padrão             │
│  Revelar no Finder               │  (macOS) / "Revelar no Explorer" (Windows) / "Revelar no Files" (Linux)
├──────────────────────────────────┤
│  Renomear                        │
│  Excluir                         │
└──────────────────────────────────┘
```

#### Detalhamento de cada item

**Abrir em nova tab**
- Abre o arquivo numa nova tab no `LeafNode` ativo atual.
- Comportamento idêntico a clicar no arquivo com `Cmd+Click`.
- Se o arquivo já está aberto em alguma tab, cria uma segunda instância (o Cortex permite múltiplas tabs da mesma nota).

**Abrir à direita**
- Abre o arquivo num `LeafNode` à direita do pane ativo.
- Se não existe pane à direita: cria um novo split horizontal (`SplitNode` com `direction: 'h'`), abre o arquivo no novo `LeafNode`.
- Se já existe pane à direita: abre como nova tab naquele pane.
- Equivalente ao `Cmd+\` do Obsidian, mas acionado via context menu.

**Duplicar**
- Cria uma cópia do arquivo no mesmo diretório com sufixo ` (cópia)` antes da extensão.
- Ex: `Reunião Q1.md` → `Reunião Q1 (cópia).md`.
- Se já existe um arquivo com esse nome, incrementa: `Reunião Q1 (cópia 2).md`.
- A cópia é aberta automaticamente em nova tab.
- Sem diálogo de confirmação — operação não-destrutiva.

**Mover para...**
- Abre o **Modal de Mover Arquivo** (componente React — ver abaixo). Único item do context menu de arquivo que abre um componente React, justificado pela complexidade de mostrar uma árvore de pastas com busca.
- O arquivo não é movido até o usuário confirmar no modal.

**Adicionar tag**
- Abre o **Tag Picker** (componente React, seção 27.4) ancorado próximo ao cursor.
- Tags já associadas ao arquivo aparecem com checkmark.
- Ao fechar o picker, as mudanças são persistidas imediatamente.

**Copiar caminho ▶** (submenu nativo)
- Abre submenu nativo com três opções:
  - **Caminho relativo** — caminho do arquivo relativo à raiz do vault. Ex: `notas/2025/reuniao-q1.md`. Copiado para o clipboard.
  - **Caminho completo** — path absoluto do sistema de arquivos. Ex: `/Users/joao/MeuVault/notas/2025/reuniao-q1.md`. Copiado para o clipboard.
  - **Caminho Cortex** — URL no protocolo `cortex://`. Ex: `cortex://vault/<vault-uuid>/notas/2025/reuniao-q1.md`. Útil para criar links externos que abrem diretamente no Cortex. Copiado para o clipboard.

**Histórico de versões**
- Disponível apenas quando o Cortex Sync está ativo para o vault (`sync_status !== 'disabled'`).
- Se sync inativo: item aparece desabilitado (greyed out) com tooltip "Requer Cortex Sync ativo".
- Se ativo: abre o painel de **Histórico de Versões** (componente React, seção 24) para o arquivo selecionado, na sidebar direita ou como modal, dependendo das preferências do usuário.

**Abrir no app padrão**
- Usa `shell.rs` → `open_in_system_explorer(path)` para abrir o arquivo no app padrão do OS para aquela extensão.
- Para `.md`: abre no editor de texto padrão (TextEdit, Notepad, etc.).
- Para imagens: abre no visualizador padrão.
- Para PDFs: abre no leitor de PDF padrão.
- Nunca abre o Cortex em outra instância.

**Revelar no Finder / Explorer / Files**
- Usa `shell.rs` → `reveal_file(path)` para abrir o gerenciador de arquivos do OS com o arquivo selecionado e em destaque.
- Label adaptado por plataforma: "Revelar no Finder" (macOS), "Revelar no Explorer" (Windows), "Revelar no Gerenciador de Arquivos" (Linux).
- Implementado via `tauri-plugin-shell` com o comando nativo de cada OS (`open -R` no macOS, `explorer /select,` no Windows, `nautilus --select` / `dolphin --select` no Linux).

**Renomear**
- Coloca o nome do arquivo no File Explorer em modo de edição inline (input de texto substitui o label).
- `Enter` confirma, `Escape` cancela.
- Validação em tempo real: caracteres inválidos para o OS são bloqueados, nome vazio não é aceito.
- Após renomear: atualiza o índice MiniSearch, atualiza todas as tabs abertas com aquele arquivo (título da tab), atualiza `sync.db` com o novo path.
- Sem diálogo de confirmação — operação reversível (Ctrl+Z desfaz).

**Excluir**
- Exibe diálogo de confirmação **nativo** via `dialog.ask()`:
  - Título: `"Excluir arquivo"`
  - Mensagem: `"Tem certeza que deseja excluir "[nome do arquivo]"? Esta ação não pode ser desfeita."`
  - Botões: `"Cancelar"` (default) e `"Excluir"` (destrutivo).
- Se confirmado: move para a lixeira do OS (não deleção permanente imediata) via `trash` crate no Rust.
- Fecha todas as tabs abertas com aquele arquivo.
- Remove do índice MiniSearch e do `sync.db`.
- A exclusão via lixeira (não permanente) garante recuperação de emergência fora do Cortex.

---

### 28.4 Modal de Mover Arquivo

Componente React justificado pela complexidade — mostra uma árvore navegável do vault com busca, similar ao Quick Switcher.

**Layout:**

```
┌─────────────────────────────────────────┐
│  Mover para                          [×] │
├─────────────────────────────────────────┤
│  🔍 Buscar pasta...                      │
├─────────────────────────────────────────┤
│  📁 / (raiz do vault)                    │
│  📁 notas/                               │
│  │  📁 2025/                             │
│  │  📁 projetos/                         │
│  📁 referências/                         │
│  📁 inbox/                               │
├─────────────────────────────────────────┤
│  Destino: notas/projetos/       [Mover]  │
└─────────────────────────────────────────┘
```

- Campo de busca filtra pastas por nome em tempo real (mesmo mecanismo do Quick Switcher — MiniSearch em `path` mode).
- Clicar numa pasta a seleciona como destino (destacada e exibida no campo "Destino").
- `Enter` confirma a seleção e executa o move.
- Botão `[+ Nova pasta]` no rodapé: cria uma subpasta no destino selecionado.
- Se o arquivo já está na pasta de destino selecionada, o botão "Mover" fica desabilitado.
- O move é executado via `fs.rs` → `rename_file(old_path, new_path)` (rename cross-directory no mesmo filesystem é atômico no OS).
- Após mover: atualiza índice, tabs abertas, `sync.db`.

---

### 28.5 macOS Menubar

O Cortex registra uma menubar nativa no macOS via Tauri `Menu` API + `app.set_menu()`. Isso é exclusivo para macOS — no Windows e Linux o app não exibe menubar (sem equivalente direto com a mesma importância de UX).

**Estrutura da menubar:**

```
Cortex   File   Edit   View   Navigate   Sync   Window   Help
```

**Cortex** (menu do app — macOS only):
- Sobre o Cortex
- Verificar atualizações...
- ─────
- Preferências...  `Cmd+,`
- ─────
- Serviços
- ─────
- Ocultar Cortex  `Cmd+H`
- Ocultar Outros  `Cmd+Opt+H`
- Mostrar Todos
- ─────
- Sair do Cortex  `Cmd+Q`

**File:**
- Nova nota  `Cmd+N`
- Nova nota em nova tab  `Cmd+Shift+N`
- ─────
- Abrir vault...
- Vaults recentes  ▶
- ─────
- Renomear nota atual
- Mover nota atual para...
- Duplicar nota atual
- ─────
- Fechar tab  `Cmd+W`
- Fechar painel

**Edit:**
- Desfazer  `Cmd+Z`
- Refazer  `Cmd+Shift+Z`
- ─────
- Recortar  `Cmd+X`
- Copiar  `Cmd+C`
- Colar  `Cmd+V`
- Selecionar tudo  `Cmd+A`
- ─────
- Localizar  `Cmd+F`
- Localizar no vault  `Cmd+Shift+F`
- ─────
- Verificar ortografia e gramática  ▶

**View:**
- Alternar Live Preview / Source  `Cmd+E`
- ─────
- Sidebar esquerda  `Cmd+[`
- Sidebar direita  `Cmd+]`
- ─────
- Aumentar zoom  `Cmd++`
- Diminuir zoom  `Cmd+-`
- Zoom padrão  `Cmd+0`
- ─────
- Alternar tema claro/escuro

**Navigate:**
- Voltar  `Cmd+Opt+←`
- Avançar  `Cmd+Opt+→`
- ─────
- Quick Switcher  `Cmd+O`
- Command Palette  `Cmd+P`
- ─────
- Próxima tab  `Ctrl+Tab`
- Tab anterior  `Ctrl+Shift+Tab`

**Sync:**
- Status do sync (item não-clicável, exibe "Sincronizado" / "Sincronizando..." / "Offline")
- ─────
- Sincronizar agora  `Cmd+Shift+S`
- ─────
- Histórico de versões da nota atual
- Resolver conflitos pendentes  (desabilitado se não há conflitos)
- ─────
- Configurações de sync...

**Window:**
- Minimizar  `Cmd+M`
- Zoom
- ─────
- Trazer tudo para frente
- ─────
- [lista de janelas abertas]

**Help:**
- Documentação do Cortex
- Atalhos de teclado
- ─────
- Reportar problema
- ─────
- Logs do app (abre arquivo de log no editor padrão)

#### Atualização dinâmica da menubar

Itens da menubar que dependem de estado (ex: "Histórico de versões da nota atual" requer nota ativa com sync ativo) têm seu estado `enabled` atualizado via comando IPC `update_menu_item(item_id, { enabled, label? })` emitido pelo frontend quando o estado relevante muda. O Rust aplica via `app.menu().get(item_id).set_enabled(bool)`.

---

### 28.6 Diálogos Nativos — Política de Uso

Todos os diálogos são implementados via `tauri-plugin-dialog`. O módulo `dialog.rs` em `src-tauri/src/commands/` é o único ponto de entrada para diálogos — nunca `window.confirm()`, `window.alert()` ou componentes React de modal para ações destrutivas simples.

| Tipo de diálogo | API Tauri | Quando usar |
|----------------|----------|------------|
| Confirmação destrutiva | `dialog.ask()` | Excluir arquivo, excluir tag com muitas notas, mesclar tags |
| Alerta de erro | `dialog.message(kind: "error")` | Erro irrecuperável, falha de escrita em disco |
| Alerta informativo | `dialog.message(kind: "info")` | Operação concluída irreversivelmente sem opção de desfazer |
| Seleção de pasta | `dialog.open(directory: true)` | Adicionar vault, selecionar pasta de export |
| Seleção de arquivo | `dialog.open(multiple: false)` | Importar tema, importar plugin externo |
| Salvar arquivo | `dialog.save()` | Exportar vault, exportar nota como PDF |

**Exceção documentada:** o modal de Mover Arquivo, o Tag Picker, o Tag Manager e o Command Palette são React porque a complexidade da UI (busca incremental, árvore navegável, grids de seleção, listas virtualizadas) não tem representação adequada em diálogos nativos do OS.

---

### 28.7 Impacto na Arquitetura de Packages

#### `src-tauri/src/commands/menu.rs` (novo módulo)

Responsável por todos os context menus e pela menubar. Comandos IPC expostos:

- `show_context_menu(menu_id: String, context: JsonValue)` — constrói e exibe o menu nativo para o contexto dado. Retorna imediatamente (o resultado da seleção chega via evento Tauri).
- `update_menu_item(item_id: String, patch: MenuItemPatch)` — atualiza estado de item da menubar (enabled, label, checked).
- `set_menu_item_checked(item_id: String, checked: bool)` — para itens de toggle na menubar (ex: "Sidebar esquerda").

Evento emitido ao frontend após seleção no context menu:
```
ContextMenuAction {
  action_id: String,   // ex: "file.open_right", "file.delete", "file.copy_path.relative"
  context: JsonValue   // o mesmo payload enviado ao show_context_menu
}
```

#### `src-tauri/src/commands/dialog.rs` (atualizado)

Adiciona os novos comandos necessários:
- `show_confirm(title, message)` → bool
- `show_alert(title, message, kind)` → void
- `pick_folder(title)` → Option\<String\>
- `pick_file(title, filters)` → Option\<String\>
- `save_file(title, default_name, filters)` → Option\<String\>

#### `packages/platform` (atualizado)

O platform adapter abstrai as chamadas de menu e dialog para compatibilidade futura com React Native:

```typescript
platform.menu.showContextMenu(menuId, context)   // Tauri: IPC → menu.rs | RN: ActionSheet nativo
platform.menu.updateMenuItem(itemId, patch)       // Tauri: IPC → menu.rs | RN: n/a
platform.dialog.confirm(title, message)           // Tauri: dialog.ask() | RN: Alert.alert()
platform.dialog.alert(title, message, kind)       // Tauri: dialog.message() | RN: Alert.alert()
platform.dialog.pickFolder(title)                 // Tauri: dialog.open() | RN: DocumentPicker
platform.dialog.pickFile(title, filters)          // Tauri: dialog.open() | RN: DocumentPicker
platform.dialog.saveFile(title, name, filters)    // Tauri: dialog.save() | RN: Share API
```

**React Native:** context menus viram `ActionSheet` nativos (iOS) ou bottom sheet nativo (Android). Diálogos de confirmação usam `Alert.alert()` nativo. O comportamento é equivalente — apenas a superfície visual muda conforme a plataforma.

---

## 29. Layout da Sidebar Esquerda e Integração Nativa macOS

> Esta seção especifica a aparência e comportamento exatos da sidebar esquerda, com base no design visual adotado: navegação em lista (ícone + label), traffic lights sobrepostos ao topo da sidebar, e efeito de vibrancy nativo no macOS. A sidebar deve sentir-se como uma superfície nativa do macOS — não como uma UI web dentro de uma janela.

---

### 29.1 Referência Visual

A sidebar esquerda segue o padrão visual do screenshot de referência:

```
┌─────────────────────────┐
│  ⬤ ⬤ ⬤               │  ← traffic lights nativos, sobrepostos, topo esquerdo
│                          │
│  📁 Files                │  ← nav item ativo (bold, sem highlight de fundo)
│  🔍 Search               │  ← nav item
│  🔖 Bookmarks            │  ← nav item
│                          │
│  > attachments           │  ← conteúdo da view ativa (file tree, etc.)
│  > Categories            │
│  ∨ Clippings             │
│  > cloud                 │
└─────────────────────────┘
```

Características visuais obrigatórias:
- Sem titlebar separada — janela começa no topo absoluto da tela.
- Traffic lights (fechar/minimizar/maximizar) nativos do macOS, posicionados no topo esquerdo da sidebar, sobrepostos ao conteúdo via `titleBarStyle: Overlay`.
- Nav items com ícone Lucide + label de texto em linha — **não** um ribbon vertical de ícones sem texto.
- Sidebar com efeito de vibrancy/blur nativo no macOS (material `Sidebar`).
- Fundo sólido no Windows e Linux (sem vibrancy — não existe equivalente nativo).

---

### 29.2 Configuração da Janela Tauri (macOS)

#### `tauri.conf.json` — configuração da janela principal

```json
{
  "app": {
    "windows": [
      {
        "decorations": false,
        "titleBarStyle": "Overlay",
        "hiddenTitle": true,
        "transparent": true,
        "vibrancy": "sidebar"
      }
    ]
  }
}
```

- `decorations: false` — remove a titlebar padrão do sistema.
- `titleBarStyle: "Overlay"` — mantém os traffic lights nativos (⬤⬤⬤) sobrepostos ao conteúdo da janela, no canto superior esquerdo. Sem isso, o app ficaria sem controles de janela.
- `hiddenTitle: true` — remove o título textual da janela que apareceria ao lado dos traffic lights.
- `transparent: true` — permite que o WebView tenha fundo transparente, necessário para o vibrancy aparecer através do conteúdo React.

#### Vibrancy via `window-vibrancy` crate

O efeito de vibrancy **não é CSS** — é uma propriedade da janela nativa configurada no Rust. A crate `window-vibrancy` expõe a API necessária:

```rust
// src-tauri/src/main.rs — após criação da janela
#[cfg(target_os = "macos")]
{
    use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
    let window = app.get_webview_window("main").unwrap();
    apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, None)
        .expect("Unsupported platform — vibrancy requires macOS 10.10+");
}
```

`NSVisualEffectMaterial::Sidebar` é o material exato que o macOS usa no Finder, Notes e Mail — produz o blur translúcido que adapta automaticamente ao wallpaper do usuário e ao modo claro/escuro do sistema.

O vibrancy é aplicado **à janela inteira**, não apenas à sidebar. A ilusão de que só a sidebar tem o efeito é criada em CSS: a área do editor tem `background: var(--color-background-primary)` sólido, enquanto a sidebar tem `background: transparent` — deixando o efeito nativo aparecer apenas nela.

#### Fallback Windows e Linux

```rust
#[cfg(not(target_os = "macos"))]
{
    // Windows: Mica/Acrylic via window-vibrancy, mas apenas se disponível (Win11+)
    // Linux: sem vibrancy — sidebar usa cor sólida
}
```

No Windows 11, a crate `window-vibrancy` suporta `apply_mica()` (efeito similar). No Windows 10 e Linux, a sidebar usa `background: var(--color-sidebar-bg)` sólido — sem tentativa de simular vibrancy via CSS blur, que nunca fica igual ao nativo.

---

### 29.3 Layout CSS da Sidebar — Compensação dos Traffic Lights

Com `titleBarStyle: Overlay`, os traffic lights são sobrepostos ao WebView com altura de aproximadamente **52px** no topo esquerdo (varia levemente por versão do macOS). O conteúdo da sidebar precisa de padding-top suficiente para não ser coberto.

```css
/* Aplicado apenas no macOS — detectado via classe injetada pelo Tauri no <body> */
body[data-platform="macos"] .sidebar-left {
  padding-top: 52px;  /* Espaço para os traffic lights */
  background: transparent;  /* Deixa o vibrancy nativo aparecer */
}

body[data-platform="windows"] .sidebar-left,
body[data-platform="linux"] .sidebar-left {
  padding-top: 0;
  background: var(--color-sidebar-bg);  /* Fundo sólido */
}
```

A classe `data-platform` é injetada pelo Rust no `<body>` do WebView na inicialização via `window.__CORTEX_PLATFORM__ = "macos"` e lida pelo React no bootstrap do app. Isso evita que o CSS precise de detecção de plataforma em JavaScript.

#### Área de drag da janela

Com `decorations: false`, o usuário não pode mais arrastar a janela pela titlebar (que não existe). A região de drag é definida via atributo CSS `data-tauri-drag-region` em elementos HTML:

```html
<!-- A faixa acima dos nav items (onde ficam os traffic lights) é draggable -->
<div class="sidebar-drag-region" data-tauri-drag-region />
```

A div com `data-tauri-drag-region` cobre toda a faixa superior da sidebar (os ~52px de padding-top), permitindo que o usuário arraste a janela pela região dos traffic lights, como esperado no macOS.

---

### 29.4 Nav Items da Sidebar — Estrutura e Comportamento

#### Estrutura visual

Os itens de navegação da sidebar esquerda são uma **lista vertical com ícone + label**, não um ribbon de ícones. Essa é a diferença fundamental com o design anterior documentado na seção 18.

```
📁  Files          ← ícone Lucide (FolderOpen) + label, 16px, weight medium quando ativo
🔍  Search         ← ícone Lucide (Search) + label
🔖  Bookmarks      ← ícone Lucide (Bookmark) + label
🏷  Tags           ← ícone Lucide (Tag) + label
```

Tipografia dos nav items: mesma fonte do app, tamanho 13–14px, weight `500` no item ativo, `400` nos demais. Sem fundo colorido no item ativo — diferenciação apenas por peso tipográfico e opacidade do ícone (ativo: 100%, inativo: 60%).

Este comportamento respeita o padrão visual do macOS Finder e do screenshot de referência: sem "pill" de seleção, sem fundo colorido — apenas o texto em bold indica o item ativo.

#### Items core fixos (sempre presentes, nesta ordem)

1. **Files** — `FolderOpen` — abre o File Explorer
2. **Search** — `Search` — abre a Search Sidebar
3. **Bookmarks** — `Bookmark` — abre os Bookmarks
4. **Tags** — `Tag` — abre o Tag Manager

#### Items de plugins (abaixo de divisor visual)

Registrados via `api.ui.registerSidebarItem(icon, label, viewType)`. Aparecem após um divisor sutil abaixo dos items core. O usuário pode reordenar via drag e ocultar via context menu nativo (click direito → "Ocultar do sidebar").

#### Largura da sidebar

- Default: **240px**.
- Redimensionável via drag na borda direita da sidebar.
- Mínimo: **180px** (abaixo disso os labels ficam cortados de forma inaceitável).
- Máximo: **400px**.
- A largura persiste em `appearance.json` → `sidebarWidth`.
- Colapsável completamente: `Cmd+[` colapsa para **0px** com animação de 150ms. O estado colapsado persiste em `appearance.json` → `sidebarCollapsed`.

---

### 29.5 Conteúdo Abaixo dos Nav Items

O espaço abaixo dos 4 nav items exibe o conteúdo da view ativa (file tree, resultados de busca, lista de bookmarks, etc.) — como no screenshot, onde se vê a árvore de arquivos com itens expansíveis.

A separação entre os nav items e o conteúdo é visual apenas (espaçamento ou divisor sutil), sem barra ou header adicional. O label do item ativo não é repetido como título da seção — o ícone bold já comunica o contexto.

---

### 29.6 Impacto na Arquitetura

#### Renomeação: "Ribbon" → "Sidebar Nav"

O termo "ribbon" usado na seção 18 referia-se a uma barra vertical estreita de ícones (modelo Obsidian). O design adotado é diferente — uma sidebar mais larga com lista de navegação. A terminologia é atualizada em todo o documento:

- `ribbon` → `sidebar-nav` no código CSS e nos stores.
- `api.ui.registerRibbonIcon()` → `api.ui.registerSidebarItem(icon, label, viewType)`.
- `appearance.json` → campo `ribbonState` renomeado para `sidebarNavState`.

#### `src-tauri/src/main.rs`

Recebe lógica de setup da janela por plataforma:
- macOS: `apply_vibrancy()` + injeção de `data-platform="macos"` no body.
- Windows: tentativa de `apply_mica()` se Win11 detectado, senão fallback.
- Linux: apenas injeção de `data-platform="linux"`.

#### `packages/ui` — componente `<SidebarNav>`

```
packages/ui/src/
└── SidebarNav/
    ├── SidebarNav.tsx      # Container com padding-top dinâmico, drag region, lista de items
    ├── SidebarNavItem.tsx  # Item individual: ícone + label, estado ativo
    └── SidebarNav.css      # Estilos com variáveis CSS, background transparent no macOS
```

#### `tauri.conf.json` — dependência nova

`window-vibrancy = "0.5"` adicionada ao `Cargo.toml` do `src-tauri`.

---

## 30. Plugin API — Referência Completa para Desenvolvedores

> Esta seção é a especificação canônica da API pública do Cortex para desenvolvimento de plugins. Ela substitui e expande a visão de alto nível da seção 5. Plugins de comunidade importam exclusivamente de `@cortex/plugin-api` — nunca de pacotes internos. A API é versionada de forma independente do app via semver e cada breaking change é comunicado com migration guide.
>
> **Diferencial em relação ao Obsidian:** React é cidadão de primeira classe com acesso a providers compartilhados. Secret storage via keychain nativo. Permissões declarativas por operação. Eventos tipados em TypeScript. Editor API com acesso direto a CM6 tipado. Cross-platform estrutural via platform adapter — plugins não precisam checar `Platform.isMobile` manualmente para operações comuns.

---

### 30.1 Anatomia de um Plugin Cortex

#### Estrutura de arquivos

```
meu-plugin/
├── manifest.json        # Declaração de identidade, versão, permissões
├── main.ts              # Entry point — exporta classe default que estende CortexPlugin
├── package.json         # Dev dependencies (bundler, TypeScript, @cortex/plugin-api)
├── tsconfig.json
└── styles.css           # Opcional — escopado automaticamente ao plugin-id
```

O plugin é distribuído como bundle ESM compilado (`main.js`). O código-fonte em TypeScript não é necessário na distribuição final.

#### Classe base `CortexPlugin`

Todo plugin exporta uma classe default que estende `CortexPlugin`:

```typescript
import { CortexPlugin, PluginAPI } from '@cortex/plugin-api'

export default class MeuPlugin extends CortexPlugin {
  async onload(api: PluginAPI): Promise<void> {
    // Registro de recursos. api é a instância completa da Plugin API.
    // Tudo registrado aqui é automaticamente desregistrado no unload.
  }

  async onunload(): Promise<void> {
    // Cleanup de recursos externos não gerenciados pela api:
    // timers, WebSockets, referências a DOM fora do container do plugin, etc.
    // Recursos registrados via api.* são limpos automaticamente — não precisam de cleanup aqui.
  }
}
```

**Diferença em relação ao Obsidian:** no Obsidian, o plugin recebe `app: App` e usa `this.addCommand()`, `this.registerEvent()` etc. como métodos da própria classe. No Cortex, a API é um objeto explícito passado como argumento — isso torna as dependências visíveis, facilita testes unitários (o `api` pode ser mockado) e evita acoplamento implícito ao estado global.

#### O método `register()` — cleanup automático

`api.register(fn)` registra uma função de cleanup arbitrária que será chamada quando o plugin for descarregado:

```typescript
// Qualquer recurso externo pode ser registrado para cleanup automático
const intervalId = setInterval(meuHandler, 5000)
api.register(() => clearInterval(intervalId))

// Ou para um EventEmitter externo
const handler = () => { /* ... */ }
emitter.on('evento', handler)
api.register(() => emitter.off('evento', handler))
```

Recursos registrados via `api.*` (comandos, views, settings, event handlers) **nunca** precisam de `register()` explícito — o framework os desregistra automaticamente no `unload`.

#### Manifest completo

```json
{
  "id": "cortex-daily-notes",
  "name": "Daily Notes",
  "version": "1.2.0",
  "minCortexVersion": "1.0.0",
  "maxCortexVersion": null,
  "author": "Nome do Autor",
  "authorUrl": "https://github.com/autor",
  "description": "Cria e navega entre notas diárias automaticamente.",
  "homepage": "https://github.com/autor/cortex-daily-notes",
  "fundingUrl": "https://buymeacoffee.com/autor",
  "platforms": ["desktop", "mobile"],
  "permissions": [
    "vault:read",
    "vault:write",
    "network",
    "secret-storage",
    "ui:status-bar",
    "ui:sidebar-item",
    "ui:context-menu"
  ],
  "entryPoints": {
    "desktop": "main.js",
    "mobile": "main.js"
  }
}
```

**Campos do manifest:**

- `id`: identificador único global (snake-case, sem espaços). Usado como namespace para settings, dados e estilos CSS.
- `platforms`: `["desktop"]`, `["mobile"]`, ou `["desktop", "mobile"]`. Plugins mobile-only não aparecem no desktop e vice-versa.
- `permissions`: array declarativo exibido ao usuário na instalação. O framework verifica em runtime — chamadas a APIs não-permitidas lançam erro com mensagem clara.
- `entryPoints`: permite bundles diferentes por plataforma (ex: implementação nativa em RN vs. WebView no desktop). Se omitido, usa `main.js` em todas as plataformas.

#### Sistema de permissões

| Permissão | O que libera |
|-----------|-------------|
| `vault:read` | `api.vault.read*`, `api.vault.list*`, `api.search.*` |
| `vault:write` | `api.vault.write*`, `api.vault.create*`, `api.vault.delete*`, `api.vault.rename*` |
| `vault:config` | Leitura e escrita de `.cortex/` (exceto dados de outros plugins) |
| `network` | `fetch()` irrestrito. Sem esta permissão, `fetch()` é bloqueado via CSP |
| `secret-storage` | `api.secrets.*` — leitura e escrita no keychain do OS |
| `ui:status-bar` | `api.ui.addStatusBarItem()` |
| `ui:sidebar-item` | `api.ui.registerSidebarItem()` |
| `ui:context-menu` | `api.ui.registerContextMenuItem()` |
| `ui:modal` | `api.ui.openModal()` |
| `editor:extension` | `api.editor.registerExtension()` — registra extensões CM6 |
| `editor:post-processor` | `api.editor.registerPostProcessor()` — processa HTML da Reading View |
| `tags` | `api.tags.*` |

Permissões não declaradas: o método da API lança `PermissionError` em runtime com mensagem: `"Plugin 'cortex-daily-notes' tentou usar api.secrets sem a permissão 'secret-storage' declarada no manifest."` Isso facilita debugging durante desenvolvimento e protege o usuário em produção.

---

### 30.2 Ciclo de Vida Detalhado

#### Estados e transições

```
uninstalled
     │ instalar
     ▼
  installed (disabled)
     │ habilitar
     ▼
  loading
     │ onload() completo
     ▼
   loaded (active)
     │ desabilitar / fechar vault / trocar vault
     ▼
  unloading
     │ onunload() + cleanup automático completo
     ▼
  installed (disabled)
```

#### Fase `loading` em detalhe

O Plugin Manager chama `onload(api)` e aguarda a Promise resolver. Durante o `onload`:

1. O plugin registra seus recursos via `api.*`.
2. O framework valida cada chamada contra o manifest de permissões.
3. Se `onload` lança ou rejeita: plugin vai para estado `error`, recursos parcialmente registrados são revertidos, o usuário é notificado com o stack trace.
4. Tempo máximo de `onload`: **10 segundos**. Após isso: timeout, plugin vai para `error`.

#### Carregamento adiado de views (`defer`)

Views pesadas não devem ser abertas durante o `onload` — o workspace pode ainda não estar restaurado. O padrão correto:

```typescript
async onload(api: PluginAPI) {
  // 1. Registra o tipo de view (barato — apenas declara)
  api.workspace.registerView('minha-view', (leaf) => new MinhaView(leaf, api))

  // 2. Adia a abertura até o workspace estar pronto
  api.workspace.onReady(() => {
    // Aqui é seguro abrir/restaurar views
    if (api.workspace.getLeavesOfType('minha-view').length === 0) {
      api.workspace.getRightLeaf(false)?.setViewState({ type: 'minha-view' })
    }
  })
}
```

`api.workspace.onReady(callback)` — o callback é chamado imediatamente se o workspace já está pronto, ou após a restauração completa se não estiver. É o equivalente melhorado de `app.workspace.onLayoutReady()` do Obsidian — não requer `this.registerEvent()` separado.

#### Cleanup automático — o que o framework faz

Quando `onunload()` é chamado, o framework executa automaticamente (na ordem):

1. Todos os handlers registrados via `api.register(fn)`.
2. Todos os event subscriptions registrados via `api.events.on()`.
3. Todos os comandos registrados via `api.commands.add()`.
4. Todos os items de UI registrados (status bar, sidebar items, context menu items).
5. Todos os tipos de view registrados via `api.workspace.registerView()`.
6. Todas as extensões CM6 registradas via `api.editor.registerExtension()`.
7. Todos os post-processors registrados via `api.editor.registerPostProcessor()`.
8. O CSS do plugin é removido do DOM.
9. Os dados do plugin em memória são descartados (mas `data.json` persiste em disco).

O `onunload()` do plugin é chamado **antes** do cleanup automático — o plugin pode usar `onunload` para cleanup de recursos que o framework não conhece (WebSockets, workers, etc.).

---

### 30.3 `api.vault` — Operações de Arquivo

Requer permissões `vault:read` e/ou `vault:write`.

```typescript
// Leitura
api.vault.read(path: string): Promise<string>
api.vault.readBinary(path: string): Promise<ArrayBuffer>
api.vault.exists(path: string): Promise<boolean>
api.vault.list(path?: string): Promise<VaultEntry[]>  // lista diretório
api.vault.listRecursive(path?: string): Promise<VaultEntry[]>
api.vault.getMetadata(path: string): Promise<FileMetadata>
// FileMetadata: { path, name, extension, size, mtime, ctime }

// Escrita
api.vault.write(path: string, content: string): Promise<void>
api.vault.writeBinary(path: string, data: ArrayBuffer): Promise<void>
api.vault.create(path: string, content?: string): Promise<void>
api.vault.createDir(path: string): Promise<void>
api.vault.rename(oldPath: string, newPath: string): Promise<void>
api.vault.delete(path: string): Promise<void>
api.vault.trash(path: string): Promise<void>  // move para lixeira do OS

// Observação de mudanças
api.vault.on('create', (path: string) => void): Unsubscribe
api.vault.on('modify', (path: string) => void): Unsubscribe
api.vault.on('delete', (path: string) => void): Unsubscribe
api.vault.on('rename', (oldPath: string, newPath: string) => void): Unsubscribe

// Informações do vault
api.vault.getRoot(): string           // path absoluto da raiz do vault
api.vault.getUUID(): string           // UUID do vault
api.vault.getName(): string           // nome do vault (de vaults.json)
api.vault.getConfigDir(): string      // path absoluto de vault/.cortex/
api.vault.toAbsolutePath(relative: string): string
api.vault.toRelativePath(absolute: string): string
```

**Diferença em relação ao Obsidian:** o Obsidian tem `TFile`, `TFolder` e `TAbstractFile` como entidades de vault com métodos. O Cortex usa strings de path puro + funções — mais simples, mais testável, sem objetos mutáveis que ficam stale após renames. O `VaultEntry` é um objeto plain `{ path, name, isDir, size, mtime }`.

---

### 30.4 `api.commands` — Command Palette

```typescript
interface CommandDefinition {
  id: string                    // único dentro do plugin — prefixado automaticamente com plugin-id
  name: string                  // exibido no Command Palette
  icon?: string                 // nome de ícone Lucide
  hotkeys?: Hotkey[]            // sugestão de hotkey padrão (pode ser sobrescrito pelo usuário)

  // callback normal — sempre disponível
  callback?: () => void | Promise<void>

  // callback condicional — quando checking=true, retorna true se o comando está disponível
  // quando checking=false, executa. Usado para desabilitar itens no Command Palette.
  checkCallback?: (checking: boolean) => boolean | void

  // callback de editor — só disponível quando há editor ativo com nota aberta
  editorCallback?: (editor: EditorHandle, view: NoteView) => void | Promise<void>
}

api.commands.add(def: CommandDefinition): void
api.commands.remove(id: string): void
api.commands.execute(id: string): Promise<boolean>  // true se executou
```

**`checkCallback` em detalhe:** quando o Command Palette abre, chama `checkCallback(true)` em todos os comandos para determinar quais estão disponíveis. Retornar `false` desabilita o item (exibido em cinza). Quando o usuário seleciona o item, chama `checkCallback(false)` para executar. Um `checkCallback` que retorna `true` no checking e não executa nada no execute é um erro de implementação — o framework loga warning.

---

### 30.5 `api.ui` — Interface do Usuário

#### Status Bar

```typescript
interface StatusBarItem {
  setText(text: string): void
  setTooltip(tooltip: string): void
  setIcon(iconName: string): void
  setVisible(visible: boolean): void
  onClick(callback: () => void): void
  remove(): void
}

api.ui.addStatusBarItem(): StatusBarItem
```

O status bar item é um elemento nativo no rodapé do app (desktop) ou equivalente em mobile. No React Native, o status bar mapeia para uma área dedicada na barra inferior do app. Plugins com `ui:status-bar` no manifest podem adicionar múltiplos itens — cada item é independente.

#### Sidebar Nav Item

```typescript
api.ui.registerSidebarItem({
  id: string,
  label: string,
  icon: string,           // nome de ícone Lucide
  viewType: string,       // viewType registrado via api.workspace.registerView()
  defaultSide: 'left' | 'right',
  order?: number          // posição relativa entre items de plugin (core items têm ordem fixa)
}): void
```

#### Context Menu Items

```typescript
// Adicionar item ao context menu de arquivo no File Explorer
api.ui.registerFileContextMenuItem({
  label: string,
  icon?: string,
  section?: 'open' | 'action' | 'info' | 'danger',  // grupo de separador
  // check: retorna true se o item deve aparecer para este arquivo
  check?: (path: string) => boolean,
  onClick: (path: string) => void | Promise<void>
}): void

// Adicionar item ao context menu de editor (clique direito no texto)
api.ui.registerEditorContextMenuItem({
  label: string,
  icon?: string,
  check?: (editor: EditorHandle) => boolean,
  onClick: (editor: EditorHandle) => void | Promise<void>
}): void
```

Os items de context menu de plugin aparecem **dentro do menu nativo do OS** via Tauri Menu API — não são elementos HTML. Quando o frontend emite o evento `contextmenu` e chama `show_context_menu()` no Rust, o Plugin Manager serializa os items de plugin registrados e os inclui no payload enviado ao Rust para construção do menu nativo. A ação selecionada volta ao frontend via evento Tauri `ContextMenuAction` e o framework roteia para o callback correto do plugin.

**Diferença crítica com Obsidian:** no Obsidian, context menus de plugins são elementos HTML — um `<div>` posicionado absolutamente, não um menu nativo. No Cortex, são menus nativos do OS em todas as plataformas. No React Native (iOS), mapeiam para `UIContextMenuConfiguration`. No Android, para o menu contextual nativo.

#### Notificações (Toasts)

```typescript
api.ui.toast(message: string, options?: {
  duration?: number,   // ms, default 4000. 0 = permanente até dismiss manual
  type?: 'info' | 'success' | 'warning' | 'error',
  action?: { label: string, onClick: () => void }
}): { dismiss: () => void }
```

#### Modais React (quando necessário)

Para UIs complexas que precisam mostrar muitos dados estruturados:

```typescript
api.ui.openModal<T>(Component: React.ComponentType<ModalProps<T>>, options?: {
  title?: string,
  width?: 'sm' | 'md' | 'lg' | 'fullscreen'
}): Promise<T | null>

// ModalProps injetado automaticamente no componente:
interface ModalProps<T> {
  onClose: (result: T | null) => void
  // Providers automáticos: ThemeContext, VaultContext, CommandContext
}
```

**React como cidadão de primeira classe:** o componente modal recebe automaticamente os providers do Cortex — `useTheme()`, `useVault()`, `useCommands()` funcionam dentro do modal sem nenhum wrapper adicional. Isso é fundamentalmente diferente do Obsidian onde plugins que usam React precisam montar manualmente `ReactDOM.render()` sem acesso ao contexto do app.

---

### 30.6 `api.workspace` — Layout e Views

#### Tipos fundamentais

```typescript
// Uma "folha" — slot no layout que contém uma view
interface Leaf {
  id: string
  viewType: string | null
  getView(): PluginView | null
  setViewState(state: ViewState): Promise<void>
  detach(): void              // remove do layout
  isPinned(): boolean
}

// Estado de uma view numa leaf
interface ViewState {
  type: string,               // viewType registrado
  state?: Record<string, unknown>,  // estado serializado da view
  active?: boolean
}
```

#### Navegação e abertura de notas

```typescript
// Obter leaves
api.workspace.getActiveLeaf(): Leaf | null
api.workspace.getLeavesOfType(viewType: string): Leaf[]
api.workspace.getLeftLeaf(split: boolean): Leaf      // false = usa existente, true = cria novo
api.workspace.getRightLeaf(split: boolean): Leaf
api.workspace.getMostRecentLeaf(): Leaf | null

// Abrir notas
api.workspace.openNote(path: string, options?: {
  leaf?: Leaf,                  // em qual leaf abrir (null = leaf ativa)
  newTab?: boolean,             // forçar nova tab
  newPane?: 'right' | 'left' | 'below' | 'above',  // abrir em split
  mode?: 'live' | 'source' | 'preview'
}): Promise<void>

// Revelar uma leaf (garante que está visível)
api.workspace.revealLeaf(leaf: Leaf): void

// Registrar tipo de view customizada
api.workspace.registerView(
  viewType: string,
  factory: (leaf: Leaf) => PluginView
): void

// Callback quando workspace está pronto para uso
api.workspace.onReady(callback: () => void): void

// Registrar provider para o Quick Switcher
api.workspace.registerQuickSwitcherProvider(provider: QuickSwitcherProvider): void
```

#### Implementando uma View

```typescript
import { PluginView, Leaf, PluginAPI } from '@cortex/plugin-api'

class MinhaView implements PluginView {
  constructor(private leaf: Leaf, private api: PluginAPI) {}

  // Obrigatórios
  getViewType(): string { return 'minha-view' }
  getDisplayText(): string { return 'Minha View' }

  // Opcionais
  getIcon(): string { return 'star' }
  getState(): Record<string, unknown> { return { /* estado serializável */ } }
  setState(state: Record<string, unknown>): Promise<void> { /* restaura estado */ return Promise.resolve() }

  // Ciclo de vida
  async onOpen(): Promise<void> {
    // Chamado quando a view é aberta/restaurada
    // Para desktop: api.ui fornece um container DOM React
    // Para mobile: api.ui fornece uma API de composição de componentes nativos
  }

  async onClose(): Promise<void> {
    // Cleanup da view
  }
}
```

#### Views em Desktop vs. Mobile

**Desktop (Tauri/WebView):** a view tem acesso a `this.leaf.containerEl` — um `HTMLElement` onde o plugin pode montar React via `api.ui.mountReact(Component, containerEl)`. O helper `mountReact` garante que o componente recebe todos os providers do Cortex e é desmontado corretamente no `onClose`.

**Mobile (React Native):** não há DOM. A view retorna um **React Native component** via `getComponent(): React.ComponentType`. O Cortex monta esse componente dentro da estrutura de panes do app mobile. O componente deve usar apenas primitivos do React Native e componentes de `@cortex/ui` — não elementos HTML.

```typescript
// Implementação cross-platform com o mesmo plugin
class MinhaView implements PluginView {
  async onOpen() {
    if (this.api.platform.isNative) {
      // React Native — registra componente que o framework vai montar
      this.api.ui.setNativeComponent(MinhaViewRN)
    } else {
      // Web/Tauri — monta React no container DOM
      this.api.ui.mountReact(MinhaViewWeb, this.leaf.containerEl)
    }
  }
}
```

---

### 30.7 `api.editor` — Editor e CodeMirror 6

Esta é a API mais sofisticada e diferencia o Cortex do Obsidian de forma significativa.

#### EditorHandle — Abstração de alto nível

```typescript
interface EditorHandle {
  // Leitura
  getValue(): string
  getLine(line: number): string
  lineCount(): number
  getCursor(): { line: number, ch: number }
  getSelection(): string
  getSelectionRange(): { from: Position, to: Position } | null

  // Escrita (cada operação cria uma transaction no CM6)
  setValue(content: string): void
  setLine(line: number, content: string): void
  replaceRange(replacement: string, from: Position, to: Position): void
  replaceSelection(replacement: string): void
  setCursor(pos: Position): void
  setSelection(from: Position, to: Position): void

  // Transações batch (operações múltiplas em um único undo step)
  transaction(fn: (tr: EditorTransaction) => void): void

  // Scroll
  scrollIntoView(pos: Position): void

  // Acesso direto ao CM6 (requer permissão editor:extension)
  readonly cm: EditorView        // instância CodeMirror 6 — API completa disponível
  readonly state: EditorState    // estado atual do CM6
}
```

**O `cm` direto:** diferente do Obsidian que esconde o CM6 atrás de uma abstração às vezes incompleta, o Cortex expõe `editor.cm` como `EditorView` tipado. Isso dá acesso completo ao CM6 sem gambiarras — plugins avançados podem usar `view.dispatch()`, `view.plugin()`, `StateField`, etc. diretamente. A abstração `EditorHandle` existe para conveniência — `cm` existe para poder.

#### Acessar o editor ativo

```typescript
api.editor.getActive(): EditorHandle | null
api.editor.getActiveNote(): { path: string, frontmatter: Record<string, unknown> } | null
```

#### Registrar extensões CodeMirror 6

```typescript
// Registra uma extensão CM6 em todos os editores ativos e futuros
api.editor.registerExtension(extension: Extension): void

// Extensões são automaticamente removidas no unload do plugin.
// Para extensões dinâmicas (que precisam ser atualizadas em runtime):
const compartment = new Compartment()
api.editor.registerExtension(compartment.of(minhaExtensao))
// Mais tarde:
editor.cm.dispatch({ effects: compartment.reconfigure(novaExtensao) })
```

#### StateFields

```typescript
import { StateField, StateEffect } from '@codemirror/state'

// Definição (fora do plugin, no nível de módulo)
const myEffect = StateEffect.define<string>()
const myField = StateField.define<string>({
  create: () => '',
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(myEffect)) return effect.value
    }
    return value
  }
})

// No onload:
api.editor.registerExtension(myField)

// Despachar effect de dentro do plugin:
editor.cm.dispatch({ effects: myEffect.of('novo valor') })

// Ler o state field de dentro de uma ViewPlugin:
const valor = view.state.field(myField)
```

#### ViewPlugins

```typescript
import { ViewPlugin, ViewUpdate } from '@codemirror/view'

const meuViewPlugin = ViewPlugin.fromClass(
  class {
    constructor(view: EditorView) {
      // setup inicial
    }
    update(update: ViewUpdate) {
      // chamado a cada update do editor
      if (update.docChanged || update.viewportChanged) {
        // recalcular decorações ou estado visual
      }
    }
    destroy() {
      // cleanup
    }
  },
  {
    decorations: (plugin) => plugin.decorations,  // se o plugin produz decorações
  }
)

api.editor.registerExtension(meuViewPlugin)
```

#### Decorações

```typescript
import { Decoration, DecorationSet, RangeSetBuilder } from '@codemirror/view'

// Dentro de um ViewPlugin.update():
const builder = new RangeSetBuilder<Decoration>()

// Mark decoration (aplica classe CSS a range de texto)
builder.add(from, to, Decoration.mark({ class: 'minha-classe' }))

// Line decoration (aplica à linha inteira)
builder.add(lineStart, lineStart, Decoration.line({ class: 'minha-linha' }))

// Widget decoration (insere elemento no ponto especificado)
builder.add(pos, pos, Decoration.widget({
  widget: new MeuWidget(),
  side: 1  // 1 = depois do caractere, -1 = antes
}))

this.decorations = builder.finish()
```

**Widget personalizado:**

```typescript
import { WidgetType } from '@codemirror/view'

class MeuWidget extends WidgetType {
  constructor(private texto: string) { super() }

  eq(other: MeuWidget): boolean {
    return other.texto === this.texto  // evita re-render desnecessário
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'meu-widget'
    span.textContent = this.texto
    return span
  }

  ignoreEvent(): boolean { return false }  // true = eventos de mouse ignorados
}
```

#### Comunicação entre extensões CM6 e React

Um padrão comum: uma extensão CM6 detecta algo no editor (ex: cursor entra em bloco especial) e precisa atualizar um componente React fora do editor. O Cortex provê um canal explícito:

```typescript
// Dentro de uma extensão CM6 (ViewPlugin):
import { cortexBridge } from '@cortex/plugin-api/editor'

// Emite evento do editor para o mundo React
cortexBridge.emit('meu-plugin:cursor-em-bloco', { blockType: 'math', pos: cursor })

// Dentro de um componente React do plugin:
import { useEditorEvent } from '@cortex/plugin-api/react'

function MeuComponente() {
  const [blocoAtual, setBlocoAtual] = useState(null)
  useEditorEvent('meu-plugin:cursor-em-bloco', (data) => {
    setBlocoAtual(data)
  })
  // ...
}
```

`cortexBridge` é um EventEmitter leve e tipado. Eventos de plugin são namespaced pelo `plugin-id` para evitar colisões. O bridge é destruído automaticamente no unload do plugin — subscriptions pendentes são limpas.

---

### 30.8 `api.editor.registerPostProcessor` — Reading View

Reading View renderiza Markdown como HTML via `remark` + `rehype`. Post-processors recebem o HTML já renderizado e podem transformá-lo.

```typescript
api.editor.registerPostProcessor(
  processor: (el: HTMLElement, ctx: PostProcessorContext) => void | Promise<void>,
  priority?: number   // maior número = executa depois. Default: 0
): void

interface PostProcessorContext {
  // Path da nota sendo renderizada
  sourcePath: string

  // Retorna informação sobre a seção de source que gerou este elemento
  getSectionInfo(el: HTMLElement): SectionInfo | null
}

interface SectionInfo {
  text: string        // texto source completo da seção
  lineStart: number   // linha onde a seção começa no source
  lineEnd: number     // linha onde a seção termina
}
```

**Padrão de uso:**

```typescript
api.editor.registerPostProcessor((el, ctx) => {
  // Encontrar todos os blocos de código com linguagem 'mermaid'
  el.querySelectorAll('pre code.language-mermaid').forEach(async (block) => {
    const definition = block.textContent || ''
    const diagram = await renderMermaid(definition)

    // Substituir o bloco de código pelo diagrama renderizado
    const container = document.createElement('div')
    container.className = 'mermaid-diagram'
    container.appendChild(diagram)
    block.parentElement?.replaceWith(container)

    // Registrar para cleanup quando a view for fechada
    // MarkdownRenderChild garante cleanup de recursos quando o elemento é removido do DOM
    ctx.addChild(new class extends RenderChild {
      onunload() { /* cleanup do diagrama se necessário */ }
    }(container))
  })
})
```

**`RenderChild`:** classe base para recursos associados a um elemento da Reading View. O `onunload()` é chamado quando o elemento é removido do DOM (ex: troca de nota, fechamento da view). Importado de `@cortex/plugin-api`.

---

### 30.9 `api.events` — Sistema de Eventos Tipado

**Diferença crítica com Obsidian:** no Obsidian, eventos são strings não tipadas (`app.workspace.on('file-open', cb)` — se errar o nome, silencia sem warning). No Cortex, o sistema de eventos é completamente tipado via TypeScript discriminated unions.

```typescript
// Todos os eventos do sistema com seus payloads:
type CortexEvent =
  // Vault
  | { type: 'vault:file-created', path: string }
  | { type: 'vault:file-modified', path: string }
  | { type: 'vault:file-deleted', path: string }
  | { type: 'vault:file-renamed', oldPath: string, newPath: string }
  | { type: 'vault:opened', uuid: string, path: string }
  | { type: 'vault:closed', uuid: string }

  // Editor / Workspace
  | { type: 'editor:note-opened', path: string, leaf: Leaf }
  | { type: 'editor:note-closed', path: string }
  | { type: 'editor:active-changed', path: string | null, leaf: Leaf | null }
  | { type: 'editor:mode-changed', path: string, mode: 'live' | 'source' | 'preview' }
  | { type: 'workspace:layout-changed' }
  | { type: 'workspace:leaf-created', leaf: Leaf }
  | { type: 'workspace:leaf-destroyed', leafId: string }

  // Sync
  | { type: 'sync:file-synced', path: string }
  | { type: 'sync:conflict', path: string }
  | { type: 'sync:status-changed', status: SyncStatus }

  // Tags
  | { type: 'tags:created', tag: Tag }
  | { type: 'tags:updated', tag: Tag }
  | { type: 'tags:deleted', tagId: string }
  | { type: 'tags:assigned', tagId: string, notePath: string }
  | { type: 'tags:removed', tagId: string, notePath: string }

  // Settings
  | { type: 'settings:changed', pluginId: string, key: string, value: unknown }

// Subscription tipada — TypeScript infere o payload automaticamente
api.events.on('vault:file-modified', (event) => {
  console.log(event.path)  // string — TypeScript sabe o tipo
})

// Emitir evento customizado de plugin (namespaced)
api.events.emit(`${api.pluginId}:meu-evento`, payload)

// Assinar evento de outro plugin
api.events.on('outro-plugin-id:evento', handler)
```

`api.events.on()` retorna uma função `Unsubscribe`. Subscriptions registradas com `api.events.on()` são automaticamente removidas no unload do plugin (sem necessidade de guardar e chamar o `Unsubscribe` manualmente).

---

### 30.10 `api.settings` — Configurações do Plugin

```typescript
// Registrar schema de configurações (auto-gera UI nas Settings do Cortex)
api.settings.register(schema: SettingSchema[]): void

// Leitura e escrita
api.settings.get<T>(key: string): T
api.settings.set(key: string, value: unknown): Promise<void>
api.settings.getAll(): Record<string, unknown>
api.settings.reset(key?: string): Promise<void>  // null = reseta tudo

// Observar mudanças
api.settings.onChange(key: string, callback: (value: unknown) => void): Unsubscribe
```

**Schema de configurações** (veja seção 20 para a tabela completa de tipos). O schema suporta validação customizada via `validate`:

```typescript
api.settings.register([
  {
    key: 'dailyNoteFormat',
    type: 'text',
    label: 'Formato da data',
    description: 'Formato moment.js para o nome das notas diárias. Ex: YYYY-MM-DD',
    default: 'YYYY-MM-DD',
    validate: (v) => {
      try { moment().format(v); return null }
      catch { return 'Formato inválido. Use um formato moment.js válido.' }
    }
  },
  {
    key: 'openOnStartup',
    type: 'toggle',
    label: 'Abrir nota do dia na inicialização',
    default: true
  }
])
```

#### Dados do plugin (não-configurações)

Para dados que o plugin persiste mas que não são configurações do usuário (ex: estado interno, cache de dados externos, progresso de tarefas):

```typescript
// Dados salvos em vault/.cortex/plugins/<plugin-id>/data.json
api.plugin.loadData<T>(): Promise<T | null>
api.plugin.saveData(data: unknown): Promise<void>
api.plugin.mergeData(patch: Record<string, unknown>): Promise<void>
```

---

### 30.11 `api.secrets` — Secret Storage via Keychain

Requer permissão `secret-storage`. Armazena dados no keychain nativo do OS — nunca em disco plaintext.

```typescript
api.secrets.get(key: string): Promise<string | null>
api.secrets.set(key: string, value: string): Promise<void>
api.secrets.delete(key: string): Promise<void>
api.secrets.has(key: string): Promise<boolean>
```

**Implementação por plataforma:**
- Desktop (macOS): `Security.framework` Keychain Services. Chave armazenada como: `cortex.plugin.<plugin-id>.<key>`
- Desktop (Windows): Windows Credential Manager
- Desktop (Linux): libsecret / Secret Service API
- Mobile (iOS): iOS Keychain (`kSecClassGenericPassword`)
- Mobile (Android): Android Keystore System

**Diferença com Obsidian:** o Obsidian não tem secret storage nativo — plugins que precisam armazenar API keys usam `data.json` em plaintext ou implementam criptografia própria. No Cortex, todo dado sensível vai para o keychain sem nenhum esforço adicional do desenvolvedor de plugin.

**Caso de uso típico:**

```typescript
async onload(api: PluginAPI) {
  const apiKey = await api.secrets.get('openai-api-key')
  if (!apiKey) {
    // Pedir ao usuário via settings
    api.settings.register([{
      key: '_apiKeyPrompt',  // pseudo-campo que abre modal de input seguro
      type: 'secret',        // tipo especial — input mascarado que salva em api.secrets
      label: 'OpenAI API Key',
      secretKey: 'openai-api-key'
    }])
  }
}
```

O tipo `secret` no schema de settings exibe um input mascarado (`type="password"`) que salva o valor via `api.secrets.set()` — nunca via `api.settings.set()`. O valor nunca aparece em `data.json`.

---

### 30.12 `api.tags` — Sistema de Tags

Requer permissão `tags`.

```typescript
api.tags.getAll(): Tag[]
api.tags.getById(id: string): Tag | null
api.tags.getBySlug(slug: string): Tag | null
api.tags.getForNote(path: string): Tag[]
api.tags.getNotesWithTag(tagId: string): string[]

api.tags.create(data: { name: string, color: TagColor, icon?: string, description?: string }): Promise<Tag>
api.tags.update(id: string, patch: Partial<Tag>): Promise<void>
api.tags.delete(id: string): Promise<void>

api.tags.assign(tagId: string, notePath: string): Promise<void>
api.tags.remove(tagId: string, notePath: string): Promise<void>
api.tags.assignBatch(tagId: string, notePaths: string[]): Promise<void>

api.tags.onChanged(callback: (event: TagEvent) => void): Unsubscribe
```

---

### 30.13 `api.search` — Extensão da Busca

```typescript
// Registrar indexer customizado — adiciona campos ao índice MiniSearch
api.search.registerIndexer({
  id: string,
  // Chamado para cada arquivo durante indexação inicial e quando arquivos mudam
  // Retorna campos adicionais para o índice (além dos padrão: title, content, tags)
  index: (path: string, content: string) => Promise<Record<string, string | string[]>>
}): void

// Registrar filtro customizado no painel de filtros da Search Sidebar
api.search.registerFilter({
  id: string,
  label: string,
  icon?: string,
  // Retorna true se o arquivo deve aparecer nos resultados com este filtro ativo
  filter: (path: string, query: string) => boolean | Promise<boolean>
}): void

// Busca programática
api.search.query(q: string, options?: SearchOptions): SearchResult[]
api.search.queryTitles(q: string): SearchResult[]
```

---

### 30.14 `api.platform` — Informações de Plataforma

```typescript
interface PlatformAPI {
  // Identificação
  readonly isDesktop: boolean
  readonly isMobile: boolean
  readonly isNative: boolean        // true se rodando em RN nativo (false = WebView/Tauri)
  readonly os: 'macos' | 'windows' | 'linux' | 'ios' | 'android'

  // Feature flags — mais granular que checar isDesktop/isMobile
  readonly hasKeychain: boolean     // secret storage disponível
  readonly hasNativeMenus: boolean  // context menus nativos disponíveis
  readonly hasFileSystem: boolean   // acesso direto ao filesystem
  readonly hasDragDrop: boolean     // drag and drop de arquivos
  readonly hasHaptics: boolean      // feedback háptico (iOS/Android)

  // Utilitários
  openExternal(url: string): Promise<void>   // abre URL no browser padrão
  copyToClipboard(text: string): Promise<void>
  readFromClipboard(): Promise<string | null>

  // Apenas mobile
  haptics?: {
    impact(style: 'light' | 'medium' | 'heavy'): void
    notification(type: 'success' | 'warning' | 'error'): void
  }
}

api.platform  // acesso direto ao objeto
```

**Por que isso é melhor que Obsidian:** o Obsidian tem `Platform.isMobile` e `Platform.isDesktop` como booleans globais. Isso não cobre variações dentro de cada plataforma (macOS tem vibrancy, Windows não; iOS tem haptics, Android pode não ter). O `api.platform` com feature flags permite que plugins escrevam código defensivo sem checar o OS manualmente.

---

### 30.15 React em Plugins — Cidadão de Primeira Classe

Esta é uma das melhorias mais significativas em relação ao Obsidian.

#### O problema no Obsidian

Plugins que usam React precisam chamar `ReactDOM.render(<MeuComponente />, containerEl)` manualmente. Sem nenhum provider compartilhado, cada plugin precisa criar seu próprio contexto. Não há acesso ao theme, ao vault, a comandos — o plugin fica isolado do sistema.

#### A solução no Cortex

O helper `api.ui.mountReact()` monta um componente React dentro de qualquer container DOM **e automaticamente fornece todos os providers do Cortex**:

```typescript
import { MinhaView } from './MinhaView'

// Na view do plugin:
async onOpen() {
  api.ui.mountReact(<MinhaView pluginApi={api} />, this.containerEl)
}
// O componente recebe automaticamente:
// - ThemeContext (useTheme(), tokens CSS resolvidos)
// - VaultContext (useVault(), acesso ao vault via hooks)
// - CommandContext (useCommands(), trigger de comandos)
// - WorkspaceContext (useWorkspace(), estado do workspace)
```

**Hooks disponíveis dentro de componentes de plugin:**

```typescript
import { useTheme, useVault, useCommands, useWorkspace, usePluginSettings } from '@cortex/plugin-api/react'

function MinhaView({ pluginApi }) {
  const { tokens, isDark } = useTheme()          // tema atual com tokens resolvidos
  const { openNote, activeNote } = useWorkspace() // workspace
  const settings = usePluginSettings(pluginApi)   // settings do plugin em tempo real

  // Estilos usando tokens do tema — funciona igual no desktop (CSS vars) e mobile (valores JS)
  const style = { backgroundColor: tokens['--color-background-primary'] }

  return <View style={style}>...</View>
}
```

**Cross-platform React:** quando o componente é montado no desktop (WebView), `tokens['--color-background-primary']` retorna `'var(--color-background-primary)'` — o CSS engine do browser resolve. No mobile (React Native), retorna `'#FAFAF8'` — o valor já resolvido do ThemeTokenMap (seção 25). O mesmo componente funciona em ambas as plataformas sem `if (Platform.OS === 'web')`.

#### Template de componente cross-platform

```typescript
// packages/plugin-api re-exporta os primitivos corretos por plataforma
import { View, Text, Pressable, ScrollView } from '@cortex/plugin-api/primitives'

// No desktop: importa de 'react-dom' internamente (div, span, button, etc.)
// No mobile: importa de 'react-native' internamente (View, Text, Pressable, etc.)
// O plugin escreve uma vez, roda em ambos.

function MinhaLista({ items }: { items: string[] }) {
  return (
    <ScrollView>
      {items.map(item => (
        <Pressable key={item} onPress={() => console.log(item)}>
          <Text>{item}</Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}
```

**Limitação declarada:** plugins que usam HTML semântico específico (`<table>`, `<form>`, `<canvas>`) não funcionam no mobile via este mecanismo — precisam de implementação separada ou não declarar suporte a mobile no manifest.

---

### 30.16 Desenvolvimento — Ferramentas e Template

#### Template oficial

O repositório do Cortex inclui `plugins/_template/` com:

```
plugins/_template/
├── manifest.json           # Template de manifest com todos os campos documentados
├── src/
│   ├── main.ts             # Classe de plugin com todos os hooks comentados
│   ├── views/
│   │   └── ExampleView.tsx # View de exemplo cross-platform
│   ├── settings.ts         # Schema de settings de exemplo
│   └── types.ts            # Tipos do plugin
├── package.json            # Scripts: dev, build, lint
├── tsconfig.json           # Configuração TypeScript com paths para @cortex/plugin-api
├── vite.config.ts          # Build com output em vault/.cortex/plugins/meu-plugin/
└── README.md               # Guia de início rápido
```

Scripts do template:
- `bun dev` — build em watch mode, hot-reload automático via devPluginPath do Cortex
- `bun build` — build de produção minificado
- `bun typecheck` — checagem de tipos sem build
- `bun lint` — ESLint com regras do Cortex (proíbe imports diretos de packages internos)

#### Modo de desenvolvimento no app

Nas configurações de desenvolvedor do Cortex (`Settings → Desenvolvedor`):

```
┌──────────────────────────────────────────────────────┐
│  Modo de desenvolvimento de plugin               [ON] │
│                                                       │
│  Pasta do plugin em dev:                             │
│  /Users/joao/dev/meu-plugin  [Selecionar...]         │
│                                                       │
│  ✓ Hot-reload automático ao detectar mudança em main.js │
│  ✓ Exibir erros de plugin como notificação em vez de  │
│    silenciar                                          │
│  ✓ Desativar cache de módulo (força reimport completo) │
│                                                       │
│  Log de hot-reload:                                   │
│  [14:32:01] Plugin recarregado em 124ms               │
│  [14:31:47] Plugin recarregado em 118ms               │
└──────────────────────────────────────────────────────┘
```

#### TypeScript strict mode e linting

`@cortex/plugin-api` exporta regras de ESLint que detectam padrões problemáticos em tempo de desenvolvimento:

- Importação de `@cortex/core`, `@cortex/editor`, etc. diretamente (apenas `@cortex/plugin-api` é permitido).
- Uso de `window.localStorage`, `document.cookie` (violações de sandbox).
- Acesso a `fetch()` sem `network` no manifest.
- `ReactDOM.render()` ou `createRoot()` diretamente (deve usar `api.ui.mountReact()`).
- Eventos não tipados (strings literais onde o tipo discriminado deveria ser usado).

---

### 30.17 Distribuição e Marketplace

#### Requisitos para submissão

Para um plugin aparecer no Marketplace do Cortex, o PR deve incluir:

```
cortex-community-plugins/  (repositório separado)
└── plugins/
    └── cortex-meu-plugin/
        ├── manifest.json    # idêntico ao do repositório do plugin
        └── versions.json    # mapa de versão do plugin → minCortexVersion
```

**`versions.json`:**

```json
{
  "1.0.0": "1.0.0",
  "1.1.0": "1.0.0",
  "2.0.0": "1.2.0"
}
```

#### Critérios de revisão

Checklist obrigatório (automatizado via CI onde possível):

- [ ] `manifest.json` completo e válido (todos os campos obrigatórios preenchidos)
- [ ] `permissions` declaradas não excedem o necessário (CI analisa estaticamente as chamadas de API)
- [ ] Plugin não acessa `window.__TAURI__` diretamente (apenas via `api.platform`)
- [ ] Plugin não acessa stores Zustand internas (`vaultStore`, `editorStore`, etc.)
- [ ] Plugin não importa de `@cortex/core`, `@cortex/ipc`, `@cortex/editor` diretamente
- [ ] Não usa `eval()` ou `new Function()`
- [ ] Se `platforms: ["mobile"]` ou `["desktop", "mobile"]`: testado em ambos
- [ ] README com descrição, screenshots e instruções de configuração
- [ ] Licença OSI-approved presente no repositório

#### Versionamento e atualizações automáticas

O Cortex verifica atualizações de plugins instalados em background (a cada 24h, ou manualmente via Settings). O processo:

1. Lê `versions.json` do plugin no `cortex-community-plugins`.
2. Filtra versões compatíveis com a versão atual do Cortex (`minCortexVersion` ≤ versão instalada).
3. Se há versão maior que a instalada: notifica via badge em Settings → Community Plugins.
4. Atualização manual (padrão) ou automática (configurável): baixa `main.js` + `styles.css` do último release do GitHub, atualiza `manifest.json` em `vault/.cortex/plugins/<plugin-id>/`.
5. Plugin é recarregado via hot-reload sem reiniciar o app.

#### Instalação direta via URL

Para plugins não no marketplace (desenvolvimento, plugins pagos, uso interno):

```
Settings → Community Plugins → Instalar via URL do GitHub
→ https://github.com/autor/cortex-meu-plugin
```

O Cortex busca o `manifest.json` do repositório, lista as permissões requeridas, pede confirmação do usuário, e baixa o release mais recente compatível.

---

### 30.18 Comparativo: Obsidian vs. Cortex Plugin API

| Aspecto | Obsidian | Cortex |
|---------|----------|--------|
| Entry point | Subclasse de `Plugin` com métodos herdados | Subclasse de `CortexPlugin` com `api` explícito passado como argumento |
| React | Sem suporte oficial; `ReactDOM.render()` manual sem providers | `api.ui.mountReact()` com todos os providers (theme, vault, workspace) automáticos |
| Eventos | Strings não tipadas (`'file-open'`) | Discriminated union tipada — erro de compilação se tipo errado |
| Secret storage | `data.json` em plaintext | Keychain nativo do OS (macOS Keychain, Windows Credential Manager, iOS Keychain, Android Keystore) |
| Context menus | Elementos HTML simulados | Menus nativos do OS via Tauri Menu API; ActionSheet no iOS |
| Editor access | Abstração `Editor` que esconde CM6 | `EditorHandle` de conveniência + `editor.cm` para acesso direto ao CM6 tipado |
| Permissões | Sem sistema de permissões (acesso total) | Permissões declarativas no manifest, verificadas em runtime |
| Mobile | `Platform.isMobile` manual; API inconsistente | `api.platform.isNative`, feature flags, adapters automáticos |
| React Native | Não suportado | Views de plugin podem retornar RN components via `getComponent()` |
| Cross-platform primitivos | Não existe | `@cortex/plugin-api/primitives` — `View`, `Text`, `Pressable` que funcionam em desktop e mobile |
| Cleanup | `this.registerEvent()`, `this.addCommand()` etc. — implícito | `api.register(fn)` explícito + todos os `api.*` com cleanup automático |
| Timeout de load | Sem timeout oficial | 10s — plugin vai para estado `error` com mensagem clara |
| Typescript | Tipos disponíveis mas incompletos em alguns pontos | API completamente tipada, regras de linting que detectam violações em dev |


---

## 31. Sync — Aprofundamento: Merge, Fila, Criptografia e Edge Cases

> Esta seção complementa a seção 24 (arquitetura geral) e a seção 26 (autenticação e protocolo) com o detalhamento de tudo que acontece **dentro** do engine de sync em Rust: o algoritmo de three-way merge passo a passo, a fila de operações, criptografia end-to-end, casos de borda críticos, e o fluxo de sync inicial de um vault em um device novo.

---

### 31.1 Three-Way Merge com diff-match-patch — Implementação Detalhada

#### Biblioteca escolhida

A crate Rust para diff-match-patch é **`dmp`** (crate `dmp` no crates.io, port fiel do algoritmo original do Google). Alternativas avaliadas:

| Crate | Motivo de descarte |
|-------|-------------------|
| `similar` | Focado em diff de apresentação (saída human-readable), não em patch-apply bidirecional para merge |
| `diffy` | Bom para diffs de linha, mas sem suporte a three-way merge out-of-the-box |
| `dissimilar` | Diff de caracteres, sem patch-apply |
| `dmp` ✓ | Port completo do diff-match-patch do Google. Suporta: `diff_main`, `patch_make`, `patch_apply`, `diff_cleanupSemantic`. Mantido ativamente. Mesmo algoritmo que o Obsidian usa internamente. |

#### O algoritmo three-way merge passo a passo

O módulo `sync/merge.rs` implementa:

```
fn three_way_merge(ancestor: &str, local: &str, remote: &str) -> MergeResult

enum MergeResult {
    Clean(String),                    // merge automático sem conflito
    WithConflicts(String),            // merge com marcadores inline
    Identical,                        // local e remote são iguais — nada a fazer
}
```

**Passo 1 — Verificação rápida de identidade:**
```
se local == remote: retorna MergeResult::Identical (zero trabalho)
se local == ancestor: retorna MergeResult::Clean(remote) (fast-forward remoto)
se remote == ancestor: retorna MergeResult::Clean(local) (fast-forward local)
```

**Passo 2 — Calcular patches:**
```
patches_local  = dmp.patch_make(ancestor, local)
patches_remote = dmp.patch_make(ancestor, remote)
```

Cada patch é uma lista de operações `(DELETE | INSERT | EQUAL, texto)` com posição de aplicação no ancestor.

**Passo 3 — Aplicar patches em sequência ao ancestor:**
```
(merged_after_local, applied_local[]) = dmp.patch_apply(patches_local, ancestor)
(merged_final, applied_remote[])      = dmp.patch_apply(patches_remote, merged_after_local)
```

O `patch_apply` do diff-match-patch retorna um array de booleans indicando quais patches foram aplicados com sucesso. Um patch falha quando a área de contexto não é encontrada (o texto foi modificado em ambos os lados no mesmo trecho).

**Passo 4 — Detectar conflitos:**
Patches que falharam na aplicação indicam sobreposição real entre mudanças locais e remotas. Para cada patch remoto que falhou:

1. Identifica a posição aproximada no texto merged onde o conflito está.
2. Extrai o trecho local correspondente.
3. Insere marcadores de conflito inline:

```
<<<<<<< Local (MacBook Pro)
conteúdo da versão local neste trecho
=======
conteúdo da versão remota neste trecho
>>>>>>> Remote (iPhone)
```

O nome do device nos marcadores vem do `device_name` armazenado em `~/.cortex/global.json`.

**Passo 5 — Retornar resultado:**
- Todos os patches aplicados com sucesso → `MergeResult::Clean(merged_final)`
- Um ou mais patches falharam → `MergeResult::WithConflicts(merged_with_markers)`

#### Casos especiais do merge Markdown

**Frontmatter YAML:**
O frontmatter (`---\n...\n---`) é tratado como bloco separado antes do merge textual:

1. Extrai e parseia o frontmatter de ancestor, local e remote separadamente com `serde_yaml`.
2. Merge de objetos YAML: chave por chave, `updatedAt` como tiebreaker.
3. Arrays: se a mesma chave é um array em ambos, merge dos elementos únicos (union set) — sem duplicatas.
4. Chaves presentes apenas em local → preservadas. Apenas em remote → adicionadas. Em ambos com valores diferentes → versão mais recente por `updatedAt` global do arquivo.
5. Recombina o frontmatter merged com o conteúdo merged do corpo.

Isso evita que edições no corpo causem conflito de frontmatter e vice-versa — os dois são mergidos de forma independente.

**Notas muito grandes (> 500KB):**
O diff-match-patch opera em memória. Para arquivos grandes:
- Acima de **500KB**: o merge textual usa diff de linhas em vez de diff de caracteres (`diff_lineMode: true`). Menos granular, mas ordens de magnitude mais rápido.
- Acima de **5MB**: last-modified-wins automático com criação obrigatória de arquivo de conflito (não há merge de arquivo de 5MB que seja ergonômico para o usuário).

**Notas com muitos embeds (`![[arquivo]]`):**
Embeds são referências — o merge trata como texto puro. Se dois devices editaram o mesmo parágrafo e um adicionou um embed, o merge de texto padrão resolve corretamente: o embed é um trecho de texto como qualquer outro.

#### Quando o ancestor não está disponível

Caso o `ancestor_hash` na `sync.db` não corresponda a nenhuma versão no servidor (ex: vault foi sync'd pela primeira vez e não há histórico) ou o servidor não consegue retornar a versão ancestor:

- Fallback para **two-way diff**: `dmp.patch_make(local, remote)` produz diff direto. Sem ancestor, toda diferença é potencialmente conflito.
- O engine marca o arquivo com `sync_status = 'conflict'` imediatamente e não tenta merge automático.
- O usuário resolve manualmente via diff viewer.

---

### 31.2 Fila de Operações de Sync — Detalhamento

O `engine.rs` mantém uma **fila de prioridade de operações** em memória, persistida em `sync.db` para sobreviver a crashes:

```sql
-- Tabela de operações pendentes
sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT,          -- 'upload' | 'download' | 'delete' | 'rename'
  file_path TEXT,
  priority INTEGER,        -- maior = mais urgente (ver tabela de prioridades)
  retry_count INTEGER DEFAULT 0,
  next_retry_at INTEGER,   -- timestamp Unix. NULL = pode executar agora
  error_last TEXT,         -- última mensagem de erro para debug
  created_at INTEGER,
  payload TEXT             -- JSON com dados adicionais (ex: new_path para rename)
)
```

#### Tabela de prioridades

| Prioridade | Tipo de operação | Justificativa |
|-----------|-----------------|---------------|
| 100 | Download de arquivo em conflito que o usuário pediu para resolver | Ação imediata do usuário |
| 80 | Download notificado via SSE (arquivo remoto novo/modificado) | Outro device acabou de salvar |
| 60 | Upload de arquivo modificado localmente e salvo | Usuário acabou de editar |
| 40 | Upload de arquivo de configuração (`.cortex/*.json`) | Configs são pequenas e importantes |
| 20 | Download de arquivo durante sync inicial | Background, sem urgência |
| 10 | Upload em retry após falha temporária | Já está em atraso |

#### Controle de concorrência

O engine executa no máximo **3 operações simultâneas** (configurável). Isso evita saturar a conexão em redes lentas enquanto mantém throughput em redes rápidas. Operações de download e upload são executadas em paralelo — sem bloquear umas às outras.

Um semáforo Tokio (`tokio::sync::Semaphore`) com 3 permits controla a concorrência. Operações de alta prioridade adquirem o permit antes de operações de baixa prioridade (fila de prioridade Rust `BinaryHeap`).

#### Retry com backoff exponencial

| Tentativa | Espera antes do próximo retry |
|-----------|------------------------------|
| 1ª falha | 30 segundos |
| 2ª falha | 2 minutos |
| 3ª falha | 10 minutos |
| 4ª falha | 30 minutos |
| 5ª falha | 2 horas |
| 6ª+ falha | 6 horas (teto) |

Após **10 falhas consecutivas** sem sucesso: operação vai para status `failed_permanent`. O frontend é notificado via evento `SyncOperationFailed` com detalhes do erro. O arquivo fica com `sync_status = 'error'` no File Explorer (ícone vermelho). O usuário pode retentar manualmente.

**Falhas que não fazem retry:** `401 Unauthorized` (vai para fluxo de refresh de token), `403 Forbidden` (vault não autorizado), `404 Not Found` (arquivo deletado remotamente durante o upload de uma versão — trata como conflito), `413 Payload Too Large` (arquivo excede limite do servidor — erro permanente).

#### O que acontece após offline por muito tempo

Cenário: device fica offline por 3 semanas, acumula 800 mudanças locais:

1. O file watcher registrou todas as mudanças locais em `sync.db` → 800 entradas com `sync_status = 'local_ahead'`.
2. Ao reconectar: o engine verifica o `Last-Event-ID` da última SSE recebida.
3. O servidor pode ou não ter os eventos SSE guardados por 3 semanas. Se não tiver: o engine faz um **reconciliation request**:
   ```
   GET /sync/v1/vaults/{vault_uuid}/state
   X-Since: <last_synced_at_timestamp>
   ```
   O servidor retorna a lista completa de arquivos com `remote_hash` e `remote_mtime` mais recentes.
4. O engine compara a lista do servidor com seu `sync.db` local e determina:
   - Arquivos que mudaram apenas localmente → upload (sem conflito)
   - Arquivos que mudaram apenas remotamente → download (sem conflito)
   - Arquivos que mudaram em ambos → detecção de conflito e merge
5. As 800 operações são enfileiradas na `sync_queue`, priorizando downloads primeiro (para que o usuário veja o conteúdo mais recente o quanto antes).

#### Rate limiting no cliente

O cliente respeita headers de rate limit do servidor:
- `Retry-After: <seconds>`: pausa todos os uploads/downloads pelo tempo especificado.
- `X-RateLimit-Remaining: <n>`: se < 10, reduz concorrência para 1 operação simultânea.
- `X-RateLimit-Reset: <timestamp>`: agenda resume para esse timestamp.

---

### 31.3 Criptografia End-to-End (E2EE)

O Obsidian Sync implementa E2EE opcional via senha de criptografia que o usuário define. O Cortex implementa **E2EE obrigatório** — não há modo sem criptografia para vaults sincronizados.

#### Filosofia

O servidor de sync do Cortex nunca tem acesso ao conteúdo plaintext dos arquivos. Apenas os devices autorizados têm as chaves para decriptar. Se o servidor for comprometido, os dados dos usuários permanecem ilegíveis.

#### Esquema de chaves

```
Vault Encryption Key (VEK)
  └─ Chave simétrica AES-256-GCM de 256 bits
  └─ Gerada aleatoriamente na primeira ativação do sync
  └─ Nunca sai do device em plaintext
  └─ Armazenada no keychain do OS: cortex.sync.vek.<vault_uuid>

Password-Based Key (PBK) — derivada da senha de criptografia do usuário
  └─ PBKDF2-SHA256 com 600.000 iterações (recomendação NIST 2023) ou Argon2id
  └─ Salt: 32 bytes aleatórios armazenados no servidor (não é segredo)

Encrypted VEK (EVEK) — o que é armazenado no servidor
  └─ AES-256-GCM(key=PBK, plaintext=VEK)
  └─ Permite recuperar a VEK com a senha correta
  └─ Stored in server as: /auth/v1/vaults/{vault_uuid}/key-bundle
```

#### Fluxo de criptografia no upload

1. Lê o conteúdo do arquivo em plaintext do disco.
2. Gera um **IV (nonce) de 12 bytes** aleatório para este arquivo/versão específica.
3. Criptografa: `ciphertext = AES-256-GCM(key=VEK, iv=IV, plaintext=conteúdo)`.
4. O body do upload é: `IV (12 bytes) || ciphertext || auth_tag (16 bytes)`.
5. O header `X-Local-Hash` contém o hash do plaintext (não do ciphertext) — para que o merge no servidor possa comparar hashes corretamente quando necessário.

#### Fluxo de decriptografia no download

1. Lê `IV` dos primeiros 12 bytes do body da resposta.
2. Lê `auth_tag` dos últimos 16 bytes.
3. Decriptografa: `plaintext = AES-256-GCM-Decrypt(key=VEK, iv=IV, ciphertext=body[12..-16])`.
4. Se a tag de autenticação falhar: arquivo corrompido ou adulterado → erro permanente, arquivo não escrito em disco.

#### Adicionando um novo device (device authorization flow)

Quando o usuário instala o Cortex em um novo device e ativa o sync, ele precisa receber a VEK sem que ela passe pelo servidor em plaintext. Opções:

**Opção A — QR Code (preferida):** o device existente gera um QR code contendo `VEK` cifrada com uma chave efêmera de 15 segundos. O novo device escaneia, decifra a VEK, armazena no keychain local.

**Opção B — Senha de recuperação:** o usuário digita a senha de criptografia no novo device. O novo device baixa o `EVEK` do servidor, deriva a `PBK` com a senha, decifra a `VEK`.

**Opção C — Código de autorização:** device existente gera um código de 6 dígitos válido por 5 minutos. Novo device digita o código + ambos confirmam via SSE que o handshake foi concluído. VEK transferida via canal efêmero criptografado (ECDH ephemeral key exchange).

O Cortex implementa as três opções — o usuário escolhe o método mais conveniente.

#### Implicações para merge no servidor

Com E2EE, o **servidor não pode fazer merge** de arquivos — ele não vê o plaintext. O merge acontece **inteiramente no cliente** (Rust engine):

1. Cliente baixa a versão remote cifrada.
2. Decriptografa localmente.
3. Executa three-way merge localmente (seção 31.1).
4. Encripta o resultado do merge com VEK + novo IV.
5. Faz upload do resultado merged e cifrado.

O servidor apenas armazena blobs opacos cifrados e metadados (hash, mtime, device_id) que são computados sobre o ciphertext, não o plaintext.

---

### 31.4 Sync Inicial de Vault em Device Novo

Quando o usuário abre um vault já existente (com histórico de sync) em um device novo pela primeira vez:

#### Fase 1 — Bootstrap da identidade

1. Device registra seu Device ID e Device Token (seção 26.3).
2. Usuário autoriza o device e transfere a VEK (seção 31.3).
3. Device obtém Access Token + Refresh Token.

#### Fase 2 — Estado remoto completo

```
GET /sync/v1/vaults/{vault_uuid}/manifest
Authorization: Bearer <access_token>
```

O servidor retorna o manifesto completo do vault: lista de todos os arquivos com `remote_hash`, `remote_mtime`, `server_version_id`. Pode ser um payload grande para vaults grandes (100k+ arquivos) — o servidor pagina a resposta em chunks de 1000 arquivos.

#### Fase 3 — Comparação com estado local

Se o vault local já existe no device (ex: o usuário copiou manualmente):
- Compara `local_hash` de cada arquivo com `remote_hash` do manifesto.
- Arquivos com hash diferente: enfileira para verificação (pode ser upload ou download dependendo do mtime).
- Arquivos ausentes localmente: enfileira download.
- Arquivos presentes localmente mas ausentes no manifesto remoto: enfileira upload.

Se o vault não existe localmente (device novo sem cópia):
- Cria a estrutura de diretórios.
- Enfileira download de todos os arquivos do manifesto.

#### Fase 4 — Download em paralelo

Downloads executam com concorrência de 3 (seção 31.2). O usuário pode usar o vault normalmente durante o download — o File Explorer exibe arquivos baixados conforme chegam, com indicador de progresso por arquivo (spinner no ícone).

**Prioridade de download:** arquivos mais recentes primeiro (maior `remote_mtime`), para que o conteúdo mais relevante esteja disponível antes do histórico antigo.

#### Fase 5 — Reconciliação final

Após todos os downloads concluírem, o engine faz uma verificação final:
- Verifica hashes de todos os arquivos baixados (download pode ter corrompido via erro de rede).
- Arquivos com hash incorreto são re-baixados.
- Emite evento Tauri `SyncInitialComplete { total_files, total_bytes, duration_ms }`.
- Frontend exibe toast: "Vault sincronizado. X arquivos baixados."

---

### 31.5 Criptografia do sync.db Local

O `sync.db` contém metadados sensíveis: paths de arquivos, hashes, timestamps, versão IDs do servidor. Embora não contenha o conteúdo dos arquivos, paths de arquivos podem revelar informações privadas.

O banco SQLite é criptografado em repouso usando **SQLCipher** (extension para SQLite que adiciona criptografia AES-256):
- A chave do SQLCipher é a Device ID (UUID) concatenada com um salt fixo derivado do `vault_uuid`.
- Não é o mesmo nível de segurança que a VEK (não precisa ser — o `sync.db` é local, a VEK protege os dados em trânsito e no servidor).
- A criptografia do `sync.db` protege contra leitura por outros processos ou após furto físico do device sem desbloqueio de OS.

---

### 31.6 Sync de Frontmatter de Tags (cortex-tags)

O frontmatter das notas contém `cortex-tags: [uuid1, uuid2]`. Quando duas versões de uma nota são mergidas:

- Os arrays de `cortex-tags` são mergidos como **union set** pelo merge de frontmatter YAML (seção 31.1): UUIDs de ambas as versões são preservados.
- UUIDs orphaned (referenciando tags deletadas em `tags.json`) são tratados conforme seção 27.8.
- Conflitos no corpo da nota não afetam os `cortex-tags` — frontmatter é mergido independentemente.

---

### 31.7 Diagnóstico e Observabilidade do Sync

#### Log de sync

Todas as operações de sync são registradas em `vault/.cortex/sync.log` (arquivo rotativo, máximo 10MB, 3 rotações):

```
2025-03-04T14:32:01Z INFO  [upload] notas/diario.md → v_abc123 (2.4KB, 234ms)
2025-03-04T14:32:05Z INFO  [download] notas/projetos/alpha.md ← v_def456 (15.1KB, 891ms)
2025-03-04T14:32:06Z WARN  [conflict] notas/reunioes.md: patches sobrepostos em linhas 45-52
2025-03-04T14:32:06Z INFO  [merge] notas/reunioes.md: conflict markers inserted, user action required
2025-03-04T14:33:00Z ERROR [upload] imagens/foto.png: retry 2/10, next in 2min (500 Internal Server Error)
```

#### Painel de diagnóstico de sync

Acessível via `Settings → Sync → Diagnóstico` ou `Command Palette → "Diagnóstico de sync"`:

```
┌─────────────────────────────────────────────┐
│  Diagnóstico de Sync                         │
├──────────────────┬──────────────────────────┤
│  Status          │  Sincronizado ✓           │
│  Último sync     │  há 2 minutos             │
│  Modo            │  SSE (tempo real)         │
│  Protocolo       │  HTTPS/2                  │
├──────────────────┴──────────────────────────┤
│  Estatísticas da sessão                      │
│  Uploads: 47 arquivos (1.2 MB)               │
│  Downloads: 12 arquivos (340 KB)             │
│  Conflitos resolvidos: 1                     │
│  Conflitos pendentes: 0                      │
├─────────────────────────────────────────────┤
│  Fila de operações: 0 pendentes              │
│  Operações com erro: 0                       │
├─────────────────────────────────────────────┤
│  [Ver log completo]  [Forçar sync agora]     │
│  [Reparar banco de dados local]              │
└─────────────────────────────────────────────┘
```

**Reparar banco de dados local:** re-hash todos os arquivos locais, compara com o manifesto remoto, re-baixa qualquer divergência. Útil quando o usuário suspeita de corrupção local.

---

## 32. Syntax Highlighting em Blocos de Código

> Os blocos de código do Cortex operam em três contextos com requisitos técnicos distintos: **Live Preview** (dentro do CM6, decorações reativas), **Source Mode** (CM6 sem decorações Markdown, mas com highlight), e **Reading View** (HTML estático gerado pelo pipeline remark/rehype). Cada contexto usa uma abordagem diferente, mas os tokens de cor são compartilhados via variáveis CSS — garantindo que temas personalizados funcionem nos três ao mesmo tempo.

---

### 32.1 Contextos e Abordagens

| Contexto | Mecanismo de highlight | Biblioteca | Reatividade |
|----------|----------------------|-----------|-------------|
| Live Preview (cursor fora do bloco) | Lezer language parser nativo CM6 | `@codemirror/language` + pacotes `@lezer/*` | Tempo real, sem delay |
| Live Preview (cursor dentro do bloco) | Idem — highlight permanece ativo | `@codemirror/language` + `@lezer/*` | Tempo real |
| Source Mode | Idem — highlight sempre ativo | `@codemirror/language` + `@lezer/*` | Tempo real |
| Reading View | Shiki via pipeline rehype | `shiki` + `rehype-shiki` | No momento do render da view |

**Por que duas bibliotecas diferentes?** O CM6 tem seu próprio sistema de highlight baseado em syntax trees Lezer. Shiki usa TextMate grammars (a mesma engine do VS Code). As duas não são intercambiáveis no contexto do CM6 — Shiki não pode operar dentro do CM6 de forma reativa. Shiki, no entanto, produz highlight de qualidade superior para o long tail de linguagens via TextMate grammars, sendo ideal para a Reading View onde o HTML é gerado uma vez.

---

### 32.2 Highlight no CM6 — Lezer Language Packages

#### Fundamento técnico

O CM6 usa **Lezer** como parser. Lezer produz uma syntax tree incremental e parcial — parseia apenas o que está visível na viewport e re-parseia incrementalmente quando o documento muda. Isso o torna ordens de magnitude mais eficiente que parsers full-document como os do Shiki ou highlight.js dentro de um editor.

O highlight no CM6 funciona assim:
1. Lezer parseia o conteúdo do bloco de código com o parser da linguagem específica.
2. O `syntaxHighlighting(defaultHighlightStyle)` do CM6 mapeia os tipos de nó da syntax tree para **highlight tags** (ex: `tags.keyword`, `tags.string`, `tags.comment`).
3. O `classHighlighter` converte highlight tags em classes CSS (ex: `.tok-keyword`, `.tok-string`, `.tok-comment`).
4. O CSS do tema define as cores para essas classes via variáveis CSS `--syntax-*`.

#### Linguagens suportadas via Lezer (bundle inicial)

As linguagens a seguir são incluídas no bundle principal do app (impacto ~180KB gzip total):

| Linguagem | Pacote | Uso típico |
|-----------|--------|-----------|
| JavaScript | `@lezer/javascript` | Universal |
| TypeScript | `@lezer/javascript` (modo TS) | Universal |
| JSX/TSX | `@lezer/javascript` (modo JSX) | Universal |
| Python | `@lezer/python` | Popular |
| Rust | `@lezer/rust` | Relevante para este projeto |
| CSS | `@lezer/css` | Universal |
| HTML | `@lezer/html` | Universal |
| JSON | `@lezer/json` | Universal |
| Markdown | `@lezer/markdown` | Meta — destaque de Markdown dentro de blocos |
| YAML | `@lezer/yaml` | Frontmatter, config |
| SQL | `@lezer/sql` | Comum em notas técnicas |
| Go | `@lezer/go` | Popular |
| C/C++ | `@lezer/cpp` | Popular |
| Java | `@lezer/java` | Popular |
| Bash/Shell | `@codemirror/legacy-modes` (StreamLanguage) | Muito comum em notas técnicas |
| XML | `@codemirror/lang-xml` | Bundled |

#### Linguagens via lazy loading

Linguagens menos comuns são carregadas sob demanda quando o primeiro bloco com aquela linguagem aparece no viewport:

```typescript
// packages/editor/src/languages.ts

const languageMap: Record<string, () => Promise<LanguageSupport>> = {
  'swift':      () => import('@lezer/swift').then(m => m.swift()),
  'kotlin':     () => import('@lezer/kotlin').then(m => m.kotlin()),
  'scala':      () => import('@lezer/scala').then(m => m.scala()),
  'ruby':       () => import('@lezer/ruby').then(m => m.ruby()),
  'php':        () => import('@codemirror/lang-php').then(m => m.php()),
  'r':          () => import('@codemirror/legacy-modes/mode/r').then(m => StreamLanguage.define(m.r)),
  'lua':        () => import('@codemirror/legacy-modes/mode/lua').then(m => StreamLanguage.define(m.lua)),
  'haskell':    () => import('@codemirror/legacy-modes/mode/haskell').then(m => StreamLanguage.define(m.haskell)),
  'toml':       () => import('@codemirror/legacy-modes/mode/toml').then(m => StreamLanguage.define(m.toml)),
  'dockerfile': () => import('@codemirror/legacy-modes/mode/dockerfile').then(m => StreamLanguage.define(m.dockerfile)),
  // ... ~40 linguagens adicionais via legacy-modes
}

export async function getLanguageSupport(lang: string): Promise<LanguageSupport | null> {
  const loader = languageMap[lang.toLowerCase()]
  if (!loader) return null
  return loader()
}
```

O carregamento lazy usa `import()` dinâmico — Vite split os chunks automaticamente. Um bloco de código com `swift` carrega `~12KB` de parser na primeira vez que aparece, depois fica em cache do browser.

**Cache de language support:** o resultado de cada `import()` é cacheado em memória (`Map<string, LanguageSupport>`) para que blocos subsequentes com a mesma linguagem não façam nova requisição de import.

#### Integração com o Markdown parser do CM6

O `@lezer/markdown` suporta **linguagens embutidas** via `defineLanguageFacet` e `parseMixed`. Quando o Lezer parseia o documento Markdown e encontra um fenced code block, ele invoca o parser da linguagem específica para o conteúdo do bloco:

```typescript
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'

const markdownWithHighlight = markdown({
  base: markdownLanguage,
  codeLanguages: [
    ...languages,          // @codemirror/language-data traz definições das bundled langs
    ...customLanguages,    // nossas adições (swift, kotlin, etc. via lazy)
  ],
  addKeymap: true,
})
```

Isso significa que o Lezer parseia o Markdown e o conteúdo do bloco de código em uma única passagem — não há dois parsers separados. A syntax tree resultante é contígua e o highlight é produzido pela mesma extensão `syntaxHighlighting` que processa o resto do documento.

---

### 32.3 Highlight na Reading View — Shiki

#### Por que Shiki

A Reading View renderiza HTML estático via `remark` → `rehype`. Nesse contexto:
- Não há CM6 rodando — o conteúdo é HTML puro.
- O highlight é gerado uma vez por render, não continuamente.
- Pode-se usar uma biblioteca mais pesada e de qualidade superior sem impacto em framerate.

**Shiki** é a escolha por:
- Usa **TextMate grammars** — as mesmas do VS Code. Cobertura de ~200 linguagens.
- Produz HTML com classes semânticas altamente granulares (`.shiki`, `.line`, tokens por tipo).
- Suporta temas customizados via JSON — podemos gerar um tema Shiki dinamicamente a partir das variáveis CSS do Cortex.
- Roda em WebWorker — não bloqueia a thread principal durante o render da Reading View.
- `shiki` v1.x suporta ESM e funciona sem Node.js (roda no browser com WASM para os parsers).

#### Integração com o pipeline remark/rehype

```typescript
// packages/editor/src/reading-view/shiki-plugin.ts

import { createHighlighter } from 'shiki'
import type { Plugin } from 'unified'

// O highlighter é singleton — inicializado uma vez por sessão do app
let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['cortex-dark', 'cortex-light'],  // temas customizados (ver 32.4)
      langs: BUNDLED_LANGS,                      // langs mais comuns pré-carregadas
    })
  }
  return highlighterPromise
}

// Plugin rehype que substitui <pre><code> pelo HTML com highlight do Shiki
export const rehypeShiki: Plugin = () => async (tree) => {
  const highlighter = await getHighlighter()
  const nodes: Array<[parent, index, node]> = []

  // Coleta todos os nós <pre><code> na árvore
  visit(tree, 'element', (node, index, parent) => {
    if (node.tagName === 'pre' && node.children[0]?.tagName === 'code') {
      nodes.push([parent, index, node])
    }
  })

  // Processa em paralelo (sem bloquear — cada highlight é O(n) do código, não do documento)
  await Promise.all(nodes.map(async ([parent, index, node]) => {
    const codeEl = node.children[0]
    const lang = extractLang(codeEl)     // extrai do className: "language-python"
    const code = toString(codeEl)

    // Carrega a gramática da linguagem sob demanda se não estiver em cache
    await highlighter.loadLanguage(lang).catch(() => null)  // silencia línguas desconhecidas

    const highlighted = highlighter.codeToHast(code, {
      lang: lang || 'text',
      theme: getCurrentThemeVariant(),  // 'cortex-dark' ou 'cortex-light'
    })

    // Substitui o nó original pelo HTML do Shiki
    parent.children[index] = highlighted
  }))
}
```

#### WebWorker para Reading View

A renderização da Reading View completa (remark → rehype com Shiki) é executada em um **WebWorker** para não bloquear a thread principal. O fluxo:

1. Thread principal envia o conteúdo Markdown da nota para o worker via `postMessage`.
2. Worker executa o pipeline `remark` → `rehype` → `rehype-shiki` → HTML string.
3. Worker retorna o HTML string para a thread principal.
4. Thread principal injeta o HTML no container da Reading View.

O worker é lazy-initialized na primeira abertura de uma Reading View. O Shiki highlighter no worker é singleton — inicializado uma vez e reutilizado para todas as notas subsequentes.

**Latência de primeira renderização:** o worker precisa inicializar o Shiki (~50-100ms na primeira vez). Nas renderizações subsequentes, o worker já está quente e o highlight é praticamente instantâneo (<5ms para notas típicas).

Durante a inicialização do worker, a Reading View exibe o HTML renderizado sem highlight (apenas `<pre><code>` com texto plano) e o substitui pelo HTML com highlight quando o worker responde — o usuário vê o conteúdo imediatamente, com o highlight chegando em < 100ms.

---

### 32.4 Sistema de Cores — Variáveis CSS de Syntax

Todo o sistema de cores de syntax do Cortex é controlado por variáveis CSS declaradas no tema. Isso garante que temas customizados de usuários substituem completamente as cores de syntax — tanto no CM6 quanto no Shiki.

#### Variáveis CSS de syntax

```css
/* Definidas pelo tema em :root ou .theme-dark / .theme-light */

/* Estruturais */
--syntax-background:       /* fundo do bloco de código */
--syntax-background-hover: /* fundo quando o bloco está com cursor */
--syntax-border:           /* borda do bloco (opcional, alguns temas não usam) */
--syntax-line-number:      /* cor dos números de linha */
--syntax-selection:        /* cor de seleção dentro do bloco */

/* Tokens semânticos */
--syntax-keyword:          /* if, for, return, def, function, class */
--syntax-builtin:          /* print, len, console, typeof */
--syntax-string:           /* "texto", 'texto', `template` */
--syntax-string-escape:    /* \n, \t, \u0041 */
--syntax-number:           /* 42, 3.14, 0xFF */
--syntax-boolean:          /* true, false, null, None */
--syntax-operator:         /* +, -, *, /, =, ==, !=, =>, -> */
--syntax-punctuation:      /* (, ), {, }, [, ], ;, , */
--syntax-comment:          /* // comentário, /* bloco */ */
--syntax-comment-doc:      /* /** JSDoc */, /// Rust doc */
--syntax-function:         /* nome de função na definição e chamada */
--syntax-function-builtin: /* map, filter, reduce, print */
--syntax-type:             /* string, int, bool, Array, Option<T> */
--syntax-type-parameter:   /* <T>, <K, V> em generics */
--syntax-variable:         /* nome de variável */
--syntax-property:         /* .property, object.key */
--syntax-attribute:        /* @decorator, #[derive], [attr] */
--syntax-namespace:        /* import, use, module */
--syntax-tag:              /* <div>, <Component> em JSX/HTML */
--syntax-tag-attribute:    /* class="...", onClick={} em JSX/HTML */
--syntax-regexp:           /* /pattern/flags */
--syntax-meta:             /* preprocessor, shebang, frontmatter */
--syntax-special:          /* caracteres especiais, escape sequences */
--syntax-invalid:          /* syntax error highlight */

/* Blocos de código — estrutura */
--syntax-block-padding:    /* padding interno do bloco */
--syntax-block-radius:     /* border-radius do bloco */
--syntax-block-font:       /* font-family do código (ex: 'JetBrains Mono', monospace) */
--syntax-block-font-size:  /* tamanho da fonte do código */
--syntax-block-line-height:
```

**Valores padrão** fornecidos pelo tema Paper (light) e Ink (dark) que acompanham o app. Temas customizados podem sobrescrever qualquer subconjunto dessas variáveis.

#### Mapeamento CM6 → variáveis CSS

O CM6 usa um sistema de **highlight tags** (`@lezer/highlight`). O Cortex define um `HighlightStyle` customizado que mapeia tags para as variáveis CSS acima:

```typescript
// packages/editor/src/syntax-highlight.ts

import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

export const cortexHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword,           color: 'var(--syntax-keyword)' },
  { tag: tags.string,            color: 'var(--syntax-string)' },
  { tag: [tags.number,
          tags.bool,
          tags.null],            color: 'var(--syntax-number)' },
  { tag: tags.comment,           color: 'var(--syntax-comment)', fontStyle: 'italic' },
  { tag: tags.docComment,        color: 'var(--syntax-comment-doc)', fontStyle: 'italic' },
  { tag: [tags.function(tags.variableName),
          tags.function(tags.propertyName)], color: 'var(--syntax-function)' },
  { tag: tags.typeName,          color: 'var(--syntax-type)' },
  { tag: tags.typeOperator,      color: 'var(--syntax-type)' },
  { tag: tags.operator,          color: 'var(--syntax-operator)' },
  { tag: tags.punctuation,       color: 'var(--syntax-punctuation)' },
  { tag: tags.variableName,      color: 'var(--syntax-variable)' },
  { tag: tags.propertyName,      color: 'var(--syntax-property)' },
  { tag: tags.attributeName,     color: 'var(--syntax-attribute)' },
  { tag: tags.tagName,           color: 'var(--syntax-tag)' },
  { tag: tags.angleBracket,      color: 'var(--syntax-punctuation)' },
  { tag: tags.regexp,            color: 'var(--syntax-regexp)' },
  { tag: tags.escape,            color: 'var(--syntax-string-escape)' },
  { tag: tags.special(tags.string), color: 'var(--syntax-string-escape)' },
  { tag: tags.meta,              color: 'var(--syntax-meta)' },
  { tag: tags.invalid,           color: 'var(--syntax-invalid)',
                                 textDecoration: 'underline wavy' },
  // Namespace e imports
  { tag: tags.namespace,         color: 'var(--syntax-namespace)' },
  { tag: tags.moduleKeyword,     color: 'var(--syntax-keyword)' },
  // Modificadores de estilo (não cor)
  { tag: tags.strong,            fontWeight: 'bold' },
  { tag: tags.emphasis,          fontStyle: 'italic' },
  { tag: tags.strikethrough,     textDecoration: 'line-through' },
  { tag: tags.link,              color: 'var(--color-accent-primary)',
                                 textDecoration: 'underline' },
])

export const cortexSyntaxHighlighting = syntaxHighlighting(cortexHighlightStyle)
```

Esta extensão é registrada no CM6 globalmente — afeta todos os editores, incluindo Live Preview e Source Mode.

#### Mapeamento Shiki → variáveis CSS

O Shiki usa temas no formato `IShikiTheme` (JSON). O Cortex gera dinamicamente um tema Shiki a partir dos valores computados das variáveis CSS:

```typescript
// packages/editor/src/reading-view/shiki-theme-bridge.ts

function buildShikiTheme(variant: 'dark' | 'light'): IShikiTheme {
  // Lê os valores computados das variáveis CSS no DOM
  const style = getComputedStyle(document.documentElement)
  const get = (v: string) => style.getPropertyValue(v).trim()

  return {
    name: `cortex-${variant}`,
    type: variant,
    colors: {
      'editor.background':   get('--syntax-background'),
      'editor.foreground':   get('--syntax-variable'),
      'editor.selectionBackground': get('--syntax-selection'),
    },
    tokenColors: [
      { scope: ['keyword', 'storage.type', 'storage.modifier'],
        settings: { foreground: get('--syntax-keyword') } },
      { scope: ['string', 'string.quoted'],
        settings: { foreground: get('--syntax-string') } },
      { scope: ['constant.numeric', 'constant.language'],
        settings: { foreground: get('--syntax-number') } },
      { scope: ['comment', 'comment.block'],
        settings: { foreground: get('--syntax-comment'), fontStyle: 'italic' } },
      { scope: ['entity.name.function', 'support.function'],
        settings: { foreground: get('--syntax-function') } },
      { scope: ['entity.name.type', 'support.type', 'entity.name.class'],
        settings: { foreground: get('--syntax-type') } },
      { scope: ['variable', 'variable.other'],
        settings: { foreground: get('--syntax-variable') } },
      { scope: ['entity.other.attribute-name'],
        settings: { foreground: get('--syntax-attribute') } },
      { scope: ['entity.name.tag'],
        settings: { foreground: get('--syntax-tag') } },
      { scope: ['keyword.operator', 'punctuation.operator'],
        settings: { foreground: get('--syntax-operator') } },
      { scope: ['punctuation'],
        settings: { foreground: get('--syntax-punctuation') } },
      { scope: ['constant.regexp', 'string.regexp'],
        settings: { foreground: get('--syntax-regexp') } },
      { scope: ['constant.character.escape'],
        settings: { foreground: get('--syntax-string-escape') } },
      { scope: ['meta.import', 'keyword.control.import', 'keyword.other.import'],
        settings: { foreground: get('--syntax-namespace') } },
      { scope: ['invalid'],
        settings: { foreground: get('--syntax-invalid') } },
    ]
  }
}
```

**Quando o tema muda:** o `buildShikiTheme()` é chamado novamente, o tema gerado é passado para o Shiki highlighter via `highlighter.setTheme()`, e a Reading View é re-renderizada para refletir as novas cores. Isso garante que trocar de tema atualiza o syntax highlight na Reading View imediatamente.

---

### 32.5 Comportamento por Modo

#### Live Preview — cursor fora do bloco

O bloco de código renderiza assim quando o cursor não está dentro:
- As linhas de ` ``` ` (abertura e fechamento) são ocultadas com decoração CSS zero-width.
- Um **badge de linguagem** aparece no canto superior direito do bloco (`Decoration.widget` posicionado como `Decoration.replace` na linha de abertura).
- O conteúdo do bloco tem syntax highlight via Lezer (sempre ativo).
- O fundo do bloco recebe `background: var(--syntax-background)` via `Decoration.line` em cada linha.
- Números de linha: opcionais (configurável). Quando ativos, adicionados via `Decoration.widget` no início de cada linha.
- Botão "copiar" no canto superior direito: `Decoration.widget` que copia o conteúdo do bloco para o clipboard ao clicar.

#### Live Preview — cursor dentro do bloco

- As linhas de ` ``` ` ficam visíveis com estilo especial (cor de syntax meta, fundo levemente diferente).
- O syntax highlight permanece ativo — sem interrupção ao entrar no bloco.
- O badge de linguagem e o botão copiar ficam ocultos (o bloco está em modo de edição).
- O `@lezer/markdown` em modo `parseMixed` continua parseando o conteúdo do bloco com o parser da linguagem — autocomplete e hints de linguagem ficam disponíveis.

#### Source Mode

- Sempre mostra as linhas de ` ``` ` (modo raw, sem decorações de ocultação).
- Syntax highlight ativo via Lezer — o mesmo `cortexHighlightStyle`.
- Sem badge de linguagem, sem botão copiar.
- Numeração de linha do editor geral se ativa.

#### Reading View

- HTML gerado pelo pipeline remark → rehype → rehype-shiki.
- Classes CSS do Shiki: `.shiki`, `.line`, tokens com `style="color: ..."`.

**Importante:** o Shiki gera `style="color: ..."` inline por padrão. Para que as variáveis CSS do tema funcionem, o Cortex usa o modo `cssVariables` do Shiki (disponível desde Shiki v1):

```typescript
highlighter.codeToHast(code, {
  lang,
  theme: 'cortex-dark',
  cssVariablePrefix: '--shiki-',  // gera --shiki-token-keyword, etc.
})
```

Com `cssVariablePrefix`, o Shiki gera classes com CSS variables em vez de valores inline: `style="color: var(--shiki-token-keyword)"`. O Cortex então injeta uma folha de estilo que mapeia `--shiki-token-keyword` para `var(--syntax-keyword)`:

```css
/* Injetado pelo packages/editor junto com o tema ativo */
.shiki { --shiki-token-keyword:    var(--syntax-keyword); }
.shiki { --shiki-token-string:     var(--syntax-string); }
.shiki { --shiki-token-comment:    var(--syntax-comment); }
/* ... */
```

Resultado: o HTML da Reading View **não precisa ser re-renderizado quando o tema muda** — apenas as variáveis CSS mudam e o browser re-pinta. Zero latência na troca de tema na Reading View.

---

### 32.6 Funcionalidades Adicionais do Bloco de Código

#### Números de linha

Configurável em `Settings → Editor → Blocos de código → Mostrar números de linha`.

No CM6 (Live Preview/Source): implementado via `ViewPlugin` que adiciona `Decoration.widget` no início de cada linha dentro do bloco com o número formatado. Não usa a extensão `lineNumbers()` nativa do CM6 (que numera todas as linhas do documento) — é específico para blocos de código.

Na Reading View: adicionado via post-processor rehype que injeta `<span class="line-number">` antes de cada linha.

```css
.code-block-line-number {
  color: var(--syntax-line-number);
  user-select: none;
  min-width: 2.5ch;
  text-align: right;
  margin-right: 1.5ch;
  opacity: 0.5;
}
```

#### Highlight de linhas específicas

Sintaxe estendida de fenced code block:

````
```javascript {2,4-6}
const a = 1       // linha 1 — normal
const b = 2       // linha 2 — highlighted
const c = 3       // linha 3 — normal
const d = 4       // linha 4 — highlighted
const e = 5       // linha 5 — highlighted
const f = 6       // linha 6 — highlighted
```
````

O parser de metadados do bloco extrai `{2,4-6}` e aplica `Decoration.line` com classe `.code-line-highlighted` nas linhas especificadas:

```css
.code-line-highlighted {
  background: var(--syntax-line-highlight);  /* variável adicional no tema */
  border-left: 3px solid var(--syntax-keyword);
}
```

#### Diff blocks

Sintaxe `diff` como linguagem especial:

````
```diff
- linha removida
+ linha adicionada
  linha sem mudança
```
````

O parser de `diff` (via `@codemirror/legacy-modes`) colore `+` em verde e `-` em vermelho usando `--syntax-diff-added` e `--syntax-diff-removed`. Funciona em todos os três modos.

#### Botão copiar

Em Live Preview (cursor fora do bloco) e Reading View: um botão "copiar" no canto superior direito do bloco que copia o conteúdo sem as linhas de ` ``` `. Usa `api.platform.copyToClipboard()` — funciona em desktop e mobile.

No mobile (React Native): o bloco de código em Reading View é renderizado numa WebView embutida (a Reading View completa é uma WebView no mobile — ver seção 4). O botão copiar funciona via `postMessage` da WebView para o RN.

#### Word-wrap vs. scroll horizontal

Por padrão: `white-space: pre-wrap` — quebra linhas longas. Não há scroll horizontal. Configurável em `Settings → Editor → Blocos de código → Quebrar linhas longas` (default: on).

Quando desativado: `white-space: pre` + `overflow-x: auto` — scroll horizontal dentro do bloco. No CM6, isso requer configuração específica na extensão de highlight do bloco.

---

### 32.7 Localização no Monorepo e Dependências

#### Arquivos novos em `packages/editor`

```
packages/editor/src/
├── syntax-highlight.ts       # cortexHighlightStyle, cortexSyntaxHighlighting (CM6)
├── languages.ts              # languageMap, getLanguageSupport(), cache de LanguageSupport
├── code-block-extension.ts   # ViewPlugin do bloco: badge, copiar, line numbers, highlight de linhas
└── reading-view/
    ├── worker.ts             # WebWorker: pipeline remark → rehype → HTML
    ├── shiki-plugin.ts       # Plugin rehype que integra Shiki
    └── shiki-theme-bridge.ts # buildShikiTheme() — lê CSS vars, gera IShikiTheme
```

#### Dependências adicionadas

**Em `packages/editor/package.json`:**

```json
{
  "dependencies": {
    "@codemirror/language": "^6.x",
    "@codemirror/language-data": "^6.x",
    "@codemirror/legacy-modes": "^6.x",
    "@lezer/highlight": "^1.x",
    "@lezer/javascript": "^1.x",
    "@lezer/python": "^1.x",
    "@lezer/rust": "^1.x",
    "@lezer/css": "^1.x",
    "@lezer/html": "^1.x",
    "@lezer/json": "^1.x",
    "@lezer/markdown": "^1.x",
    "@lezer/yaml": "^1.x",
    "@lezer/go": "^1.x",
    "@lezer/cpp": "^1.x",
    "@lezer/java": "^1.x",
    "@codemirror/lang-xml": "^6.x",
    "@codemirror/lang-php": "^6.x",
    "shiki": "^1.x",
    "rehype-shiki": "^1.x"
  }
}
```

**Tamanho estimado do bundle (gzip):**

| Componente | Tamanho |
|-----------|---------|
| Lezer langs bundled (JS/TS/Python/Rust/CSS/HTML/JSON/YAML/SQL/Go/C/Java) | ~185 KB |
| CM6 language infrastructure (`@codemirror/language`) | ~15 KB |
| Shiki core (sem grammars) | ~45 KB |
| Shiki grammars bundled (as 10 mais comuns) | ~120 KB |
| Shiki grammars lazy (todas as outras, carregadas sob demanda) | não conta no initial bundle |
| **Total impacto no bundle inicial** | **~365 KB** |

Esse impacto é aceitável: o Obsidian usa highlight.js (~250KB gzip com todas as linguagens em bundle único) e CodeMirror 5 com modos legados. O Cortex tem qualidade superior com bundle comparável.

---

### 32.8 API de Plugin para Syntax Highlighting

Plugins podem registrar parsers de linguagem para o CM6 e grammars para o Shiki, estendendo o sistema de highlight para linguagens customizadas ou DSLs:

```typescript
// Registrar uma linguagem Lezer para o CM6
api.editor.registerLanguage({
  name: 'minha-linguagem',
  aliases: ['ml', 'minhalang'],
  support: minhaLanguageSupport,  // LanguageSupport do @codemirror/language
})

// Registrar uma TextMate grammar para a Reading View via Shiki
api.editor.registerShikiGrammar({
  name: 'minha-linguagem',
  aliases: ['ml'],
  grammar: minhaGrammar,  // BundledLanguage compatible grammar object
})
```

Plugins que registram ambos (Lezer para CM6 e TextMate para Shiki) obtêm highlight consistente nos três modos. Plugins que registram apenas um obtêm highlight no modo correspondente e fallback para texto plano no outro.

---

## Apêndice A — Decisões Arquiteturais Resolvidas

| # | Decisão | Escolha | Justificativa |
|---|---------|---------|---------------|
| 1 | Motor de busca | **MiniSearch** | Volume de vault pessoal (< 10k docs) não justifica SQLite. MiniSearch: zero deps, in-memory, queries < 5ms, serialização JSON simples. SQLite avaliado separadamente para feature de database relacional (fora do escopo core). |
| 2 | Estado global | **Zustand** | API mínima sem boilerplate, sem Provider, devtools integrado, compatível com React Native. |
| 3 | IPC type safety | **tauri-specta v2** | Gera `bindings.ts` automaticamente das assinaturas Rust. Type safety ponta a ponta sem contratos manuais. Arquivo gerado commitado para uso no CI. |
| 4 | Abstração de plataforma | **`packages/platform` com adapters** | Isola chamadas nativas do core. Tauri adapter hoje. RN adapter no futuro. Apenas operações que genuinamente diferem entre plataformas são abstraídas — sem overhead desnecessário. |
| 5 | Plugin hot-reload | **File watch + reimport com cache-busting** | Agnóstico ao bundler do plugin. Plugins core: HMR Vite nativo. Plugins externos: watch do `main.js` via `notify` Rust + `import('path?t=timestamp')`. |
| 6 | Vault identity | **UUID v4 em `vault-id.json`** | Estável quando vault é movido/renomeado. UUID viaja no sync entre devices. |
| 7 | Tab keep-alive | **DOM show/hide, EditorView persistente** | Alternar tabs é instantâneo — sem re-parse, sem re-read de disco. EditorView nunca é destruído enquanto a tab existe. Suspensão por inatividade (30min) para controle de memória. |
| 8 | Note Cache | **Map em memória com entry: {content, diskContent, hash, dirty, snapshots}** | Cache-first para leitura. Dirty tracking para detecção de mudanças locais. Hash como ancestor para three-way merge no sync. Snapshots locais integrados (File Recovery). |
| 9 | Sync conflict resolution Markdown | **Three-way merge via diff-match-patch** | Mesmo algoritmo do Obsidian (Google diff-match-patch). Ancestor explícito no Note Cache garante merge correto. Fallback configurável: arquivo de conflito separado. |
| 10 | Sync state storage | **SQLite local em `vault/.cortex/sync.db`** | Apenas para o engine de sync. Não exposto ao frontend. Permite queries eficientes de arquivos por status de sync. |
| 11 | Cross-platform theming | **Theme Token Bridge: PostCSS extrator → ThemeTokenMap JSON** | CSS puro para autores de temas. Desktop: CSS nativo no WebView (zero overhead). Mobile: ThemeTokenMap carregado de cache `.tokens.json`, consumido via `useTheme()`. Extração via PostCSS AST (sem Puppeteer/headless browser). Uma única dep nova (`postcss`). |
| 12 | Autenticação sync | **JWT Access Token (15min, memória) + Refresh Token opaco (90 dias, keychain OS) com rotação** | Access token nunca vai a disco. Refresh token no keychain nativo via Tauri. Rotação a cada uso com detecção de reuso (revoga família inteira). Renovação transparente pelo sync engine Rust — usuário nunca vê tela de login por expiração normal. |
| 13 | Protocolo de notificação sync | **SSE sobre HTTP/2 + HTTP REST para transferência** | Notificações servidor→cliente via SSE: opera sobre HTTP padrão, sem proxies TCP, escalável horizontalmente, reconexão automática com . Upload/download via HTTP POST/GET. Fallback: polling a cada 30s em redes restritivas. WebSocket descartado: bidirecionalidade desnecessária para sync de arquivos, overhead operacional injustificado. |
| 14 | Identidade de device | **Device ID (UUID, keychain, permanente) + Device Token (opaco, keychain, revogável)** | Device ID gerado uma vez, nunca muda, identifica o device em histórico de versões. Device Token emitido pelo servidor no registro, prova que o device está autorizado. Revogação remota via UI de gerenciamento de conta. Re-login no mesmo device reconhece Device ID existente — sem duplicatas. |
| 17 | Sidebar esquerda: nav list vs. ribbon | **Lista de navegação com ícone + label (não ribbon vertical de ícones)** | Adotado o padrão visual do screenshot de referência: items com FolderOpen/Search/Bookmark/Tag + label em linha. Sem pill de seleção — diferenciação por weight tipográfico. Largura 240px redimensionável (180–400px). Colapsável via Cmd+[. |
| 18 | macOS: vibrancy e titlebar | **`titleBarStyle: Overlay` + `window-vibrancy` crate com `NSVisualEffectMaterial::Sidebar`** | Traffic lights nativos sobrepostos via titleBarStyle Overlay. Vibrancy aplicado à janela, sidebar transparent em CSS para deixar o efeito aparecer. Padding-top 52px via `data-platform="macos"` no body. Fallback sólido no Windows/Linux. Área de drag via `data-tauri-drag-region`. |
| 16 | UI nativa vs. React | **Nativo sempre que o OS oferece equivalente adequado; React apenas para UI complexa sem representação nativa** | Context menus: Tauri Menu API (Rust). Diálogos de confirmação/alerta/seleção: tauri-plugin-dialog. macOS Menubar: Tauri Menu + app.set_menu(). React reservado para: Command Palette, Quick Switcher, Tag Picker, Modal de Mover, Diff Viewer, Settings. React Native: ActionSheet (context menus), Alert.alert() (confirmações), DocumentPicker (arquivos). Abstraído via platform.menu e platform.dialog. |
| 15 | Sistema de tags | **Tags como entidades UUID em `tags.json` — não strings extraídas de texto** | UUID como identificador permanente: renomear uma tag atualiza apenas `tags.json`, zero arquivos de nota tocados. Notas armazenam `cortex-tags: [uuid]` no frontmatter. Merge no sync por UUID com `updatedAt` como tiebreaker por campo. Diferencial visual: chips coloridos (16 cores do design system), Tag Manager dedicado, atribuição via `Cmd+T` / drag / batch. Compatibilidade com tags legadas do Obsidian via migração opcional. |

---

## Apêndice B — Operações por Responsabilidade

### Sempre no Rust (src-tauri)
- Leitura/escrita/deleção/renomeação de arquivos
- Listagem recursiva de diretório
- File watching em tempo real (eventos de mudança)
- Scan inicial de vault (paths + mtime + hash)
- Hash de arquivo via blake3
- Diálogos nativos do OS (picker de pasta, confirmações)
- Gerenciamento de janelas Tauri
- Protocolo `cortex://` para servir assets do vault
- Gerenciamento do registry de vaults
- Engine de sync (thread separada): upload, download, detecção de conflito, `sync.db`
- Context menus nativos via Tauri Menu API (`menu.rs`): construção, exibição, eventos de seleção
- macOS Menubar nativa: setup inicial, atualização dinâmica de estado de itens
- Setup de janela por plataforma em `main.rs`: `apply_vibrancy()` (macOS), `apply_mica()` (Win11), injeção de `data-platform` no body do WebView
- Diálogos nativos do OS: confirmações destrutivas, alertas, seleção de arquivo/pasta (`dialog.rs`)

### Sempre no TypeScript/Frontend
- Parser Markdown (Lezer/CM6)
- Motor de busca full-text (MiniSearch)
- Gerenciamento de estado (Zustand stores)
- Sistema de plugins (Plugin Manager, ciclos de vida)
- Lógica de shortcuts e Command Palette
- Gerenciamento de configurações (SettingsManager + cache em memória)
- Temas e CSS (injeção, variáveis, snippets)
- Toda lógica de UI e componentes React
- Live Preview (decorações CodeMirror)
- Note Cache (Map em memória: content, diskContent, hash, dirty, snapshots)
- Merge UI (resolução de conflitos, diff viewer, File Recovery UI)
- Tab keep-alive (DOM show/hide, EditorView persistente, política de suspensão)
- Theme Token Bridge: extração PostCSS de variáveis CSS (uma vez por tema, via `packages/theme/extractor`)
- ThemeTokenMap: cache em `*.tokens.json`, carregamento e invalidação por hash
- `useTheme()` hook e `ThemeProvider` para consumo de tokens no React Native
- `TagsStore` (Zustand): CRUD de tags, índices `noteTagIndex`/`tagNoteIndex`, persistência em `tags.json`, merge de tags órfãs após sync
- Tag Manager UI, Tag Picker popover, TagChip, TagColorPicker (em `packages/ui`)
- Parser de `cortex-tags` no frontmatter integrado ao scan de notas
- Extensão CM6 de autocomplete `#slug` e decoração de chips no Live Preview

### No Rust com abstração via Platform Adapter (transparente para plugins e core)
- `readFile`, `writeFile`, `deleteFile` → `platform.fs.*`
- `listDir`, `watchDir` → `platform.fs.*`
- `getAppDataDir`, `getVaultConfigDir` → `platform.storage.*`
- `pickFolder`, `showConfirm`, `showAlert`, `pickFile`, `saveFile` → `platform.dialog.*`
- `showContextMenu`, `updateMenuItem` → `platform.menu.*` (Tauri: IPC nativo | RN: ActionSheet/Alert)
