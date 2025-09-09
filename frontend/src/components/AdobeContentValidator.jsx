import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Upload, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Loader2,
  Download,
  ArrowLeft,
  Package,
  Shield,
  FileText,
  Settings
} from 'lucide-react';

const AdobeContentValidator = ({ onBack }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [validationLog, setValidationLog] = useState('');

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setValidationResults(null);
      setValidationLog('');
    }
  };

  const simulateValidation = async () => {
    setIsValidating(true);
    setValidationLog('🚀 Iniciando validação do pacote Adobe AEM...\n');
    
    // Simular processo de validação
    const steps = [
      '📦 Extraindo pacote de conteúdo...',
      '🔍 Analisando estrutura de diretórios...',
      '📋 Validando metadados do pacote...',
      '🔐 Verificando permissões e ACLs...',
      '📝 Analisando arquivos de configuração...',
      '🔗 Validando dependências...',
      '✅ Gerando relatório final...'
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setValidationLog(prev => prev + steps[i] + '\n');
    }

    // Simular resultados
    const hasIssues = Math.random() > 0.3; // 70% chance de ter problemas
    
    const results = {
      status: hasIssues ? 'warning' : 'success',
      packageName: selectedFile.name,
      version: '1.2.3',
      totalFiles: Math.floor(Math.random() * 500) + 100,
      issues: hasIssues ? [
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
      compliance: hasIssues ? 85 : 98
    };

    setValidationResults(results);
    setValidationLog(prev => prev + '\n🎉 Validação concluída!\n');
    setIsValidating(false);
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
        {severity.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-6">
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
                  <Shield className="w-8 h-8 text-red-500 mr-3" />
                  Validador Adobe AEM
                </h1>
                <p className="text-gray-600">
                  Validação completa de pacotes de conteúdo Adobe Experience Manager
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Upload do Pacote
                </CardTitle>
                <CardDescription>
                  Selecione um arquivo .zip de pacote de conteúdo AEM
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-400 transition-colors">
                    <input
                      type="file"
                      accept=".zip"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-600">
                        Clique para selecionar arquivo
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Formatos aceitos: .zip
                      </p>
                    </label>
                  </div>

                  {selectedFile && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {selectedFile.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={simulateValidation}
                    disabled={!selectedFile || isValidating}
                    className="w-full bg-red-500 hover:bg-red-600"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Iniciar Validação
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Validation Features */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  O que é Validado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Estrutura de diretórios
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Metadados e propriedades
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Permissões e ACLs
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Dependências de pacotes
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Filtros de conteúdo
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Conformidade Adobe
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2">
            {/* Validation Log */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Log de Validação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-48 overflow-y-auto font-mono text-sm">
                  {validationLog || 'Aguardando seleção de arquivo...'}
                </div>
              </CardContent>
            </Card>

            {/* Validation Results */}
            {validationResults && (
              <div className="space-y-6">
                {/* Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <FileCheck className="w-5 h-5 mr-2" />
                        Resultado da Validação
                      </span>
                      <Badge className={
                        validationResults.status === 'success' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }>
                        {validationResults.status === 'success' ? 'APROVADO' : 'COM AVISOS'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {validationResults.totalFiles}
                        </div>
                        <div className="text-sm text-gray-600">Arquivos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {validationResults.metrics.contentNodes}
                        </div>
                        <div className="text-sm text-gray-600">Nós de Conteúdo</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {validationResults.issues.length}
                        </div>
                        <div className="text-sm text-gray-600">Problemas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {validationResults.compliance}%
                        </div>
                        <div className="text-sm text-gray-600">Conformidade</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Issues */}
                {validationResults.issues.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        Problemas Encontrados ({validationResults.issues.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {validationResults.issues.map((issue, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                {getIssueIcon(issue.type)}
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {issue.message}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Arquivo: {issue.file}
                                  </p>
                                </div>
                              </div>
                              {getSeverityBadge(issue.severity)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Ações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex space-x-4">
                      <Button className="flex items-center">
                        <Download className="w-4 h-4 mr-2" />
                        Baixar Relatório
                      </Button>
                      <Button variant="outline">
                        Validar Outro Pacote
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdobeContentValidator;
