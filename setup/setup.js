const axios = require('axios');
const fs = require('fs').promises;

const SONAR_URL = 'http://sonarqube:9000';

// Credenciais padrão do SonarQube
const DEFAULT_ADMIN = {
  login: 'admin',
  password: 'admin'
};

const DEVELOPER_USER = {
  login: 'developer',
  name: 'Developer',
  password: 'developer'
};

// Aguardar SonarQube ficar disponível
async function waitForSonarQube() {
  console.log('⏳ Aguardando SonarQube ficar disponível...');
  
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(`${SONAR_URL}/api/system/status`);
      if (response.data.status === 'UP') {
        console.log('✅ SonarQube está disponível!');
        return;
      }
    } catch (error) {
      attempts++;
      console.log(`⏳ Tentativa ${attempts}/${maxAttempts}...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  throw new Error('SonarQube não ficou disponível dentro do tempo limite');
}

// Fazer requisições para a API do SonarQube
async function makeRequest(method, endpoint, params = {}, auth = DEFAULT_ADMIN) {
  const url = `${SONAR_URL}${endpoint}`;
  
  const config = {
    method,
    url,
    auth: {
      username: auth.login,
      password: auth.password
    }
  };
  
  if (method.toLowerCase() === 'get') {
    config.params = params;
  } else {
    config.data = new URLSearchParams(params);
    config.headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };
  }
  
  const response = await axios(config);
  return response.data;
}

// Criar ou validar usuário developer
async function createOrValidateDeveloperUser() {
  console.log('👤 Verificando usuário developer...');
  
  try {
    // Verificar se usuário já existe
    const users = await makeRequest('get', '/api/users/search', {
      q: DEVELOPER_USER.login
    }, DEFAULT_ADMIN);
    
    const existingUser = users.users?.find(user => user.login === DEVELOPER_USER.login);
    
    if (existingUser) {
      console.log('✅ Usuário developer já existe');
      return existingUser;
    }
    
    // Criar usuário se não existir
    console.log('🆕 Criando usuário developer...');
    const newUser = await makeRequest('post', '/api/users/create', {
      login: DEVELOPER_USER.login,
      name: DEVELOPER_USER.name,
      email: 'developer@be-devkit.local',
      password: DEVELOPER_USER.password
    }, DEFAULT_ADMIN);
    
    console.log('✅ Usuário developer criado com sucesso!');
    return newUser;
    
  } catch (error) {
    console.error(`❌ Erro ao criar/validar usuário: ${error.message}`);
    throw error;
  }
}

// Gerar token para o usuário admin
async function generateAdminToken() {
  console.log('🔑 Gerando novo token de admin...');
  
  try {
    // Limpar todos os tokens antigos do admin primeiro
    try {
      const tokens = await makeRequest('get', '/api/user_tokens/search', {
        login: DEFAULT_ADMIN.login
      }, DEFAULT_ADMIN);
      
      if (tokens.userTokens && tokens.userTokens.length > 0) {
        console.log(`🧹 Removendo ${tokens.userTokens.length} token(s) antigo(s) do admin...`);
        for (const token of tokens.userTokens) {
          try {
            await makeRequest('post', '/api/user_tokens/revoke', {
              name: token.name
            }, DEFAULT_ADMIN);
            console.log(`🗑️  Token removido: ${token.name}`);
          } catch (error) {
            console.log(`⚠️  Erro ao remover token ${token.name}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.log('⚠️  Erro ao listar tokens antigos:', error.message);
    }
    
    // Criar novo token para o admin
    console.log('🆕 Criando novo token para admin...');
    const result = await makeRequest('post', '/api/user_tokens/generate', {
      name: 'be-devkit-admin-token'
    }, DEFAULT_ADMIN);
    
    const token = result.token;
    console.log('✅ Token de admin gerado com sucesso!');
    
    // Salvar token no arquivo para o backend usar
    await fs.writeFile('/app/config/sonar-token.txt', token);
    console.log('💾 Token salvo em /app/config/sonar-token.txt');
    
    return token;
    
  } catch (error) {
    console.error('❌ Erro ao gerar token de admin:', error.message);
    throw error;
  }
}

