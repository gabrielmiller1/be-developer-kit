import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  ArrowLeft, 
  Shield, 
  Play, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  Info,
  FileText,
  Upload
} from 'lucide-react';

const AdobeContentValidator = ({ onBack, systemHealth }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationLog, setValidationLog] = useState('');
  const [validationResults, setValidationResults] = useState(null);
  const [validationHistory, setValidationHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('execute');

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
          const response = await axios.get(`/api/adobe/results/${analysisId}`);
          const data = response.data;

          if (data.status === 'completed') {
            setIsValidating(false);
            setValidationResults(data.results);
            setValidationLog(prev => prev + '🎉 Validação concluída!\n');
            loadValidationHistory(); // Recarregar histórico
          } else if (data.status === 'error') {
            setIsValidating(false);
            setValidationLog(prev => prev + `❌ Erro na validação: ${data.error}\n`);
          } else {
            // Status 'running' - continuar monitorando
            if (data.log) {
              setValidationLog(prev => prev + data.log);
            }
            setTimeout(checkStatus, 2000);
          }
        } catch (error) {
          console.error('Error checking status:', error);
          setIsValidating(false);
          setValidationLog(prev => prev + `❌ Erro ao verificar status: ${error.message}\n`);
        }
      };

      setTimeout(checkStatus, 1000);
    } catch (error) {
      console.error('Monitor error:', error);
      setIsValidating(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (errors, warnings) => {
    if (errors > 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          REPROVADO
        </Badge>
      );
    }
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        APROVADO
      </Badge>
    );
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'low':
  return <Info className="h-4 w-4 text-[#cc092f]" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('Tem certeza que deseja limpar todo o histórico de validações? Esta ação não pode ser desfeita.')) {
      try {
        const response = await fetch('/api/adobe/history', {
          method: 'DELETE',
        });
        
        if (response.ok) {
          const result = await response.json();
          alert(`Histórico limpo com sucesso! ${result.deletedCount} registros removidos.`);
          loadValidationHistory();
        } else {
          throw new Error('Erro ao limpar histórico');
        }
      } catch (error) {
        console.error('Erro ao limpar histórico:', error);
        alert('Erro ao limpar histórico. Tente novamente.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
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
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center">
                  <Shield className="w-8 h-8 text-red-500 mr-3" />
                  Adobe AEM - Validação de Pacotes
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${
                  systemHealth?.backend === 'online' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-sm font-medium text-gray-600">
                  Validador {systemHealth?.backend === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger 
              value="execute" 
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Executar Validação
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="gap-2"
            >
              <Clock className="h-4 w-4" />
              Histórico de Validações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="execute" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Nova Validação de Pacote</CardTitle>
                    <CardDescription>
                      Selecione um arquivo .zip de pacote de conteúdo AEM para validação
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={startValidation}
                    disabled={!selectedFile || isValidating}
                    size="lg"
                    className="gap-2 bg-red-500 hover:bg-red-600"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Iniciar Validação
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload de arquivo */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Upload do Pacote Adobe AEM (.zip)
                  </label>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                    disabled={isValidating}
                  />
                  {selectedFile && (
                    <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Arquivo selecionado:</span>
                      </div>
                      <div className="mt-1 text-green-700">
                        📁 {selectedFile.name} • {(selectedFile.size / 1024 / 1024).toFixed(2)}MB
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Log de Validação */}
            {(isValidating || validationLog) && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Saída da Validação</CardTitle>
                    <Badge variant={isValidating ? "default" : "success"} className="gap-1">
                      {isValidating ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Executando
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          Concluído
                        </>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg bg-black p-4 font-mono text-sm text-green-400 max-h-64 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">
                      {validationLog || 'Pronto para iniciar validação...'}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resultados da Validação */}
            {validationResults && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Resultados da Validação
                    {getStatusBadge(
                      validationResults.metrics?.errors || 0,
                      validationResults.metrics?.warnings || 0
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Métricas */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="text-2xl font-bold text-red-600">
                        {validationResults.metrics?.errors || 0}
                      </div>
                      <div className="text-sm text-red-700 font-medium">Erros</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="text-2xl font-bold text-yellow-600">
                        {validationResults.metrics?.warnings || 0}
                      </div>
                      <div className="text-sm text-yellow-700 font-medium">Avisos</div>
                    </div>
                    <div className="text-center p-4 bg-[#fdecea] rounded-lg border border-[#f5b3b0]">
                      <div className="text-2xl font-bold text-[#cc092f]">
                        {validationResults.metrics?.info || 0}
                      </div>
                      <div className="text-sm text-[#a00726] font-medium">Informações</div>
                    </div>
                  </div>

                  {/* Problemas Encontrados */}
                  {validationResults.validationResults && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Problemas Encontrados</h3>
                      
                      {/* Erros */}
                      {validationResults.validationResults.errors?.length > 0 && (
                        <div>
                          <h4 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            Erros ({validationResults.validationResults.errors.length})
                          </h4>
                          <div className="space-y-2">
                            {validationResults.validationResults.errors.map((error, index) => (
                              <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-md">
                                <div className="flex items-start gap-2">
                                  {getSeverityIcon(error.severity)}
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-red-800">{error.message}</p>
                                    {error.file && (
                                      <p className="text-xs text-red-600 mt-1">📁 {error.file}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Avisos */}
                      {validationResults.validationResults.warnings?.length > 0 && (
                        <div>
                          <h4 className="font-medium text-yellow-600 mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Avisos ({validationResults.validationResults.warnings.length})
                          </h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {validationResults.validationResults.warnings.slice(0, 20).map((warning, index) => (
                              <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                <div className="flex items-start gap-2">
                                  {getSeverityIcon(warning.severity)}
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-yellow-800">{warning.message}</p>
                                    {warning.file && (
                                      <p className="text-xs text-yellow-600 mt-1">📁 {warning.file}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {validationResults.validationResults.warnings.length > 20 && (
                              <p className="text-sm text-gray-600 text-center py-2">
                                ... e mais {validationResults.validationResults.warnings.length - 20} avisos
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Informações */}
                      {validationResults.validationResults.info?.length > 0 && (
                        <div>
                          <h4 className="font-medium text-[#cc092f] mb-2 flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            Informações ({validationResults.validationResults.info.length})
                          </h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {validationResults.validationResults.info.slice(0, 10).map((info, index) => (
                              <div key={index} className="p-3 bg-[#fdecea] border border-[#f5b3b0] rounded-md">
                                <div className="flex items-start gap-2">
                                  {getSeverityIcon(info.severity)}
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-[#a00726]">{info.message}</p>
                                    {info.file && (
                                      <p className="text-xs text-[#cc092f] mt-1">📁 {info.file}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {validationResults.validationResults.info.length > 10 && (
                              <p className="text-sm text-gray-600 text-center py-2">
                                ... e mais {validationResults.validationResults.info.length - 10} informações
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Histórico de Validações</CardTitle>
                    <CardDescription>
                      Revise resultados de validações passadas de pacotes Adobe AEM
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {validationHistory?.length || 0} validações
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Histórico de Validações</h3>
                  {validationHistory && validationHistory.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleClearHistory}
                      className="gap-2 text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Limpar Histórico
                    </Button>
                  )}
                </div>
                
                {validationHistory && validationHistory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pacote</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Erros</TableHead>
                        <TableHead>Avisos</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationHistory.map((validation, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="font-medium">{validation.packageName || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{validation.packagePath || 'Upload'}</div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(validation.errors || 0, validation.warnings || 0)}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-red-600">{validation.errors || 0}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-yellow-600">{validation.warnings || 0}</span>
                          </TableCell>
                          <TableCell className="text-gray-500">
                            {formatTime(validation.timestamp)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhuma validação realizada ainda</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdobeContentValidator;
