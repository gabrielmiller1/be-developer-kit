import JSZip from 'jszip';
import { parseStringPromise } from 'xml2js';

/**
 * Extrai informações básicas de um pacote zip Adobe AEM no frontend:
 * - Nome do arquivo
 * - Tamanho
 * - Lista de filtros do filter.xml (root, mode, rules)
 *
 * @param {File} file - arquivo .zip selecionado
 * @returns {Promise<{name: string, size: number, filters: Array}>}
 */
export async function extractAemPackageInfo(file) {
  const zip = await JSZip.loadAsync(file);
  const filterXmlFile = zip.file('META-INF/vault/filter.xml');
  let filters = [];
  if (filterXmlFile) {
    const xmlContent = await filterXmlFile.async('string');
    try {
      const parsed = await parseStringPromise(xmlContent);
      const filterArr = parsed?.workspaceFilter?.filter || [];
      filters = filterArr.map(f => ({
        root: f.$.root,
        mode: f.$.mode || '',
        rules: f.rule ? f.rule.map(r => r.$) : []
      }));
    } catch (e) {
      // erro ao parsear xml
      filters = [];
    }
  }
  return {
    name: file.name,
    size: file.size,
    filters
  };
}
