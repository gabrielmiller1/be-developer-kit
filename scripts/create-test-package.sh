#!/bin/bash

# Script para criar um pacote de teste Adobe AEM
TEST_DIR="/tmp/test-aem-package"
PACKAGE_NAME="site-test-content-20241210-v1.0.0.zip"

# Limpar diretório anterior
rm -rf $TEST_DIR
mkdir -p $TEST_DIR

# Criar estrutura básica do pacote
mkdir -p $TEST_DIR/META-INF/vault
mkdir -p $TEST_DIR/jcr_root/content/site-test
mkdir -p $TEST_DIR/jcr_root/apps/site-test
mkdir -p $TEST_DIR/jcr_root/conf/site-test/settings/graphql/persistentQueries

# Criar filter.xml válido
cat > $TEST_DIR/META-INF/vault/filter.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
    <filter root="/content/site-test" />
    <filter root="/apps/site-test" />
    <filter root="/conf/site-test" />
</workspaceFilter>
EOF

# Criar properties.xml válido
cat > $TEST_DIR/META-INF/vault/properties.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
    <entry key="name">site-test-content</entry>
    <entry key="group">bradesco.packages</entry>
    <entry key="version">1.0.0</entry>
    <entry key="description">Pacote de teste para validação</entry>
</properties>
EOF

# Criar alguns arquivos de conteúdo
cat > $TEST_DIR/jcr_root/content/site-test/.content.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:cq="http://www.day.com/jcr/cq/1.0"
    jcr:primaryType="cq:Page">
    <jcr:content
        cq:template="/apps/site-test/templates/page"
        jcr:title="Test Page"
        jcr:primaryType="cq:PageContent"/>
</jcr:root>
EOF

# Criar uma query GraphQL válida
cat > $TEST_DIR/jcr_root/conf/site-test/settings/graphql/persistentQueries/site-test_getPages.graphql << 'EOF'
# Query para buscar páginas do site de teste
query getPages {
  pageList(filter: {
    path: {
      _path: {
        _expressions: [
          {
            value: "/content/site-test"
          }
        ]
      }
    }
  }) {
    items {
      _path
      title
    }
  }
}
EOF

# Criar o arquivo ZIP
cd $TEST_DIR
zip -r ../$PACKAGE_NAME . > /dev/null 2>&1

echo "📦 Pacote de teste criado: /tmp/$PACKAGE_NAME"
echo "🔍 Estrutura do pacote:"
unzip -l /tmp/$PACKAGE_NAME

echo ""
echo "✅ Para testar, use o caminho: /tmp/$PACKAGE_NAME"
