const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const xml2js = require('xml2js');
const semver = require('semver');

class AdobeAemValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.maxFileSize = 200 * 1024 * 1024; // 200MB
    this.maxFiles = 10000; // Aumentado para pacotes maiores
    this.packageNameRegex = /^[a-z0-9-]+-(content|apps|conf)-\d{8}-.+\.zip$/;
    this.semverRegex = /^\d+\.\d+\.\d+$/;
  }

  reset() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  addError(message, file = null) {
    this.errors.push({ type: 'error', severity: 'high', message, file });
  }

  addWarning(message, file = null) {
    this.warnings.push({ type: 'warning', severity: 'medium', message, file });
  }

  addInfo(message, file = null) {
    this.info.push({ type: 'info', severity: 'low', message, file });
  }

  async validatePackage(packagePath) {
    this.reset();
    
    try {
      // 1. Verificar se o arquivo existe
      if (!fs.existsSync(packagePath)) {
        this.addError(`Arquivo não encontrado: ${packagePath}`);
        return this.getResults();
      }

      // 2. Verificar tamanho do arquivo
      const stats = fs.statSync(packagePath);
      if (stats.size > this.maxFileSize) {
        this.addError(`Arquivo muito grande: ${(stats.size / 1024 / 1024).toFixed(2)}MB (máximo: 200MB)`);
      } else {
        this.addInfo(`Tamanho do arquivo: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
      }

      // 3. Validar nome do pacote
      const fileName = path.basename(packagePath);
      if (!this.packageNameRegex.test(fileName)) {
        this.addError(`Nome do pacote inválido: ${fileName}. Deve seguir o padrão: [a-z0-9-]+(content|apps|conf)-YYYYMMDD-*.zip`);
      } else {
        this.addInfo(`Nome do pacote válido: ${fileName}`);
      }

      // 4. Extrair projeto do nome do pacote
      const projectMatch = fileName.match(/^([a-z0-9-]+)-(content|apps|conf)-/);
      const projectName = projectMatch ? projectMatch[1] : null;

      // 5. Descompactar e validar conteúdo
      const zip = new AdmZip(packagePath);
      const zipEntries = zip.getEntries();

      // Verificar número de arquivos
      if (zipEntries.length > this.maxFiles) {
        this.addWarning(`Muitos arquivos no pacote: ${zipEntries.length} (recomendado: máximo ${this.maxFiles})`);
      } else {
        this.addInfo(`Número de arquivos: ${zipEntries.length}`);
      }

      // 6. Validar estrutura básica
      await this.validateBasicStructure(zipEntries);

      // 7. Validar filter.xml
      await this.validateFilterXml(zipEntries, projectName);

      // 8. Validar properties.xml
      await this.validatePropertiesXml(zipEntries);

      // 9. Validar conteúdo do jcr_root
      await this.validateJcrRootContent(zipEntries, projectName);

      // 10. Validar GraphQL queries
      await this.validateGraphQLQueries(zipEntries, projectName);

      return this.getResults();

    } catch (error) {
      this.addError(`Erro durante validação: ${error.message}`);
      return this.getResults();
    }
  }

  async validateBasicStructure(zipEntries) {
    const requiredPaths = ['META-INF/vault/', 'jcr_root/'];
    
    for (const requiredPath of requiredPaths) {
      const found = zipEntries.some(entry => entry.entryName.startsWith(requiredPath));
      if (found) {
        this.addInfo(`Estrutura encontrada: ${requiredPath}`);
      } else {
        this.addError(`Estrutura obrigatória não encontrada: ${requiredPath}`);
      }
    }
  }

  async validateFilterXml(zipEntries, projectName) {
    const filterEntry = zipEntries.find(entry => entry.entryName === 'META-INF/vault/filter.xml');
    
    if (!filterEntry) {
      this.addError('Arquivo filter.xml não encontrado em META-INF/vault/');
      return;
    }

    this.addInfo('Arquivo filter.xml encontrado');

    try {
      const filterContent = filterEntry.getData().toString('utf8');
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(filterContent);

      const filters = result?.workspaceFilter?.filter || [];
      
      if (filters.length === 0) {
        this.addWarning('Nenhum filtro encontrado no filter.xml');
        return;
      }

      const seenFilters = new Set();
      const forbiddenPaths = ['/libs', '/etc'];
      const genericPaths = ['/content', '/apps', '/conf'];

      for (const filter of filters) {
        const root = filter.$.root;
        
        // Verificar filtros duplicados
        if (seenFilters.has(root)) {
          this.addError(`Filtro duplicado encontrado: ${root}`, 'META-INF/vault/filter.xml');
          continue;
        }
        seenFilters.add(root);

        // Verificar paths proibidos
        if (forbiddenPaths.some(forbidden => root.startsWith(forbidden))) {
          this.addError(`Path proibido encontrado: ${root}`, 'META-INF/vault/filter.xml');
          continue;
        }

        // Verificar filtros genéricos
        if (genericPaths.includes(root)) {
          this.addError(`Filtro muito genérico: ${root}. Use paths específicos como /content/${projectName || '<project>'}`, 'META-INF/vault/filter.xml');
          continue;
        }

        // Verificar escopo do projeto
        if (projectName) {
          const expectedPaths = [`/content/${projectName}`, `/apps/${projectName}`, `/conf/${projectName}`];
          const isValidPath = expectedPaths.some(expected => root.startsWith(expected));
          
          if (!isValidPath) {
            this.addWarning(`Filtro fora do escopo do projeto '${projectName}': ${root}`, 'META-INF/vault/filter.xml');
          } else {
            this.addInfo(`Filtro válido: ${root}`);
          }
        }
      }

    } catch (error) {
      this.addError(`Erro ao analisar filter.xml: ${error.message}`, 'META-INF/vault/filter.xml');
    }
  }

  async validatePropertiesXml(zipEntries) {
    const propsEntry = zipEntries.find(entry => entry.entryName === 'META-INF/vault/properties.xml');
    
    if (!propsEntry) {
      this.addError('Arquivo properties.xml não encontrado em META-INF/vault/');
      return;
    }

    this.addInfo('Arquivo properties.xml encontrado');

    try {
      const propsContent = propsEntry.getData().toString('utf8');
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(propsContent);

      const properties = result?.properties?.entry || [];
      const propMap = {};
      
      properties.forEach(prop => {
        if (prop.$ && prop.$.key) {
          propMap[prop.$.key] = prop._;
        }
      });

      // Validar propriedades obrigatórias
      const required = ['name', 'group', 'version'];
      for (const prop of required) {
        if (propMap[prop]) {
          this.addInfo(`Propriedade '${prop}' encontrada: ${propMap[prop]}`);
        } else {
          this.addError(`Propriedade obrigatória '${prop}' não encontrada`, 'META-INF/vault/properties.xml');
        }
      }

      // Validar versão
      if (propMap.version) {
        if (!this.semverRegex.test(propMap.version)) {
          this.addWarning(`Versão não segue padrão semver: ${propMap.version}`, 'META-INF/vault/properties.xml');
        } else {
          this.addInfo(`Versão válida: ${propMap.version}`);
        }
      }

    } catch (error) {
      this.addError(`Erro ao analisar properties.xml: ${error.message}`, 'META-INF/vault/properties.xml');
    }
  }

  async validateJcrRootContent(zipEntries, projectName) {
    const jcrRootEntries = zipEntries.filter(entry => entry.entryName.startsWith('jcr_root/'));
    
    if (jcrRootEntries.length === 0) {
      this.addWarning('Nenhum conteúdo encontrado em jcr_root/');
      return;
    }

    // Verificar arquivos indesejados
    const unwantedFiles = ['.DS_Store', 'Thumbs.db', '.gitkeep', '.git'];
    let contentFiles = 0;
    let osgiConfigs = 0;

    for (const entry of jcrRootEntries) {
      const fileName = path.basename(entry.entryName);
      
      // Arquivos indesejados
      if (unwantedFiles.includes(fileName)) {
        this.addWarning(`Arquivo indesejado encontrado: ${entry.entryName}`);
        continue;
      }

      // OSGi configs
      if (entry.entryName.includes('/apps/') && entry.entryName.includes('/config/')) {
        osgiConfigs++;
        this.addError(`Configuração OSGi encontrada: ${entry.entryName}`);
        continue;
      }

      // Analisar arquivos .content.xml
      if (fileName === '.content.xml') {
        contentFiles++;
        await this.validateContentXml(entry, projectName);
      }
    }

    this.addInfo(`Arquivos .content.xml analisados: ${contentFiles}`);
    
    if (osgiConfigs > 0) {
      this.addError(`Total de configurações OSGi encontradas: ${osgiConfigs} (não permitidas)`);
    }
  }

  async validateContentXml(entry, projectName) {
    try {
      const content = entry.getData().toString('utf8');
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(content);

      // Verificar propriedades perigosas
      const checkProperties = (obj, path = '') => {
        if (typeof obj === 'object' && obj !== null) {
          Object.keys(obj).forEach(key => {
            const value = obj[key];
            
            if (key === 'cq:lastModifiedBy' && value === 'admin') {
              this.addWarning(`Propriedade perigosa: cq:lastModifiedBy="admin"`, entry.entryName);
            }
            
            if (key === 'cq:template' && projectName) {
              if (!value.includes(projectName)) {
                this.addWarning(`Template fora do projeto: ${value} (esperado: contendo '${projectName}')`, entry.entryName);
              }
            }
            
            if (key === 'cq:designPath' && projectName) {
              if (!value.includes(projectName)) {
                this.addWarning(`Design path fora do projeto: ${value}`, entry.entryName);
              }
            }
            
            if (key === 'jcr:mixinTypes') {
              const mixins = Array.isArray(value) ? value : [value];
              mixins.forEach(mixin => {
                if (mixin !== 'mix:versionable') {
                  this.addWarning(`Mixin não permitido: ${mixin}`, entry.entryName);
                }
              });
            }
            
            if (typeof value === 'object') {
              checkProperties(value, `${path}${key}.`);
            }
          });
        }
      };

      checkProperties(result);

    } catch (error) {
      this.addWarning(`Erro ao analisar ${entry.entryName}: ${error.message}`);
    }
  }

  async validateGraphQLQueries(zipEntries, projectName) {
    if (!projectName) return;

    const graphqlPath = `jcr_root/conf/${projectName}/settings/graphql/persistentQueries/`;
    const graphqlEntries = zipEntries.filter(entry => 
      entry.entryName.startsWith(graphqlPath) && 
      entry.entryName.endsWith('.graphql')
    );

    if (graphqlEntries.length === 0) {
      return; // Não há queries GraphQL, ok
    }

    this.addInfo(`Encontradas ${graphqlEntries.length} queries GraphQL`);

    for (const entry of graphqlEntries) {
      const fileName = path.basename(entry.entryName);
      
      // Validar nome do arquivo
      const expectedPattern = `${projectName}_`;
      if (!fileName.startsWith(expectedPattern)) {
        this.addError(`Nome da query GraphQL inválido: ${fileName}. Deve começar com '${expectedPattern}'`, entry.entryName);
        continue;
      }

      try {
        const queryContent = entry.getData().toString('utf8');
        
        // Validar wildcards
        if (queryContent.includes('*')) {
          this.addError(`Query GraphQL contém wildcard (*): não permitido`, entry.entryName);
        }

        // Validar referências a outros projetos
        const contentMatches = queryContent.match(/\/content\/([a-zA-Z0-9-]+)/g);
        if (contentMatches) {
          contentMatches.forEach(match => {
            const referencedProject = match.replace('/content/', '');
            if (referencedProject !== projectName) {
              this.addError(`Query referencia outro projeto: ${match}`, entry.entryName);
            }
          });
        }

        // Contar queries no arquivo
        const queryCount = (queryContent.match(/query\s+/gi) || []).length;
        if (queryCount > 1) {
          this.addWarning(`Arquivo contém ${queryCount} queries (recomendado: 1 por arquivo)`, entry.entryName);
        } else if (queryCount === 1) {
          this.addInfo(`Query GraphQL válida: ${fileName}`);
        }

        // Verificar comentário inicial
        if (!queryContent.trim().startsWith('#')) {
          this.addInfo(`Recomendado: adicionar comentário descritivo no início da query`, entry.entryName);
        }

      } catch (error) {
        this.addError(`Erro ao analisar query GraphQL: ${error.message}`, entry.entryName);
      }
    }
  }

  getResults() {
    const allIssues = [...this.errors, ...this.warnings, ...this.info];
    const hasErrors = this.errors.length > 0;
    
    return {
      success: !hasErrors,
      status: hasErrors ? 'failed' : (this.warnings.length > 0 ? 'warning' : 'success'),
      summary: {
        errors: this.errors.length,
        warnings: this.warnings.length,
        info: this.info.length,
        total: allIssues.length
      },
      issues: allIssues,
      exitCode: hasErrors ? 1 : 0
    };
  }

  generateConsoleReport(results) {
    let report = '\n=== Adobe AEM Package Validation Report ===\n\n';
    
    results.issues.forEach(issue => {
      const prefix = issue.type === 'error' ? '[ERROR]' : 
                    issue.type === 'warning' ? '[WARNING]' : '[OK]';
      const file = issue.file ? ` (${issue.file})` : '';
      report += `${prefix} ${issue.message}${file}\n`;
    });

    report += `\nSummary: ${results.summary.errors} errors, ${results.summary.warnings} warnings, ${results.summary.info} info\n`;
    report += `Status: ${results.status.toUpperCase()}\n`;
    report += `Exit Code: ${results.exitCode}\n`;

    return report;
  }
}

module.exports = AdobeAemValidator;
