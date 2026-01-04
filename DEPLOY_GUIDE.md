# 🚀 Guia de Deploy - Administrador de Propriedades

Este guia mostra como colocar a aplicação online com banco de dados MySQL.

## Opções de Deploy (do mais fácil ao mais avançado)

| Plataforma | Custo | Dificuldade | MySQL Incluído |
|------------|-------|-------------|----------------|
| Railway | Grátis* | ⭐ Fácil | ✅ Sim |
| Render + PlanetScale | Grátis* | ⭐⭐ Médio | ✅ Separado |
| Fly.io + PlanetScale | Grátis* | ⭐⭐ Médio | ✅ Separado |
| VPS (DigitalOcean/Vultr) | $5-10/mês | ⭐⭐⭐ Avançado | ✅ Manual |

*Planos gratuitos têm limitações

---

## 🎯 Opção 1: Railway (RECOMENDADO - Mais Fácil)

Railway oferece hosting gratuito com MySQL incluído.

### Passo 1: Criar conta no Railway
1. Acesse [railway.app](https://railway.app)
2. Faça login com GitHub

### Passo 2: Criar projeto
1. Clique em **"New Project"**
2. Selecione **"Deploy from GitHub repo"**
3. Conecte seu repositório

### Passo 3: Adicionar MySQL
1. No projeto, clique em **"+ New"**
2. Selecione **"Database" → "MySQL"**
3. Railway criará automaticamente um banco MySQL

### Passo 4: Configurar variáveis de ambiente
No serviço da aplicação, adicione:

```env
DATABASE_URL=mysql://user:password@host:port/database
NODE_ENV=production
SESSION_SECRET=sua-chave-secreta-aqui-min-32-caracteres
```

> **Dica:** O Railway fornece a `DATABASE_URL` automaticamente quando você conecta o MySQL ao seu app.

### Passo 5: Deploy
O Railway faz deploy automático a cada push no GitHub.

---

## 🎯 Opção 2: Render + PlanetScale

### Parte A: Banco de Dados (PlanetScale)

1. Acesse [planetscale.com](https://planetscale.com)
2. Crie uma conta gratuita
3. Crie um novo banco de dados
4. Vá em **"Connect"** e copie a connection string

### Parte B: Aplicação (Render)

1. Acesse [render.com](https://render.com)
2. Conecte seu GitHub
3. Crie um **"New Web Service"**
4. Configure:
   - **Build Command:** `pnpm install && pnpm build`
   - **Start Command:** `pnpm start`
   - **Environment:** Node

5. Adicione variáveis de ambiente:
```env
DATABASE_URL=mysql://...sua-url-do-planetscale...
NODE_ENV=production
SESSION_SECRET=sua-chave-secreta-aqui
```

---

## 🎯 Opção 3: VPS (DigitalOcean/Vultr/Linode)

Para máximo controle, use um VPS.

### Passo 1: Criar Droplet/VPS
- Ubuntu 22.04 LTS
- Mínimo 1GB RAM, 25GB SSD (~$5/mês)

### Passo 2: Configurar servidor

```bash
# Conectar via SSH
ssh root@seu-ip

# Atualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Instalar pnpm
npm install -g pnpm

# Instalar MySQL
apt install -y mysql-server
mysql_secure_installation

# Instalar Nginx (proxy reverso)
apt install -y nginx

# Instalar PM2 (gerenciador de processos)
npm install -g pm2
```

### Passo 3: Configurar MySQL

```bash
mysql -u root -p

CREATE DATABASE administrador_de_propriedades;
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'senha_segura';
GRANT ALL PRIVILEGES ON administrador_de_propriedades.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Passo 4: Clonar e configurar aplicação

```bash
# Criar diretório
mkdir -p /var/www
cd /var/www

# Clonar repositório
git clone https://github.com/seu-usuario/seu-repo.git app
cd app

# Instalar dependências
pnpm install

# Criar arquivo .env
cat > .env << EOF
DATABASE_URL=mysql://appuser:senha_segura@localhost:3306/administrador_de_propriedades
NODE_ENV=production
SESSION_SECRET=$(openssl rand -hex 32)
EOF

# Build
pnpm build

# Rodar migrações
pnpm db:push
```

### Passo 5: Configurar PM2

```bash
# Iniciar aplicação
pm2 start pnpm --name "admin-propriedades" -- start

# Salvar configuração
pm2 save

# Iniciar no boot
pm2 startup
```

### Passo 6: Configurar Nginx

```bash
cat > /etc/nginx/sites-available/admin-propriedades << 'EOF'
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/admin-propriedades /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Passo 7: SSL com Let's Encrypt (HTTPS)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d seu-dominio.com
```

---

## 📁 Arquivos Necessários para Deploy

Os seguintes arquivos já estão configurados no projeto:

### 1. `Dockerfile` (para containers)
### 2. `docker-compose.prod.yml` (para Docker Compose)
### 3. `railway.json` (para Railway)
### 4. `.env.example` (template de variáveis)

---

## 🔐 Variáveis de Ambiente para Produção

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | URL de conexão MySQL | `mysql://user:pass@host:3306/db` |
| `NODE_ENV` | Ambiente | `production` |
| `SESSION_SECRET` | Chave para sessões | String aleatória 32+ chars |
| `PORT` | Porta do servidor | `3000` |

---

## ⚠️ Checklist de Segurança para Produção

- [ ] Remover rotas de dev-login (`/api/dev-login`)
- [ ] Usar HTTPS (SSL)
- [ ] Configurar CORS corretamente
- [ ] Usar senhas fortes no banco
- [ ] Configurar rate limiting
- [ ] Backup automático do banco de dados
- [ ] Monitoramento de erros (Sentry, LogRocket)

---

## 🔄 Deploy Automático (CI/CD)

### GitHub Actions

O arquivo `.github/workflows/deploy.yml` configura deploy automático:

1. A cada push na branch `main`
2. Roda testes
3. Faz build
4. Deploy automático

---

## 📞 Suporte

- **Railway:** [docs.railway.app](https://docs.railway.app)
- **Render:** [render.com/docs](https://render.com/docs)
- **PlanetScale:** [planetscale.com/docs](https://planetscale.com/docs)
