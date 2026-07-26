# Backup automático diário — guia de configuração

O código e o agendamento já estão prontos e publicados (`backup/backup-firestore.js` +
`.github/workflows/backup.yml`, corre todos os dias às 03:00 UTC via GitHub Actions,
gratuito). Falta só um passo, que só tu consegues fazer: dar ao GitHub uma chave de
acesso de leitura ao Firestore.

**Não é preciso o plano Blaze para isto** — GitHub Actions é gratuito para repositórios
públicos, e a Firebase Admin SDK só lê dados (não usa Cloud Functions).

## 1. Gerar a chave de conta de serviço no Firebase

1. Vai a [console.firebase.google.com](https://console.firebase.google.com) → projecto **Armazens**.
2. Clica na roda dentada (⚙️) ao lado de "Vista geral do projeto" → **Definições do projeto**.
3. Separador **Contas de serviço**.
4. Clica em **Gerar nova chave privada** → confirma. Vai descarregar um ficheiro `.json`
   (nome parecido com `armazens-7a4de-firebase-adminsdk-xxxxx.json`).

⚠️ **Este ficheiro dá acesso total de leitura/escrita ao Firestore, sem passar pelas
regras de segurança.** Não o partilhes, não o anexes a emails, não o coloques em nenhuma
pasta pública. Vai directamente para o passo 2 e depois podes apagá-lo do teu computador
(o GitHub guarda uma cópia em segurança nos Secrets).

## 2. Adicionar a chave como Secret no GitHub

1. Vai a `github.com/braulioinv2019-wq/armazens` → separador **Settings**.
2. **Secrets and variables** → **Actions** → **New repository secret**.
3. Nome do secret: `FIREBASE_SERVICE_ACCOUNT`
4. Valor: abre o ficheiro `.json` que descarregaste num editor de texto, copia **todo o
   conteúdo** (desde `{` até `}`) e cola aqui.
5. **Add secret**.

## 3. Testar

O backup corre sozinho todos os dias, mas podes testar já sem esperar:

1. `github.com/braulioinv2019-wq/armazens` → separador **Actions**.
2. Na lista à esquerda, clica em **Backup diário do Firestore**.
3. Botão **Run workflow** (canto direito) → **Run workflow** outra vez para confirmar.
4. Espera 1-2 minutos e actualiza a página — deve aparecer um ✅ verde.
5. Confirma que apareceu uma pasta `backups/` no repositório com dois ficheiros de hoje:
   `AAAA-MM-DD.json` e `AAAA-MM-DD.xlsx`.

## O que fica guardado

Todos os dias, dois ficheiros novos em `backups/`:
- **`.xlsx`** — fácil de abrir no Excel: stock actual de todos os armazéns, histórico de
  movimentos, guias SFS e registo de alterações (auditoria).
- **`.json`** — cópia completa e exacta de tudo o que está no Firestore nesse momento,
  para restauro técnico se algum dia for preciso.

Guardam-se sempre os **últimos 14 dias** — os mais antigos são apagados automaticamente
para o repositório não crescer sem limite. Se quiseres guardar um backup específico para
sempre, basta descarregar o ficheiro dessa data antes de ele ser removido.

## Se precisares de ajuda

Volta à conversa e diz-me em que passo ficaste, ou cola a mensagem de erro que aparecer
no separador Actions — ajudo a interpretar.
