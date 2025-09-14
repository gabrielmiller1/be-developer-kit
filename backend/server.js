const fastify = require('fastify')({ logger: true });
const axios = require('axios');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const AdobeAemValidator = require('./services/adobeAemValidator');

// Configurar CORS
fastify.register(require('@fastify/cors'), {
  origin: true
});

// Registrar plugin de multipart para upload de arquivos
fastify.register(require('@fastify/multipart'), {
  limits: {
    fieldNameSize: 100,     // Max field name size in bytes
    fieldSize: 100,         // Max field value size in bytes
    fields: 10,             // Max number of non-file fields
    fileSize: 200 * 1024 * 1024, // 200MB max file size
    files: 1,               // Max number of file fields
    headerPairs: 2000       // Max number of header key=>value pairs
  }
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

// Criar tabela para histórico de validações Adobe
db.exec(`
  CREATE TABLE IF NOT EXISTS adobe_validation_history (
    id TEXT PRIMARY KEY,
    package_path TEXT NOT NULL,
    package_name TEXT NOT NULL,
    status TEXT NOT NULL,
    errors_count INTEGER DEFAULT 0,
    warnings_count INTEGER DEFAULT 0,
    info_count INTEGER DEFAULT 0,
    validation_results TEXT,
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

// Função para executar validação Adobe AEM real
async function runAdobeAemValidation(packagePath, analysisId) {
  return new Promise(async (resolve, reject) => {
    const packageName = path.basename(packagePath);
    const startTime = new Date();
    
    try {
      const analysis = activeAnalyses.get(analysisId);
      if (analysis) {
        analysis.status = 'running';
        analysis.logs.push(`Iniciando validação Adobe AEM do pacote: ${packageName}`);
        analysis.logs.push(`Caminho: ${packagePath}`);
        analysis.logs.push('🔍 Executando validações...');
        analysis.startTime = startTime;
      }

      // Mapear caminho do host para container se necessário
      let actualPath = packagePath;
      // Para validação Adobe, não precisamos do mapeamento /host-root
      // pois estamos rodando diretamente no container backend
      // O volume já está montado como /:/host-root:ro
      if (!packagePath.startsWith('/host-root') && !packagePath.startsWith('/tmp') && !packagePath.startsWith('/app')) {
        // Se o path não for absoluto do container, assumir que é do host
        actualPath = `/host-root${packagePath}`;
      }

      // Executar validação real
      const validator = new AdobeAemValidator();
      if (analysis) {
        analysis.logs.push('📋 Validando nome do pacote...');
        analysis.logs.push('📦 Extraindo e analisando estrutura...');
        analysis.logs.push('🔍 Verificando filter.xml...');
        analysis.logs.push('📝 Analisando properties.xml...');
        analysis.logs.push('🗂️  Validando conteúdo jcr_root...');
        analysis.logs.push('🔗 Verificando queries GraphQL...');
      }

      const results = await validator.validatePackage(actualPath);
      const endTime = new Date();
      const duration = `${Math.round((endTime - startTime) / 1000)}s`;

      // Gerar relatório console
      const consoleReport = validator.generateConsoleReport(results);
      
      if (analysis) {
        analysis.status = 'completed';
        analysis.qualityGateStatus = results.status === 'failed' ? 'FAILED' : 'PASSED';
        analysis.duration = duration;
        analysis.logs.push('✅ Validação Adobe AEM concluída!');
        
        if (results.status === 'failed') {
          analysis.logs.push(`❌ Validação falhou: ${results.summary.errors} erro(s) encontrado(s)`);
        } else if (results.status === 'warning') {
          analysis.logs.push(`⚠️ Validação com avisos: ${results.summary.warnings} warning(s)`);
        } else {
          analysis.logs.push('✅ Pacote aprovado sem problemas!');
        }

        analysis.logs.push(`📊 Resumo: ${results.summary.errors} erros, ${results.summary.warnings} avisos, ${results.summary.info} informações`);
        
        // Salvar resultado detalhado
        analysis.result = {
          packageKey: `adobe-aem-${packageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          packageName: packageName,
          validationResults: results,
          consoleReport: consoleReport,
          qualityGate: {
            status: analysis.qualityGateStatus
          },
          metrics: {
            totalIssues: results.summary.total,
            errors: results.summary.errors,
            warnings: results.summary.warnings,
            info: results.summary.info,
            exitCode: results.exitCode
          }
        };

        // Salvar no banco de dados
        saveAdobeValidationToDatabase(analysis);
      }

      resolve({
        packageKey: `adobe-aem-${packageName}`,
        packageName: packageName,
        validationResults: results,
        consoleReport: consoleReport,
        qualityGate: {
          status: results.status === 'failed' ? 'FAILED' : 'PASSED'
        },
        metrics: {
          totalIssues: results.summary.total,
          errors: results.summary.errors,
          warnings: results.summary.warnings,
          info: results.summary.info,
          exitCode: results.exitCode
        }
      });
      
    } catch (error) {
      fastify.log.error(`Erro na validação Adobe AEM: ${error}`);
      if (activeAnalyses.get(analysisId)) {
        activeAnalyses.get(analysisId).status = 'error';
        activeAnalyses.get(analysisId).logs.push(`Erro na validação: ${error.message}`);
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

// Função para salvar validação Adobe no SQLite
function saveAdobeValidationToDatabase(analysis) {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO adobe_validation_history 
      (id, package_path, package_name, status, errors_count, warnings_count, info_count, validation_results, start_time, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const results = analysis.result?.validationResults || {};
    const summary = results.summary || { errors: 0, warnings: 0, info: 0 };
    
    stmt.run(
      analysis.id,
      analysis.projectPath,
      path.basename(analysis.projectPath),
      analysis.qualityGateStatus === 'PASSED' ? 'passed' : 'failed',
      summary.errors,
      summary.warnings,
      summary.info,
      JSON.stringify(results),
      analysis.startTime?.toISOString(),
      analysis.duration || '30s'
    );
    
    fastify.log.info(`Validação Adobe ${analysis.id} salva no banco de dados`);
  } catch (error) {
    fastify.log.error(`Erro ao salvar validação Adobe no banco: ${error}`);
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

// Rota para análise Adobe Content Package (upload de arquivo)
fastify.post('/api/adobe/upload-validate', async (request, reply) => {
  try {
    const data = await request.file();
    
    if (!data) {
      return reply.code(400).send({ error: 'Nenhum arquivo enviado' });
    }

    // Validar tipo de arquivo
    if (!data.filename.endsWith('.zip')) {
      return reply.code(400).send({ error: 'Apenas arquivos .zip são permitidos' });
    }

    // Validar tamanho (200MB)
    const maxSize = 200 * 1024 * 1024;
    if (data.file.bytesRead > maxSize) {
      return reply.code(400).send({ error: 'Arquivo muito grande. Máximo 200MB permitido.' });
    }

    // Salvar arquivo temporariamente
    const analysisId = uuidv4();
    const tempFilePath = `/tmp/adobe-${analysisId}-${data.filename}`;
    
    const fs = require('fs');
    const pipeline = require('util').promisify(require('stream').pipeline);
    
    await pipeline(data.file, fs.createWriteStream(tempFilePath));
    
    fastify.log.info(`Arquivo salvo: ${tempFilePath} (${data.filename})`);

    // Registrar validação
    activeAnalyses.set(analysisId, {
      id: analysisId,
      projectPath: tempFilePath,
      status: 'starting',
      logs: [],
      startTime: new Date()
    });

    // Executar validação em background
    runAdobeAemValidation(tempFilePath, analysisId)
      .then(() => {
        // Limpar arquivo temporário após validação
        setTimeout(() => {
          try {
            fs.unlinkSync(tempFilePath);
            fastify.log.info(`Arquivo temporário removido: ${tempFilePath}`);
          } catch (error) {
            fastify.log.warn(`Erro ao remover arquivo temporário: ${error.message}`);
          }
        }, 5000); // 5 segundos para garantir que a resposta foi enviada
      })
      .catch(error => {
        fastify.log.error('Erro na validação Adobe:', error);
        const analysis = activeAnalyses.get(analysisId);
        if (analysis) {
          analysis.status = 'error';
          analysis.logs.push(`Erro na validação: ${error.message}`);
        }
        // Limpar arquivo em caso de erro também
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          fastify.log.warn(`Erro ao limpar arquivo após falha: ${cleanupError.message}`);
        }
      });

    return { 
      success: true, 
      analysisId, 
      status: 'started',
      message: 'Upload realizado e validação Adobe AEM iniciada com sucesso',
      filename: data.filename
    };
  } catch (error) {
    fastify.log.error('Erro no upload/validação Adobe:', error);
    return reply.code(500).send({ error: 'Erro interno do servidor' });
  }
});

// Rota para análise Adobe Content Package (por path - mantida para compatibilidade)
fastify.post('/api/adobe/validate', async (request, reply) => {
  const { packagePath } = request.body;
  
  if (!packagePath) {
    return reply.code(400).send({ error: 'Caminho do pacote é obrigatório' });
  }

  try {
    const analysisId = uuidv4();
    
    // Registrar validação
    activeAnalyses.set(analysisId, {
      id: analysisId,
      projectPath: packagePath,
      status: 'starting',
      logs: [],
      startTime: new Date()
    });

    // Executar validação em background
    runAdobeAemValidation(packagePath, analysisId)
      .catch(error => {
        fastify.log.error('Erro na validação Adobe:', error);
        const analysis = activeAnalyses.get(analysisId);
        if (analysis) {
          analysis.status = 'error';
          analysis.logs.push(`Erro na validação: ${error.message}`);
        }
      });

    return { 
      success: true, 
      analysisId, 
      status: 'started',
      message: 'Validação Adobe AEM iniciada com sucesso'
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

// Rota para histórico de validações Adobe
fastify.get('/api/adobe/history', async (request, reply) => {
  try {
    const stmt = db.prepare(`
      SELECT id, package_path as packagePath, package_name as packageName, 
             status, errors_count as errors, warnings_count as warnings, 
             info_count as info, start_time as date, duration
      FROM adobe_validation_history 
      ORDER BY created_at DESC 
      LIMIT 50
    `);
    
    const validations = stmt.all().map(v => ({
      ...v,
      date: v.date || new Date().toISOString()
    }));

    return validations;
  } catch (error) {
    fastify.log.error('Erro ao obter histórico Adobe:', error);
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
