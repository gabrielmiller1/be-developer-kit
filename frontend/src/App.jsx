import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Hub from './components/Hub.jsx';
import SonarQubeAnalyzer from './components/SonarQubeAnalyzer.jsx';
import AdobeContentValidator from './components/AdobeContentValidator.jsx';
import { mockAPI } from './mockData.js';

// Detectar se estamos em modo desenvolvimento (usar mocks apenas se não estiver rodando em localhost)
const isDevelopment = false; // Força usar API real sempre

function App() {
  // Estados principais
  const [currentView, setCurrentView] = useState('hub'); // 'hub', 'sonarqube', 'adobe-content'
  const [systemHealth, setSystemHealth] = useState({
    sonarqube: 'checking',
    api: 'checking',
    lastUpdate: new Date().toLocaleTimeString('pt-BR')
  });

  // Verificação de saúde do sistema
  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        if (isDevelopment) {
          // Usar dados mock em desenvolvimento
          console.log('🧪 Modo desenvolvimento: usando dados mock');
          await mockAPI.checkHealth();
          await mockAPI.getSonarStatus();
          
          setSystemHealth({
            sonarqube: 'online',
            api: 'online',
            lastUpdate: new Date().toLocaleTimeString('pt-BR')
          });
        } else {
          // Modo produção: usar API real
          const apiResponse = await axios.get('/api/health');
          const apiStatus = apiResponse.status === 200 ? 'online' : 'offline';

          let sonarStatus = 'offline';
          try {
            const sonarResponse = await axios.get('/api/sonar/status');
            sonarStatus = sonarResponse.data?.status === 'UP' ? 'online' : 'offline';
          } catch (error) {
            console.warn('SonarQube status check failed:', error.message);
          }

          setSystemHealth({
            sonarqube: sonarStatus,
            api: apiStatus,
            lastUpdate: new Date().toLocaleTimeString('pt-BR')
          });
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setSystemHealth({
          sonarqube: 'offline',
          api: 'offline',
          lastUpdate: new Date().toLocaleTimeString('pt-BR')
        });
      }
    };

    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, []);

  // Função para navegar entre ferramentas
  const handleSelectTool = (toolId) => {
    setCurrentView(toolId);
  };

  const handleBackToHub = () => {
    setCurrentView('hub');
  };

  // Renderizar a view atual
  const renderCurrentView = () => {
    switch (currentView) {
      case 'sonarqube':
        return (
          <SonarQubeAnalyzer 
            onBack={handleBackToHub}
            systemHealth={systemHealth}
          />
        );
      case 'adobe-content':
        return (
          <AdobeContentValidator 
            onBack={handleBackToHub}
          />
        );
      case 'lighthouse':
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">🚧 Lighthouse</h2>
              <p className="text-gray-600 mb-6">Em desenvolvimento...</p>
              <button 
                onClick={handleBackToHub}
                className="bg-[#cc092f] text-white px-6 py-3 rounded-lg hover:bg-[#a00726] transition-colors"
              >
                ← Voltar ao Hub
              </button>
            </div>
          </div>
        );
      case 'hub':
      default:
        return (
          <Hub 
            onSelectTool={handleSelectTool}
            systemHealth={systemHealth}
          />
        );
    }
  };

  return (
    <div className="app">
      {/* Indicador de modo desenvolvimento */}
      {isDevelopment && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center py-2 text-sm font-medium">
          🧪 <strong>Development Mode</strong> usando mocks
        </div>
      )}

      {/* Renderizar a view atual */}
      <main className={`${isDevelopment ? 'pt-10' : ''}`}>
        {renderCurrentView()}
      </main>
    </div>
  );
}

export default App;
