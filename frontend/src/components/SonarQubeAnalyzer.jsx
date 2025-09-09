import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { ArrowLeft, Code2 } from 'lucide-react';
import ProjectSelector from './ProjectSelector.jsx';
import AnalysisPanel from './AnalysisPanel.jsx';
import { mockAPI } from '../mockData.js';

const SonarQubeAnalyzer = ({ onBack, systemHealth }) => {
  const [projectPath, setProjectPath] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisLog, setAnalysisLog] = useState('');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalAnalyses: 0,
    passedQualityGate: 0,
    failedQualityGate: 0,
    averageScore: 0
  });

  const isDevelopment = false; // Força usar API real sempre

  // Carregar estatísticas do dashboard
  const loadDashboardStats = async () => {
    try {
      if (isDevelopment) {
        const response = await mockAPI.getDashboardStats();
        setDashboardStats(response.data);
      } else {
        const response = await axios.get('/api/analysis/stats');
        setDashboardStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  };

  // Carregar histórico de análises
  const loadAnalysisHistory = async () => {
    try {
      if (isDevelopment) {
        const response = await mockAPI.getAnalysisHistory();
        setAnalysisHistory(response.data);
      } else {
        const response = await axios.get('/api/analysis/history');
        setAnalysisHistory(response.data);
      }
    } catch (error) {
      console.error('Failed to load analysis history:', error);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    loadDashboardStats();
    loadAnalysisHistory();
  }, []);

  // Iniciar análise
  const startAnalysis = async () => {
    if (!projectPath.trim()) {
      alert('Por favor, informe o caminho do projeto');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisLog('🚀 Iniciando análise SonarQube...\n');
    setAnalysisResults(null);

    try {
      if (isDevelopment) {
        const response = await mockAPI.startAnalysis(projectPath.trim());
        if (response.data.success) {
          setAnalysisLog(prev => prev + '✅ Análise iniciada com sucesso!\n');
          monitorAnalysis(response.data.analysisId);
        }
      } else {
        const response = await axios.post('/api/analyze', {
          projectPath: projectPath.trim()
        });

        if (response.data.success) {
          setAnalysisLog(prev => prev + '✅ Análise iniciada com sucesso!\n');
          monitorAnalysis(response.data.analysisId);
        } else {
          throw new Error(response.data.error || 'Falha ao iniciar análise');
        }
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisLog(prev => prev + `❌ Erro: ${error.message}\n`);
      setIsAnalyzing(false);
    }
  };

  // Monitorar progresso da análise
  const monitorAnalysis = async (analysisId) => {
    try {
      const checkStatus = async () => {
        try {
          let response;
          if (isDevelopment) {
            response = await mockAPI.getAnalysisStatus(analysisId);
          } else {
            response = await axios.get(`/api/analysis/${analysisId}`);
          }
          
          const { status, log, results } = response.data;

          // Atualizar log
          if (log) {
            setAnalysisLog(prev => prev + log + '\n');
          }

          if (status === 'completed') {
            setAnalysisLog(prev => prev + '🎉 Análise concluída!\n');
            setAnalysisResults(results);
            setIsAnalyzing(false);
            
            // Recarregar estatísticas e histórico
            await loadDashboardStats();
            await loadAnalysisHistory();
            
          } else if (status === 'failed' || status === 'error') {
            setAnalysisLog(prev => prev + '❌ Análise falhou!\n');
            setIsAnalyzing(false);
          } else {
            // Continuar monitorando
            setTimeout(checkStatus, 2000);
          }
        } catch (error) {
          console.error('Error checking analysis status:', error);
          setAnalysisLog(prev => prev + `❌ Erro ao verificar status: ${error.message}\n`);
          setIsAnalyzing(false);
        }
      };

      checkStatus();
    } catch (error) {
      console.error('Error starting analysis monitoring:', error);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={onBack}
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Code2 className="w-8 h-8 text-[#cc092f] mr-3" />
                  BE Dev Kit
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="space-y-6">
        {/* Seletor de projeto */}
        <div className="container mx-auto px-6 pt-6">
          <ProjectSelector
            projectPath={projectPath}
            setProjectPath={setProjectPath}
            isAnalyzing={isAnalyzing}
          />
        </div>

        {/* Painel de análise */}
        <AnalysisPanel
          isAnalyzing={isAnalyzing}
          analysisLog={analysisLog}
          analysisResults={analysisResults}
          analysisHistory={analysisHistory}
          onStartAnalysis={startAnalysis}
          systemHealth={systemHealth}
          onRefreshHistory={loadAnalysisHistory}
        />
      </main>
    </div>
  );
};

export default SonarQubeAnalyzer;
