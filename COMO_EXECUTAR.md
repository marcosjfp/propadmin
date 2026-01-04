# Administrador de Propriedades - Guia de Execução

## ✅ Scripts Atualizados e Funcionais

Todos os scripts `.bat` (Windows) e `.sh` (Linux/Mac) foram atualizados para:
- Iniciar **AMBOS** os servidores (backend e frontend)
- Configurar automaticamente a variável `DATABASE_URL`
- Gerenciar ambas as portas (3000 e 5173)

---

## 🚀 Como Executar o Projeto

### Windows

#### Método 1: Launcher Interativo (Recomendado)
```cmd
launcher.bat
```
Menu com todas as opções: instalar, iniciar, parar, etc.

#### Método 2: Script de Desenvolvimento
```cmd
dev.bat
```
- Abre **2 janelas separadas** (Backend + Frontend)
- Modo desenvolvimento com hot-reload
- Backend: http://localhost:3000
- Frontend: http://localhost:5173

#### Método 3: Script de Produção
```cmd
start.bat
```
- Abre **2 janelas separadas** (Backend + Frontend)
- Modo produção

### Parar Servidores
```cmd
stop.bat
```
Encerra todos os processos nas portas 3000 e 5173.

### Abrir Navegador
```cmd
open-browser.bat
```
Abre http://localhost:5173 no navegador padrão.

---

### Linux / Mac

#### Dar permissão de execução (primeira vez)
```bash
chmod +x *.sh
```

#### Launcher Interativo (Recomendado)
```bash
./launcher.sh
```

#### Script de Desenvolvimento
```bash
./dev.sh
```
- Inicia backend e frontend em background
- Modo desenvolvimento com hot-reload
- Backend: http://localhost:3000
- Frontend: http://localhost:5173

#### Parar Servidores
```bash
./stop.sh
```

#### Abrir Navegador
```bash
./open-browser.sh
```

---

## 📋 Fluxo Completo de Primeira Execução

### 1. Instalar Docker Desktop
- Baixe e instale: https://www.docker.com/products/docker-desktop
- Inicie o Docker Desktop

### 2. Configurar Banco de Dados
```cmd
REM Windows
setup-database.bat

# Linux/Mac
docker run --name mysql-admin-propriedades \
  -e MYSQL_ROOT_PASSWORD=rootpass123 \
  -e MYSQL_DATABASE=administrador_de_propriedades \
  -p 3307:3306 \
  -d mysql:8.0
```

Aguarde 30 segundos, então:
```bash
pnpm db:push  # Aplica o schema
```

### 3. Instalar Dependências
```cmd
REM Windows
install.bat

# Linux/Mac
./install.sh
```

### 4. Iniciar Aplicação
```cmd
REM Windows
dev.bat

# Linux/Mac
./dev.sh
```

### 5. Acessar no Navegador
- Frontend: http://localhost:5173
- Clique em "Acessar Plataforma"
- Você será autenticado automaticamente

---

## 🔧 Configuração Automática

Os scripts agora configuram automaticamente:

**Variável de Ambiente:**
```
DATABASE_URL=mysql://root:rootpass123@localhost:3307/administrador_de_propriedades
```

**Portas:**
- Backend: 3000
- Frontend: 5173
- MySQL: 3307

---

## 📁 Estrutura dos Scripts

| Script | Windows | Linux/Mac | Função |
|--------|---------|-----------|--------|
| Launcher | `launcher.bat` | `launcher.sh` | Menu interativo |
| Desenvolvimento | `dev.bat` | `dev.sh` | Hot-reload mode |
| Produção | `start.bat` | `start.sh` | Production mode |
| Parar | `stop.bat` | `stop.sh` | Encerra servidores |
| Instalar | `install.bat` | `install.sh` | pnpm install |
| Navegador | `open-browser.bat` | `open-browser.sh` | Abre browser |
| Database | `setup-database.bat` | - | Configura MySQL |

---

## ⚠️ Solução de Problemas

### "Port already in use"
```cmd
stop.bat   # ou ./stop.sh
```

### "pnpm not found"
```bash
npm install -g pnpm
```

### "Docker não está rodando"
1. Abra Docker Desktop
2. Aguarde inicializar completamente
3. Execute novamente

### "Database connection failed"
1. Verifique se o Docker está rodando:
   ```bash
   docker ps
   ```
2. Se o container não existir, execute `setup-database.bat`
3. Se existir mas estiver parado:
   ```bash
   docker start mysql-admin-propriedades
   ```

### Servidores não iniciam
1. Verifique se as portas estão livres:
   ```bash
   netstat -ano | findstr ":3000 :5173"
   ```
2. Se houver processos, execute `stop.bat`
3. Tente iniciar novamente

---

## 🎯 Funcionalidades da Aplicação

Após iniciar com sucesso:

1. **Página Inicial**: http://localhost:5173
2. **Clique "Acessar Plataforma"**
3. **Navegue pelas seções**:
   - **Imóveis**: CRUD completo de propriedades
   - **Minhas Comissões**: Visualizar comissões (perfil agent)
   - **Meu Perfil**: Editar informações do usuário

### Dados de Teste
- **Usuário Mock**: Dev User
- **Email**: dev@example.com
- **Papel**: agent (pode criar/editar propriedades)

---

## 📝 Notas Importantes

1. **Windows**: Scripts abrem janelas separadas para backend e frontend
2. **Linux/Mac**: Scripts executam em background no mesmo terminal
3. **Hot Reload**: Mudanças nos arquivos recarregam automaticamente
4. **Persistência**: Todos os dados são salvos no MySQL
5. **Sessão**: Cookie de autenticação dura 7 dias

---

## 🔗 URLs Úteis

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Backend Health**: http://localhost:3000/api/health
- **Backend Login**: http://localhost:3000/api/dev-login
- **tRPC Endpoint**: http://localhost:3000/trpc

---

## 📞 Comandos Docker Úteis

```bash
# Ver containers rodando
docker ps

# Ver todos os containers
docker ps -a

# Parar MySQL
docker stop mysql-admin-propriedades

# Iniciar MySQL
docker start mysql-admin-propriedades

# Ver logs do MySQL
docker logs mysql-admin-propriedades

# Remover container
docker rm -f mysql-admin-propriedades

# Entrar no MySQL
docker exec -it mysql-admin-propriedades mysql -u root -prootpass123
```

---

## ✅ Checklist de Verificação

- [ ] Docker Desktop instalado e rodando
- [ ] Node.js instalado (v18+ recomendado)
- [ ] pnpm instalado globalmente
- [ ] Container MySQL criado e rodando
- [ ] Dependências instaladas (`install.bat/sh`)
- [ ] Portas 3000, 5173, 3307 disponíveis
- [ ] Scripts executam sem erros
- [ ] Ambos servidores acessíveis
- [ ] Login funcionando
- [ ] CRUD de propriedades funcionando

---

**Última atualização**: Outubro 24, 2025
**Versão dos Scripts**: 2.0 (Multi-server support)
