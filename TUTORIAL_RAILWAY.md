# 🚂 Tutorial Completo: Deploy no Railway

Este tutorial vai te guiar passo a passo para colocar a aplicação "Administrador de Propriedades" no ar usando o Railway.

---

## 📋 Pré-requisitos

1. Uma conta no [Railway](https://railway.app) (pode criar gratuitamente com GitHub)
2. Seu código no GitHub (já está configurado!)

---

## 🚀 Passo 1: Criar Conta no Railway

1. Acesse [railway.app](https://railway.app)
2. Clique em **"Login"** no canto superior direito
3. Selecione **"Login with GitHub"**
4. Autorize o Railway a acessar sua conta GitHub
5. Pronto! Você está logado.

---

## 🗄️ Passo 2: Criar o Banco de Dados MySQL

### 2.1 Criar novo projeto
1. No dashboard do Railway, clique em **"New Project"**
2. Selecione **"Empty Project"** (Projeto Vazio)

### 2.2 Adicionar MySQL
1. Dentro do projeto, clique em **"+ New"** (botão roxo)
2. Selecione **"Database"**
3. Escolha **"Add MySQL"**
4. Aguarde alguns segundos enquanto o Railway cria o banco

### 2.3 Copiar as credenciais do MySQL
1. Clique no serviço **MySQL** que apareceu no projeto
2. Vá na aba **"Variables"** (Variáveis)
3. Você verá várias variáveis. **Anote ou copie estas**:
   - `MYSQL_HOST` (ex: `containers-us-west-xxx.railway.app`)
   - `MYSQL_PORT` (ex: `6842`)
   - `MYSQL_USER` (ex: `root`)
   - `MYSQL_PASSWORD` (uma senha longa gerada automaticamente)
   - `MYSQL_DATABASE` (ex: `railway`)
   - `DATABASE_URL` (a URL completa de conexão)

> 💡 **Dica**: Clique no ícone de "olho" para ver os valores, e no ícone de "copiar" para copiar.

---

## 🔧 Passo 3: Criar as Tabelas do Banco de Dados

### 3.1 Acessar o MySQL via linha de comando
1. Ainda no serviço MySQL, vá na aba **"Connect"**
2. Na seção "Connect from Your Computer", copie o comando que começa com `mysql -h...`
3. Abra o terminal do seu computador e cole o comando
4. Digite a senha quando solicitado (está na variável `MYSQL_PASSWORD`)

### 3.2 Executar o script de criação das tabelas
Cole e execute os seguintes comandos SQL:

```sql
-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  phone VARCHAR(20),
  loginMethod VARCHAR(64),
  role ENUM('user', 'agent', 'admin') NOT NULL DEFAULT 'user',
  isAgent BOOLEAN NOT NULL DEFAULT FALSE,
  creci VARCHAR(50),
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de propriedades
CREATE TABLE IF NOT EXISTS properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('apartamento', 'casa', 'terreno', 'comercial', 'outro') NOT NULL,
  transactionType ENUM('venda', 'aluguel') NOT NULL,
  price INT NOT NULL,
  size INT NOT NULL,
  rooms INT NOT NULL,
  bathrooms INT NOT NULL,
  hasBackyard BOOLEAN NOT NULL DEFAULT FALSE,
  hasLivingRoom BOOLEAN NOT NULL DEFAULT TRUE,
  hasKitchen BOOLEAN NOT NULL DEFAULT TRUE,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zipCode VARCHAR(10),
  agentId INT NOT NULL,
  status ENUM('ativa', 'vendida', 'alugada', 'inativa') NOT NULL DEFAULT 'ativa',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (agentId) REFERENCES users(id) ON DELETE CASCADE
);

-- Criar tabela de comissões
CREATE TABLE IF NOT EXISTS commissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  propertyId INT NOT NULL,
  agentId INT NOT NULL,
  transactionType ENUM('venda', 'aluguel') NOT NULL,
  transactionAmount INT NOT NULL,
  commissionRate INT NOT NULL,
  commissionAmount INT NOT NULL,
  status ENUM('pendente', 'paga', 'cancelada') NOT NULL DEFAULT 'pendente',
  paymentDate TIMESTAMP,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (agentId) REFERENCES users(id) ON DELETE CASCADE
);

-- Criar tabela de imagens das propriedades
CREATE TABLE IF NOT EXISTS property_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  propertyId INT NOT NULL,
  url TEXT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  originalName VARCHAR(255) NOT NULL,
  mimeType VARCHAR(50) NOT NULL,
  size INT NOT NULL,
  isPrimary BOOLEAN NOT NULL DEFAULT FALSE,
  sortOrder INT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE
);

-- Criar tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  userName VARCHAR(255),
  userRole VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entityType VARCHAR(50) NOT NULL,
  entityId INT,
  entityName VARCHAR(255),
  description TEXT,
  oldValue JSON,
  newValue JSON,
  ipAddress VARCHAR(45),
  userAgent TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

-- Criar usuários iniciais para teste
INSERT INTO users (openId, name, email, role, isAgent, creci) VALUES
('agent-001', 'Agente Teste', 'agente@teste.com', 'agent', TRUE, 'CRECI-12345'),
('admin-001', 'Administrador', 'admin@teste.com', 'admin', FALSE, NULL),
('user-001', 'Usuário Comum', 'user@teste.com', 'user', FALSE, NULL);

-- Verificar se as tabelas foram criadas
SHOW TABLES;
```

> ✅ Se tudo correu bem, você verá uma lista com as 5 tabelas criadas.

### 3.3 Sair do MySQL
Digite `exit` para sair do cliente MySQL.

---

## 🌐 Passo 4: Fazer Deploy da Aplicação

### 4.1 Adicionar o serviço da aplicação
1. Volte ao seu projeto no Railway
2. Clique em **"+ New"**
3. Selecione **"GitHub Repo"**
4. Escolha o repositório **"administrador_de_propriedades_3"**
5. O Railway vai começar a fazer o build automaticamente

### 4.2 Aguardar o primeiro build (vai falhar, é normal!)
- O primeiro build provavelmente vai falhar porque ainda não configuramos as variáveis de ambiente
- Não se preocupe, vamos configurar agora

---

## ⚙️ Passo 5: Configurar Variáveis de Ambiente

Esta é a parte mais importante! Siga com atenção.

### 5.1 Acessar as variáveis
1. Clique no serviço da sua aplicação (não o MySQL)
2. Vá na aba **"Variables"**

### 5.2 Adicionar as variáveis necessárias

Clique em **"+ New Variable"** para cada uma:

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `NODE_ENV` | `production` | Indica que é ambiente de produção |
| `DATABASE_URL` | *(copie do MySQL)* | URL completa de conexão com o banco |
| `DB_HOST` | *(copie MYSQL_HOST)* | Endereço do servidor MySQL |
| `DB_PORT` | *(copie MYSQL_PORT)* | Porta do MySQL |
| `DB_USER` | *(copie MYSQL_USER)* | Usuário do MySQL |
| `DB_PASSWORD` | *(copie MYSQL_PASSWORD)* | Senha do MySQL |
| `DB_NAME` | *(copie MYSQL_DATABASE)* | Nome do banco de dados |

### 5.3 Método alternativo: Referenciar variáveis do MySQL
Em vez de copiar os valores manualmente, você pode referenciar as variáveis do MySQL diretamente:

1. Clique em **"+ New Variable"**
2. No campo de valor, digite `${{MySQL.MYSQL_HOST}}` (substitua MySQL pelo nome do seu serviço de banco)

Exemplo de como ficaria:
- `DB_HOST` → `${{MySQL.MYSQL_HOST}}`
- `DB_PORT` → `${{MySQL.MYSQL_PORT}}`
- `DB_USER` → `${{MySQL.MYSQL_USER}}`
- `DB_PASSWORD` → `${{MySQL.MYSQL_PASSWORD}}`
- `DB_NAME` → `${{MySQL.MYSQL_DATABASE}}`
- `DATABASE_URL` → `${{MySQL.DATABASE_URL}}`

> 💡 **Vantagem**: Se as credenciais do MySQL mudarem, sua aplicação atualiza automaticamente!

---

## 🔄 Passo 6: Fazer Redeploy

1. Após configurar todas as variáveis, vá na aba **"Deployments"**
2. Clique nos três pontinhos (...) do último deploy
3. Selecione **"Redeploy"**
4. Aguarde o build completar (geralmente 2-5 minutos)

---

## 🌍 Passo 7: Gerar URL Pública

### 7.1 Criar o domínio
1. Clique no serviço da sua aplicação
2. Vá na aba **"Settings"** (Configurações)
3. Role até a seção **"Networking"** ou **"Domains"**
4. Clique em **"Generate Domain"**
5. Será gerado um domínio como: `seu-app-production.up.railway.app`

### 7.2 Testar a aplicação
1. Copie a URL gerada
2. Abra em uma nova aba do navegador
3. A página de login deve aparecer!

---

## ✅ Verificação Final

Para garantir que tudo está funcionando:

1. **Health Check**: Acesse `https://seu-dominio.up.railway.app/api/health`
   - Deve retornar: `{"status":"ok","timestamp":"..."}`

2. **Login**: Acesse a página principal e tente fazer login como Admin ou Corretor

3. **Banco de Dados**: Tente criar uma propriedade para verificar se o banco está funcionando

---

## 🐛 Problemas Comuns

### "Health check failed"
- **Causa**: Servidor não está escutando na porta correta
- **Solução**: Verifique se a variável `PORT` não está definida manualmente (o Railway define automaticamente)

### "Database connection failed"
- **Causa**: Credenciais do MySQL incorretas
- **Solução**: Verifique se todas as variáveis DB_* estão corretas e correspondem às do serviço MySQL

### "Build failed"
- **Causa**: Erro no código ou dependências
- **Solução**: Veja os logs de build clicando em "View Logs"

### "Cannot find module"
- **Causa**: Dependências não instaladas
- **Solução**: Verifique se o `package.json` está correto

---

## 💰 Custos

O Railway oferece:
- **$5 de crédito grátis** por mês para contas verificadas
- **500 horas de execução** no plano gratuito
- O MySQL consome recursos, então monitore seu uso

Para verificar seu uso:
1. Clique no seu avatar no canto superior direito
2. Vá em **"Usage"**

---

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs em **"Deployments"** → **"View Logs"**
2. Consulte a [documentação do Railway](https://docs.railway.app)
3. Acesse o [Discord do Railway](https://discord.gg/railway)

---

## 🎉 Parabéns!

Se você chegou até aqui, sua aplicação deve estar rodando na nuvem! 

URL da sua aplicação: `https://[seu-dominio].up.railway.app`

---

*Tutorial criado para o projeto Administrador de Propriedades - Janeiro/2026*
