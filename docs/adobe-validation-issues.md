# Adobe AEM Package Validation — Tipos de problemas

Este documento descreve todos os tipos de erro/aviso que o `AdobeAemValidator` pode apontar durante a validação de um pacote Adobe AEM (.zip).

Formato por entrada:
- Nome (código interno)
- Gravidade: Error / Warning / Info
- Por que ocorre (motivo técnico)
- Explicação (o que o validador checa e por que isso importa)
- Como corrigir (passos práticos)

> Observação: o validador prefere o `originalFilename` (nome enviado no upload) para checagem do nome do pacote, evitando falsos positivos causados por prefixos temporários.

---

## Sumário rápido
- Erros (Error): `arquivo-nao-encontrado`, `arquivo-muito-grande`, `nome-pacote-invalido`, `estrutura-obrigatoria-ausente`, `filter-xml-ausente`, `filtro-duplicado`, `path-proibido`, `filtro-generico`, `propriedade-obrigatoria-ausente`, `configuracao-osgi`, `configuracao-osgi-total`, `nome-query-graphql-invalido`, `graphql-wildcard`, `graphql-referencia-outro-projeto`
- Avisos (Warning): `muitos-arquivos`, `nenhum-filtro`, `filtro-fora-escopo`, `versao-invalida`, `conteudo-jcr-ausente`, `arquivo-indesejado`, `propriedade-perigosa-admin`, `template-fora-projeto`, `design-path-fora-projeto`, `graphql-multiplas-queries`
- Infos (Info): mensagens informativas sobre tamanho, número de arquivos, filtros válidos, versão válida, etc.

---

## Erros (detalhados)

### 1) arquivo-nao-encontrado
- Gravidade: Error
- Por que ocorre: O caminho passado para o validador não existe no sistema de arquivos.
- Explicação: O validador tenta abrir o arquivo `.zip` informado; se `fs.existsSync(packagePath)` for falso, a análise não pode continuar.
- Como corrigir:
  1. Verifique se o caminho do arquivo está correto e acessível pelo processo que roda o validador.
  2. Se enviou via upload, confirme que o arquivo foi salvo (sem falhas) e que o nome/ID corresponde ao enviado.
  3. Corrija permissões se o processo não tiver permissão de leitura para o arquivo.

---

### 2) arquivo-muito-grande
- Gravidade: Error
- Por que ocorre: O arquivo `.zip` excede o limite configurado (padrão: 200 MB).
- Explicação: Pacotes muito grandes podem causar problemas de desempenho, estouro de memória ou tempos de processamento muito longos; por isso são considerados erro.
- Como corrigir:
  1. Reduza o tamanho do pacote removendo arquivos desnecessários (assets pesados, arquivos temporários).
  2. Divida o conteúdo em múltiplos pacotes menores se aplicável.
  3. Se esse limite for aceitável para seu caso, o parâmetro `maxFileSize` pode ser ajustado no validador (valor em bytes).

---

### 3) nome-pacote-invalido
- Gravidade: Error
- Por que ocorre: O nome do arquivo não segue o padrão esperado: `^[a-z0-9-]+-(content|apps|conf)-YYYYMMDD-*.zip`.
- Explicação: O validador verifica o nome do pacote (usando `originalFilename` quando fornecido). O padrão garante consistência, permite extrair o `projectName` e validar escopo e conventions do projeto.
- Como corrigir:
  1. Renomeie o arquivo para seguir o padrão: por exemplo `meu-projeto-content-20250101-bra.zip`.
  2. Use somente letras minúsculas, números e hífen no prefixo do projeto.
  3. Certifique-se de incluir o sufixo correto (`content`, `apps` ou `conf`) e uma data no formato `YYYYMMDD`.

---

