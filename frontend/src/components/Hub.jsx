import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Code2, 
  Shield, 
  FileSearch, 
  Zap, 
  Settings,
  Activity,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

const Hub = ({ onSelectTool, systemHealth }) => {
  const tools = [
    {
      id: 'sonarqube',
      title: 'SonarQube',
      description: 'Análise completa de qualidade de código',
      icon: Code2,
  color: 'bg-[#cc092f]',
      features: [
        'Detecção de bugs e vulnerabilidades',
        'Métricas de cobertura de testes', 
        'Code smells e duplicação',
        'Quality Gate Bradesco'
      ],
      status: systemHealth.sonarqube,
      category: 'Análise de Código'
    },
    {
      id: 'adobe-content',
      title: 'Adobe AEM',
      description: 'Validação de pacotes de conteúdo AEM',
      icon: Shield,
      color: 'bg-[#cc092f]',
      features: [
        'Validação de nomenclatura e versão',
        'Validação de estrutura de pacotes',
        'Conformidade com padrões Bradesco'
      ],
      status: 'coming-soon',
      category: 'Análise de Código'
    },
    {
      id: 'lighthouse',
      title: 'Lighthouse',
      description: 'Auditoria de performance e qualidade web',
      icon: Zap,
      color: 'bg-[#cc092f]',
      features: [
        'Performance',
        'SEO e acessibilidade',
        'Core Web Vitals',
      ],
      status: 'coming-soon',
      category: 'Análise de Código'
    }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'online':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Online
          </Badge>
        );
      case 'offline':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Offline
          </Badge>
        );
      case 'checking':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Verificando
          </Badge>
        );
      case 'coming-soon':
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            <Clock className="w-3 h-3 mr-1" />
            Em Breve
          </Badge>
        );
      default:
        return null;
    }
  };

  const groupedTools = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <img
              src="/brad-logo-bradesco-institucional-horizontal-default.svg"
              alt="Logo Bradesco"
              className="mx-auto mb-6 max-h-16"
              style={{ width: '220px', height: 'auto' }}
            />
          </div>
          
          {/* Health Status */}
          <div className="mt-8 flex justify-center">
            <div className="bg-gray-50 rounded-lg px-4 py-2 flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Status do Sistema:</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">API:</span>
                {getStatusBadge(systemHealth.api)}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">SonarQube:</span>
                {getStatusBadge(systemHealth.sonarqube)}
              </div>
              <span className="text-xs text-gray-500">
                v1.0.0
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {Object.entries(groupedTools).map(([category, categoryTools]) => (
          <div key={category} className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-1 h-8 bg-[#cc092f] rounded mr-4"></div>
              {category}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {categoryTools.map((tool) => {
                const IconComponent = tool.icon;
                const isAvailable = tool.status === 'online' || tool.status === 'offline' || tool.status === 'checking';
                
                return (
                  <Card 
                    key={tool.id} 
                    className={`group transition-all duration-200 border-2 ${
                      !isAvailable 
                        ? 'opacity-60 cursor-not-allowed' 
                        : 'hover:shadow-lg hover:border-[#cc092f]/30 hover:-translate-y-1 cursor-pointer'
                    }`}
                    onClick={() => isAvailable && onSelectTool(tool.id)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className={`p-3 rounded-lg ${tool.color} text-white`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        {getStatusBadge(tool.status)}
                      </div>
                      
                      <CardTitle className={`text-xl font-bold transition-colors ${
                        isAvailable ? 'group-hover:text-[#cc092f]' : ''
                      }`}>
                        {tool.title}
                      </CardTitle>
                      
                      <CardDescription className="text-gray-600">
                        {tool.description}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">
                          Funcionalidades:
                        </h4>
                        <ul className="space-y-1">
                          {tool.features.map((feature, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-center">
                              <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        
                        <div className="pt-4 border-t">
                          <Button 
                            className="w-full bg-[#cc092f] hover:bg-[#a30725] transition-colors text-white border-none"
                            disabled={!isAvailable}
                          >
                            {tool.status === 'coming-soon' ? (
                              'Em Breve'
                            ) : (
                              <>
                                Acessar Ferramenta
                                <ChevronRight className="w-4 h-4 ml-2" />
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <p className="text-sm text-gray-500 mt-2">
              BE Dev Kit - Bradesco
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hub;
