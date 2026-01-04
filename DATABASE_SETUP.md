# 🗄️ Database Setup Guide - Administrador de Propriedades

## Quick Setup (Recommended)

### Windows Users

#### Step 1: Start Docker Desktop
1. Open **Docker Desktop** application
2. Wait until it shows "Docker Desktop is running"

#### Step 2: Run the Setup Script
```batch
setup-database.bat
```

#### Step 3: Push Database Schema
```batch
pnpm db:push
```

#### Step 4: Start the Application
```batch
pnpm dev
```

### Mac/Linux Users

#### Step 1: Start Docker Desktop
1. Open **Docker Desktop** application
2. Wait until Docker is running

#### Step 2: Make Script Executable and Run
```bash
chmod +x setup-database.sh
./setup-database.sh
```

#### Step 3: Push Database Schema
```bash
pnpm db:push
```

#### Step 4: Start the Application
```bash
pnpm dev
```

### What the Setup Script Does:
- Creates a MySQL 8.0 container
- Sets up the database `administrador_de_propriedades`
- Configures connection on port 3306
- Creates all tables with schema and relationships

---

## Manual Setup

If you prefer to set up the database manually:

### Option A: Using Docker (Recommended)

**Windows:**

1. **Start Docker Desktop**

2. **Create MySQL container:**
```batch
docker run --name mysql-admin-propriedades -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=administrador_de_propriedades -p 3306:3306 -d mysql:8.0
```

3. **Run migrations:**
```batch
pnpm db:push
```

**Mac/Linux:**

1. **Start Docker Desktop**

2. **Create MySQL container:**
```bash
docker run --name mysql-admin-propriedades \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=administrador_de_propriedades \
  -p 3306:3306 \
  -d mysql:8.0
```

3. **Run migrations:**
```bash
pnpm db:push
```

**Note:** `.env.local` is already configured with:
```env
DATABASE_URL=mysql://root:root@localhost:3306/administrador_de_propriedades
```

### Option B: Using Local MySQL

**Windows:**

1. **Start MySQL Service:**
```batch
net start MySQL80
```

2. **Create Database:**
```batch
mysql -u root -p
```
```sql
CREATE DATABASE administrador_de_propriedades;
EXIT;
```

3. **Update `.env.local`:**
```env
DATABASE_URL=mysql://root:YOUR_PASSWORD@localhost:3306/administrador_de_propriedades
```

4. **Run migrations:**
```batch
pnpm db:push
```

**Mac:**

1. **Install MySQL (if not installed):**
```bash
brew install mysql
```

2. **Start MySQL Service:**
```bash
brew services start mysql
```

3. **Create Database:**
```bash
mysql -u root -p
```
```sql
CREATE DATABASE administrador_de_propriedades;
EXIT;
```

4. **Update `.env.local`:**
```env
DATABASE_URL=mysql://root:YOUR_PASSWORD@localhost:3306/administrador_de_propriedades
```

5. **Run migrations:**
```bash
pnpm db:push
```

**Linux:**

1. **Start MySQL Service:**
```bash
sudo systemctl start mysql
```

2. **Create Database:**
```bash
mysql -u root -p
```
```sql
CREATE DATABASE administrador_de_propriedades;
EXIT;
```

3. **Update `.env.local`:**
```env
DATABASE_URL=mysql://root:YOUR_PASSWORD@localhost:3306/administrador_de_propriedades
```

4. **Run migrations:**
```bash
pnpm db:push
```

---

## Database Schema

The database includes three main tables with relationships:

### Tables:
- **users** - User accounts and agents
- **properties** (propriedades) - Property listings
- **commissions** (comissões) - Commission records

### Relationships:
- `properties.agentId` → `users.id` (CASCADE delete)
- `commissions.propertyId` → `properties.id` (CASCADE delete)
- `commissions.agentId` → `users.id` (CASCADE delete)

### Commission Calculation:
- **Sales:** 8% of property value
- **Rentals:** 10% of monthly rent

See `DATABASE_RELATIONSHIPS.md` for detailed documentation.

---

## Useful Commands

### Docker Container Management

**All Platforms:**
```bash
# Start container
docker start mysql-admin-propriedades

# Stop container
docker stop mysql-admin-propriedades

# View logs
docker logs mysql-admin-propriedades

# Remove container
docker rm -f mysql-admin-propriedades

# Check if running
docker ps | grep mysql-admin-propriedades
```

### Database Operations

**Windows:**
```batch
# Generate and run migrations
pnpm db:push

# Access MySQL shell (Docker)
docker exec -it mysql-admin-propriedades mysql -uroot -proot administrador_de_propriedades

# Access MySQL shell (Local)
mysql -u root -p administrador_de_propriedades
```

**Mac/Linux:**
```bash
# Generate and run migrations
pnpm db:push

# Access MySQL shell (Docker)
docker exec -it mysql-admin-propriedades mysql -uroot -proot administrador_de_propriedades

# Access MySQL shell (Local)
mysql -u root -p administrador_de_propriedades
```

### Verification

**Windows:**
```batch
# Check if MySQL is running
docker ps | findstr mysql-admin-propriedades

# Test connection
docker exec mysql-admin-propriedades mysql -uroot -proot -e "SELECT 1;"
```

**Mac/Linux:**
```bash
# Check if MySQL is running
docker ps | grep mysql-admin-propriedades

# Test connection
docker exec mysql-admin-propriedades mysql -uroot -proot -e "SELECT 1;"
```

---

## Troubleshooting

### "Docker Desktop is not running"
- Open Docker Desktop application
- Wait for the whale icon to stop animating

### "Port 3306 is already in use"

**Windows:**
```batch
# Stop the conflicting service
net stop MySQL80

# Or use a different port
docker run --name mysql-admin-propriedades -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=administrador_de_propriedades -p 3307:3306 -d mysql:8.0
```

**Mac:**
```bash
# Stop the conflicting service
brew services stop mysql

# Or use a different port
docker run --name mysql-admin-propriedades -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=administrador_de_propriedades -p 3307:3306 -d mysql:8.0
```

**Linux:**
```bash
# Stop the conflicting service
sudo systemctl stop mysql

# Or use a different port
docker run --name mysql-admin-propriedades -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=administrador_de_propriedades -p 3307:3306 -d mysql:8.0
```

Then update DATABASE_URL to use port 3307.

### "Cannot connect to database"
1. Check if container is running: `docker ps`
2. Check logs: `docker logs mysql-admin-propriedades`
3. Verify DATABASE_URL in `.env.local`

### Reset Database

**Windows:**
```batch
# Remove container and start fresh
docker rm -f mysql-admin-propriedades
setup-database.bat
pnpm db:push
```

**Mac/Linux:**
```bash
# Remove container and start fresh
docker rm -f mysql-admin-propriedades
./setup-database.sh
pnpm db:push
```

---

## Current Configuration

Your `.env.local` is already configured with:
```env
DATABASE_URL=mysql://root:root@localhost:3306/administrador_de_propriedades
```

✅ Ready to use once you start the MySQL container!
