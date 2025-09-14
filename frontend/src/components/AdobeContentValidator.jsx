import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Loader2, Shield, FileCheck, Download } from 'lucide-react';
import AnalysisLayout from './AnalysisLayout.jsx';

const AdobeContentValidator = ({ onBack }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationLog, setValidationLog] = useState('');
  const [validationResults, setValidationResults] = useState(null);
  const [validationHistory, setValidationHistory] = useState([]);
  const [activeTab, setActiveTabState] = useState('execute');
  const setActiveTab = (tab) => {
    console.log('[AdobeContentValidator] Tab selecionada:', tab);
    setActiveTabState(tab);
  };

  // Carregar histórico de validações
  const loadValidationHistory = async () => {
    try {
      const response = await axios.get('/api/adobe/history');
      setValidationHistory(response.data);
    } catch (error) {
      console.error('Failed to load validation history:', error);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    loadValidationHistory();
  }, []);

  // Função para seleção de arquivo
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        alert('Por favor, selecione um arquivo .zip válido');
        return;
      }
      
      if (file.size > 200 * 1024 * 1024) { // 200MB
        alert('Arquivo muito grande. Máximo 200MB permitido.');
        return;
      }
      
      setSelectedFile(file);
      setValidationLog(`📁 Arquivo selecionado: ${file.name}\n📊 Tamanho: ${(file.size / 1024 / 1024).toFixed(2)}MB\n`);
      setValidationResults(null);
    }
  };

  // Iniciar validação via upload
  const startValidation = async () => {
    if (!selectedFile) {
      alert('Por favor, selecione um arquivo .zip');
      return;
    }

    setIsValidating(true);
    setValidationLog(prev => prev + '🚀 Iniciando upload e validação Adobe AEM...\n');
    setValidationResults(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post('/api/adobe/upload-validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setValidationLog(prev => {
            const lines = prev.split('\n');
            const lastLine = lines[lines.length - 1];
            if (lastLine.includes('📤 Upload:')) {
              lines[lines.length - 1] = `📤 Upload: ${percentCompleted}%`;
              return lines.join('\n');
            } else {
              return prev + `📤 Upload: ${percentCompleted}%\n`;
            }
          });
        }
      });

      if (response.data.success) {
        setValidationLog(prev => prev + '✅ Upload realizado e validação iniciada com sucesso!\n');
        monitorValidation(response.data.analysisId);
      } else {
        throw new Error(response.data.error || 'Falha ao iniciar validação');
      }
    } catch (error) {
      console.error('Validation failed:', error);
      setValidationLog(prev => prev + `❌ Erro: ${error.message}\n`);
      setIsValidating(false);
    }
  };

  // Monitorar progresso da validação
  const monitorValidation = async (analysisId) => {
    try {
      const checkStatus = async () => {
        try {
          const response = await axios.get(`/api/analysis/${analysisId}`);
          const { status, log, results } = response.data;
          if (log) {
            setValidationLog(prev => prev + log + '\n');
          }
          if (status === 'completed') {
            setValidationLog(prev => prev + '🎉 Validação concluída!\n');
            setValidationResults(results);
            setIsValidating(false);
            await loadValidationHistory();
            return;
          } else if (status === 'failed' || status === 'error') {
            setValidationLog(prev => prev + '❌ Validação falhou!\n');
            setIsValidating(false);
            return;
          } else {
            setTimeout(checkStatus, 2000);
          }
        } catch (error) {
          console.error('Error checking validation status:', error);
          setValidationLog(prev => prev + `❌ Erro ao verificar status: ${error.message}\n`);
          setIsValidating(false);
        }
      };
      checkStatus();
    } catch (error) {
      console.error('Error starting validation monitoring:', error);
      setIsValidating(false);
    }
  };

  const getIssueIcon = (type) => {
    switch (type) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <FileCheck className="w-4 h-4 text-blue-500" />;
      default:
        return <FileCheck className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    
    return (
      <Badge className={colors[severity] || colors.low}>
        {severity?.toUpperCase() || 'INFO'}
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'passed':
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">Aprovado</span>;
      case 'failed':
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">Reprovado</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800">Desconhecido</span>;
    }
  };

  // Input Section
  const inputSection = (
    <div>
      <input
        type="file"
        accept=".zip"
        onChange={handleFileSelect}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        disabled={isValidating}
      />
      {selectedFile && (
        <div className="text-sm text-green-600 bg-green-50 p-2 rounded mt-2">
          ✅ Arquivo selecionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
        </div>
      )}
    </div>
  );

  // Result Section (apenas se tab ativa for 'execute')
  const resultSection = (activeTab === 'execute' && validationResults) ? (
    <div className="mt-6">
      <div className="mb-4 flex items-center gap-4">
        <Shield className="w-6 h-6 text-red-500" />
        <span className="text-xl font-bold">Resultado da Validação</span>
        {getStatusBadge(validationResults.qualityGate?.status === 'PASSED' ? 'passed' : 'failed')}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{validationResults.metrics?.errors || 0}</div>
          <div className="text-sm text-gray-600">Erros</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{validationResults.metrics?.warnings || 0}</div>
          <div className="text-sm text-gray-600">Avisos</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{validationResults.metrics?.info || 0}</div>
          <div className="text-sm text-gray-600">Informações</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{validationResults.metrics?.totalIssues || 0}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
      </div>
      {validationResults.consoleReport && (
        <div className="mb-4">
          <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
            {validationResults.consoleReport}
          </pre>
        </div>
      )}
      <div className="flex gap-4 mt-4">
        <Button className="flex items-center">
          <Download className="w-4 h-4 mr-2" />
          Baixar Relatório
        </Button>
        <Button 
          variant="outline"
          onClick={() => {
            setValidationResults(null);
            setValidationLog('');
            setSelectedFile(null);
          }}
        >
          Validar Outro Pacote
        </Button>
      </div>
    </div>
  ) : null;

  // History Section (apenas se tab ativa for 'history')
  const historySection = (activeTab === 'history') ? (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Histórico de Validações</h3>
      </div>
      {validationHistory.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Nenhuma validação realizada ainda</div>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pacote</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duração</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Erros</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avisos</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {validationHistory.map((validation) => (
              <tr key={validation.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{validation.packageName}</div>
                  <div className="text-xs text-gray-500 font-mono">{validation.packagePath}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(validation.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{validation.date ? new Date(validation.date).toLocaleString('pt-BR') : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{validation.duration}</td>
                <td className="px-6 py-4 whitespace-nowrap">{validation.errors}</td>
                <td className="px-6 py-4 whitespace-nowrap">{validation.warnings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  ) : null;

  return (
    <AnalysisLayout
      title="Validador Adobe AEM"
      description="Valide pacotes de conteúdo Adobe Experience Manager de forma simples e profissional."
      onBack={onBack}
      systemHealth={null}
      inputSection={inputSection}
      onStart={startValidation}
      isRunning={isValidating}
      log={validationLog}
      resultSection={resultSection}
      historySection={historySection}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    />
  );
};

export default AdobeContentValidator;
