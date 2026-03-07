# Obsidian-Style Sync System

Arquitetura, Criptografia E2E e Sincronização Multi-Device
Documento técnico de arquitetura

1. Visão geral do sistema
Obsidian Sync é um sistema de sincronização de arquivos de um vault entre múltiplos dispositivos.
Um vault é simplesmente um diretório contendo:


```
vault/
   note1.md
   note2.md
   folder/
      note3.md
   image.png
   .obsidian/
      config.json
```

Ao contrário de ferramentas como Notion ou Google Docs, o Obsidian trabalha diretamente com arquivos no filesystem, não com documentos armazenados em banco de dados.
Portanto, o sistema de sync funciona de maneira similar a:
Git
Dropbox
Syncthing
Mas com três propriedades principais:
sincronização incremental
criptografia end-to-end
versionamento
2. Componentes do sistema
O sistema de sincronização pode ser dividido em três camadas principais.

```
┌───────────────┐
│  Client App   │
│  (desktop /   │
│   mobile)     │
└──────┬────────┘
       │
       │ encrypted sync
       │
┌──────▼────────┐
│  Sync Server  │
│  Metadata +   │
│  routing      │
└──────┬────────┘
       │
       │ encrypted objects
       │
┌──────▼────────┐
│ Storage Layer │
│ encrypted     │
│ file blobs    │
└───────────────┘
```

Responsabilidades:
Client
detectar mudanças
criptografar dados
enviar diffs
Server
armazenar blobs criptografados
gerenciar versões
distribuir eventos
Storage
armazenar arquivos criptografados
3. Fluxo de sincronização
Quando um usuário edita uma nota:
User edits note.md
Cliente executa:
1 detectar mudança
2 calcular hash
3 comparar com versão remota
4 enviar atualização
Fluxo simplificado:

```
Device A edit
     │
detect change
     │
encrypt content
     │
upload
     │
server stores version
     │
notify devices
     │
devices pull changes
```

O tráfego de sincronização ocorre geralmente via WebSocket ou eventos contínuos, permitindo comunicação quase em tempo real.
4. Detecção de mudanças
O cliente utiliza um file watcher.
Exemplo:
Linux / Mac
inotify
Windows
ReadDirectoryChangesW
Quando um arquivo muda:
note.md changed
Cliente calcula:
hash = hash(file content)
Esse hash é comparado com a versão conhecida no servidor.
Se o hash for diferente:
upload required
5. Versionamento
Cada alteração gera uma nova versão.
Modelo conceitual:

```
note.md
   v1
   v2
   v3
```

Estrutura:

```
file_versions
   file_id
   version
   hash
   timestamp
```

O conteúdo em si não é armazenado diretamente no banco.
Ele é salvo como object blob.

```
objects/
   hash1
   hash2
   hash3
```

Isso permite:
deduplicação
histórico
economia de storage

6. Sincronização multi-device
Cada dispositivo possui um identificador.
device_id
Quando um dispositivo sincroniza:
sync since last_timestamp
Servidor retorna:
changes[]
Exemplo de resposta:

```json
{
  "changes": [
     {
       "file": "note.md",
       "version": 4
     }
  ]
}
```

O dispositivo então baixa o novo conteúdo.

7. Resolução de conflitos
Conflitos ocorrem quando dois dispositivos modificam o mesmo arquivo antes da sincronização.
Exemplo:

```
Device A edit version 5
Device B edit version 5
```

Servidor recebe:

```
A -> version 6
B -> version 6
```

O sistema utiliza merge automático.
Obsidian usa o algoritmo:
diff-match-patch
para combinar mudanças automaticamente.
Se o merge falhar:
note-conflict-deviceB.md
é criado.
8. Sincronização em tempo real
Para melhorar UX, o cliente mantém conexão persistente.
WebSocket
Quando ocorre alteração:
server → notify devices
Evento:
note_updated
vault_id
file_path
version
Dispositivos então executam:
pull latest version
9. Criptografia end-to-end
Obsidian Sync utiliza criptografia E2E por padrão.
Isso significa:
encryption happens on client
Servidor nunca vê conteúdo em plaintext.
A criptografia utiliza:
AES-256-GCM
com derivação de chave via:
scrypt
10. Processo de criptografia
Quando o usuário configura Sync:
user sets encryption password
Cliente executa:
key = scrypt(password, salt)
Essa chave é usada para criptografar:
file contents
file names
hashes
Algumas versões recentes também utilizam AES-SIV para melhorar proteção de padrões em metadados.
11. Limitações da criptografia
Alguns metadados não são criptografados.
Servidor precisa ver:
timestamps
device id
mapping between files and objects
Isso permite:
roteamento de sync
version history
Mas o conteúdo permanece criptografado.
12. Hash determinístico
O Obsidian utiliza hashes criptografados determinísticos.
Significa:
same content → same encrypted hash
Isso permite:
evitar uploads duplicados
deduplicação
otimização de storage
13. Arquitetura backend recomendada (AWS)
Para implementar um sistema equivalente com baixo custo:
Users: ~100
Vault avg size: 200MB
Total:
20GB storage
14. Arquitetura proposta
            CloudFront
                 │
            API Gateway
                 │
           Sync Service
             (Go)
        ┌───────┴────────┐
        │                │
    DynamoDB            S3
        │
       SQS
15. Storage de arquivos
Utilizar:
AWS S3
Estrutura:
s3://notes-storage/
   objects/
      hash1
      hash2
      hash3
Cada objeto contém:
encrypted blob
16. Banco de metadados
Usar:
DynamoDB
Tabelas:
vaults
vault_id
owner_id
created_at
files
file_id
vault_id
path
latest_version
file_versions
version_id
file_id
hash
timestamp
device_id
devices
device_id
user_id
last_sync
17. Serviço de sincronização
Implementado em:
Go
Motivos:
baixo uso de memória
ótimo para WebSockets
alta concorrência
Endpoints:
POST /sync/upload
GET /sync/changes
GET /sync/download
18. Realtime events
Usar:
WebSocket
ou
AWS API Gateway WebSocket
Eventos:
file_updated
file_deleted
vault_updated
19. Fila de eventos
Para distribuir eventos:
SQS
Fluxo:
file uploaded
→ event queued
→ websocket service push
20. Version history
Salvar:
últimas 50 versões
Arquivos antigos:
S3 Glacier
Lifecycle rule:
after 90 days → glacier
21. Estratégia de redução de custo
Para reduzir infraestrutura:
1 usar polling incremental
GET /changes?since=timestamp
2 evitar WebSocket
3 usar Lambda
Arquitetura serverless:
API Gateway
   │
Lambda
   │
DynamoDB
   │
S3
22. Estimativa de custo AWS
Para ~100 usuários:
S3
20GB storage
≈ $0.50 / mês
DynamoDB
≈ $2–5
EC2 ou Lambda
≈ $5–10
Transferência
≈ $2
Total estimado:
~$10–15 / mês
23. Melhorias futuras
CRDT
Permitir edição colaborativa real-time.
Delta Sync
Enviar apenas diffs.
Edge caching
Utilizar:
Cloudflare R2
24. Conclusão
Um sistema semelhante ao Obsidian Sync pode ser implementado com três princípios:
1 sincronização incremental baseada em arquivos
2 armazenamento de blobs versionados
3 criptografia end-to-end client-side
Arquitetura ideal:
client encrypted sync
        │
sync service
        │
metadata db
        │
object storage
Com essa arquitetura é possível operar um serviço para cerca de 100 usuários com custo inferior a $15/mês, mantendo segurança e escalabilidade profissional.