### 4) estrutura-obrigatoria-ausente
- Gravidade: Error
- Por que ocorre: O pacote não contém uma das pastas obrigatórias (ex.: `META-INF/vault/` ou `jcr_root/`).
- Explicação: Pacotes Adobe AEM devem conter a estrutura mínima com metadados (META-INF/vault) e conteúdo (jcr_root). Sem essas pastas não é um pacote válido para instalação no AEM.
- Como corrigir:
  1. Recrie o pacote incluindo `META-INF/vault/` com `filter.xml` e `properties.xml` e a pasta `jcr_root/` com o conteúdo do JCR.
  2. Verifique o processo que empacota o conteúdo (Maven/Gradle ou ferramentas de empacotamento) para garantir que gere essas pastas.

---

### 5) filter-xml-ausente
- Gravidade: Error
- Por que ocorre: O arquivo `META-INF/vault/filter.xml` não foi encontrado dentro do `.zip`.
- Explicação: `filter.xml` define os paths que serão incluídos no pacote — sem ele o instalador/vault não sabe o que aplicar.
- Como corrigir:
  1. Adicione `META-INF/vault/filter.xml` com os filtros apropriados.
  2. Confirme o conteúdo e a sintaxe XML para garantir que o arquivo seja válido.
  3. Teste o pacote localmente ou com a ferramenta de empacotamento para verificar que o filter aparece no zip.

---

### 6) filtro-duplicado
- Gravidade: Error
- Por que ocorre: O mesmo root/path aparece múltiplas vezes no `filter.xml`.
- Explicação: Filtros duplicados podem causar comportamentos imprevisíveis durante a instalação e indicam configuração incorreta do `filter.xml`.
- Como corrigir:
  1. Remova entradas duplicadas em `META-INF/vault/filter.xml` mantendo apenas uma entrada por path.
  2. Se filtros são gerados por scripts, ajuste-os para evitar linhas repetidas.

---

### 7) path-proibido
- Gravidade: Error
- Por que ocorre: O `filter.xml` inclui paths que são proibidos (por ex. começando com `/libs` ou `/etc`).
- Explicação: Paths como `/libs` e `/etc` são áreas do sistema AEM e não devem ser incluídas em pacotes de conteúdo do projeto — isso pode sobrescrever recursos do sistema e causar falhas.
- Como corrigir:
  1. Remova quaisquer filtros que apontem para `/libs`, `/etc` ou outras áreas do sistema.
  2. Utilize apenas paths que pertencem ao seu projeto (ex.: `/content/seu-projeto`, `/apps/seu-projeto`, `/conf/seu-projeto`).

---

### 8) filtro-generico
- Gravidade: Error
- Por que ocorre: O `filter.xml` contém filtros muito genéricos, ex.: `/content`, `/apps` ou `/conf` sem detalhar o projeto.
- Explicação: Filtros genéricos podem incluir conteúdo de outros projetos ou do core do AEM, levando a pacotes que têm impacto indevido no ambiente.
- Como corrigir:
  1. Substitua filtros genéricos por paths específicos do projeto — por exemplo `/content/{projectName}` ao invés de `/content`.
  2. Se `projectName` não puder ser inferido automaticamente, renomeie o pacote para seguir o padrão e permitir inferência.

---

### 9) propriedade-obrigatoria-ausente
- Gravidade: Error
- Por que ocorre: `META-INF/vault/properties.xml` não contém uma propriedade obrigatória (`name`, `group` ou `version`).
- Explicação: Essas propriedades definem metadados essenciais do pacote; sem elas o pacote pode falhar durante a publicação ou rastreabilidade.
- Como corrigir:
  1. Abra `META-INF/vault/properties.xml` e adicione as entradas `name`, `group` e `version`.
  2. Use valores coerentes com seu projeto e siga convenções de versionamento (semver recomendado).

---

### 10) configuracao-osgi
- Gravidade: Error
- Por que ocorre: Encontrado arquivo(s) de configuração OSGi dentro de caminhos proibidos do pacote (detectado como `/apps/.../config/...`).
- Explicação: Pacotes de conteúdo geralmente não devem conter configurações OSGi; isso deve ser gerenciado separadamente (pacotes de configuração ou deployment específicos).
- Como corrigir:
  1. Remova arquivos de configuração OSGi do pacote (arquivos sob diretórios `/config` dentro de `/apps`).
  2. Mova essas configurações para um pacote de configuração apropriado (por exemplo, um pacote de configuração separado ou use ferramentas de deploy específicas).

