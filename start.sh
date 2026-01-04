#!/bin/bash
# ========================================
# Administrador de Propriedades - Production Start
# ========================================

echo ""
echo "========================================"
echo "  Administrador de Propriedades - Modo de Produção"
echo "  Iniciando Servidor..."
echo "========================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[ERRO] Dependências não instaladas. Por favor, execute a opção 1 do launcher."
    exit 1
fi

# Kill any existing Node processes on ports 3000 and 5173
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

echo "[INFO] Backend: http://localhost:3000"
echo "[INFO] Frontend: http://localhost:5173"
echo "========================================"
echo "  Pressione Ctrl+C para parar os servidores"
echo "========================================"
echo ""

# Set database URL environment variable
export DATABASE_URL="mysql://root:rootpass123@localhost:3307/administrador_de_propriedades"

# Start backend server in background
DATABASE_URL="mysql://root:rootpass123@localhost:3307/administrador_de_propriedades" pnpm exec tsx server/_core/index.ts &
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

