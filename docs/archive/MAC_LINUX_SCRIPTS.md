> Historical documentation from before the October 2026 audit. Commands and schema descriptions may be obsolete; use the root README and DEPLOY_GUIDE.

# Administrador de Propriedades - Mac/Linux Shell Scripts

This project includes several shell scripts (`.sh`) to facilitate running on Mac and Linux.

## 📋 Available Scripts

### 🚀 `start.sh` - Start Server (Production)
Starts the server in production mode.

**How to use:**
```bash
./start.sh
```

**What it does:**
- Checks if Node.js and pnpm are installed
- Installs dependencies if necessary
- Kills existing processes on port 3000
- Starts the server at http://localhost:3000

---

### 🔧 `dev.sh` - Development Mode
Starts the server with auto-reload (restarts automatically when files change).

**How to use:**
```bash
./dev.sh
```

**Ideal for:**
- Active development
- Quick testing of changes
- Watch mode active

---

### ⚙️ `install.sh` - Installation
Installs all project dependencies.

**How to use:**
```bash
./install.sh
```

**What it does:**
- Checks Node.js and pnpm
- Installs pnpm globally if needed
- Runs `pnpm install`
- Shows post-installation instructions

**Use this script first** when cloning the project!

---

### 🛑 `stop.sh` - Stop Server
Stops all running Node.js processes.

**How to use:**
```bash
./stop.sh
```

**What it does:**
- Stops all node processes
- Frees port 3000
- Useful when server doesn't respond to Ctrl+C

---

### 🌐 `open-browser.sh` - Open in Browser
Opens the application in the default browser.

**How to use:**
```bash
./open-browser.sh
```

**Useful:**
- After starting the server
- To quickly open the app

---

### 🎯 `launcher.sh` - Interactive Launcher
Interactive menu with all options.

**How to use:**
```bash
./launcher.sh
```

**Features:**
- Install dependencies
- Start server (production/development)
- Stop server
- Open browser
- Check status

---

## 📖 Quick Start Guide

### First Time (Installation)

```bash
# 1. Make scripts executable
chmod +x *.sh

# 2. Install dependencies
./install.sh

# 3. Start server
./start.sh

# 4. Open in browser (in another terminal)
./open-browser.sh
```

### Daily Use (Development)

```bash
# Start in development mode (with auto-reload)
./dev.sh
```

### Daily Use (Production)

```bash
# Start normal server
./start.sh
```

### Stop Server

```bash
# Stop everything
./stop.sh
```

---

## 🔧 Requirements

### macOS
- **Node.js** 18.x or higher
- **Homebrew** (recommended)

Install Node.js with Homebrew:
```bash
brew install node
```

### Linux (Ubuntu/Debian)
- **Node.js** 18.x or higher

Install Node.js:
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
```

### Linux (Fedora/RHEL)
```bash
# Using NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install nodejs
```

---

## 🌐 Accessing the Application

After starting with `start.sh` or `dev.sh`:

1. Open your browser
2. Access: **http://localhost:3000**
3. Click **"Entrar na Plataforma"**
4. You will be logged in as "Agente de Desenvolvimento"

---

## ❓ Troubleshooting

### "Permission denied" error
```bash
# Make scripts executable
chmod +x *.sh
```

### "Node.js not found"
**macOS:**
```bash
brew install node
```

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### "Port 3000 already in use"
```bash
# Use the stop script to free the port
./stop.sh
```

### "Error installing dependencies"
```bash
# Try cleaning and reinstalling
rm -rf node_modules
./install.sh
```

### "Server doesn't start"
1. Run `./stop.sh` first
2. Wait 2 seconds
3. Run `./start.sh` again

### Check what's using port 3000
```bash
# macOS/Linux
lsof -i :3000

# Kill specific process
kill -9 <PID>
```

---

## 📁 Project Structure

```
administrador_de_propriedades_2/
├── launcher.sh        # Interactive menu
├── start.sh          # Start server (production)
├── dev.sh            # Start server (development with watch)
├── stop.sh           # Stop server
├── install.sh        # Install dependencies
├── open-browser.sh   # Open browser
├── server/           # Server code
├── client/           # Frontend code
└── drizzle/          # Database schema
```

---

## 🎯 Features

✅ **Authentication** - Automatic login as agent  
✅ **Properties** - Create, list and delete properties  
✅ **Commissions** - View commissions by property  
✅ **Mock Data** - Works without database configuration  
✅ **Hot Reload** - Development mode with auto-reload  

---

## 💡 Tips

### Running in Background
```bash
# Start server in background
nohup ./start.sh > server.log 2>&1 &

# Check the log
tail -f server.log

# Stop background process
./stop.sh
```

### Using with tmux (recommended for servers)
```bash
# Start tmux session
tmux new -s admin-propriedades

# Run the server
./start.sh

# Detach: Press Ctrl+B then D
# Reattach: tmux attach -t admin-propriedades
```

### Using with screen
```bash
# Start screen session
screen -S admin-propriedades

# Run the server
./start.sh

# Detach: Press Ctrl+A then D
# Reattach: screen -r admin-propriedades
```

---

## 🔒 File Permissions

All scripts need execute permission:

```bash
chmod +x launcher.sh
chmod +x start.sh
chmod +x dev.sh
chmod +x stop.sh
chmod +x install.sh
chmod +x open-browser.sh

# Or all at once:
chmod +x *.sh
```

---

## 📞 Support

For more information, see:
- `README_PT.md` - Main documentation in Portuguese
- `SETUP_VSCODE.md` - VS Code setup
- `WINDOWS_SCRIPTS.md` - Windows scripts documentation

---

## ⚡ Quick Reference

| Action | Command |
|--------|---------|
| Install | `./install.sh` |
| Start | `./start.sh` |
| Development | `./dev.sh` |
| Stop | `./stop.sh` |
| Open Browser | `./open-browser.sh` |
| Interactive Menu | `./launcher.sh` |
| Local URL | http://localhost:3000 |
| Make Executable | `chmod +x *.sh` |

---

## 🍎 macOS Specific Notes

### Security Settings
When running scripts for the first time, macOS may show a security warning. To allow:

1. Go to **System Preferences** > **Security & Privacy**
2. Click **"Allow Anyway"** for the blocked script
3. Run the script again

Or disable Gatekeeper temporarily:
```bash
sudo spctl --master-disable
# After running scripts, enable it again:
sudo spctl --master-enable
```

### Homebrew Installation
If you don't have Homebrew:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

---

## 🐧 Linux Specific Notes

### Using nvm (Node Version Manager)
Recommended for managing Node.js versions:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 18
nvm install 18
nvm use 18

# Set as default
nvm alias default 18
```

### Firewall Configuration
If needed, allow port 3000:

**Ubuntu/Debian:**
```bash
sudo ufw allow 3000/tcp
```

**Fedora/RHEL:**
```bash
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --reload
```

---

**Developed with ❤️ to facilitate property management**