---

### 11) configuracao-osgi-total
- Gravidade: Error
- Por que ocorre: Após analisar todos os arquivos, foram encontradas configurações OSGi (total > 0), o validador reporta o total como erro agregado.
- Explicação: Indica que pelo menos uma configuração OSGi foi incluída — ver `configuracao-osgi` para detalhes por arquivo.
- Como corrigir:
  1. Remova/mova todas as configurações OSGi encontradas.
  2. Refaça o pacote e valide novamente.

---

### 12) nome-query-graphql-invalido
- Gravidade: Error
- Por que ocorre: Um arquivo `.graphql` não segue a convenção de nome: deve começar com `${projectName}_`.
- Explicação: O validador espera que queries persistentes sejam nomeadas por projeto para evitar colisões e indicar propriedade.
- Como corrigir:
  1. Renomeie o arquivo para começar com o prefixo do projeto, por exemplo `meu-projeto_query1.graphql`.
  2. Reempacote e revalide.

---

### 13) graphql-wildcard
- Gravidade: Error
- Por que ocorre: Uma query GraphQL contém wildcard (`*`).
- Explicação: Wildcards podem negar controle fino sobre os campos retornados, afetando performance e segurança.
- Como corrigir:
  1. Remova o uso de `*` na query, especificando explicitamente os campos necessários.
  2. Revise performance/segurança da query após ajustes.

---

### 14) graphql-referencia-outro-projeto
- Gravidade: Error
- Por que ocorre: A query faz referência a paths `/content/<outro-projeto>` diferentes do `projectName` do pacote.
- Explicação: Queries devem referenciar conteúdo do próprio projeto para evitar acoplamento e problemas de implantação entre projetos.
- Como corrigir:
  1. Atualize a query para apontar apenas para `/content/{projectName}`.
  2. Se for intencional referenciar outro projeto, faça isso via mecanismo controlado (e documente a dependência).

---

## Avisos (Warnings)

> Avisos indicam itens que não bloqueiam necessariamente a instalação, mas merecem correção ou revisão.

### muitos-arquivos
- Gravidade: Warning
- Por que ocorre: O número de entradas dentro do `.zip` excede `maxFiles` (padrão: 10000).
- Como corrigir:
  1. Remova arquivos desnecessários, assets temporários ou divida o pacote.
  2. Se necessário, aumente `maxFiles` no validador (apenas se for seguro e testado).

---

### nenhum-filtro
- Gravidade: Warning
- Por que ocorre: `filter.xml` existe mas não contém filtros (ou a lista é vazia).
- Como corrigir:
  1. Adicione filtros válidos em `META-INF/vault/filter.xml`.
  2. Garanta que o XML esteja bem formado e que cada `<filter>` possua um atributo `root`.

---

### filtro-fora-escopo
- Gravidade: Warning
- Por que ocorre: O filtro apontado não corresponde ao `projectName` esperado (p.ex. inclui path genérico ou de outro projeto).
- Como corrigir:
  1. Ajuste o filtro para englobar apenas o scope do projeto (`/content/{projectName}`, `/apps/{projectName}` etc.).
  2. Se o filtro é intencionalmente amplo, documente o motivo e revise impacto.

---

### versao-invalida
- Gravidade: Warning
- Por que ocorre: A propriedade `version` em `properties.xml` não segue o padrão semver `MAJOR.MINOR.PATCH`.
- Como corrigir:
  1. Ajuste `version` para um formato semver (ex.: `1.0.0`).
  2. Se you usar outro esquema de versionamento, documente-o, mas prefira semver para interoperabilidade.

---

