#!/bin/bash
# ========================================
# Administrador de Propriedades - Install Script
# ========================================

echo ""
echo "========================================"
echo "  Administrador de Propriedades - Instalação"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERRO] Node.js não está instalado ou não está no PATH"
    echo ""
    echo "Por favor, instale o Node.js em https://nodejs.org/"
    echo "Versão recomendada: 18.x ou superior"
    echo ""
    echo "No macOS com Homebrew:"
    echo "  brew install node"
    echo ""
    exit 1
fi

echo "[SUCESSO] Node.js encontrado"
node --version

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo ""
    echo "[INFO] pnpm não encontrado. Instalando pnpm globalmente..."
    npm install -g pnpm
    if [ $? -ne 0 ]; then
        echo "[ERRO] Falha ao instalar pnpm"
        exit 1
    fi
fi

echo "[SUCESSO] pnpm encontrado"
pnpm --version

# Clean install
echo ""
echo "[INFO] Instalando dependências..."
echo "Isso pode levar alguns minutos..."
echo ""

pnpm install

if [ $? -ne 0 ]; then
    echo ""
    echo "[ERRO] Falha ao instalar dependências"
    echo "Por favor, verifique sua conexão com a internet e tente novamente"
    exit 1
fi

echo ""
echo "========================================"
echo "  Instalação Concluída!"
echo "========================================"
echo ""
echo "Próximos passos:"
echo "  1. Execute './start.sh' para iniciar o servidor"
echo "  2. Abra http://localhost:3000 no seu navegador"
echo "    3. Clique em "Entrar na Plataforma" para fazer login"
echo ""
echo "Para desenvolvimento com recarregamento automático, use './dev.sh'"
echo "Para parar o servidor, use './stop.sh' ou pressione Ctrl+C"
echo ""
