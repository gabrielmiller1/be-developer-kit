#!/bin/bash
# Script para rodar o frontend e backend em modo desenvolvimento (hot reload)
# Uso: ./dev.sh

# Rodar backend em modo dev
cd backend && npm install && npm run dev &
BACKEND_PID=$!
cd ..

# Rodar frontend em modo dev
cd frontend && npm install && npm run dev &
FRONTEND_PID=$!
cd ..

# Esperar ambos
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait $BACKEND_PID $FRONTEND_PID