// Criar ou validar Quality Gate personalizado
async function createOrValidateQualityGate() {
  console.log('🎯 Verificando Quality Gate bbdc-leap-way-incubating...');
  
  // Condições enterprise esperadas (12 condições: 6 new code + 6 overall code)
  const expectedConditions = [
    // === NEW CODE CONDITIONS (6) ===
    // 1. New Coverage - cobertura mínima de 90% em código novo
    { metric: 'new_coverage', op: 'LT', error: '90' },
    
    // 2. New Duplicated Lines Density - máximo 3% de duplicação em código novo
    { metric: 'new_duplicated_lines_density', op: 'GT', error: '3' },
    
    // 3. New Maintainability Rating - máximo A (1) em código novo
    { metric: 'new_maintainability_rating', op: 'GT', error: '1' },
    
    // 4. New Reliability Rating - máximo A (1) em código novo
    { metric: 'new_reliability_rating', op: 'GT', error: '1' },
    
    // 5. New Security Hotspots Reviewed - 100% dos hotspots revisados em código novo
    { metric: 'new_security_hotspots_reviewed', op: 'LT', error: '100' },
    
    // 6. New Security Rating - máximo A (1) em código novo
    { metric: 'new_security_rating', op: 'GT', error: '1' },
    
    // === OVERALL CODE CONDITIONS (6) ===
    // 7. Overall Coverage - cobertura mínima de 90% geral
    { metric: 'coverage', op: 'LT', error: '90' },
    
    // 8. Overall Duplicated Lines Density - máximo 3% de duplicação geral
    { metric: 'duplicated_lines_density', op: 'GT', error: '3' },
    
    // 9. Overall Maintainability Rating (sqale_rating) - máximo A (1) geral
    { metric: 'sqale_rating', op: 'GT', error: '1' },
    
    // 10. Overall Reliability Rating - máximo A (1) geral
    { metric: 'reliability_rating', op: 'GT', error: '1' },
    
    // 11. Overall Security Hotspots Reviewed - 100% dos hotspots revisados geral
    { metric: 'security_hotspots_reviewed', op: 'LT', error: '100' },
    
    // 12. Overall Security Rating - máximo A (1) geral
    { metric: 'security_rating', op: 'GT', error: '1' }
  ];
  
  try {
    // Verificar se já existe - API correta para listar Quality Gates
    const gates = await makeRequest('get', '/api/qualitygates/list', {}, DEFAULT_ADMIN);
    let existingGate = gates.qualitygates?.find(gate => gate.name === 'bbdc-leap-way-incubating');
    
    if (!existingGate) {
      // Criar novo Quality Gate
      console.log('🆕 Criando Quality Gate bbdc-leap-way-incubating...');
      existingGate = await makeRequest('post', '/api/qualitygates/create', {
        name: 'bbdc-leap-way-incubating'
      }, DEFAULT_ADMIN);
      console.log('✅ Quality Gate criado com sucesso!');
    } else {
      console.log('✅ Quality Gate bbdc-leap-way-incubating já existe');
    }
    
    // Obter condições atuais do Quality Gate
    const gateDetails = await makeRequest('get', '/api/qualitygates/show', {
      name: 'bbdc-leap-way-incubating'
    }, DEFAULT_ADMIN);
    
    const currentConditions = gateDetails.conditions || [];
    console.log(`📋 Condições atuais: ${currentConditions.length}`);
    
    // PRIMEIRO: Limpar todas as condições existentes
    if (currentConditions.length > 0) {
      console.log('🧹 Limpando todas as condições existentes...');
      for (const condition of currentConditions) {
        try {
          await makeRequest('post', '/api/qualitygates/delete_condition', {
            id: condition.id
          }, DEFAULT_ADMIN);
          console.log(`🗑️  Removida condição: ${condition.metric} (${condition.op} ${condition.error})`);
        } catch (error) {
          console.log(`⚠️  Erro ao remover condição ${condition.metric}: ${error.message}`);
        }
      }
      console.log('✅ Todas as condições antigas foram removidas');
    } else {
      console.log('✅ Nenhuma condição existente para remover');
    }
    
    // SEGUNDO: Adicionar todas as novas condições
    console.log('🔧 Adicionando as 12 condições enterprise...');
    for (const expectedCondition of expectedConditions) {
      try {
        await makeRequest('post', '/api/qualitygates/create_condition', {
          gateName: 'bbdc-leap-way-incubating',
          metric: expectedCondition.metric,
          op: expectedCondition.op,
          error: expectedCondition.error
        }, DEFAULT_ADMIN);
        console.log(`✅ Condição adicionada: ${expectedCondition.metric} ${expectedCondition.op} ${expectedCondition.error}`);
      } catch (error) {
        console.log(`⚠️  Erro ao adicionar condição ${expectedCondition.metric}: ${error.message}`);
      }
    }
    
    // Definir como Quality Gate padrão
    try {
      await makeRequest('post', '/api/qualitygates/set_as_default', {
        name: 'bbdc-leap-way-incubating'
      }, DEFAULT_ADMIN);
      console.log('✅ Quality Gate definido como padrão para novos projetos');
    } catch (error) {
      console.log(`⚠️  Erro ao definir como padrão: ${error.message}`);
    }
    
    return existingGate;
  } catch (error) {
    console.error('❌ Erro ao criar/validar Quality Gate:', error.message);
    throw error;
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando setup do SonarQube...');
  
  try {
    // Aguardar SonarQube ficar disponível
    await waitForSonarQube();
    
    // Criar/validar usuário developer (se necessário)
    await createOrValidateDeveloperUser();
    
    // Gerar token admin
    await generateAdminToken();
    
    // Criar Quality Gate personalizado
    await createOrValidateQualityGate();
    
    console.log('✅ Setup concluído com sucesso!');
    console.log('📋 Resumo:');
    console.log('   - Admin: admin / admin (token para análises)');
    console.log('   - Developer user: developer / developer (consulta apenas)');
    console.log('   - Token admin salvo em: /app/config/sonar-token.txt');
    console.log('   - Quality Gate: bbdc-leap-way-incubating (ENTERPRISE)');
    console.log('   - 12 condições de qualidade configuradas');
    console.log('');
    console.log('🌐 Acesse o SonarQube em: http://localhost:9000');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro durante o setup:', error.message);
    process.exit(1);
  }
}

main();
