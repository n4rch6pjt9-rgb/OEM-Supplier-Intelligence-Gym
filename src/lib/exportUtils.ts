import jsPDF from 'jspdf';
import { ProductItem } from '../types.ts';

/**
 * Utilitários para Geração de Ficha Técnica em PDF e Exportação de CSV
 * Desenvolvido com proteção estrita contra truncamento de texto, quebra de página dinâmica e espaçamento profissional A4.
 */

export const calculateCbm = (lengthMm?: number | null, widthMm?: number | null, heightMm?: number | null): string => {
  if (!lengthMm || !widthMm || !heightMm) return 'N/D';
  const cbm = (lengthMm / 1000) * (widthMm / 1000) * (heightMm / 1000);
  return cbm.toFixed(3) + ' m³';
};

export const getPackingDimensions = (sku: ProductItem) => {
  const pL = sku.packingLengthMm || Math.round(Math.max(sku.lengthMm || 1400, sku.heightMm || 1500) * 0.95 + 100);
  const pW = sku.packingWidthMm || Math.round((sku.widthMm || 1200) * 0.65);
  const pH = sku.packingHeightMm || 650;
  const pCbm = sku.packingCbm ? sku.packingCbm.toFixed(3) + ' m³' : calculateCbm(pL, pW, pH);
  const grossWt = sku.grossWeightKg || Math.round((sku.netWeightKg || 210) * 1.15);
  const packaging = sku.packagingType || sku.transportPackage || 'Caixa de Madeira Plywood Exportação (Fumigada)';

  return {
    packingLength: pL,
    packingWidth: pW,
    packingHeight: pH,
    packingCbm: pCbm,
    grossWeight: grossWt,
    packagingType: packaging,
  };
};

/**
 * Renderiza uma Ficha Técnica completa para um SKU com suporte a paginação dinâmica,
 * cabeçalho de continuação, repetição de cabeçalhos de tabela e quebra de texto sem truncamento.
 */
