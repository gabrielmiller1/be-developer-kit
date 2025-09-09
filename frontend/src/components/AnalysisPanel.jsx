import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ExternalLink, Play, Loader2, Activity, CheckCircle, XCircle, Clock } from 'lucide-react';

const AnalysisPanel = ({ 
  isAnalyzing,
  analysisLog,
  analysisResults,
  analysisHistory,
  onStartAnalysis,
  systemHealth,
  onRefreshHistory
}) => {
  const [activeTab, setActiveTab] = useState('execute');
  const [analysisType, setAnalysisType] = useState('sonarqube');

  const handleClearHistory = async () => {
    if (window.confirm('Tem certeza que deseja limpar todo o histórico de análises? Esta ação não pode ser desfeita.')) {
      try {
        const response = await fetch('/api/analysis/history', {
          method: 'DELETE',
        });
        
        if (response.ok) {
          const result = await response.json();
          alert(`Histórico limpo com sucesso! ${result.deletedCount} registros removidos.`);
          // Atualizar a lista de histórico
          if (onRefreshHistory) {
            onRefreshHistory();
          }
        } else {
          throw new Error('Erro ao limpar histórico');
        }
      } catch (error) {
        console.error('Erro ao limpar histórico:', error);
        alert('Erro ao limpar histórico. Tente novamente.');
      }
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

  const getStatusBadge = (status) => {
    if (status === 'passed') {
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          APROVADO
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        REPROVADO
      </Badge>
    );
  };

  const getRatingBadge = (rating, type) => {
    const colors = {
      'A': 'bg-green-500 hover:bg-green-600',
      'B': 'bg-blue-500 hover:bg-blue-600', 
      'C': 'bg-yellow-500 hover:bg-yellow-600',
      'D': 'bg-orange-500 hover:bg-orange-600',
      'E': 'bg-red-500 hover:bg-red-600'
    };
    
    return (
      <Badge className={`text-white text-xs ${colors[rating] || 'bg-gray-500'}`}>
        {type}:{rating}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                SonarQube - Análise de Código
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${
                  systemHealth?.sonarqube === 'online' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-sm font-medium text-gray-600">
                  SonarQube {systemHealth?.sonarqube === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger 
              value="execute" 
              isActive={activeTab === 'execute'}
              onClick={() => setActiveTab('execute')}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Executar Análise
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              isActive={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              className="gap-2"
            >
              <Clock className="h-4 w-4" />
              Histórico de Execuções
            </TabsTrigger>
          </TabsList>

          <TabsContent value="execute" className="space-y-6">
            {activeTab === 'execute' && (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">Iniciar Nova Análise</CardTitle>
                      </div>
                      <Button 
                        onClick={() => onStartAnalysis()}
                        disabled={isAnalyzing}
                        size="lg"
                        variant="sonar"
                        className="gap-2"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Analisando...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            Iniciar Análise
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  
                  {(isAnalyzing || analysisLog) && (
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">Saída da Análise</h3>
                          <Badge variant={isAnalyzing ? "default" : "success"} className="gap-1">
                            {isAnalyzing ? (
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
                        <div className="rounded-lg bg-black p-4 font-mono text-sm text-green-400 max-h-64 overflow-y-auto">
                          <pre className="whitespace-pre-wrap">
                            {analysisLog || 'Pronto para iniciar análise...'}
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {activeTab === 'history' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Histórico de Execuções</CardTitle>
                      <CardDescription>
                        Revise resultados de análises passadas e acesse dashboards do SonarQube
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {analysisHistory?.length || 0} análises
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Histórico de Análises</h3>
                    {analysisHistory && analysisHistory.length > 0 && (
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
                  {analysisHistory && analysisHistory.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Projeto</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysisHistory.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-gray-900">{item.projectName}</p>
                                <p className="text-sm text-gray-500 font-mono">{item.project}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(item.status)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="gap-1">
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M15.685.386l-.465.766c3.477 2.112 6.305 5.27 7.966 8.89L24 9.67C22.266 5.887 19.313 2.59 15.685.386zM8.315.386C4.687 2.59 1.734 5.887 0 9.67l.814.372c1.661-3.62 4.489-6.778 7.966-8.89L8.315.386zM12 3.566L4.542 18.286h14.916L12 3.566z"/>
                                </svg>
                                SonarQube
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="text-sm text-gray-900">{formatTime(item.date)}</p>
                                <p className="text-xs text-gray-500">{item.duration}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm"
                                asChild
                                className="gap-2"
                              >
                                <a 
                                  href={item.sonarUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className='flex items-center gap-1'
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Ver Detalhes
                                </a>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12">
                      <Activity className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-semibold text-gray-900">Nenhum histórico de análise</h3>
                      <p className="mt-2 text-gray-600">
                        Inicie sua primeira análise de código para ver resultados aqui
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AnalysisPanel;
