import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Folder, FolderOpen, Info } from 'lucide-react';

const ProjectSelector = ({ projectPath, setProjectPath, isAnalyzing }) => {
  // Detectar sistema operacional
  const getOperatingSystem = () => {
    const userAgent = window.navigator.userAgent;
    if (userAgent.indexOf('Windows') !== -1) return 'windows';
    if (userAgent.indexOf('Mac') !== -1) return 'mac';
    return 'linux';
  };

  const operatingSystem = getOperatingSystem();

  // Exemplos de caminhos por sistema operacional (apenas 1 exemplo)
  const pathExamples = {
    windows: [
      { path: 'C:\\workspace\\meu-projeto'}
    ],
    mac: [
      { path: '/Users/dev/workspace/meu-projeto'}
    ],
    linux: [
      { path: '/home/dev/workspace/meu-projeto'}
    ]
  };

  const handleExampleClick = (examplePath) => {
    setProjectPath(examplePath);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Configuração do Projeto
            </CardTitle>
            <CardDescription>
              Selecione o caminho do projeto para análise.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="project-path" className="text-sm font-medium text-gray-700">
            Caminho do Projeto
          </label>
          <div className="relative">
            <FolderOpen className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="project-path"
              type="text"
              placeholder={`Digite o caminho do projeto, ex: ${pathExamples[operatingSystem][0].path}`}
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              disabled={isAnalyzing}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Exemplo Rápido:</label>
          <div className="grid gap-2">
            {pathExamples[operatingSystem].map((example, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={() => handleExampleClick(example.path)}
                disabled={isAnalyzing}
                className="justify-start h-auto p-3 text-left"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 font-mono truncate">
                      {example.path}
                    </p>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-[#fdecea] border border-[#f5b3b0] p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-[#cc092f] mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-[#cc092f]">Requisitos</h4>
              <p className="text-sm text-[#a00726]">
                • O caminho deve ser absoluto para o diretório raiz do projeto
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectSelector;
