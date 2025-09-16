const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Gera um relatório PDF da análise Adobe AEM
 * @param {Object} analysis - Objeto de análise contendo informações do pacote e resultados
 * @param {string} outputPath - Caminho onde o PDF será salvo
 * @returns {Promise<string>} Caminho do PDF gerado
 */
async function generateAdobeAemPdfReport(analysis, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    doc.fontSize(18).text('Relatório de Validação Adobe AEM', { align: 'center' });
    doc.moveDown();
  const pkgName = analysis.packageName || analysis.result?.packageName || analysis.originalFilename || '-';
  const generatedAt = analysis.generatedAt ? new Date(analysis.generatedAt) : new Date();
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(generatedAt);

  doc.fontSize(12).text(`Pacote: ${pkgName}`);
  doc.text(`Data: ${formattedDate} (America/Sao_Paulo)`);
  doc.text(`Status: ${analysis.qualityGateStatus || analysis.status}`);
  doc.text(`Duração: ${analysis.duration || '-'}\n`);

    doc.fontSize(14).text('Resumo:', { underline: true });
    doc.fontSize(12).text(`Erros: ${analysis.result?.metrics?.errors ?? '-'} | Warnings: ${analysis.result?.metrics?.warnings ?? '-'} | Info: ${analysis.result?.metrics?.info ?? '-'}`);
    doc.moveDown();

    doc.fontSize(14).text('Detalhes:', { underline: true });
    if (analysis.result?.validationResults?.issues?.length) {
      analysis.result.validationResults.issues.forEach((issue, idx) => {
        doc.fontSize(11).text(`${idx + 1}. [${issue.type.toUpperCase()}] ${issue.message}${issue.file ? ' (' + issue.file + ')' : ''}`);
        // Espaçamento extra entre problemas para melhorar legibilidade no PDF
        doc.moveDown(0.5);
      });
    } else {
      doc.fontSize(11).text('Nenhum problema encontrado.');
    }

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

module.exports = { generateAdobeAemPdfReport };
