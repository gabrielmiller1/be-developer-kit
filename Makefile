# BE Developer Kit - Comandos essenciais

.PHONY: help start stop restart clean logs health rebuild clean-token

help: ## Exibe este menu de ajuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

start: ## Inicia todos os serviços
	@echo "🚀 Iniciando BE Developer Kit..."
	@docker-compose up -d
	@echo "✅ Serviços iniciados!"
	@echo "🌐 Acesse: http://localhost:$$(grep FRONTEND_PORT .env 2>/dev/null | cut -d'=' -f2 || echo 3000)"

stop: ## Para todos os serviços
	@echo "⏹️  Parando serviços..."
	@docker-compose down
	@echo "✅ Serviços parados!"

restart: stop start ## Reinicia todos os serviços

rebuild: clean-token ## Remove todos os containers, volumes e reconstrói com token limpo
	@echo "🔄 Rebuild completo com limpeza de token..."
	@docker-compose down -v
	@docker system prune -f
	@docker-compose up --build -d
	@echo "✅ Rebuild concluído!"

clean-token: ## Limpa o token salvo para forçar regeneração
	@echo "🗑️  Limpando token antigo..."
	@rm -f config/sonar-token.txt
	@echo "✅ Token removido! Próxima inicialização criará um novo."

clean: ## Remove todos os containers e volumes
	@echo "🧹 Limpando sistema..."
	@docker-compose down -v
	@docker system prune -f
	@echo "✅ Sistema limpo!"

logs: ## Exibe logs de todos os serviços
	@docker-compose logs -f

health: ## Verifica o status dos serviços
	@echo "🔍 Status dos serviços:"
	@docker-compose ps
	@echo ""
	@echo "🌐 URLs:"
	@echo "   Frontend:  http://localhost:$$(grep FRONTEND_PORT .env 2>/dev/null | cut -d'=' -f2 || echo 3000)"
	@echo "   SonarQube: http://localhost:$$(grep SONARQUBE_PORT .env 2>/dev/null | cut -d'=' -f2 || echo 9000)"
	@echo "   Backend:   http://localhost:$$(grep BACKEND_PORT .env 2>/dev/null | cut -d'=' -f2 || echo 3001)"
