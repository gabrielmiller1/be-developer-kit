# BE Developer Kit 🚀

Um kit para auxulio no desenvolvimento bradesco.

## ✨ Características

- **Setup Zero**: `docker-compose up -d` e está pronto
- **Acesso Local**: Analisa projetos do seu computador

## 🚀 Início Rápido

### Pré-requisitos
- Docker e Docker Compose
- Portas 3000, 3001 e 9000 livres (ou configure no .env)

### Configurar (Opcional)
Se as portas padrão estiverem ocupadas ou quiser personalizar, copie e edite:
```bash
# Windows
copy .env.example .env

# Linux/Mac  
cp .env.example .env
```

Edite as configurações:
```bash
FRONTEND_PORT=3000
BACKEND_PORT=3001  
SONARQUBE_PORT=9000
COMPOSE_PROJECT_NAME=be-devkit
```

### Executar
```bash
# Iniciar o sistema
docker-compose up -d

# Ou usar o Makefile
make start
```

### Acessar
- **Interface Principal**: http://localhost:3000
- **SonarQube Dashboard**: http://localhost:9000
- **API Backend**: http://localhost:3001

## 📋 Como Usar

1. **Acesse**: http://localhost:3000
2. **Configure**: Caminho absoluto do projeto
3. **Execute**: Clique em "Executar Análise"
4. **Visualize**: Resultados na aba "Histórico de Execuções"
5. **Detalhes**: Clique em "Ver Detalhes" para o SonarQube

## 🛠️ Comandos Úteis

```bash
# Para buildar
make rebuild

# Iniciar
make start

# Parar
make stop

# Ver logs
make logs

# Status
make health

# Limpar tudo
make clean
```

## 🏗️ Arquitetura

```
Frontend (React)  ←→  Backend (Node.js)  ←→  SonarQube
Port: 3000            Port: 3001             Port: 9000
                           ↓
                      SQLite (Histórico)
```

### 🔐 Credenciais Sonar
- **Developer**: `developer` / `developer`

## 📁 Estrutura do Projeto

```
be-devkit/
├── frontend/          # Interface React
├── backend/           # API Node.js + SQLite
├── setup/             # Configuração automática
├── config/            # Tokens e configurações
├── scripts/           # Scripts auxiliares
├── docker-compose.yml # Orquestração
├── Makefile          # Comandos úteis
└── start.sh          # Script de início
```

## 🚨 Troubleshooting

### SonarQube não inicia
- Verifique RAM disponível (mínimo 2GB)
- Aumente memória do Docker se necessário

### Reset completo
```bash
make clean
make rebuild
make start
```

### Logs de debug
```bash
docker-compose logs -f [service]
```

---