# Cortex CLI — Documento de Implementação

## Visão Geral

A **Cortex CLI** é uma ferramenta oficial para desenvolvedores de plugins e temas do Cortex. Seu objetivo é:

* Padronizar o desenvolvimento
* Simplificar publicação
* Melhorar DX (Developer Experience)
* Reduzir erros no ecossistema
* Eliminar fricção no onboarding

A CLI cobre:

* Criação de plugins/temas
* Desenvolvimento local com hot reload
* Validação
* Build
* Publicação automatizada
* Integração com GitHub

---

# Arquitetura Geral

```
cortex-cli
 ├── cmd/
 ├── internal/
 │   ├── auth/
 │   ├── github/
 │   ├── plugin/
 │   ├── theme/
 │   ├── registry/
 │   ├── dev/
 │   └── utils/
 ├── pkg/
 └── main.go
```

---

# Stack Recomendada (Go)

## CLI Framework

* `cobra` → estrutura de comandos
* `urfave/cli` (alternativa)

## Config & Files

* `spf13/viper` → configs
* `os`, `filepath` → filesystem

## HTTP / GitHub

* `go-github` → client oficial GitHub
* `oauth2` → auth

## Terminal UX

* `bubbletea` → UI interativa
* `lipgloss` → styling
* `survey` → prompts

## Build / Zip

* `archive/zip`
* `os/exec`

## Keychain

* `zalando/go-keyring`

---

# Distribuição via NPM

## Estratégia

A CLI é escrita em Go, mas distribuída via npm:

```
npm install -g cortex-cli
```

## Estrutura

```
cortex-cli/
 ├── bin/
 │   └── cortex (binário Go compilado)
 ├── package.json
```

## package.json

```json
{
  "name": "cortex-cli",
  "version": "1.0.0",
  "bin": {
    "cortex": "./bin/cortex"
  }
}
```

## Build

```
GOOS=darwin GOARCH=arm64 go build -o bin/cortex
GOOS=linux GOARCH=amd64 go build -o bin/cortex
```

---

# Comandos da CLI

## 1. `cortex init`

Cria estrutura base.

### Fluxo:

```
prompt user
↓
gerar estrutura
↓
instalar deps
```

### Output:

```
my-plugin/
 ├ manifest.json
 ├ src/
 ├ dist/
 ├ cortex.config.ts
```

---

## 2. `cortex plugin create`

Criação de plugin.

### Inputs:

* name
* id
* description
* author

### Ações:

* cria estrutura
* gera manifest
* configura build

---

## 3. `cortex theme create`

Mesmo fluxo de plugin, porém:

```
theme.css
manifest.json
```

---

## 4. `cortex plugin dev`

Modo desenvolvimento.

### Fluxo:

```
watch build
↓
cria symlink
↓
app detecta plugin
↓
reload automático
```

### Implementação:

* `fsnotify` para watch
* symlink para pasta do app:

```
~/.cortex/plugins/dev-plugin
```

---

## 5. `cortex plugin reload`

Recarrega plugin manualmente.

### Ações:

* remove cache
* reimporta plugin
* dispara evento IPC (futuro)

---

## 6. `cortex plugin build`

### Fluxo:

```
executa bundler
↓
gera dist/
↓
valida saída
```

---

## 7. `cortex plugin validate`

Validação completa.

### Checks:

#### Estrutura

* manifest existe
* entry existe

#### Schema

* versão semver
* campos obrigatórios

#### Segurança

* detectar:

  * eval
  * child_process
  * acesso indevido

#### Bundle

* tamanho máximo
* dependências embutidas

---

## 8. `cortex plugin doctor`

Diagnóstico avançado.

### Analisa:

* performance
* bundle size
* compatibilidade
* boas práticas

---

## 9. `cortex plugin publish`

Comando principal.

---

# Fluxo de Publicação

```
validate
↓
build
↓
zip
↓
criar release
↓
criar PR no registry
```

---

## Etapas

### 1. Build

```
npm run build
```

---

### 2. Zip

```go
zip.NewWriter()
```

Conteúdo:

```
manifest.json
main.js
styles.css
```

---

### 3. Criar Release

GitHub API:

```
POST /repos/{owner}/{repo}/releases
```

Upload:

```
plugin.zip
```

---

### 4. Atualizar Registry

* clona repo registry
* cria arquivo:

```
plugins/{plugin-id}.json
```

---

### 5. Criar PR

```
git checkout -b plugin-id
git commit
git push
```

API:

```
POST /pulls
```

---

# Autenticação GitHub (Device Flow)

## Por que Device Flow?

* não precisa browser embutido
* funciona em terminal puro
* melhor UX

---

## Fluxo

### 1. CLI inicia login

```
POST https://github.com/login/device/code
```

Resposta:

```
device_code
user_code
verification_uri
```

---

### 2. Usuário autoriza

CLI mostra:

```
Acesse:
https://github.com/login/device

Código:
ABCD-1234
```

---

### 3. CLI faz polling

```
POST /login/oauth/access_token
```

---

### 4. Recebe token

```
access_token
```

---

### 5. Armazena

Keychain:

```
go-keyring
```

---

## Uso do token

Headers:

```
Authorization: Bearer TOKEN
```

---

## Logout

```
cortex logout
```

Remove token do keychain.

---

# Estrutura de Config

```
~/.config/cortex/
 ├ config.json
 └ cache/
```

---

# Integração com Registry

## Estrutura

```
registry/
 ├ plugins/
 └ themes/
```

---

## Formato

```json
{
  "id": "kanban",
  "repo": "user/repo",
  "versions": [
    {
      "version": "1.0.0",
      "download": "url"
    }
  ]
}
```

---

# Comandos Extras Recomendados

## `cortex plugin link`

Link manual para dev.

---

## `cortex plugin unlink`

Remove link.

---

## `cortex plugin search`

Busca plugins no registry.

---

## `cortex plugin install`

Instala plugin via CLI.

---

## `cortex plugin update`

Atualiza plugin.

---

## `cortex registry sync`

Atualiza cache local.

---

# Diferenciais Competitivos

Comparado ao Obsidian:

* CLI oficial robusta
* validação local
* publish automático
* DX superior
* device flow nativo
* doctor tool

---

# Fluxo Completo do Dev

```
cortex plugin create
↓
cortex plugin dev
↓
cortex plugin validate
↓
cortex plugin publish
↓
PR automático
↓
plugin disponível no app
```

---

# Roadmap Futuro

* sandbox de plugins
* analytics de uso
* marketplace web
* assinatura de plugins
* plugins pagos

---

# Conclusão

A Cortex CLI é um componente central para escalar o ecossistema:

* reduz fricção
* melhora qualidade
* elimina custo de infra
* aumenta adoção

Ela posiciona o Cortex como uma plataforma moderna e profissional para extensibilidade.
