# Scripts de Inicialização / Startup Scripts

Este projeto inclui scripts para facilitar o desenvolvimento e execução da aplicação.
This project includes scripts to facilitate development and application execution.

## Windows (.bat files)

### Opção 1: Usando o Launcher (Recomendado)
```cmd
launcher.bat
```
Menu interativo com todas as opções disponíveis.

### Opção 2: Scripts Individuais

**Desenvolvimento (com hot-reload):**
```cmd
dev.bat
```
Inicia backend (porta 3000) e frontend (porta 5173) em janelas separadas com recarregamento automático.

**Produção:**
```cmd
start.bat
```
Inicia ambos os servidores em modo produção.

**Parar servidores:**
```cmd
stop.bat
```
Encerra todos os processos nas portas 3000 e 5173.

**Abrir navegador:**
```cmd
open-browser.bat
```
Abre o navegador em http://localhost:5173

**Instalar dependências:**
```cmd
install.bat
```
Instala todas as dependências do projeto (pnpm install).

---

## Linux/Mac (.sh files)

### Dar permissão de execução (primeira vez):
```bash
chmod +x *.sh
```

### Opção 1: Usando o Launcher (Recomendado)
```bash
./launcher.sh
```
Menu interativo com todas as opções disponíveis.

### Opção 2: Scripts Individuais

**Desenvolvimento (com hot-reload):**
```bash
./dev.sh
```
Inicia backend (porta 3000) e frontend (porta 5173) com recarregamento automático.

**Produção:**
```bash
./start.sh
```
Inicia ambos os servidores em modo produção.

**Parar servidores:**
```bash
./stop.sh
```
Encerra todos os processos nas portas 3000 e 5173.

**Abrir navegador:**
```bash
./open-browser.sh
```
Abre o navegador em http://localhost:5173

**Instalar dependências:**
```bash
./install.sh
```
Instala todas as dependências do projeto (pnpm install).

---

## URLs da Aplicação

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Backend Health Check:** http://localhost:3000/api/health
- **Backend Dev Login:** http://localhost:3000/api/dev-login

---

## Configuração do Banco de Dados

O projeto usa MySQL via Docker. Para configurar:

### Windows:
```cmd
setup-database.bat
```

### Linux/Mac:
```bash
docker run --name mysql-admin-propriedades \
  -e MYSQL_ROOT_PASSWORD=rootpass123 \
  -e MYSQL_DATABASE=administrador_de_propriedades \
  -p 3307:3306 \
  -d mysql:8.0
```

Aguarde 30 segundos para o MySQL iniciar, então aplique o schema:
```bash
pnpm db:push
```

---

## Notas Importantes

1. **Primeira execução:** Execute `install.bat` (Windows) ou `./install.sh` (Linux/Mac) primeiro
2. **Docker:** Certifique-se de que o Docker Desktop está rodando antes de configurar o banco
3. **Portas:** Verifique se as portas 3000, 5173 e 3307 estão disponíveis
4. **Ambiente:** A variável `DATABASE_URL` é configurada automaticamente pelos scripts

---

## Estrutura dos Scripts

- `launcher.bat/sh` - Menu principal interativo
- `dev.bat/sh` - Modo desenvolvimento (watch mode)
- `start.bat/sh` - Modo produção
- `stop.bat/sh` - Parar todos os servidores
- `install.bat/sh` - Instalar dependências
- `open-browser.bat/sh` - Abrir navegador
- `setup-database.bat` - Configurar MySQL (apenas Windows)

---

## Solução de Problemas

**"Port already in use":**
```cmd
stop.bat   # Windows
./stop.sh  # Linux/Mac
```

**"Command not found: pnpm":**
```bash
npm install -g pnpm
```

**Erro de conexão com banco de dados:**
1. Verifique se o Docker está rodando
2. Verifique se o container MySQL está ativo: `docker ps`
3. Reinicie o container: `docker restart mysql-admin-propriedades`
