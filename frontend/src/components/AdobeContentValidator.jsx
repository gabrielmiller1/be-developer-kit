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
            setValidationResults({ ...results, analysisId });
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

  const handleDownloadReport = async (id) => {
    try {
      const response = await axios.get(`/api/adobe/report/${id}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-adobe-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar relatório:', error);
      alert('Erro ao baixar relatório. Verifique se a validação foi concluída.');
    }
  };

  // Render helpers
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

  // Mapeamento dos tipos de problema para explicação e âncora
  const problemExplanations = {
    'filtro-generico': {
      title: 'Filtro muito genérico',
      summary: 'Filtros muito genéricos no filter.xml podem incluir conteúdo indesejado ou fora do escopo do projeto.',
      solution: 'Use paths específicos como /content/nome-do-projeto, /apps/nome-do-projeto ou /conf/nome-do-projeto.',
      anchor: 'filtro-generico',
    },
    'path-proibido': {
      title: 'Path proibido no filtro',
      summary: 'Paths como /libs e /etc não devem ser incluídos em pacotes de conteúdo, pois são áreas do sistema.',
      solution: 'Remova filtros que apontem para /libs ou /etc. Use apenas paths específicos do seu projeto.',
      anchor: 'path-proibido',
    },
    'filtro-fora-escopo': {
      title: 'Filtro fora do escopo do projeto',
      summary: 'O filtro aponta para um path que não pertence ao projeto atual.',
      solution: 'Verifique se o path do filtro corresponde ao nome do projeto extraído do nome do pacote.',
      anchor: 'filtro-fora-escopo',
    },
    'filtro-duplicado': {
      title: 'Filtro duplicado',
      summary: 'O mesmo path está sendo filtrado múltiplas vezes no filter.xml.',
      solution: 'Remova filtros duplicados, mantendo apenas uma entrada por path.',
      anchor: 'filtro-duplicado',
    },
    'propriedade-obrigatoria-ausente': {
      title: 'Propriedade obrigatória ausente',
      summary: 'Propriedades essenciais estão faltando no arquivo properties.xml.',
      solution: 'Adicione as propriedades obrigatórias (name, group, version) no properties.xml.',
      anchor: 'propriedade-obrigatoria-ausente',
    },
    'versao-invalida': {
      title: 'Versão inválida',
      summary: 'A versão do pacote não segue o padrão Semantic Versioning (semver).',
      solution: 'Use o formato MAJOR.MINOR.PATCH (ex: 1.0.0) para a versão.',
      anchor: 'versao-invalida',
    },
    'configuracao-osgi': {
      title: 'Configuração OSGi encontrada',
      summary: 'Configurações OSGi não devem ser incluídas em pacotes de conteúdo.',
      solution: 'Remova arquivos de configuração OSGi dos pacotes de conteúdo.',
      anchor: 'configuracao-osgi',
    },
    'propriedade-perigosa-admin': {
      title: 'Propriedade perigosa (admin)',
      summary: 'O conteúdo foi modificado pelo usuário admin, o que pode causar problemas de segurança.',
      solution: 'Remova ou altere a propriedade cq:lastModifiedBy="admin".',
      anchor: 'propriedade-perigosa-admin',
    },
    'template-fora-projeto': {
      title: 'Template fora do projeto',
      summary: 'O template referenciado não pertence ao projeto atual.',
      solution: 'Use apenas templates do projeto atual ou garanta que o template referenciado existe.',
      anchor: 'template-fora-projeto',
    },
    'design-path-fora-projeto': {
      title: 'Design path fora do projeto',
      summary: 'O caminho de design não pertence ao projeto atual.',
      solution: 'Use apenas caminhos de design do projeto atual.',
      anchor: 'design-path-fora-projeto',
    },
    'mixin-nao-permitido': {
      title: 'Mixin não permitido',
      summary: 'Mixins JCR além de mix:versionable não são permitidos.',
      solution: 'Remova mixins não permitidos, mantendo apenas mix:versionable se necessário.',
      anchor: 'mixin-nao-permitido',
    },
    'nome-query-graphql-invalido': {
      title: 'Nome da query GraphQL inválido',
      summary: 'O nome da query GraphQL deve seguir o padrão do projeto.',
      solution: 'Renomeie o arquivo para começar com o nome do projeto seguido de underscore.',
      anchor: 'nome-query-graphql-invalido',
    },
    'graphql-wildcard': {
      title: 'Query GraphQL com wildcard',
      summary: 'Queries GraphQL não podem conter wildcards (*).',
      solution: 'Remova wildcards e seja específico nos campos da query.',
      anchor: 'graphql-wildcard',
    },
    'graphql-referencia-outro-projeto': {
      title: 'Query GraphQL referencia outro projeto',
      summary: 'Queries GraphQL devem referenciar apenas conteúdo do projeto atual.',
      solution: 'Ajuste os paths para referenciar apenas conteúdo do projeto atual.',
      anchor: 'graphql-referencia-outro-projeto',
    },
    'graphql-multiplas-queries': {
      title: 'Múltiplas queries no arquivo',
      summary: 'Arquivos GraphQL devem conter apenas uma query.',
      solution: 'Separe cada query em um arquivo diferente.',
      anchor: 'graphql-multiplas-queries',
    },
    'arquivo-indesejado': {
      title: 'Arquivo indesejado',
      summary: 'Arquivos temporários ou de sistema foram incluídos no pacote.',
      solution: 'Remova arquivos como .DS_Store, Thumbs.db, .gitkeep, etc.',
      anchor: 'arquivo-indesejado',
    },
    'estrutura-obrigatoria-ausente': {
      title: 'Estrutura obrigatória ausente',
      summary: 'Estruturas essenciais do pacote Adobe estão faltando.',
      solution: 'Garanta que META-INF/vault/ e jcr_root/ estejam presentes.',
      anchor: 'estrutura-obrigatoria-ausente',
    },
    'arquivo-nao-encontrado': {
      title: 'Arquivo não encontrado',
      summary: 'O arquivo especificado não foi encontrado no sistema.',
      solution: 'Verifique se o caminho do arquivo está correto.',
      anchor: 'arquivo-nao-encontrado',
    },
    'arquivo-muito-grande': {
      title: 'Arquivo muito grande',
      summary: 'O tamanho do pacote excede o limite permitido.',
      solution: 'Reduza o tamanho do pacote para no máximo 200MB.',
      anchor: 'arquivo-muito-grande',
    },
    'nome-pacote-invalido': {
      title: 'Nome do pacote inválido',
      summary: 'O nome do pacote não segue o padrão Adobe AEM.',
      solution: 'Use o formato: [a-z0-9-]+(content|apps|conf)-YYYYMMDD-*.zip',
      anchor: 'nome-pacote-invalido',
    },
    'muitos-arquivos': {
      title: 'Muitos arquivos no pacote',
      summary: 'O pacote contém um número excessivo de arquivos.',
      solution: 'Reduza o número de arquivos ou divida em pacotes menores.',
      anchor: 'muitos-arquivos',
    },
    'filter-xml-ausente': {
      title: 'Filter.xml ausente',
      summary: 'O arquivo filter.xml é obrigatório em pacotes Adobe.',
      solution: 'Crie o arquivo META-INF/vault/filter.xml com os filtros apropriados.',
      anchor: 'filter-xml-ausente',
    },
    'properties-xml-ausente': {
      title: 'Properties.xml ausente',
      summary: 'O arquivo properties.xml é obrigatório em pacotes Adobe.',
      solution: 'Crie o arquivo META-INF/vault/properties.xml com as propriedades do pacote.',
      anchor: 'properties-xml-ausente',
    },
    'conteudo-jcr-ausente': {
      title: 'Conteúdo JCR ausente',
      summary: 'Não foi encontrado conteúdo na pasta jcr_root.',
      solution: 'Adicione conteúdo válido na pasta jcr_root do pacote.',
      anchor: 'conteudo-jcr-ausente',
    },
    'configuracao-osgi-total': {
      title: 'Configurações OSGi encontradas',
      summary: 'Pacotes de conteúdo não devem incluir configurações OSGi.',
      solution: 'Remova todas as configurações OSGi do pacote.',
      anchor: 'configuracao-osgi-total',
    },
    'imagem-sem-alt': {
      title: 'Imagem sem atributo alt',
      summary: 'O atributo alt em imagens é essencial para acessibilidade, pois descreve o conteúdo da imagem para pessoas que utilizam leitores de tela.',
      solution: 'Adicione sempre o atributo alt em todas as imagens. Se a imagem for decorativa, use alt="".',
      anchor: 'imagem-sem-alt',
    },
    'link-sem-descricao': {
      title: 'Link sem descrição',
      summary: 'Links devem ter descrições claras para que todos os usuários entendam seu propósito, especialmente quem utiliza leitores de tela.',
      solution: 'Evite textos genéricos como "clique aqui". Descreva o destino ou ação do link.',
      anchor: 'link-sem-descricao',
    },
    'contraste-insuficiente': {
      title: 'Contraste insuficiente',
      summary: 'O contraste entre texto e fundo deve ser suficiente para garantir a leitura por todos os usuários, inclusive pessoas com baixa visão.',
      solution: 'Utilize ferramentas para checar o contraste. Garanta contraste mínimo de 4.5:1 para textos normais.',
      anchor: 'contraste-insuficiente',
    },
    // Adicione outros tipos conforme necessário
  };

  // Função para agrupar problemas por tipo
  function groupProblemsByType(issues) {
    const grouped = {};
    if (!Array.isArray(issues)) return grouped;
    for (const issue of issues) {
      const type = issue.code || issue.type || 'outro';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(issue);
    }
    return grouped;
  }

  // Renderização dos problemas agrupados com explicação
  function renderGroupedProblems(issues) {
    const grouped = {};
    const infos = [];
    const errors = [];
    const warnings = [];

    // Separar por tipo
    issues.forEach(issue => {
      const type = issue.code || issue.type || 'outro';
      if (issue.type === 'info') {
        infos.push(issue);
      } else if (issue.type === 'error') {
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(issue);
        errors.push(issue);
      } else if (issue.type === 'warning') {
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(issue);
        warnings.push(issue);
      }
    });

    return { grouped, infos, errors, warnings };
  }

  // Renderizar informações positivas do pacote
  function renderPackageInfo(infos) {
    if (infos.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="ml-2 text-sm font-medium text-green-800">Informações do Pacote</h3>
          </div>
          <div className="space-y-1">
            {infos.map((info, idx) => (
              <div key={idx} className="text-sm text-green-700 flex items-start">
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                {info.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Result Section (apenas se tab ativa for 'execute')
  const resultSection = (activeTab === 'execute' && validationResults) ? (
    <div className="mt-6 space-y-6">
      {/* Header com status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${validationResults.qualityGate?.status === 'PASSED' ? 'bg-green-100' : 'bg-red-100'}`}>
              <Shield className={`w-6 h-6 ${validationResults.qualityGate?.status === 'PASSED' ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Resultado da Validação</h2>
              <p className="text-sm text-gray-600">Análise completa do pacote Adobe AEM</p>
            </div>
          </div>
          {getStatusBadge(validationResults.qualityGate?.status === 'PASSED' ? 'passed' : 'failed')}
        </div>

  {/* Métricas principais em cards modernos */}
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">Erros</p>
                <p className="text-2xl font-bold text-red-900">{validationResults.metrics?.errors || 0}</p>
              </div>
              <div className="p-2 bg-red-200 rounded-full">
                <svg className="w-5 h-5 text-red-700" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800">Avisos</p>
                <p className="text-2xl font-bold text-yellow-900">{validationResults.metrics?.warnings || 0}</p>
              </div>
              <div className="p-2 bg-yellow-200 rounded-full">
                <svg className="w-5 h-5 text-yellow-700" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Total</p>
                <p className="text-2xl font-bold text-gray-900">{((validationResults.metrics?.errors || 0) + (validationResults.metrics?.warnings || 0))}</p>
              </div>
              <div className="p-2 bg-gray-200 rounded-full">
                <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="flex items-center justify-center bg-blue-600 hover:bg-blue-700" onClick={() => handleDownloadReport(validationResults.analysisId)}>
            <Download className="w-4 h-4 mr-2" />
            Baixar Relatório PDF
          </Button>
          <Button
            variant="outline"
            className="flex items-center justify-center"
            onClick={() => {
              setValidationResults(null);
              setValidationLog('');
              setSelectedFile(null);
            }}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Validar Outro Pacote
          </Button>
        </div>
      </div>

      {/* Informações positivas do pacote */}
      {validationResults.issues && renderPackageInfo(renderGroupedProblems(validationResults.issues).infos)}

      {/* Problemas encontrados (apenas se houver erros ou avisos) */}
      {validationResults.issues && (renderGroupedProblems(validationResults.issues).errors.length > 0 || renderGroupedProblems(validationResults.issues).warnings.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-full">
              <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Problemas Encontrados</h3>
          </div>

          <div className="space-y-6">
            {Object.entries(renderGroupedProblems(validationResults.issues).grouped).map(([type, problems]) => {
              const info = problemExplanations[type] || {
                title: type,
                summary: 'Problema detectado.',
                solution: 'Consulte a documentação para mais detalhes.',
                anchor: type,
              };
              return (
                <div key={type} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-3 h-3 rounded-full ${problems[0]?.type === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{info.title}</h4>
                        <a
                          href={`/problemas/adobe.html#${info.anchor}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Ver solução completa
                        </a>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{info.summary}</p>
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-3">
                        <p className="text-sm font-medium text-blue-900">Como corrigir:</p>
                        <p className="text-sm text-blue-800">{info.solution}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">Ocorrências:</p>
                        {problems.map((p, idx) => (
                          <div key={idx} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {p.message || p.description || JSON.stringify(p)}
                            {p.file && <span className="text-xs text-gray-500 block mt-1">Arquivo: {p.file}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relatório</th>
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
                <td className="px-6 py-4 whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => handleDownloadReport(validation.id)}>
                    <Download className="w-4 h-4 mr-1" /> PDF
                  </Button>
                </td>
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
