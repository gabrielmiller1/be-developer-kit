const fastify = require('fastify')({ logger: true });
const axios = require('axios');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');

// Configurar CORS
fastify.register(require('@fastify/cors'), {
  origin: true
});

// Criar diretório de dados se não existir
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Inicializar SQLite Database
const db = new Database(path.join(dataDir, 'analysis.db'));

// Criar tabela se não existir
db.exec(`
  CREATE TABLE IF NOT EXISTS analysis_history (
    id TEXT PRIMARY KEY,
    project_path TEXT NOT NULL,
    project_name TEXT NOT NULL,
    status TEXT NOT NULL,
    quality_gate TEXT,
    dashboard_url TEXT,
    start_time DATETIME,
    duration TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Estado das análises em andamento (em memória para logs em tempo real)
const activeAnalyses = new Map();

// Função para aguardar o SonarQube estar pronto
async function waitForSonarQube() {
  const maxAttempts = 30;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const response = await axios.get('http://sonarqube:9000/api/system/status');
      if (response.data.status === 'UP') {
        fastify.log.info('SonarQube está pronto!');
        return true;
      }
    } catch (error) {
      fastify.log.info(`Aguardando SonarQube... tentativa ${attempts + 1}/${maxAttempts}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }
  
  throw new Error('SonarQube não ficou pronto após 2.5 minutos');
}

// Função para ler o token do SonarQube
async function getSonarToken() {
  try {
    const tokenPath = '/app/config/sonar-token.txt';
    const token = await fsPromises.readFile(tokenPath, 'utf8');
    return token.trim();
  } catch (error) {
    fastify.log.error('Erro ao ler token do SonarQube:', error);
    throw new Error('Token do SonarQube não encontrado');
  }
}

// Função para executar análise Adobe Filters (mock)
async function runAdobeFiltersAnalysis(projectPath, analysisId) {
  return new Promise(async (resolve, reject) => {
    const projectName = path.basename(projectPath);
    
    try {
      const analysis = activeAnalyses.get(analysisId);
      if (analysis) {
        analysis.status = 'running';
        analysis.logs.push(`Iniciando análise Adobe Filters do projeto: ${projectName}`);
        analysis.logs.push(`Caminho: ${projectPath}`);
        analysis.logs.push('🔍 Executando filtros de conteúdo Adobe...');
      }

      // Simular análise Adobe Filters
      setTimeout(() => {
        const analysis = activeAnalyses.get(analysisId);
        if (analysis) {
          const hasIssues = Math.random() > 0.7; // 30% chance de falha
          
          analysis.status = 'completed';
          analysis.qualityGateStatus = hasIssues ? 'FAILED' : 'PASSED';
          analysis.logs.push('✅ Análise Adobe Filters concluída!');
          
          if (hasIssues) {
            analysis.logs.push('❌ Filtros detectaram conteúdo inadequado');
          } else {
            analysis.logs.push('✅ Conteúdo aprovado pelos filtros Adobe');
          }
          
          analysis.result = {
            projectKey: `adobe-${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            dashboardUrl: `http://localhost:9000/dashboard?id=adobe-${projectName}`,
            qualityGate: {
              status: analysis.qualityGateStatus
            },
            metrics: {
              coverage: hasIssues ? '60%' : '95%',
              maintainabilityRating: hasIssues ? 'C' : 'A',
              reliabilityRating: hasIssues ? 'B' : 'A', 
              securityRating: hasIssues ? 'B' : 'A'
            }
          };
        }

        resolve({
          projectKey: `adobe-${projectName}`,
          dashboardUrl: `http://localhost:9000/dashboard?id=adobe-${projectName}`,
          qualityGate: {
            status: hasIssues ? 'FAILED' : 'PASSED'
          },
          metrics: {
            coverage: hasIssues ? '60%' : '95%',
            maintainabilityRating: hasIssues ? 'C' : 'A',
            reliabilityRating: hasIssues ? 'B' : 'A', 
            securityRating: hasIssues ? 'B' : 'A'
          }
        });
      }, 3000); // 3 segundos de simulação
      
    } catch (error) {
      fastify.log.error(`Erro na análise Adobe Filters: ${error}`);
      if (activeAnalyses.get(analysisId)) {
        activeAnalyses.get(analysisId).status = 'error';
        activeAnalyses.get(analysisId).logs.push(`Erro na análise Adobe Filters: ${error.message}`);
      }
      reject(error);
    }
  });
}