### conteudo-jcr-ausente
- Gravidade: Warning
- Por que ocorre: Não foram encontrados arquivos sob `jcr_root/`.
- Como corrigir:
  1. Verifique se o conteúdo do projeto foi incluído no pacote.
  2. Se o pacote for apenas metadados, confirme que esse comportamento é intencional; caso contrário, inclua os arquivos necessários.

---

### arquivo-indesejado
- Gravidade: Warning
- Por que ocorre: Foram encontrados arquivos típicos de sistema/temporários como `.DS_Store`, `Thumbs.db`, `.gitkeep`.
- Como corrigir:
  1. Remova esses arquivos antes de empacotar (adicione regras .gitignore / exclusão no processo de build).
  2. Automatize a limpeza com scripts de empacotamento.

---

### propriedade-perigosa-admin
- Gravidade: Warning
- Por que ocorre: Encontrado `cq:lastModifiedBy` com valor `admin` em algum `.content.xml`.
- Explicação: Indica que alterações foram feitas manualmente pelo usuário `admin`, prática insegura; pode comprometer rastreabilidade e permissões.
- Como corrigir:
  1. Reaplique operações pelo usuário correto ou remova/atualize a propriedade para o usuário apropriado.
  2. Evite editar conteúdo em produção com a conta `admin`.

---

### template-fora-projeto
- Gravidade: Warning
- Por que ocorre: O valor de `cq:template` não contém `projectName` (possível referência a template externo).
- Como corrigir:
  1. Garanta que o template referenciado exista no projeto ou atualize para um template do projeto.
  2. Se for intencional, valide dependências entre projetos.

---

### design-path-fora-projeto
- Gravidade: Warning
- Por que ocorre: `cq:designPath` aponta para um path que não contém `projectName`.
- Como corrigir:
  1. Atualize `cq:designPath` para um caminho dentro do projeto.
  2. Verifique se o design referenciado é parte do projeto ou se precisa ser provisionado separadamente.

---

### graphql-multiplas-queries
- Gravidade: Warning
- Por que ocorre: Um arquivo `.graphql` contém mais de uma query.
- Explicação: Boas práticas recomendam uma query por arquivo para facilitar manutenção e deploy.
- Como corrigir:
  1. Separe queries em arquivos distintos (um por arquivo).
  2. Adicione comentários descritivos no início de cada arquivo.

---

## Mensagens informativas (Info)
- Exemplos que o validador adiciona como `info`:
  - `Tamanho do arquivo: ...` — informa o tamanho em MB.
  - `Número de arquivos: ...` — quantidade de entradas no ZIP.
  - `Estrutura encontrada: META-INF/vault/` ou `jcr_root/` — confirma presença.
  - `Nome do pacote válido: ...` — confirma que o nome casa com o regex.
  - `Versão válida: ...` — versão que segue semver.
  - `Query GraphQL válida: ...` — indica que a query passou nas verificações.

Infos são úteis para debug e para preencher relatórios sem falhas.

---

## Como o validador agrega resultados
- O retorno contém `summary` com contagens: errors, warnings, info e total.
- Se existir qualquer `error`, o `status` final será `failed` e `exitCode` será `1`.
- Caso contrário, se houver warnings, `status` será `warning`; se não houver problemas, `success`.

---

## Boas práticas para evitar problemas
1. Sempre gere pacotes usando o mesmo processo automatizado (Maven/Gradle/CRX packager). Evite zipar manualmente.
2. Valide localmente com um script antes do upload: verifique `filter.xml`, `properties.xml` e a presença de `jcr_root`.
3. Remova arquivos temporários (.DS_Store, Thumbs.db) durante o build.
4. Use nomes de pacote consistentes (padrão definido) e versão semver.
5. Separe configurações OSGi de pacotes de conteúdo.

---

Se quiser, eu:
- gero um JSON com todos os códigos (chave -> {severity, message, hint, howToFix}) para integrar na UI;
- ou crio uma versão curta (enxuta) para incluir no README do componente.

Qual formato prefere como próximo passo?
