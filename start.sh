#!/bin/bash

echo "🚀 Iniciando BE Developer Kit..."
echo ""

# Verificar se o Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker e tente novamente."
    exit 1
fi

# Verificar se o docker-compose está disponível
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ docker-compose não encontrado. Por favor, instale o Docker Compose."
    exit 1
fi

echo "✅ Docker está rodando"
echo "✅ Docker Compose encontrado"
echo ""

# Limpar containers anteriores se existirem
echo "🧹 Limpando containers anteriores..."
docker-compose down -v 2>/dev/null || true
echo ""

# Construir e iniciar os serviços
echo "🔨 Construindo e iniciando serviços..."
docker-compose up --build -d

echo ""
echo "⏳ Aguardando serviços ficarem prontos..."
echo "   Isso pode levar alguns minutos na primeira execução..."
echo ""

# Aguardar o backend ficar pronto
echo "🔄 Aguardando backend..."
for i in {1..30}; do
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "✅ Backend pronto!"
        break
    fi
    sleep 5
    echo "   Tentativa $i/30..."
done

# Aguardar o frontend ficar pronto
echo "🔄 Aguardando frontend..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Frontend pronto!"
        break
    fi
    sleep 5
    echo "   Tentativa $i/30..."
done

echo ""
echo "🎉 BE Developer Kit está rodando!"
echo ""
echo "📋 URLs disponíveis:"
echo "   🌐 Frontend (Interface principal): http://localhost:3000"
echo "   🔧 SonarQube (Dashboard): http://localhost:9000"
echo "   ⚙️  Backend API: http://localhost:3001"
echo ""
echo "👤 Credenciais do SonarQube:"
echo "   Admin: admin / admin"
echo "   Developer: developer / developer"
echo ""
echo "🚀 Para começar:"
echo "   1. Acesse http://localhost:3000"
echo "   2. Selecione um projeto"
echo "   3. Clique em 'Iniciar Análise'"
echo "   4. Veja os resultados no SonarQube"
echo ""
echo "📊 Para parar os serviços: docker-compose down"