// Função para salvar análise no SQLite
function saveAnalysisToDatabase(analysis) {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO analysis_history 
      (id, project_path, project_name, status, quality_gate, dashboard_url, start_time, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      analysis.id,
      analysis.projectPath,
      path.basename(analysis.projectPath),
      analysis.qualityGateStatus === 'PASSED' ? 'passed' : 'failed',
      analysis.qualityGateStatus,
      analysis.result?.dashboardUrl,
      analysis.startTime?.toISOString(),
      analysis.duration || '2m 30s'
    );
    
    fastify.log.info(`Análise ${analysis.id} salva no banco de dados`);
  } catch (error) {
    fastify.log.error(`Erro ao salvar análise no banco: ${error}`);
  }
}

// Função para buscar métricas reais do SonarQube
async function getSonarMetrics(projectKey, token) {
  try {
    const sonarUrl = 'http://sonarqube:9000';
    const metricsToFetch = [
      'coverage',
      'bugs', 
      'vulnerabilities',
      'security_hotspots',
      'code_smells',
      'sqale_debt_ratio',
      'duplicated_lines_density',
      'reliability_rating',
      'security_rating', 
      'sqale_rating'
    ];
    
    const response = await fetch(`${sonarUrl}/api/measures/component?component=${projectKey}&metricKeys=${metricsToFetch.join(',')}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`SonarQube API error: ${response.status}`);
    }
    
    const data = await response.json();
    const measures = data.component?.measures || [];
    
    // Converter métricas para formato mais legível
    const metrics = {};
    measures.forEach(measure => {
      switch(measure.metric) {
        case 'coverage':
          metrics.coverage = measure.value ? `${parseFloat(measure.value).toFixed(1)}%` : '0.0%';
          break;
        case 'bugs':
          metrics.bugs = parseInt(measure.value) || 0;
          break;
        case 'vulnerabilities':
          metrics.vulnerabilities = parseInt(measure.value) || 0;
          break;
        case 'security_hotspots':
          metrics.securityHotspots = parseInt(measure.value) || 0;
          break;
        case 'code_smells':
          metrics.codeSmells = parseInt(measure.value) || 0;
          break;
        case 'duplicated_lines_density':
          metrics.duplication = measure.value ? `${parseFloat(measure.value).toFixed(1)}%` : '0.0%';
          break;
        case 'reliability_rating':
          metrics.reliabilityRating = ['A', 'B', 'C', 'D', 'E'][parseInt(measure.value) - 1] || 'A';
          break;
        case 'security_rating':
          metrics.securityRating = ['A', 'B', 'C', 'D', 'E'][parseInt(measure.value) - 1] || 'A';
          break;
        case 'sqale_rating':
          metrics.maintainabilityRating = ['A', 'B', 'C', 'D', 'E'][parseInt(measure.value) - 1] || 'A';
          break;
      }
    });
    
    return metrics;
  } catch (error) {
    fastify.log.error(`Erro ao buscar métricas do SonarQube: ${error}`);
    // Retornar métricas padrão em caso de erro
    return {
      coverage: '0.0%',
      bugs: 0,
      vulnerabilities: 0,
      securityHotspots: 0,
      codeSmells: 0,
      duplication: '0.0%',
      reliabilityRating: 'A',
      securityRating: 'A', 
      maintainabilityRating: 'A'
    };
  }
}

// Função para executar análise do SonarQube
async function runSonarAnalysis(projectPath, analysisId) {
  return new Promise(async (resolve, reject) => {
    const projectName = path.basename(projectPath);
    const projectKey = `be-devkit-${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    try {
      // Ler o token do arquivo
      const token = await getSonarToken();
      
      // Detectar nome da network dinamicamente baseado no COMPOSE_PROJECT_NAME
      const networkName = process.env.COMPOSE_PROJECT_NAME 
        ? `${process.env.COMPOSE_PROJECT_NAME}_sonar-network`
        : 'be-devkit_sonar-network'; // fallback padrão
      
      // Comando para executar o SonarScanner via Docker
      const scannerCommand = `
        docker run --rm \\
          --network ${networkName} \\
          --platform linux/amd64 \\
          -v "${projectPath}:/usr/src" \\
          sonarsource/sonar-scanner-cli \\
          -Dsonar.projectKey=${projectKey} \\
          -Dsonar.projectName="${projectName}" \\
          -Dsonar.sources=/usr/src \\
          -Dsonar.host.url=http://sonarqube:9000 \\
          -Dsonar.login=${token} \\
          -Dsonar.qualitygate.wait=true
      `;

      fastify.log.info(`Executando análise para projeto: ${projectName}`);
      fastify.log.info(`Caminho: ${projectPath}`);
      fastify.log.info(`Chave do projeto: ${projectKey}`);

      const analysis = activeAnalyses.get(analysisId);
      if (analysis) {
        analysis.status = 'running';
        analysis.logs.push(`Iniciando análise do projeto: ${projectName}`);
        analysis.logs.push(`Caminho: ${projectPath}`);
        analysis.logs.push(`Token configurado: ${token.substring(0, 10)}...`);
      }

      const childProcess = exec(scannerCommand, { shell: true }, async (error, stdout, stderr) => {
        const analysis = activeAnalyses.get(analysisId);
        
        // Verificar se é Quality Gate Failed ou erro real
        const isQualityGateFailed = stderr?.includes('QUALITY GATE STATUS: FAILED') || 
                                  stdout?.includes('QUALITY GATE STATUS: FAILED');
        
        if (error && !isQualityGateFailed) {
          // Erro real na execução
          fastify.log.error(`Erro na análise: ${error}`);
          if (analysis) {
            analysis.status = 'error';
            analysis.logs.push(`Erro: ${error.message}`);
          }
          reject(error);
          return;
        }

        // Análise executada com sucesso (mesmo se Quality Gate falhou)
        if (analysis) {
          if (isQualityGateFailed) {
            analysis.status = 'completed';
            analysis.qualityGateStatus = 'FAILED';
            analysis.logs.push('✅ Análise concluída com sucesso!');
            analysis.logs.push('❌ Quality Gate: FAILED - Projeto não atende aos critérios de qualidade');
          } else {
            analysis.status = 'completed';
            analysis.qualityGateStatus = 'PASSED';
            analysis.logs.push('✅ Análise concluída com sucesso!');
            analysis.logs.push('✅ Quality Gate: PASSED - Projeto atende aos critérios de qualidade');
          }
          
          // Buscar métricas reais do SonarQube
          const realMetrics = await getSonarMetrics(projectKey, token);
          
          // Formato correto esperado pelo frontend
          analysis.result = {
            projectKey,
            dashboardUrl: `http://localhost:9000/dashboard?id=${projectKey}`,
            qualityGate: {
              status: analysis.qualityGateStatus
            },
            metrics: realMetrics
          };
          
          // Salvar análise no SQLite
          saveAnalysisToDatabase(analysis);
        }

        // Buscar métricas reais para o resultado final
        const finalMetrics = await getSonarMetrics(projectKey, token);

        resolve({
          projectKey,
          dashboardUrl: `http://localhost:9000/dashboard?id=${projectKey}`,
          qualityGate: {
            status: isQualityGateFailed ? 'FAILED' : 'PASSED'
          },
          metrics: finalMetrics,
          stdout,
          stderr
        });
      });

      // Capturar logs em tempo real
      childProcess.stdout?.on('data', (data) => {
        const log = data.toString();
        fastify.log.info(`Scanner stdout: ${log}`);
        if (analysis) {
          analysis.logs.push(log);
        }
      });

      childProcess.stderr?.on('data', (data) => {
        const log = data.toString();
        fastify.log.warn(`Scanner stderr: ${log}`);
        if (analysis) {
          analysis.logs.push(`Warning: ${log}`);
        }
      });
    } catch (tokenError) {
      fastify.log.error(`Erro ao obter token: ${tokenError}`);
      if (activeAnalyses.get(analysisId)) {
        activeAnalyses.get(analysisId).status = 'error';
        activeAnalyses.get(analysisId).logs.push(`Erro ao obter token: ${tokenError.message}`);
      }
      reject(tokenError);
    }
  });
}

// Rota para listar diretórios (simulação para desenvolvimento)
fastify.get('/api/directories', async (request, reply) => {
  const { path: dirPath = '/Users' } = request.query;
  
  try {
    // Mapear caminhos do host para o container
    let actualPath = dirPath;
    if (dirPath.startsWith('/Users') || dirPath.startsWith('/home') || dirPath.startsWith('C:')) {
      actualPath = `/host-root${dirPath}`;
    }

    const items = await fs.readdir(actualPath, { withFileTypes: true });
    const directories = items
      .filter(item => item.isDirectory())
      .map(item => ({
        name: item.name,
        path: path.join(dirPath, item.name),
        type: 'directory'
      }))
      .slice(0, 50); // Limitar para performance

    return { directories, currentPath: dirPath };
  } catch (error) {
    fastify.log.error(`Erro ao listar diretórios: ${error}`);
    return { directories: [], currentPath: dirPath, error: error.message };
  }
});

// Rota para análise Adobe Content Package
fastify.post('/api/adobe/validate', async (request, reply) => {
  try {
    const analysisId = uuidv4();
    
    // Simular validação de pacote Adobe (mock)
    const validationResults = {
      id: analysisId,
      status: 'completed',
      packageName: 'sample-package.zip',
      version: '1.2.3',
      totalFiles: Math.floor(Math.random() * 500) + 100,
      issues: Math.random() > 0.3 ? [
        {
          type: 'error',
          severity: 'high',
          message: 'Permissões incorretas em /content/dam/assets',
          file: 'META-INF/vault/filter.xml'
        },
        {
          type: 'warning', 
          severity: 'medium',
          message: 'Dependência obsoleta encontrada: cq-commons v1.8.2',
          file: 'META-INF/vault/properties.xml'
        },
        {
          type: 'info',
          severity: 'low', 
          message: 'Recomendado adicionar descrição no pacote',
          file: 'META-INF/vault/definition/.content.xml'
        }
      ] : [],
      metrics: {
        contentNodes: Math.floor(Math.random() * 200) + 50,
        configurations: Math.floor(Math.random() * 30) + 10,
        templates: Math.floor(Math.random() * 15) + 5,
        components: Math.floor(Math.random() * 25) + 8
      },
      compliance: Math.random() > 0.3 ? 85 : 98
    };

    return { 
      success: true, 
      analysisId, 
      message: 'Validação Adobe iniciada com sucesso',
      results: validationResults
    };
  } catch (error) {
    fastify.log.error('Erro na validação Adobe:', error);
    return reply.code(500).send({ error: 'Erro interno do servidor' });
  }
});

// Rota para iniciar análise
fastify.post('/api/analyze', async (request, reply) => {
  const { projectPath } = request.body;
  
  if (!projectPath) {
    return reply.code(400).send({ error: 'Caminho do projeto é obrigatório' });
  }

  try {
    const analysisId = uuidv4();
    
    // Registrar análise
    activeAnalyses.set(analysisId, {
      id: analysisId,
      projectPath,
      status: 'starting',
      logs: [],
      startTime: new Date()
    });

    // Executar análise em background
    runSonarAnalysis(projectPath, analysisId)
      .catch(error => {
        fastify.log.error('Erro na análise:', error);
        const analysis = activeAnalyses.get(analysisId);
        if (analysis) {
          analysis.status = 'error';
          analysis.logs.push(`Erro na análise: ${error.message}`);
        }
      });

    return { analysisId, status: 'started', success: true };
  } catch (error) {
    fastify.log.error('Erro ao iniciar análise:', error);
    return reply.code(500).send({ error: 'Erro interno do servidor' });
  }
});

// Rota para obter status da análise
fastify.get('/api/analysis/:id', async (request, reply) => {
  const { id } = request.params;
  const analysis = activeAnalyses.get(id);
  
  if (!analysis) {
    return reply.code(404).send({ error: 'Análise não encontrada' });
  }
  
  // Formatar resposta para o frontend
  return {
    status: analysis.status,
    log: analysis.logs.join('\n'),
    results: analysis.result
  };
});

// Rota para obter logs da análise em tempo real
fastify.get('/api/analysis/:id/logs', async (request, reply) => {
  const { id } = request.params;
  const analysis = activeAnalyses.get(id);
  
  if (!analysis) {
    return reply.code(404).send({ error: 'Análise não encontrada' });
  }
  
  return { logs: analysis.logs };
});

// Rota para verificar status do SonarQube
fastify.get('/api/sonar/status', async (request, reply) => {
  try {
    const response = await axios.get('http://sonarqube:9000/api/system/status');
    return { status: response.data.status };
  } catch (error) {
    fastify.log.error('Erro ao verificar status do SonarQube:', error);
    return reply.code(503).send({ status: 'DOWN', error: error.message });
  }
});

// Rota para estatísticas do dashboard
fastify.get('/api/analysis/stats', async (request, reply) => {
  try {
    // Calcular estatísticas das análises ativas
    const analyses = Array.from(activeAnalyses.values());
    const completedAnalyses = analyses.filter(a => a.status === 'completed');
    
    const stats = {
      totalAnalyses: completedAnalyses.length,
      passedQualityGate: completedAnalyses.filter(a => a.qualityGateStatus === 'PASSED').length,
      failedQualityGate: completedAnalyses.filter(a => a.qualityGateStatus === 'FAILED').length,
      averageScore: completedAnalyses.length > 0 ? 
        Math.round(completedAnalyses.filter(a => a.qualityGateStatus === 'PASSED').length / completedAnalyses.length * 100) : 0
    };

    return stats;
  } catch (error) {
    fastify.log.error('Erro ao obter estatísticas:', error);
    return reply.code(500).send({ error: 'Erro interno do servidor' });
  }
});

// Rota para histórico de análises
fastify.get('/api/analysis/history', async (request, reply) => {
  try {
    // Buscar histórico do SQLite
    const stmt = db.prepare(`
      SELECT id, project_path as project, project_name as projectName, 
             status, quality_gate as qualityGate, dashboard_url as sonarUrl, 
             start_time as date, duration
      FROM analysis_history 
      ORDER BY created_at DESC 
      LIMIT 50
    `);
    
    const analyses = stmt.all().map(a => ({
      ...a,
      date: a.date || new Date().toISOString()
    }));

    return analyses;
  } catch (error) {
    fastify.log.error('Erro ao obter histórico:', error);
    return reply.code(500).send({ error: 'Erro interno do servidor' });
  }
});

// Rota para limpar histórico
fastify.delete('/api/analysis/history', async (request, reply) => {
  try {
    const stmt = db.prepare('DELETE FROM analysis_history');
    const result = stmt.run();
    
    fastify.log.info(`Histórico limpo: ${result.changes} registros removidos`);
    
    return { 
      success: true, 
      message: `${result.changes} registros removidos do histórico`,
      deletedCount: result.changes
    };
  } catch (error) {
    fastify.log.error('Erro ao limpar histórico:', error);
    return reply.code(500).send({ error: 'Erro interno do servidor' });
  }
});

// Health check
fastify.get('/api/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Inicializar servidor
const start = async () => {
  try {
    fastify.log.info('Aguardando SonarQube ficar pronto...');
    await waitForSonarQube();
    
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    fastify.log.info('Backend rodando na porta 3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
