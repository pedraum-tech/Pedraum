# Plataforma Pedra Um - MVP

Este repositório contém o código-fonte da Plataforma Pedra Um, desenvolvido com **Next.js 15**, focado na validação de venda de Leads.

O projeto conta com uma esteira de **CI/CD robusta** configurada via GitHub Actions, incluindo testes automatizados (Componentes e E2E), deploy automático na Vercel e sistema de notificações por e-mail.

## 🛠 Tecnologias Utilizadas

- **Core:** Next.js 15, React, TypeScript.
- **Banco de Dados/Auth:** Firebase.
- **Testes:** Playwright (E2E e Component Testing).
- **Infraestrutura:** Vercel (Hospedagem) + GitHub Actions (CI/CD).

---

## 🚀 Como Rodar Localmente

### 1. Pré-requisitos

- Node.js v20+ (Recomendado).
- Gerenciador de pacotes NPM.

### 2. Instalação

Clone o repositório e instale as dependências:

npm install

### 3. Configuração de Variáveis (.env)

Crie um arquivo `.env.local` na raiz do projeto com as seguintes chaves (solicite as credenciais de produção à equipe responsável):

# Created by Vercel CLI

ADMIN_ALLOWED_EMAILS=...
ADMIN_EMAILS=...
ANALYZE=
BASE_URL=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=...
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_SERVICE_ACCOUNT_JSON=...
FIREBASE_SERVICE_ACCOUNT_JSON_B64=...
FIREBASE_SERVICE_ACCOUNT_KEY=...
GCP_CLIENT_EMAIL=...
GCP_PRIVATE_KEY=...
GCP_PROJECT_ID=...
GOOGLE_APPLICATION_CREDENTIALS=...
MERCADOPAGO_ACCESS_TOKEN=...
MP_ACCESS_TOKEN=...
MP_WEBHOOK_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
NEXT_PUBLIC_APP_URL=...
NEXT_PUBLIC_BASE_URL=...
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=..
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=...
NEXT_PUBLIC_MP_PREAPPROVAL_PLAN_ID=...
NEXT_PUBLIC_MP_PUBLIC_KEY=...
NEXT_PUBLIC_PEDRAUM_WPP=...
NEXT_PUBLIC_UPLOAD_MAX_IMG_SIZE=...
NEXT_PUBLIC_UPLOAD_MAX_PDF_SIZE=...
UPLOADTHING_TOKEN=...
VERCEL_OIDC_TOKEN=...

# ----------------------------------------------------------------------

# VARIAVEIS DE TESTE

ADMIN_EMAIL_TEST=...
ADMIN_PASSWORD_TEST=...
DEMANDA_ID_TEST=...

### 4. Executar

npm run dev

O projeto estará disponível em `http://localhost:3000`.

---

## 🧪 Testes Automatizados

A qualidade do código é garantida através do **Playwright**.

### Testes de Componentes (Unitários/Integração)

Valida o funcionamento isolado dos componentes da interface.

npm run test:ct

### Testes E2E (Ponta a Ponta)

Simula um usuário real navegando na aplicação.

npm run test:e2e

_Nota: Para rodar os testes E2E localmente, certifique-se de ter as variáveis `ADMIN_EMAIL_TEST` e `ADMIN_PASSWORD_TEST` configuradas no seu ambiente._

---

## ⚙️ Arquitetura de CI/CD (Pipeline)

O projeto possui um workflow automatizado no GitHub Actions (`.github/workflows/pipeline.yml`) dividido em 3 etapas:

### 1. Job: Tests (Testes)

Rodado a cada **Push** ou **Pull Request** na branch `main`.

- Instala dependências com cache para performance.
- Executa testes de componentes (`test:ct`).
- Executa testes E2E (`test:e2e`).
- **Artifacts:** Se houver falha, um relatório detalhado (Playwright Report) é gerado e disponibilizado para download na aba "Actions" do GitHub.

### 2. Job: Deploy (Vercel)

Rodado apenas se os testes passarem e for um **Push na main**.

- Realiza o build e deploy de produção diretamente na Vercel.

### 3. Job: Notification (E-mail)

Envia notificações automáticas para a equipe:

- **Falha:** Avisa o desenvolvedor se o pipeline quebrar (Teste ou Deploy).
- **Release:** Envia um e-mail para o Cliente e Desenvolvedor com as notas de atualização (Release Notes) sempre que uma nova Release é publicada no GitHub.

---

## 🔐 Segredos do Repositório (GitHub Secrets)

Para que o pipeline funcione corretamente (em caso de fork ou mudança de repositório), as seguintes _Secrets_ devem ser configuradas em `Settings > Secrets and variables > Actions`:

| Secret Key               | Descrição                                             |
| ------------------------ | ----------------------------------------------------- |
| `VERCEL_TOKEN`           | Token de autenticação da Vercel CLI.                  |
| `VERCEL_ORG_ID`          | ID da organização na Vercel.                          |
| `VERCEL_PROJECT_ID`      | ID do projeto na Vercel.                              |
| `NEXT_PUBLIC_FIREBASE_*` | Todas as chaves do Firebase listadas acima.           |
| `MAIL_USERNAME`          | E-mail remetente (SMTP) para notificações.            |
| `MAIL_PASSWORD`          | Senha de app (App Password) do e-mail SMTP.           |
| `MY_EMAIL`               | E-mail do desenvolvedor para receber alertas de erro. |
| `CLIENT_EMAIL`           | E-mail do cliente para receber novidades de Release.  |
| `ADMIN_EMAIL_TEST`       | Usuário para login nos testes E2E.                    |
| `ADMIN_PASSWORD_TEST`    | Senha para login nos testes E2E.                      |

---

_Documentação técnica entregue em conformidade com o encerramento contratual em 23/01/2026._
