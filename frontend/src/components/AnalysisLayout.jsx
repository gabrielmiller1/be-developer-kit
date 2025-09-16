import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ArrowLeft, Play, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

const AnalysisLayout = ({
  title,
  description,
  onBack,
  systemHealth,
  inputSection,
  onStart,
  isRunning,
  log,
  resultSection,
  historySection,
  activeTab: controlledActiveTab,
  setActiveTab: controlledSetActiveTab
}) => {
  // Permite uso controlado ou não-controlado
  const [uncontrolledTab, setUncontrolledTab] = useState('execute');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : uncontrolledTab;
  const setActiveTab = controlledSetActiveTab !== undefined ? controlledSetActiveTab : setUncontrolledTab;

  // Debug logs para entender fluxo de tabs
  React.useEffect(() => {
    console.log('[AnalysisLayout] activeTab:', activeTab);
    if (controlledActiveTab !== undefined) {
      console.log('[AnalysisLayout] controlledActiveTab vindo do pai:', controlledActiveTab);
    }
  }, [activeTab, controlledActiveTab]);

  React.useEffect(() => {
    if (typeof setActiveTab === 'function') {
      console.log('[AnalysisLayout] setActiveTab está definido');
    } else {
      console.log('[AnalysisLayout] setActiveTab NÃO está definido');
    }
  }, [setActiveTab]);
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button variant="ghost" onClick={onBack} className="flex items-center">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              )}
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
                {description && <p className="text-gray-600">{description}</p>}
              </div>
            </div>
            {systemHealth && (
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${systemHealth === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium text-gray-600">
                  {systemHealth === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="execute" className="gap-2">
              <Play className="h-4 w-4" />
              Executar
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="execute" className="space-y-6">
            {/* Só mostra input, botão e console na tab de executar */}
            {inputSection && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Nova Análise</CardTitle>
                </CardHeader>
                <CardContent>
                  {inputSection}
                  <div className="flex justify-end mt-4">
                    <Button onClick={onStart} disabled={isRunning} size="lg" className="gap-2 bg-[#cc092f]">
                      {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      {isRunning ? 'Analisando...' : 'Iniciar Análise'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Console</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-black p-4 font-mono text-sm text-green-400 max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{log || 'Pronto para iniciar análise...'}</pre>
                </div>
                {resultSection}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {/* Só mostra histórico na tab de histórico */}
            {historySection}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AnalysisLayout;
