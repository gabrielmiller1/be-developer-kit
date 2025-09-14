#!/bin/bash

# Script para criar um pacote de teste Adobe AEM com problemas
TEST_DIR="/tmp/test-aem-package-bad"
PACKAGE_NAME="invalid-content-apps-20241210-v1.0.0.zip"

# Limpar diretório anterior
rm -rf $TEST_DIR
mkdir -p $TEST_DIR

# Criar estrutura básica do pacote
mkdir -p $TEST_DIR/META-INF/vault
mkdir -p $TEST_DIR/jcr_root/content/invalid-site
mkdir -p $TEST_DIR/jcr_root/apps/another-project/config  # OSGi config - erro
mkdir -p $TEST_DIR/jcr_root/libs/forbidden              # /libs - erro
mkdir -p $TEST_DIR/jcr_root/conf/different-project

# Criar filter.xml com problemas
cat > $TEST_DIR/META-INF/vault/filter.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
    <filter root="/content" />    <!-- Filtro genérico - erro -->
    <filter root="/libs/forbidden" />    <!-- /libs proibido - erro -->
    <filter root="/content/different-project" />    <!-- Projeto diferente - warning -->
</workspaceFilter>
EOF

# Criar properties.xml com problemas
cat > $TEST_DIR/META-INF/vault/properties.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
    <entry key="name">invalid-content</entry>
    <!-- Faltando group e version - erro -->
</properties>
EOF

# Criar arquivo OSGi config (problema)
cat > $TEST_DIR/jcr_root/apps/another-project/config/com.example.Service.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
    jcr:primaryType="sling:OsgiConfig"
    enabled="{Boolean}true"/>
EOF

# Criar .content.xml com problemas
cat > $TEST_DIR/jcr_root/content/invalid-site/.content.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:cq="http://www.day.com/jcr/cq/1.0"
    jcr:primaryType="cq:Page">
    <jcr:content
        cq:lastModifiedBy="admin"
        cq:template="/apps/different-project/templates/page"
        cq:designPath="/etc/designs/external"
        jcr:mixinTypes="mix:dangerous"
        jcr:title="Test Page"
        jcr:primaryType="cq:PageContent"/>
</jcr:root>
EOF

# Criar arquivo indesejado
touch $TEST_DIR/jcr_root/.DS_Store
touch $TEST_DIR/jcr_root/Thumbs.db

# Criar query GraphQL com problemas
mkdir -p $TEST_DIR/jcr_root/conf/invalid-content/settings/graphql/persistentQueries
cat > $TEST_DIR/jcr_root/conf/invalid-content/settings/graphql/persistentQueries/wrong_name.graphql << 'EOF'
query getEverything {
  pageList(filter: {
    path: {
      _path: {
        _expressions: [
          {
            value: "*"
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

query anotherQuery {
  contentList {
    items {
      _path
    }
  }
}
EOF

# Criar o arquivo ZIP
cd $TEST_DIR
zip -r ../$PACKAGE_NAME . > /dev/null 2>&1

echo "📦 Pacote com problemas criado: /tmp/$PACKAGE_NAME"
echo "🔍 Este pacote deve gerar múltiplos erros e warnings"
echo ""
echo "✅ Para testar, use o caminho: /tmp/$PACKAGE_NAME"
