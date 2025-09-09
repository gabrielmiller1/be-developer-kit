// Mock data para desenvolvimento rápido
export const mockSystemHealth = {
  sonarqube: 'online',
  api: 'online',
  lastUpdate: new Date().toLocaleTimeString('pt-BR')
};

export const mockDashboardStats = {
  totalAnalyses: 42,
  passedQualityGate: 38,
  failedQualityGate: 4,
  averageScore: 87
};

export const mockAnalysisHistory = [
  {
    id: 'analysis-001',
    project: '/Users/dev/projects/e-commerce-api',
    projectName: 'E-commerce API',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'passed',
    qualityGate: 'PASSED',
    coverage: 85.2,
    maintainabilityRating: 'A',
    reliabilityRating: 'A',
    securityRating: 'A',
    sonarUrl: 'http://localhost:9000/dashboard?id=e-commerce-api',
    duration: '2m 34s'
  },
  {
    id: 'analysis-002',
    project: '/Users/dev/projects/user-management',
    projectName: 'User Management Service',
    date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    status: 'failed',
    qualityGate: 'FAILED',
    coverage: 42.1,
    maintainabilityRating: 'C',
    reliabilityRating: 'B',
    securityRating: 'A',
    sonarUrl: 'http://localhost:9000/dashboard?id=user-management',
    duration: '1m 18s'
  },
  {
    id: 'analysis-003',
    project: '/Users/dev/projects/payment-gateway',
    projectName: 'Payment Gateway',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: 'passed',
    qualityGate: 'PASSED',
    coverage: 92.7,
    maintainabilityRating: 'A',
    reliabilityRating: 'A',
    securityRating: 'A',
    sonarUrl: 'http://localhost:9000/dashboard?id=payment-gateway',
    duration: '3m 12s'
  },
  {
    id: 'analysis-004',
    project: '/Users/dev/projects/notification-service',
    projectName: 'Notification Service',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'passed',
    qualityGate: 'PASSED',
    coverage: 78.4,
    maintainabilityRating: 'B',
    reliabilityRating: 'A',
    securityRating: 'A',
    sonarUrl: 'http://localhost:9000/dashboard?id=notification-service',
    duration: '1m 45s'
  },
  {
    id: 'analysis-005',
    project: '/Users/dev/projects/content-management',
    projectName: 'AEM Content Management',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'failed',
    qualityGate: 'FAILED',
    coverage: 31.8,
    maintainabilityRating: 'D',
    reliabilityRating: 'C',
    securityRating: 'B',
    sonarUrl: 'http://localhost:9000/dashboard?id=content-management',
    duration: '4m 22s'
  }
];

export const mockAnalysisResults = {
  qualityGate: {
    status: 'PASSED',
    conditions: [
      { metric: 'new_coverage', status: 'OK', actualValue: '92.5%', threshold: '90%' },
      { metric: 'new_duplicated_lines_density', status: 'OK', actualValue: '1.2%', threshold: '3%' },
      { metric: 'new_maintainability_rating', status: 'OK', actualValue: 'A', threshold: 'A' },
      { metric: 'new_reliability_rating', status: 'OK', actualValue: 'A', threshold: 'A' },
      { metric: 'new_security_rating', status: 'OK', actualValue: 'A', threshold: 'A' },
      { metric: 'coverage', status: 'OK', actualValue: '92.5%', threshold: '90%' }
    ]
  },
  metrics: {
    coverage: '92.5%',
    duplications: '1.2%',
    maintainabilityRating: 'A',
    reliabilityRating: 'A',
    securityRating: 'A',
    codeSmells: 5,
    bugs: 0,
    vulnerabilities: 0,
    linesOfCode: 2847
  }
};

// Simular API calls
export const mockAPI = {
  async checkHealth() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { status: 200, data: { status: 'UP' } };
  },

  async getSonarStatus() {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { data: { status: 'UP' } };
  },

  async getDashboardStats() {
    await new Promise(resolve => setTimeout(resolve, 150));
    return { data: mockDashboardStats };
  },

  async getAnalysisHistory() {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { data: mockAnalysisHistory };
  },

  async startAnalysis(projectPath) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { 
      data: { 
        success: true, 
        analysisId: 'mock-' + Date.now() 
      } 
    };
  },

  async getAnalysisStatus(analysisId) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simular progresso
    const progress = Math.random();
    if (progress < 0.3) {
      return {
        data: {
          status: 'running',
          log: '📊 Analisando arquivos JavaScript...'
        }
      };
    } else if (progress < 0.6) {
      return {
        data: {
          status: 'running',
          log: '🔍 Verificando Quality Gate...'
        }
      };
    } else {
      return {
        data: {
          status: 'completed',
          log: '✅ Análise concluída com sucesso!',
          results: mockAnalysisResults
        }
      };
    }
  }
};
