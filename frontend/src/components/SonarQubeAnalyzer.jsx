import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProjectSelector from './ProjectSelector.jsx';
import AnalysisLayout from './AnalysisLayout.jsx';
import { mockAPI } from '../mockData.js';

const SonarQubeAnalyzer = ({ onBack, systemHealth }) => {
  const [projectPath, setProjectPath] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisLog, setAnalysisLog] = useState('');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('execute');

  const isDevelopment = false; // Força usar API real sempre

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


  // Seção de input (ProjectSelector)
  const inputSection = (activeTab === 'execute') ? (
    <ProjectSelector
      projectPath={projectPath}
      setProjectPath={setProjectPath}
      isAnalyzing={isAnalyzing}
    />
  ) : null;

  // Seção de resultado (pode ser expandida para mostrar summary/resultados)
  const resultSection = null; // Adapte aqui se quiser mostrar resultado só na tab execute

  // Seção de histórico
  const historySection = (activeTab === 'history') ? (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Histórico de Análises</h3>
      </div>
      {analysisHistory && analysisHistory.length > 0 ? (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projeto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duração</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {analysisHistory.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{item.projectName}</div>
                  <div className="text-xs text-gray-500 font-mono">{item.project}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.status === 'passed' ? (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">Aprovado</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">Reprovado</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.duration}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <a href={item.sonarUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Ver Detalhes</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-center py-12">
          <span className="block text-gray-400 text-2xl mb-2">📊</span>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Nenhum histórico de análise</h3>
          <p className="mt-2 text-gray-600">Inicie sua primeira análise de código para ver resultados aqui</p>
        </div>
      )}
    </div>
  ) : null;

  return (
    <AnalysisLayout
      title="SonarQube - Análise de Código"
      description={"Analise a qualidade do código do seu projeto com o SonarQube."}
      onBack={onBack}
      systemHealth={systemHealth?.sonarqube}
      inputSection={inputSection}
      onStart={startAnalysis}
      isRunning={isAnalyzing}
      log={analysisLog}
      resultSection={resultSection}
      historySection={historySection}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    />
  );
};

export default SonarQubeAnalyzer;
