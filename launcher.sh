#!/bin/bash
# ========================================
# Administrador de Propriedades - Main Launcher
# ========================================

show_menu() {
    clear
    echo ""
    echo "========================================"
    echo "   ADMINISTRADOR DE PROPRIEDADES - LAUNCHER"
    echo "========================================"
    echo ""
    echo "  1. Instalar Dependências (Primeira vez)"
    echo "  2. Iniciar Servidor (Produção)"
    echo "  3. Iniciar Servidor (Desenvolvimento)"
    echo "  4. Parar Servidor"
    echo "  5. Abrir no Navegador"
    echo "  6. Verificar Status"
    echo "  0. Sair"
    echo ""
    echo "========================================"
    echo ""
}

check_status() {
    clear
    echo ""
    echo "========================================"
    echo "  Verificando Status do Servidor"
    echo "========================================"
    echo ""

    # Check if Node.js is running
    if pgrep -x "node" > /dev/null; then
        echo "[INFO] Processos Node.js em execução:"
        ps aux | grep node | grep -v grep
        echo ""
    else
        echo "[INFO] Nenhum processo Node.js em execução"
        echo ""
    fi

    # Check port 3000
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "[INFO] Porta 3000 em uso:"
        lsof -i :3000
        echo ""
        echo "[SUCESSO] Servidor provavelmente está em execução"
    else
        echo "[INFO] Porta 3000 está livre"
        echo "[AVISO] Servidor não está em execução"
    fi

    echo ""
    echo "========================================"
    echo ""
    read -p "Pressione Enter para voltar ao menu..."
}

# Make scripts executable
chmod +x *.sh 2>/dev/null

while true; do
    show_menu
    read -p "Escolha uma opção (0-6): " choice

    case $choice in
        1)
            clear
            echo ""
            echo "========================================"
            echo "  Instalando Dependências..."
            echo "========================================"
            echo ""
            ./install.sh
            echo ""
            read -p "Pressione Enter para voltar ao menu..."
            ;;
        2)
            clear
            echo ""
            echo "========================================"
            echo "  Iniciando Servidor (Produção)"
            echo "========================================"
            echo ""
            ./start.sh
            ;;
        3)
            clear
            echo ""
            echo "========================================"
            echo "  Iniciando Servidor (Desenvolvimento)"
            echo "========================================"
            echo ""
            ./dev.sh
            ;;
        4)
            clear
            echo ""
            echo "========================================"
            echo "  Parando Servidor"
            echo "========================================"
            echo ""
            ./stop.sh
            echo ""
            read -p "Pressione Enter para voltar ao menu..."
            ;;
        5)
            clear
            echo ""
            echo "========================================"
            echo "  Abrindo Navegador"
            echo "========================================"
            echo ""
            ./open-browser.sh
            echo ""
            read -p "Pressione Enter para voltar ao menu..."
            ;;
        6)
            check_status
            ;;
        0)
            clear
            echo ""
            echo "========================================"
            echo "  Saindo do Administrador de Propriedades"
            echo "========================================"
            echo ""
            echo "Obrigado por usar o Administrador de Propriedades!"
            echo ""
            exit 0
            ;;
        *)
            echo ""
            echo "[ERRO] Opção inválida!"
            sleep 2
            ;;
    esac
done
