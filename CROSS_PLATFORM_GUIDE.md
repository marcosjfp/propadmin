# 🚀 Administrador de Propriedades - Cross-Platform Quick Start

Choose your operating system:

## 🪟 Windows

### Quick Start
```batch
# 1. Run the interactive launcher
launcher.bat

# Choose option 1 (Install), then option 2 (Start)
```

### Individual Scripts
```batch
install.bat    # Install dependencies
start.bat      # Start server (production)
dev.bat        # Start with auto-reload (development)
stop.bat       # Stop server
```

📖 **Full Documentation**: [WINDOWS_SCRIPTS.md](WINDOWS_SCRIPTS.md)  
📖 **Quick Guide**: [QUICKSTART.md](QUICKSTART.md)

---

## 🍎 macOS / 🐧 Linux

### Quick Start
```bash
# 1. Make scripts executable
chmod +x *.sh

# 2. Run the interactive launcher
./launcher.sh

# Choose option 1 (Install), then option 2 (Start)
```

### Individual Scripts
```bash
./install.sh    # Install dependencies
./start.sh      # Start server (production)
./dev.sh        # Start with auto-reload (development)
./stop.sh       # Stop server
```

📖 **Full Documentation**: [MAC_LINUX_SCRIPTS.md](MAC_LINUX_SCRIPTS.md)  
📖 **Quick Guide**: [QUICKSTART_MAC.md](QUICKSTART_MAC.md)

---

## 🌐 Access the Application

After starting the server (on any platform):

1. Open your browser
2. Go to: **http://localhost:3000**
3. Click **"Entrar na Plataforma"**
4. You'll be logged in automatically as "Agente de Desenvolvimento"

---

## 📋 Common Features (All Platforms)

| Feature | Windows | Mac/Linux |
|---------|---------|-----------|
| Interactive Menu | `launcher.bat` | `./launcher.sh` |
| Install | `install.bat` | `./install.sh` |
| Start Server | `start.bat` | `./start.sh` |
| Development Mode | `dev.bat` | `./dev.sh` |
| Stop Server | `stop.bat` | `./stop.sh` |
| Open Browser | `open-browser.bat` | `./open-browser.sh` |

---

## 🎯 What You Can Do

✅ **Manage Properties** - Create, edit, and delete property listings  
✅ **Track Commissions** - Automatic calculation (8% sales, 10% rentals)  
✅ **User Management** - Admin can create and promote agents  
✅ **Full Details** - Type, size, rooms, amenities, location  
✅ **Real-time Updates** - Development mode with hot-reload  
✅ **No Database Required** - Works with mock data out of the box  

---

## ❓ Troubleshooting

### Windows
- **"Node.js not found"** → Install from [nodejs.org](https://nodejs.org/)
- **"Port 3000 in use"** → Run `stop.bat`
- **Need help?** → See [WINDOWS_SCRIPTS.md](WINDOWS_SCRIPTS.md)

### Mac/Linux
- **"Permission denied"** → Run `chmod +x *.sh`
- **"Node.js not found"** → 
  - Mac: `brew install node`
  - Linux: See [MAC_LINUX_SCRIPTS.md](MAC_LINUX_SCRIPTS.md)
- **"Port 3000 in use"** → Run `./stop.sh`

---

## 🔧 Requirements

### All Platforms
- Node.js 18.x or higher
- pnpm (auto-installed by scripts)
- Modern web browser

### Platform-Specific Installation

**Windows:**
- Download Node.js: https://nodejs.org/

**macOS:**
```bash
brew install node
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## 📚 Documentation

- **[README_PT.md](README_PT.md)** - Complete documentation (Portuguese)
- **[WINDOWS_SCRIPTS.md](WINDOWS_SCRIPTS.md)** - Windows scripts guide
- **[MAC_LINUX_SCRIPTS.md](MAC_LINUX_SCRIPTS.md)** - Mac/Linux scripts guide
- **[QUICKSTART.md](QUICKSTART.md)** - Windows quick start
- **[QUICKSTART_MAC.md](QUICKSTART_MAC.md)** - Mac/Linux quick start

---

## 🎨 Development Mode

Perfect for active development with automatic file watching:

**Windows:**
```batch
dev.bat
```

**Mac/Linux:**
```bash
./dev.sh
```

The server will restart automatically when you modify any file!

---

## 🛑 Stopping the Server

**Windows:**
```batch
stop.bat
```
Or press `Ctrl+C` in the terminal

**Mac/Linux:**
```bash
./stop.sh
```
Or press `Ctrl+C` in the terminal

---

## 🌟 Features

- **Modern Stack**: React 19 + TypeScript + Tailwind CSS
- **Type-Safe API**: tRPC for end-to-end type safety
- **Beautiful UI**: shadcn/ui components
- **Responsive**: Works on desktop and mobile
- **Portuguese**: Fully localized interface
- **No Database Needed**: Works with mock data for quick testing

---

## 💡 Tips

### Running in Production
Use the standard start scripts for production environments.

### Development Workflow
1. Use dev mode (`dev.bat` or `./dev.sh`) for active development
2. Files are watched and server restarts automatically
3. Frontend has hot-reload for instant updates

### Multiple Terminals
Open two terminals:
- **Terminal 1**: Run the server
- **Terminal 2**: Run commands, check status, etc.

---

## 🚀 Next Steps

1. ✅ Start the server
2. ✅ Open http://localhost:3000
3. ✅ Login automatically
4. ✅ Create your first property
5. ✅ Explore commissions tracking
6. ✅ Manage users (if admin)

---

**Made with ❤️ for property management**