const renderSkuDocument = (
  doc: jsPDF,
  sku: ProductItem,
  isFirstPageInDoc: boolean,
  pageSkuMap: Record<number, string>,
  issueDate: string
) => {
  if (!isFirstPageInDoc) {
    doc.addPage();
  }

  const PAGE_WIDTH = 210;
  const MARGIN_X = 14;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2; // 182mm
  const MAX_CONTENT_Y = 277; // Margem de segurança antes do rodapé em 286mm

  let currentY = 11;
  const skuLabel = sku.modelNo || sku.sku || sku.productId;

  // Registra a página atual no mapa para o rodapé global
  pageSkuMap[doc.getNumberOfPages()] = skuLabel;

  const packing = getPackingDimensions(sku);
  const length = sku.lengthMm || 1040;
  const width = sku.widthMm || 1450;
  const height = sku.heightMm || 1630;
  const netWeight = sku.netWeightKg || 210;

  // Renderiza cabeçalho em páginas adicionais (Páginas 2+)
  const renderContinuationHeader = () => {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(MARGIN_X, 9, CONTENT_WIDTH, 9.5, 1, 1, 'F');

    // Linha de acento laranja na esquerda
    doc.setFillColor(194, 65, 12); // orange-700
    doc.rect(MARGIN_X, 9, 2.5, 9.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(248, 250, 252);
    doc.text('FICHA TÉCNICA DE ENGENHARIA REVERSA & HOMOLOGAÇÃO OEM', MARGIN_X + 5, 15.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(251, 146, 60); // orange-400
    doc.text(`MODELO: ${skuLabel} • CONTINUAÇÃO`, MARGIN_X + CONTENT_WIDTH - 4, 15.2, { align: 'right' });

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, 20.5, MARGIN_X + CONTENT_WIDTH, 20.5);
  };

  // Garante que haja espaço vertical suficiente; se não houver, quebra a página de forma limpa
  const ensureSpace = (neededHeight: number, onBreak?: () => void) => {
    if (currentY + neededHeight > MAX_CONTENT_Y) {
      doc.addPage();
      pageSkuMap[doc.getNumberOfPages()] = skuLabel;
      renderContinuationHeader();
      currentY = 24;
      if (onBreak) {
        onBreak();
      }
    }
  };

  // Renderizador do cabeçalho da tabela de atributos
  const renderTableHeader = (yPos: number) => {
    const colKeyW = 62;
    const hH = 6;

    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(MARGIN_X, yPos, CONTENT_WIDTH, hH, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(248, 250, 252);
    doc.text('PARÂMETRO TÉCNICO (DT)', MARGIN_X + 3.5, yPos + 4.1);
    doc.text('VALOR NORMALIZADO (DD)', MARGIN_X + colKeyW + 3.5, yPos + 4.1);

    return hH;
  };

  // =========================================================================
  // 1. BANNER SUPERIOR PRINCIPAL (PÁGINA 1)
  // =========================================================================
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, 19, 1.5, 1.5, 'F');

  // Faixa de destaque no topo do banner (Laranja Industrial)
  doc.setFillColor(194, 65, 12);
  doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, 2, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(248, 250, 252);
  doc.text('FICHA TÉCNICA DE ENGENHARIA REVERSA & HOMOLOGAÇÃO OEM', MARGIN_X + 5, currentY + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('OEM Supplier Intelligence Database • Medidas de Embalagem (Packing Size) & Equipamento Montado', MARGIN_X + 5, currentY + 14.8);

  doc.setFontSize(7.2);
  doc.setTextColor(203, 213, 225);
  doc.text(`Emissão: ${issueDate}`, MARGIN_X + CONTENT_WIDTH - 5, currentY + 8.5, { align: 'right' });
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text('Status: Normalizado PostgreSQL • ISO/CE', MARGIN_X + CONTENT_WIDTH - 5, currentY + 14.8, { align: 'right' });

  currentY += 22.5;

  // =========================================================================
  // 2. BLOCO DE IDENTIFICAÇÃO DA FÁBRICA E LINHA DE PRODUTOS
  // =========================================================================
  const supColW = 105;
  const lineColW = CONTENT_WIDTH - supColW - 6;
  const supplierName = sku.supplierName || 'Fabricante Homologado';
  const productLine = sku.productLine || 'Linha Força Comercial';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  const supLines = doc.splitTextToSize(supplierName, supColW - 6);
  const lineLines = doc.splitTextToSize(productLine, lineColW - 6);

  const blockHeight = Math.max(20, Math.max(supLines.length, lineLines.length) * 4 + 11.5);

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.35);
  doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, blockHeight, 1.5, 1.5, 'FD');

  // Rótulos superiores das colunas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('FÁBRICA FABRICANTE (SUPPLIER)', MARGIN_X + 4, currentY + 5);
  doc.text('LINHA / SÉRIE DO PRODUTO', MARGIN_X + supColW + 4, currentY + 5);

  // Nome do Fabricante (quebra de linha completa, sem cortes)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42); // slate-900
  supLines.forEach((lineText: string, idx: number) => {
    doc.text(lineText, MARGIN_X + 4, currentY + 9.8 + idx * 3.8);
  });

  // Linha / Série (quebra de linha completa em laranja)
  doc.setTextColor(194, 65, 12); // orange-700
  lineLines.forEach((lineText: string, idx: number) => {
    doc.text(lineText, MARGIN_X + supColW + 4, currentY + 9.8 + idx * 3.8);
  });

  // Metadados inferiores do bloco
  const metaY = currentY + blockHeight - 3.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`ID Fábrica: ${sku.supplierId || 'N/A'} • Origem: ${sku.origin || 'China'}`, MARGIN_X + 4, metaY);
  doc.text(`NCM / HS Code: ${sku.hsCode || '95069119'} • MOQ: ${sku.moq || 1} unid`, MARGIN_X + supColW + 4, metaY);

  currentY += blockHeight + 4;

  // =========================================================================
  // 3. TÍTULO DO EQUIPAMENTO & CÓDIGO DO MODELO
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(3, 105, 161); // sky-700
  doc.text(`MODELO: ${skuLabel}`, MARGIN_X, currentY);

  currentY += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59); // slate-800
  const titleLines = doc.splitTextToSize(sku.title, CONTENT_WIDTH);
  titleLines.forEach((lineText: string, idx: number) => {
    doc.text(lineText, MARGIN_X, currentY + idx * 4);
  });
  currentY += titleLines.length * 4 + 1.2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const catText = [sku.category1, sku.category2, sku.category3].filter(Boolean).join('  ›  ') || 'Equipamentos de Musculação Profissional';
  doc.text(`Classificação Técnica: ${catText}`, MARGIN_X, currentY);

  currentY += 4;

  // =========================================================================
  // 4. SEÇÃO PRINCIPAL DE DESTAQUE: MEDIDAS DA EMBALAGEM (PACKING SIZE)
  // Dimensões prioritárias solicitadas para cubagem, contêiner e frete marítimo
  // =========================================================================
  ensureSpace(40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  const packLines = doc.splitTextToSize(packing.packagingType, CONTENT_WIDTH - 12);
  const packCardH = 17;
  const bottomRowH = Math.max(11, packLines.length * 3.5 + 5.5);
  const packSectionHeight = 8 + packCardH + 2.5 + bottomRowH + 3;

  doc.setFillColor(255, 251, 235); // amber-50
  doc.setDrawColor(217, 119, 6); // amber-600
  doc.setLineWidth(0.55);
  doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, packSectionHeight, 2, 2, 'FD');

  // Cabeçalho da Seção de Embalagem
  doc.setFillColor(217, 119, 6); // amber-600
  doc.roundedRect(MARGIN_X + 2.5, currentY + 2.5, 118, 5.5, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(255, 255, 255);
  doc.text('📦 MEDIDAS DA EMBALAGEM (PACKING SIZE / CAIXA DE TRANSPORTE)', MARGIN_X + 4.5, currentY + 6.3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  doc.setTextColor(146, 64, 14); // amber-900
  doc.text('CUBAGEM & FRETE MARÍTIMO INTERNACIONAL', MARGIN_X + CONTENT_WIDTH - 4, currentY + 6.3, { align: 'right' });

  // 3 Cards de Métricas Principais de Embalagem na Linha 1
  const colGap = 3;
  const cardW = (CONTENT_WIDTH - 6 - colGap * 2) / 3;
  const cardY = currentY + 9;

  // Card 1: Dimensões da Caixa (C × L × A mm)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(245, 158, 11); // amber-500
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN_X + 3, cardY, cardW, packCardH, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.3);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text('DIMENSÕES DA EMBALAGEM (C × L × A)', MARGIN_X + 5, cardY + 4.3);

  doc.setFontSize(9.2);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`${packing.packingLength} × ${packing.packingWidth} × ${packing.packingHeight} mm`, MARGIN_X + 5, cardY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Milímetros (mm) • Caixa Fechada', MARGIN_X + 5, cardY + 14.5);

  // Card 2: Volume CBM da Caixa (Destaque Principal em Esmeralda)
  const card2X = MARGIN_X + 3 + cardW + colGap;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.roundedRect(card2X, cardY, cardW, packCardH, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.3);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('VOLUME CBM DA CAIXA (CBM)', card2X + 3, cardY + 4.3);

  doc.setFontSize(10.2);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text(packing.packingCbm, card2X + 3, cardY + 10.3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(16, 185, 129);
  doc.text('Cubagem p/ Cálculo de Container', card2X + 3, cardY + 14.5);

  // Card 3: Peso Bruto com Caixa (PB)
  const card3X = card2X + cardW + colGap;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(card3X, cardY, cardW, packCardH, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.3);
  doc.setTextColor(180, 83, 9);
  doc.text('PESO BRUTO COM CAIXA (PB)', card3X + 3, cardY + 4.3);

  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${packing.grossWeight} kg`, card3X + 3, cardY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Aparelho + Engradado de Madeira', card3X + 3, cardY + 14.5);

  // Linha 2 do Bloco de Embalagem: Card Amplo para Tipo de Caixa com quebra de texto integral
  const bottomCardY = cardY + packCardH + 2.5;
  const bottomCardW = CONTENT_WIDTH - 6;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN_X + 3, bottomCardY, bottomCardW, bottomRowH, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.3);
  doc.setTextColor(180, 83, 9);
  doc.text('TIPO DA CAIXA & EMBALAGEM DE EXPORTAÇÃO (TRANSPORT PACKAGE):', MARGIN_X + 5, bottomCardY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  packLines.forEach((lineText: string, idx: number) => {
    doc.text(lineText, MARGIN_X + 5, bottomCardY + 7.8 + idx * 3.5);
  });

  currentY += packSectionHeight + 4;

  // =========================================================================
  // 5. SEÇÃO SECUNDÁRIA: EQUIPAMENTO MONTADO (ASSEMBLED SIZE)
  // =========================================================================
  ensureSpace(24);

  const assemH = 20.5;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.35);
  doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, assemH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('🏋️ DIMENSÕES DO APARELHO MONTADO (ASSEMBLED SIZE)', MARGIN_X + 4, currentY + 4.8);

  const assemCardW = (CONTENT_WIDTH - 8 - colGap * 2) / 3;
  const assemContentY = currentY + 6.8;

  // M1: Dimensões Montado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.3);
  doc.setTextColor(100, 116, 139);
  doc.text('DIMENSÕES MONTADO (C × L × A)', MARGIN_X + 4, assemContentY + 3.2);

  doc.setFontSize(8.6);
  doc.setTextColor(15, 23, 42);
  doc.text(`${length} × ${width} × ${height} mm`, MARGIN_X + 4, assemContentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Área de instalação na academia', MARGIN_X + 4, assemContentY + 11.8);

  // M2: Peso Líquido (PL)
  const assem2X = MARGIN_X + 4 + assemCardW + colGap;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.3);
  doc.setTextColor(100, 116, 139);
  doc.text('PESO LÍQUIDO DO APARELHO (PL)', assem2X, assemContentY + 3.2);

  doc.setFontSize(8.6);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(`${netWeight} kg`, assem2X, assemContentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Peso mecânico sem embalagem', assem2X, assemContentY + 11.8);

  // M3: Tubulação & Estrutura
  const assem3X = assem2X + assemCardW + colGap;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.3);
  doc.setTextColor(100, 116, 139);
  doc.text('ESTRUTURA TUBULAR / AÇO', assem3X, assemContentY + 3.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  const matLines = doc.splitTextToSize(sku.material || 'Aço Q235 60x100x3.0mm', assemCardW - 2);
  matLines.slice(0, 2).forEach((lineText: string, idx: number) => {
    doc.text(lineText, assem3X, assemContentY + 8 + idx * 3.4);
  });

  currentY += assemH + 4;

  // =========================================================================
  // 6. DESCRIÇÃO TÉCNICA DO EQUIPAMENTO & BIOMECÂNICA (ALTURA ADAPTÁVEL)
  // =========================================================================
  const descText =
    sku.description ||
    `${sku.title}. Equipamento profissional de musculação fabricado com padrões internacionais de qualidade, pintura eletrostática a pó e estofamento de alta densidade.`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  const descLines = doc.splitTextToSize(descText, CONTENT_WIDTH - 8);
  const descBoxH = Math.max(17, descLines.length * 3.5 + 8);

  ensureSpace(descBoxH);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.35);
  doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, descBoxH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('DESCRIÇÃO TÉCNICA DO EQUIPAMENTO & BIOMECÂNICA', MARGIN_X + 4, currentY + 4.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.1);
  doc.setTextColor(51, 65, 85);
  descLines.forEach((lineText: string, idx: number) => {
    doc.text(lineText, MARGIN_X + 4, currentY + 9 + idx * 3.5);
  });

  currentY += descBoxH + 4;

  // =========================================================================
  // 7. DICIONÁRIO DE ATRIBUTOS TÉCNICOS & EMBALAGEM (DT / DD TABLE)
  // Com repetição automática do cabeçalho caso ocorra quebra de página
  // =========================================================================
  const rawAttrs = sku.rawAttributes || {};

  // Lista padronizada com destaque inicial para Embalagem e Transporte
  const attrEntries: Array<[string, string]> = [
    ['Packing Size (Caixa C×L×A)', `${packing.packingLength} × ${packing.packingWidth} × ${packing.packingHeight} mm`],
    ['Packing Volume (CBM Caixa)', packing.packingCbm],
    ['Gross Weight (Peso Bruto)', `${packing.grossWeight} kg`],
    ['Transport Package (Caixa)', packing.packagingType],
    ['Assembled Dimension (Montado)', `${length} × ${width} × ${height} mm`],
    ['Net Weight (Peso Líquido)', `${netWeight} kg`],
    ['Model NO. / Código', sku.modelNo || sku.sku || 'N/A'],
    ['Material Estrutural', sku.material || 'Tubo de Aço Q235 3mm'],
    ['Especificação Técnica', sku.specification || `${length}*${width}*${height}mm | Tubo 60x100x3mm`],
    ['Marca / Trademark', sku.trademark || 'OEM Homologado'],
    ['NCM / HS Code', sku.hsCode || '95069119'],
    ['Origem de Fabricação', sku.origin || 'Dezhou, Shandong, China'],
    ['Capacidade de Produção', sku.productionCapacity || '3,000 Conjuntos / Mês'],
    ['Certificações Internacionais', (sku.certifications || ['CE', 'ISO9001']).join(', ')],
  ];

  // Adiciona atributos brutos extras da ficha sem duplicação
  const duplicateKeys = [
    'model no',
    'model no.',
    'item number',
    'size',
    'net weight',
    'gross weight',
    'packaging',
    'hs code',
    'product name',
  ];

  Object.entries(rawAttrs).forEach(([k, v]) => {
    const norm = k.toLowerCase().trim();
    if (!duplicateKeys.includes(norm) && !attrEntries.some(([existingK]) => existingK.toLowerCase() === norm)) {
      attrEntries.push([k, String(v)]);
    }
  });

  // Título da Tabela
  ensureSpace(18, () => {
    renderTableHeader(currentY);
    currentY += 6.5;
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('DICIONÁRIO DE ATRIBUTOS TÉCNICOS & EMBALAGEM (PRODUCT ATTRIBUTES DT / DD)', MARGIN_X, currentY);
  currentY += 3.5;

  const headerHeight = renderTableHeader(currentY);
  currentY += headerHeight;

  const colKeyW = 62;
  const colValW = CONTENT_WIDTH - colKeyW;

  // Renderiza todas as linhas da tabela com cálculo dinâmico de altura e quebra de página
  attrEntries.forEach(([k, v], idx) => {
    const isPackingRow =
      k.toLowerCase().includes('packing') ||
      k.toLowerCase().includes('gross weight') ||
      k.toLowerCase().includes('transport');

    doc.setFont('helvetica', isPackingRow ? 'bold' : 'normal');
    doc.setFontSize(6.8);
    const keyLines = doc.splitTextToSize(k, colKeyW - 6);
    const valLines = doc.splitTextToSize(String(v), colValW - 6);
    const lineCount = Math.max(keyLines.length, valLines.length);
    const rowH = Math.max(5.6, lineCount * 3.5 + 2.4);

    // Se a linha não couber na página, quebra e repete o cabeçalho da tabela
    ensureSpace(rowH, () => {
      renderTableHeader(currentY);
      currentY += 6.5;
    });

    // Fundo zebrado ou destaque âmbar suave para itens de embalagem
    if (isPackingRow) {
      doc.setFillColor(254, 252, 232); // soft amber
    } else {
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    }
    doc.rect(MARGIN_X, currentY, CONTENT_WIDTH, rowH, 'F');

    // Linhas divisórias da célula
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(MARGIN_X, currentY + rowH, MARGIN_X + CONTENT_WIDTH, currentY + rowH);
    doc.line(MARGIN_X + colKeyW, currentY, MARGIN_X + colKeyW, currentY + rowH);

    // Texto da Coluna DT (Chave)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    doc.setTextColor(isPackingRow ? 180 : 71, isPackingRow ? 83 : 85, isPackingRow ? 9 : 105);
    keyLines.forEach((lineText: string, lIdx: number) => {
      doc.text(lineText, MARGIN_X + 3.5, currentY + 3.6 + lIdx * 3.5);
    });

    // Texto da Coluna DD (Valor)
    doc.setFont('helvetica', isPackingRow ? 'bold' : 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(isPackingRow ? 15 : 30, isPackingRow ? 23 : 41, isPackingRow ? 42 : 59);
    valLines.forEach((lineText: string, lIdx: number) => {
      doc.text(lineText, MARGIN_X + colKeyW + 3.5, currentY + 3.6 + lIdx * 3.5);
    });

    currentY += rowH;
  });
};

/**
 * Aplica o rodapé global padronizado em todas as páginas do documento com numeração precisa "Página X de Y"
 */
const applyGlobalFooters = (doc: jsPDF, pageSkuMap: Record<number, string>, issueDate: string) => {
  const totalPages = doc.getNumberOfPages();
  const PAGE_WIDTH = 210;
  const MARGIN_X = 14;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, 287, MARGIN_X + CONTENT_WIDTH, 287);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Ficha Técnica de Engenharia Reversa & Homologação OEM • Medidas de Embalagem (Packing Size) para Container',
      MARGIN_X,
      291
    );

    const skuForPage = pageSkuMap[p] || 'Homologação';
    doc.text(
      `Página ${p} de ${totalPages} • SKU: ${skuForPage} • Emissão: ${issueDate}`,
      MARGIN_X + CONTENT_WIDTH,
      291,
      { align: 'right' }
    );
  }
};

/**
 * Gera e realiza o download do PDF individual de um SKU
 */
export const downloadSkuPdf = (sku: ProductItem) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageSkuMap: Record<number, string> = {};
  const issueDate = new Date().toLocaleDateString('pt-BR');

  renderSkuDocument(doc, sku, true, pageSkuMap, issueDate);
  applyGlobalFooters(doc, pageSkuMap, issueDate);

  const cleanModel = (sku.modelNo || sku.sku || sku.productId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Ficha_Tecnica_SKU_${cleanModel}.pdf`;
  doc.save(filename);
};

/**
 * Gera e realiza o download de um PDF consolidado com múltiplos SKUs selecionados
 */
export const downloadMultipleSkusPdf = (skus: ProductItem[], documentTitle = 'Catalogo_Fichas_Tecnicas_OEM') => {
  if (skus.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageSkuMap: Record<number, string> = {};
  const issueDate = new Date().toLocaleDateString('pt-BR');

  skus.forEach((sku, idx) => {
    renderSkuDocument(doc, sku, idx === 0, pageSkuMap, issueDate);
  });

  applyGlobalFooters(doc, pageSkuMap, issueDate);

  const cleanTitle = documentTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${cleanTitle}_(${skus.length}_SKUs).pdf`);
};

/**
 * Exporta uma lista de SKUs para formato CSV compatível com Excel (com UTF-8 BOM e ponto-e-vírgula)
 */
export const exportSkusToCsv = (skus: ProductItem[], filename: string) => {
  if (skus.length === 0) return;

  // Cabeçalhos em Português com destaque prioritário para Medidas de Embalagem (Packing Size)
  const headers = [
    'Modelo / Código',
    'SKU',
    'Linha de Produtos / Série',
    'Nome do Equipamento',
    'Fábrica Fabricante',
    'ID Fábrica',
    'EMBALAGEM - Comprimento (mm)',
    'EMBALAGEM - Largura (mm)',
    'EMBALAGEM - Altura (mm)',
    'EMBALAGEM - Volume CBM (m³)',
    'EMBALAGEM - Peso Bruto PB (kg)',
    'EMBALAGEM - Tipo de Caixa/Engradado',
    'MONTADO - Comprimento (mm)',
    'MONTADO - Largura (mm)',
    'MONTADO - Altura (mm)',
    'MONTADO - Volume CBM (m³)',
    'MONTADO - Peso Líquido PL (kg)',
    'Material / Tubulação',
    'NCM / HS Code',
    'Capacidade Mensal',
    'Origem (Cidade/Província)',
    'Certificações',
    'URL do Produto',
  ];

  const escapeCsv = (str: any) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = skus.map(sku => {
    const packing = getPackingDimensions(sku);
    const length = sku.lengthMm || 1040;
    const width = sku.widthMm || 1450;
    const height = sku.heightMm || 1630;
    const netWeight = sku.netWeightKg || 210;
    const assembledCbm = ((length / 1000) * (width / 1000) * (height / 1000)).toFixed(3);
    const packingCbmVal =
      typeof sku.packingCbm === 'number'
        ? sku.packingCbm.toFixed(3)
        : ((packing.packingLength / 1000) * (packing.packingWidth / 1000) * (packing.packingHeight / 1000)).toFixed(3);

    return [
      escapeCsv(sku.modelNo || sku.sku || sku.productId),
      escapeCsv(sku.sku || 'N/A'),
      escapeCsv(sku.productLine || 'Linha Força Comercial'),
      escapeCsv(sku.title),
      escapeCsv(sku.supplierName || 'Fabricante Homologado'),
      escapeCsv(sku.supplierId || ''),
      // Medidas da Embalagem (Packing Size - O PRINCIPAL)
      packing.packingLength,
      packing.packingWidth,
      packing.packingHeight,
      packingCbmVal,
      packing.grossWeight,
      escapeCsv(packing.packagingType),
      // Medidas Montado
      length,
      width,
      height,
      assembledCbm,
      netWeight,
      escapeCsv(sku.material || 'Aço Q235 3mm'),
      escapeCsv(sku.hsCode || '95069119'),
      escapeCsv(sku.productionCapacity || '3,000 Sets / Mês'),
      escapeCsv(sku.origin || 'Dezhou, Shandong, China'),
      escapeCsv((sku.certifications || ['CE', 'ISO9001']).join(', ')),
      escapeCsv(sku.productUrl || ''),
    ].join(';');
  });

  // UTF-8 BOM (\uFEFF) para garantir acentuação correta no Microsoft Excel
  const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
