#!/bin/bash
# ========================================
# Administrador de Propriedades - Stop Servers
# ========================================

echo ""
echo "========================================"
echo "  Administrador de Propriedades - Parando Servidores"
echo "========================================"
echo ""

stopped=0

# Kill any existing Node processes on port 3000 (Backend)
PID_3000=$(lsof -ti:3000 2>/dev/null)
if [ ! -z "$PID_3000" ]; then
    echo "[INFO] Encerrando backend na porta 3000 (PID: $PID_3000)..."
    kill -9 $PID_3000 2>/dev/null
    stopped=1
fi

# Kill any existing Node processes on port 5173 (Frontend)
PID_5173=$(lsof -ti:5173 2>/dev/null)
if [ ! -z "$PID_5173" ]; then
    echo "[INFO] Encerrando frontend na porta 5173 (PID: $PID_5173)..."
    kill -9 $PID_5173 2>/dev/null
    stopped=1
fi

if [ $stopped -eq 1 ]; then
    echo "[SUCESSO] Servidores parados."
else
    echo "[AVISO] Nenhum servidor encontrado em execução."
fi

echo ""

