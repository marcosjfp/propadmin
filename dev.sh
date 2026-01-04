#!/bin/bash
# ========================================
# Administrador de Propriedades - Development Mode
# With Auto-Restart on File Changes
# ========================================

echo ""
echo "========================================"
echo "  Administrador de Propriedades - Modo de Desenvolvimento"
echo "  Iniciando com Recarregamento Automático..."
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERRO] Node.js não está instalado ou não está no PATH"
    echo "Por favor, instale o Node.js em https://nodejs.org/"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "[INFO] pnpm não encontrado. Instalando pnpm globalmente..."
    npm install -g pnpm
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[INFO] Dependências não encontradas. Instalando..."
    pnpm install
    if [ $? -ne 0 ]; then
        echo "[ERRO] Falha ao instalar dependências"
        exit 1
    fi
fi

# Encerrar quaisquer processos Node existentes nas portas 3000 e 5173
PID_3000=$(lsof -ti:3000 2>/dev/null)
if [ ! -z "$PID_3000" ]; then
    kill -9 $PID_3000 2>/dev/null
    sleep 1
fi

PID_5173=$(lsof -ti:5173 2>/dev/null)
if [ ! -z "$PID_5173" ]; then
    kill -9 $PID_5173 2>/dev/null
    sleep 1
fi

echo ""
echo "[INFO] Iniciando em modo de desenvolvimento com observação..."
echo "[INFO] Backend: http://localhost:3000"
echo "[INFO] Frontend: http://localhost:5173"
echo "[INFO] Os arquivos serão observados para alterações"
echo ""
echo "========================================"
echo "  Pressione Ctrl+C para parar os servidores"
echo "========================================"
echo ""

# Set database URL environment variable
export DATABASE_URL="mysql://root:rootpass123@localhost:3307/administrador_de_propriedades"

# Start backend server in background
DATABASE_URL="mysql://root:rootpass123@localhost:3307/administrador_de_propriedades" pnpm exec tsx watch server/_core/index.ts &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend server
pnpm --dir client dev &
FRONTEND_PID=$!

echo ""
echo "[INFO] Servidores iniciados"
echo "[INFO] Backend PID: $BACKEND_PID"
echo "[INFO] Frontend PID: $FRONTEND_PID"
echo ""

# Wait for user interrupt
wait

echo ""
echo "[INFO] Servidores parados"
