#!/bin/bash
# ========================================
# Administrador de Propriedades - Open Browser Script
# ========================================

URL="http://localhost:5173"

echo "[INFO] Abrindo navegador em $URL"

# Detecta o sistema operacional
case "$(uname -s)" in
    Linux*)     xdg-open $URL;;
    Darwin*)    open $URL;;
    CYGWIN*|MINGW32*|MSYS*|MINGW*) start $URL;;
    *)          echo "Não foi possível detectar o sistema operacional. Por favor, abra $URL manualmente."
esac

