import React, { useState } from 'react';
import {
  Factory,
  Boxes,
  Package,
  Ruler,
  Weight,
  Layers,
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Download,
  Info,
  Maximize2,
  X,
  Network,
  CheckCircle2,
  GitBranch,
  FileSpreadsheet,
  CheckSquare,
  Square,
  RefreshCw,
  Container,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { SupplierItem, ProductItem } from '../types.ts';
import {
  downloadSkuPdf,
  downloadMultipleSkusPdf,
  exportSkusToCsv,
  calculateCbm,
  getPackingDimensions,
} from '../lib/exportUtils.ts';
import { Button } from './ui/button.tsx';
import { Badge } from './ui/badge.tsx';
import {
  SupplierFilterPanel,
  CAPABILITY_PRESETS,
  CERTIFICATION_PRESETS,
} from './SupplierFilterPanel.tsx';

interface FactoryLinesCatalogProps {
  suppliers: SupplierItem[];
  products: ProductItem[];
  loading: boolean;
  onRefresh: () => void;
  onOpenCommercial: (supplierId: string) => void;
  globalQuery: string;
}

export const FactoryLinesCatalog: React.FC<FactoryLinesCatalogProps> = ({
  suppliers,
  products,
  loading,
  onRefresh,
  onOpenCommercial,
  globalQuery,
}) => {
  const [expandedFactoryId, setExpandedFactoryId] = useState<string | null>(null);
  const [selectedSkuDetail, setSelectedSkuDetail] = useState<ProductItem | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'tree' | 'hs_focus'>('hs_focus');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  // Estados de Filtro Multi-Select por Capacidade Fabril e Certificação
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [oemOdmOnly, setOemOdmOnly] = useState<boolean>(false);
  const [isFilterPanelExpanded, setIsFilterPanelExpanded] = useState<boolean>(false);

  const toggleCapability = (capId: string) => {
    setSelectedCapabilities(prev =>
      prev.includes(capId) ? prev.filter(c => c !== capId) : [...prev, capId]
    );
  };

  const toggleCertification = (certId: string) => {
    setSelectedCertifications(prev =>
      prev.includes(certId) ? prev.filter(c => c !== certId) : [...prev, certId]
    );
  };

  const resetFilters = () => {
    setSelectedCapabilities([]);
    setSelectedCertifications([]);
    setOemOdmOnly(false);
  };

  // Ordena para que BRTW (fábrica solicitada pelo usuário) apareça em primeiro lugar
  const sortedSuppliers = [...suppliers].sort((a, b) => {
    if (a.supplierId === 'sup_brtw_baodelong') return -1;
    if (b.supplierId === 'sup_brtw_baodelong') return 1;
    return 0;
  });

  // Agrupa produtos por fábrica e por linha de produção
  const factoriesWithLines = sortedSuppliers.map(supplier => {
    const factoryProducts = products.filter(
      p => p.supplierId === supplier.supplierId || p.supplierName?.toLowerCase().includes(supplier.supplierName.toLowerCase().slice(0, 10))
    );

    // Agrupa por linha
    const linesMap = new Map<string, ProductItem[]>();
    factoryProducts.forEach(prod => {
      const lineName = prod.productLine || 'Linha Geral de Força';
      if (!linesMap.has(lineName)) {
        linesMap.set(lineName, []);
      }
      linesMap.get(lineName)!.push(prod);
    });

    // Ordena as linhas para colocar "2025 New HS Series" no topo da BRTW
    const lines = Array.from(linesMap.entries())
      .map(([lineName, items]) => {
        const sortedItems = [...items].sort((a, b) =>
          (a.modelNo || '').localeCompare(b.modelNo || '', undefined, { numeric: true })
        );
        return {
          lineName,
          items: sortedItems,
        };
      })
      .sort((a, b) => {
        if (a.lineName.includes('2025 New HS Series')) return -1;
        if (b.lineName.includes('2025 New HS Series')) return 1;
        return 0;
      });

    return {
      supplier,
      lines,
      factoryProducts,
      totalSkus: factoryProducts.length,
    };
  });

  // Filtra por query, modo de foco e pelos filtros de capacidades e certificações
  const filteredFactories = factoriesWithLines.filter(({ supplier, lines, factoryProducts }) => {
    if (viewMode === 'hs_focus') {
      return supplier.supplierId === 'sup_brtw_baodelong';
    }

    // 1. Filtro de Capacidades Fabris (Multi-Select AND: todas as capacidades marcadas devem ser atendidas)
    if (selectedCapabilities.length > 0) {
      const satisfiesCapabilities = selectedCapabilities.every(capId => {
        const preset = CAPABILITY_PRESETS.find(p => p.id === capId);
        return preset ? preset.check(supplier, factoryProducts) : true;
      });
      if (!satisfiesCapabilities) return false;
    }

    // 2. Filtro de Certificações Internacionais (Multi-Select AND: todas as certificações marcadas devem estar presentes)
    if (selectedCertifications.length > 0) {
      const satisfiesCertifications = selectedCertifications.every(certId => {
        const preset = CERTIFICATION_PRESETS.find(p => p.id === certId);
        return preset ? preset.check(supplier, factoryProducts) : true;
      });
      if (!satisfiesCertifications) return false;
    }

    // 3. Filtro OEM/ODM Homologado
    if (oemOdmOnly) {
      if (!supplier.oemAvailable || !supplier.customizationAvailable) {
        return false;
      }
    }

    // 4. Filtro de Busca Textual Global
    if (!globalQuery.trim()) return true;
    const q = globalQuery.toLowerCase();
    const matchSupplier =
      supplier.supplierName.toLowerCase().includes(q) ||
      supplier.businessType?.toLowerCase().includes(q);
    const matchLineOrSku = lines.some(l =>
      l.lineName.toLowerCase().includes(q) ||
      l.items.some(it =>
        it.title.toLowerCase().includes(q) ||
        (it.modelNo && it.modelNo.toLowerCase().includes(q)) ||
        (it.description && it.description.toLowerCase().includes(q)) ||
        (it.hsCode && it.hsCode.toLowerCase().includes(q))
      )
    );
    return matchSupplier || matchLineOrSku;
  });

  // Checkbox handlers
  const toggleSkuSelection = (productId: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleSelectAllInLine = (items: ProductItem[]) => {
    const allSelected = items.every(item => selectedProductIds.has(item.productId));
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        items.forEach(item => next.delete(item.productId));
      } else {
        items.forEach(item => next.add(item.productId));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedProductIds(new Set());
  };

  // Itens atualmente selecionados
  const selectedSkus = products.filter(p => selectedProductIds.has(p.productId));

  // Métricas logísticas consolidadas dos SKUs selecionados (Foco: Medidas na Embalagem / Packing Size)
  const selectedTotalPackingCbm = selectedSkus.reduce((acc, sku) => {
    const p = getPackingDimensions(sku);
    const cbmVal = typeof sku.packingCbm === 'number'
      ? sku.packingCbm
      : parseFloat(((p.packingLength / 1000) * (p.packingWidth / 1000) * (p.packingHeight / 1000)).toFixed(3));
    return acc + cbmVal;
  }, 0);

  const selectedTotalGrossWeight = selectedSkus.reduce((acc, sku) => {
    const p = getPackingDimensions(sku);
    return acc + p.grossWeight;
  }, 0);

  const handleDownloadSelectedPdf = () => {
    if (selectedSkus.length === 0) return;
    downloadMultipleSkusPdf(selectedSkus, `Fichas_Tecnicas_Selecionadas_${selectedSkus.length}_SKUs`);
  };

  const handleExportSelectedCsv = () => {
    if (selectedSkus.length === 0) return;
    exportSkusToCsv(selectedSkus, `Exportacao_SKUs_Selecionados_(${selectedSkus.length})`);
  };

  return (
    <div className="w-full space-y-6 pb-24">
      {/* Banner Superior Lovable SaaS Style - Fundo Claro (#FAFAF9) & Cartão Branco (#FFFFFF) */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-app)] bg-[var(--bg-card)] p-6 shadow-xs backdrop-blur-xl transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-[var(--border-app)]">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs py-0.5 px-2.5 rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-app)]">
                <GitBranch className="w-3.5 h-3.5 text-[#C2410C] dark:text-[#F28C5B]" />
                Árvore de Extração Normalizada
              </span>
              <Badge variant="emerald" className="text-xs py-0.5">
                PDF Individual &bull; CSV por Linha &bull; Seleção em Lote
              </Badge>
              <Badge variant="amber" className="text-xs py-0.5">
                📦 Medidas na Embalagem (Packing Size) Integradas
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Catálogo de Engenharia &amp; Homologação OEM
            </h2>
            <p className="text-xs text-[var(--text-secondary)] max-w-4xl leading-relaxed">
              Estrutura hierárquica por <strong>Fábrica &rarr; Linha de Produção &rarr; SKUs</strong> com dimensões de embalagem (<em className="text-amber-700 dark:text-amber-300 not-italic font-semibold">Packing Size para frete/container</em>) e medidas montado. Exporte relatórios em PDF A4 sem corte de texto ou planilhas CSV por item, linha ou seleção.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={onRefresh}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>Atualizar Dados</span>
            </Button>
          </div>
        </div>

        {/* 3 Cartões de Navegação Visual Rápida */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-5">
          <div className="bg-[var(--bg-surface)] p-3.5 rounded-xl border border-[var(--border-app)] transition">
            <div className="text-[10px] font-mono text-[#C2410C] dark:text-[#F28C5B] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Factory className="w-3.5 h-3.5" />
              <span>Nível 1 &bull; Fábrica Homologada</span>
            </div>
            <div className="font-semibold text-[var(--text-primary)] text-sm truncate">SHANDONG BAODELONG FITNESS</div>
            <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5 font-mono">
              https://brtw-fitness.en.made-in-china.com/
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] p-3.5 rounded-xl border border-[var(--border-app)] transition">
            <div className="text-[10px] font-mono text-amber-700 dark:text-amber-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5" />
              <span>Nível 2 &bull; Linha de Produtos</span>
            </div>
            <div className="font-semibold text-amber-800 dark:text-amber-300 text-sm truncate">2025 New HS Series (12 SKUs)</div>
            <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5 font-mono">
              product-group/.../2025-New-HS-Series-catalog-1.html
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] p-3.5 rounded-xl border border-[var(--border-app)] transition">
            <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              <span>Nível 3 &bull; Item &amp; Embalagem (Packing)</span>
            </div>
            <div className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm truncate">HS01 &bull; Vertical Chest Press</div>
            <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5 font-mono">
              Caixa: 1680&times;920&times;660mm &bull; 1.020 m³ &bull; PB: 245kg
            </div>
          </div>
        </div>

        {/* Barra de Seleção de Visualização Segmentada */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-app)]">
          <div className="inline-flex p-1 bg-[var(--bg-surface)] border border-[var(--border-app)] rounded-xl gap-1">
            <button
              onClick={() => setViewMode('hs_focus')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'hs_focus'
                  ? 'bg-[var(--bg-card)] text-[#C2410C] dark:text-[#F28C5B] border border-[var(--border-app)] shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C2410C] dark:text-[#F28C5B]" />
              <span>⭐ Linha 2025 New HS Series (BRTW)</span>
            </button>

            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'tree'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs border border-[var(--border-app)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Network className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Árvore de Extração (Tree View)</span>
            </button>

            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs border border-[var(--border-app)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Todas as 5 Fábricas &amp; Linhas</span>
            </button>
          </div>

          <div className="text-xs font-mono text-[var(--text-secondary)]">
            {selectedProductIds.size > 0 ? (
              <span className="text-[#C2410C] dark:text-[#F28C5B] font-semibold">
                {selectedProductIds.size} SKU(s) selecionados para exportação
              </span>
            ) : (
              <span>Selecione checkboxes nas linhas para ações e exportação em lote</span>
            )}
          </div>
        </div>
      </div>

      {/* Painel Multi-Select de Filtros: Capacidades Fabris & Certificações */}
      <SupplierFilterPanel
        suppliers={suppliers}
        products={products}
        selectedCapabilities={selectedCapabilities}
        onToggleCapability={toggleCapability}
        selectedCertifications={selectedCertifications}
        onToggleCertification={toggleCertification}
        oemOdmOnly={oemOdmOnly}
        onToggleOemOdmOnly={() => setOemOdmOnly(!oemOdmOnly)}
        onResetFilters={resetFilters}
        totalFilteredCount={filteredFactories.length}
        totalSuppliersCount={factoriesWithLines.length}
        isExpanded={isFilterPanelExpanded}
        onToggleExpanded={() => setIsFilterPanelExpanded(!isFilterPanelExpanded)}
      />

      {/* Alerta de Nenhum Resultado Encontrado pelos Filtros */}
      {filteredFactories.length === 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-[#C2410C] flex items-center justify-center mx-auto border border-amber-500/20">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            Nenhuma fábrica atende a todos os critérios selecionados
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
            Tente remover alguns filtros de capacidade fabril ou certificação para expandir os resultados do catálogo.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="gap-1.5 text-xs text-[#C2410C]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Redefinir Todos os Filtros</span>
          </Button>
        </div>
      )}

      {/* VIEW MODE 1: VISUALIZAÇÃO EM ÁRVORE HIERÁRQUICA ESTRUTURADA */}
      {viewMode === 'tree' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-app)]">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Network className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <span>Navegador Hierárquico de Extração (Fábrica &rarr; Linha &rarr; SKUs)</span>
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Visualize os dados hierarquizados e baixe fichas técnicas individuais ou em lote.
              </p>
            </div>
            <Button
              onClick={() => setViewMode('cards')}
              variant="outline"
              size="sm"
            >
              Ver em modo tabelas
            </Button>
          </div>

          <div className="space-y-6 text-xs">
            {filteredFactories.map(({ supplier, lines }) => (
              <div key={supplier.supplierId} className="space-y-3 bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-app)]">
                {/* Nível 1: Fábrica */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-app)]">
                  <div className="flex items-center gap-2.5">
                    <Factory className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span className="font-bold text-[var(--text-primary)] text-base">
                      {supplier.supplierName}
                    </span>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {supplier.plantAreaSqm?.toLocaleString()} m² &bull; {supplier.employees} colaboradores
                    </Badge>
                  </div>
                  <Button
                    onClick={() => onOpenCommercial(supplier.supplierId)}
                    variant="amber"
                    size="sm"
                    className="gap-1.5 font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Dados Comerciais</span>
                  </Button>
                </div>

                {/* Nível 2: Linhas */}
                <div className="pl-4 space-y-4 border-l-2 border-[var(--border-app)]">
                  {lines.map((line, lIdx) => (
                    <div key={lIdx} className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Boxes className={`w-4 h-4 shrink-0 ${line.lineName.includes('2025 New HS') ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-secondary)]'}`} />
                          <span className={`font-bold ${line.lineName.includes('2025 New HS') ? 'text-amber-800 dark:text-amber-300 text-sm' : 'text-[var(--text-primary)]'}`}>
                            {line.lineName}
                          </span>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {line.items.length} SKUs
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => exportSkusToCsv(line.items, `Linha_${line.lineName.replace(/[^a-zA-Z0-9_-]/g, '_')}`)}
                            variant="emerald"
                            size="sm"
                            className="gap-1 font-medium"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>CSV da Linha</span>
                          </Button>
                          <Button
                            onClick={() => downloadMultipleSkusPdf(line.items, `Fichas_Tecnicas_${line.lineName.replace(/[^a-zA-Z0-9_-]/g, '_')}`)}
                            variant="destructive"
                            size="sm"
                            className="gap-1 font-medium"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>PDF da Linha</span>
                          </Button>
                        </div>
                      </div>

                      {/* Nível 3: SKUs da Linha */}
                      <div className="pl-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 border-l border-[var(--border-app)]">
                        {line.items.map(sku => {
                          const p = getPackingDimensions(sku);
                          const isChecked = selectedProductIds.has(sku.productId);

                          return (
                            <div
                              key={sku.productId}
                              className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                                isChecked
                                  ? 'bg-[#C2410C]/5 border-[#C2410C]/50 shadow-xs'
                                  : sku.modelNo === 'HS01'
                                  ? 'bg-amber-500/10 border-amber-500/40'
                                  : 'bg-[var(--bg-card)] border-[var(--border-app)] hover:border-[var(--text-secondary)]/30'
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-1 mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleSkuSelection(sku.productId)}
                                      className="w-4 h-4 rounded text-[#C2410C] border-[var(--border-app)] focus:ring-[#C2410C] cursor-pointer"
                                    />
                                    <span className="font-mono font-bold text-[#C2410C] dark:text-[#F28C5B] text-xs">
                                      {sku.modelNo}
                                    </span>
                                  </div>
                                  {sku.modelNo === 'HS01' && (
                                    <Badge variant="amber" className="text-[9px] py-0 px-1 font-bold">
                                      URL Fornecida
                                    </Badge>
                                  )}
                                </div>

                                <div
                                  onClick={() => setSelectedSkuDetail(sku)}
                                  className="text-xs text-[var(--text-primary)] line-clamp-2 font-medium cursor-pointer hover:text-[#C2410C] transition"
                                >
                                  {sku.title}
                                </div>

                                {/* Medidas de Embalagem (Packing Size - Destaque Principal) */}
                                <div className="mt-2.5 pt-2 border-t border-[var(--border-app)] space-y-1 font-mono text-[10px]">
                                  <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 font-medium bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                                    <span className="flex items-center gap-1">
                                      <Package className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                      <span>Caixa: {p.packingLength}×{p.packingWidth}×{p.packingHeight}mm</span>
                                    </span>
                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">{p.packingCbm}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[var(--text-secondary)] px-0.5">
                                    <span>Montado: {(sku.lengthMm || 1040)}×{(sku.widthMm || 1450)}×{(sku.heightMm || 1630)}mm</span>
                                    <span className="font-medium text-[var(--text-primary)]">PL: {sku.netWeightKg || 210}kg</span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 pt-2.5 border-t border-[var(--border-app)] flex items-center justify-end gap-1.5">
                                <Button
                                  onClick={() => downloadSkuPdf(sku)}
                                  variant="destructive"
                                  size="sm"
                                  className="h-6 px-2 text-[10px]"
                                >
                                  PDF
                                </Button>
                                <Button
                                  onClick={() => exportSkusToCsv([sku], `SKU_${sku.modelNo || sku.productId}`)}
                                  variant="emerald"
                                  size="sm"
                                  className="h-6 px-2 text-[10px]"
                                >
                                  CSV
                                </Button>
                                <Button
                                  onClick={() => setSelectedSkuDetail(sku)}
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 text-[10px]"
                                >
                                  Ficha
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW MODE 2 & 3: TABELAS EXPANDIDAS SEM BARRA DE ROLAGEM */}
      {viewMode !== 'tree' && (
        <div className="space-y-6">
          {filteredFactories.map(({ supplier, lines, factoryProducts, totalSkus }, factoryIndex) => {
            const isExpanded = expandedFactoryId === supplier.supplierId || expandedFactoryId === null;

            return (
              <div
                key={supplier.supplierId}
                className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-2xl shadow-xs overflow-hidden transition-all duration-200"
              >
                {/* Header do Card da Fábrica */}
                <div className="p-5 bg-[var(--bg-surface)] border-b border-[var(--border-app)]">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="cyan" className="font-mono text-[10px]">
                          Fábrica #{factoryIndex + 1}
                        </Badge>
                        <span className="text-xs text-[var(--text-secondary)] font-mono">
                          ID: {supplier.supplierId}
                        </span>
                        {supplier.foundedDate && (
                          <span className="text-xs text-[var(--text-secondary)] font-medium">
                            &bull; Fundada em {supplier.foundedDate}
                          </span>
                        )}
                        <Badge variant="emerald" className="text-[10px]">
                          {totalSkus} SKUs Estruturados
                        </Badge>
                        {supplier.supplierId === 'sup_brtw_baodelong' && (
                          <Badge variant="amber" className="text-[10px] gap-1 font-bold">
                            <Sparkles className="w-3 h-3" />
                            Fábrica Solicitada
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                        {supplier.supplierName}
                      </h3>

                      <p className="text-xs text-[var(--text-secondary)] flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Segmento: <strong className="text-[var(--text-primary)]">{supplier.businessType}</strong></span>
                        <span>&bull;</span>
                        <span>Área Fabril: <strong className="text-[var(--text-primary)]">{supplier.plantAreaSqm?.toLocaleString()} m²</strong></span>
                        <span>&bull;</span>
                        <span>Equipe: <strong className="text-[var(--text-primary)]">{supplier.employees} colaboradores</strong></span>
                        <span>&bull;</span>
                        <span>Linhas de Montagem: <strong className="text-cyan-700 dark:text-cyan-400">{supplier.productionLines} linhas</strong></span>
                      </p>
                    </div>

                    {/* Botões de Ação para a Fábrica */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={() => exportSkusToCsv(factoryProducts, `Fabrica_${supplier.supplierName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Todos_SKUs`)}
                        variant="emerald"
                        size="sm"
                        className="gap-1.5 font-medium"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>CSV de Todos os SKUs ({totalSkus})</span>
                      </Button>

                      <Button
                        onClick={() => onOpenCommercial(supplier.supplierId)}
                        variant="amber"
                        size="sm"
                        className="gap-1.5 font-bold"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Dados Comerciais &amp; Compra</span>
                      </Button>

                      <Button
                        onClick={() =>
                          setExpandedFactoryId(
                            expandedFactoryId === supplier.supplierId ? 'none' : supplier.supplierId
                          )
                        }
                        variant="outline"
                        size="sm"
                        className="gap-1"
                      >
                        <span>{isExpanded ? 'Recolher Linhas' : 'Expandir Linhas'}</span>
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Resumo de Maquinário Industrial & Capacidades */}
                  {supplier.productionMachines && supplier.productionMachines.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--border-app)] flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-[var(--text-secondary)] font-semibold mr-1">Maquinário Homologado:</span>
                      {supplier.productionMachines.map((m, mIdx) => (
                        <span
                          key={mIdx}
                          className="px-2 py-0.5 bg-[var(--bg-card)] border border-[var(--border-app)] text-[var(--text-secondary)] rounded font-mono text-[10px]"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Badges de Certificações & Capacidades Atendidas da Fábrica */}
                  <div className="mt-2.5 pt-2.5 border-t border-[var(--border-app)] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[var(--text-secondary)] font-semibold text-[10px] uppercase">
                        Conformidade &amp; Normas:
                      </span>
                      {CERTIFICATION_PRESETS.filter(cert => cert.check(supplier, factoryProducts)).map(cert => (
                        <Badge
                          key={cert.id}
                          variant={cert.badgeVariant}
                          className="text-[10px] py-0 px-1.5 font-medium"
                        >
                          {cert.id}
                        </Badge>
                      ))}
                      {supplier.inspectionType && (
                        <span className="text-[10px] text-[var(--text-secondary)] italic truncate max-w-sm" title={supplier.inspectionType}>
                          &bull; {supplier.inspectionType}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {supplier.oemAvailable && (
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          OEM Homologado
                        </span>
                      )}
                      {supplier.odmAvailable && (
                        <span className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                          ODM Disponível
                        </span>
                      )}
                      {supplier.customizationAvailable && (
                        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Personalização Total
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Corpo do Card: Linhas de Produtos & Tabelas sem Barra de Rolagem */}
                {isExpanded && (
                  <div className="p-5 space-y-6 bg-[var(--bg-card)]">
                    {lines.map(({ lineName, items }, lineIndex) => {
                      const isTargetLine = lineName.includes('2025 New HS');
                      const allInLineSelected = items.every(item => selectedProductIds.has(item.productId));

                      return (
                        <div
                          key={lineIndex}
                          className={`rounded-2xl p-5 shadow-xs space-y-4 border ${
                            isTargetLine
                              ? 'bg-[var(--bg-card)] border-amber-500/40 shadow-sm shadow-amber-500/5'
                              : 'bg-[var(--bg-card)] border-[var(--border-app)]'
                          }`}
                        >
                          {/* Linha / Série Header com Ações de Linha Total */}
                          <div className="flex flex-wrap items-center justify-between pb-3.5 border-b border-[var(--border-app)] gap-3">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <Boxes className={`w-4.5 h-4.5 ${isTargetLine ? 'text-amber-600 dark:text-amber-400' : 'text-cyan-600 dark:text-cyan-400'}`} />
                              <h4 className={`font-bold tracking-wide ${isTargetLine ? 'text-amber-800 dark:text-amber-300 text-base' : 'text-[var(--text-primary)] text-sm'}`}>
                                {lineName}
                              </h4>
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {items.length} {items.length === 1 ? 'modelo' : 'modelos'}
                              </Badge>
                              {isTargetLine && (
                                <Badge variant="amber" className="text-[10px] font-bold">
                                  ⭐ Linha Prioritária Solicitada
                                </Badge>
                              )}
                            </div>

                            {/* Ações em Lote para esta Linha Total */}
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Botão Checkbox: Selecionar Todos da Linha */}
                              <Button
                                onClick={() => toggleSelectAllInLine(items)}
                                variant="outline"
                                size="sm"
                                className={`gap-1.5 ${allInLineSelected ? 'border-[#C2410C] bg-[#C2410C]/10 text-[#C2410C]' : ''}`}
                              >
                                {allInLineSelected ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-[#C2410C]" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                                )}
                                <span>
                                  {allInLineSelected ? 'Desmarcar Linha' : `Selecionar Linha (${items.length})`}
                                </span>
                              </Button>

                              {/* CSV por Linha Total */}
                              <Button
                                onClick={() => exportSkusToCsv(items, `Linha_Total_${lineName.replace(/[^a-zA-Z0-9_-]/g, '_')}`)}
                                variant="emerald"
                                size="sm"
                                className="gap-1.5 font-medium"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>CSV Linha Total</span>
                              </Button>

                              {/* PDF consolidado da Linha */}
                              <Button
                                onClick={() => downloadMultipleSkusPdf(items, `Catalogo_Linha_${lineName.replace(/[^a-zA-Z0-9_-]/g, '_')}`)}
                                variant="destructive"
                                size="sm"
                                className="gap-1.5 font-medium"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>PDF Linha Total</span>
                              </Button>
                            </div>
                          </div>

                          {/* TABELA DE SKUs EXPANDIDA E AJUSTADA: ZERO SCROLLBAR HORIZONTAL */}
                          <div className="w-full overflow-hidden rounded-xl border border-[var(--border-app)]">
                            <table className="w-full text-left text-xs table-fixed">
                              <thead className="bg-[var(--bg-surface)] text-[var(--text-secondary)] font-mono border-b border-[var(--border-app)] text-[11px]">
                                <tr>
                                  <th className="p-2.5 w-9 text-center">
                                    <input
                                      type="checkbox"
                                      checked={allInLineSelected}
                                      onChange={() => toggleSelectAllInLine(items)}
                                      className="w-4 h-4 rounded text-[#C2410C] border-[var(--border-app)] focus:ring-[#C2410C] cursor-pointer"
                                      title="Selecionar todos os SKUs desta linha"
                                    />
                                  </th>
                                  <th className="p-2.5 w-[110px]">Modelo / SKU</th>
                                  <th className="p-2.5 w-auto min-w-[140px]">Descrição Técnica</th>
                                  <th className="p-2.5 w-[210px] bg-amber-500/10 text-amber-800 dark:text-amber-300 border-x border-amber-500/20">
                                    <div className="flex items-center gap-1 font-bold">
                                      <Package className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                      <span>📦 Embalagem (Packing Size)</span>
                                    </div>
                                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-normal">Caixa C×L×A • CBM • PB</span>
                                  </th>
                                  <th className="p-2.5 w-[170px] text-[var(--text-primary)]">
                                    <div className="flex items-center gap-1 font-bold">
                                      <Ruler className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                                      <span>🏋️ Montado (Assembled)</span>
                                    </div>
                                    <span className="text-[10px] text-[var(--text-secondary)] font-normal">C×L×A mm • Peso Líquido</span>
                                  </th>
                                  <th className="p-2.5 w-[125px]">Tipo da Embalagem</th>
                                  <th className="p-2.5 w-[75px] text-center font-mono">NCM</th>
                                  <th className="p-2.5 w-[115px] text-center">Exportar</th>
                                  <th className="p-2.5 w-[65px] text-right">Ação</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--border-app)] font-sans">
                                {items.map(sku => {
                                  const p = getPackingDimensions(sku);
                                  const length = sku.lengthMm || 1040;
                                  const width = sku.widthMm || 1450;
                                  const height = sku.heightMm || 1630;
                                  const netWeight = sku.netWeightKg || 210;
                                  const packaging = p.packagingType;
                                  const isProvidedUrlItem = sku.modelNo === 'HS01';
                                  const isChecked = selectedProductIds.has(sku.productId);

                                  return (
                                    <tr
                                      key={sku.productId}
                                      className={`transition group ${
                                        isChecked
                                          ? 'bg-[#C2410C]/5 hover:bg-[#C2410C]/10'
                                          : isProvidedUrlItem
                                          ? 'bg-amber-500/5 hover:bg-amber-500/10'
                                          : 'hover:bg-[var(--bg-surface)]'
                                      }`}
                                    >
                                      {/* Checkbox Linha a Linha */}
                                      <td className="p-2.5 text-center">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => toggleSkuSelection(sku.productId)}
                                          className="w-4 h-4 rounded text-[#C2410C] border-[var(--border-app)] focus:ring-[#C2410C] cursor-pointer"
                                        />
                                      </td>

                                      {/* SKU / Modelo */}
                                      <td className="p-2.5">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-mono font-bold text-[#C2410C] dark:text-[#F28C5B] text-xs">
                                            {sku.modelNo || sku.sku || sku.productId}
                                          </span>
                                          {isProvidedUrlItem && (
                                            <span className="px-1 py-0.2 text-[9px] bg-amber-500 text-white font-bold rounded">
                                              URL
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-[var(--text-secondary)] font-mono truncate">
                                          {sku.sku || 'N/A'}
                                        </div>
                                      </td>

                                      {/* Descrição Técnica */}
                                      <td className="p-2.5">
                                        <div
                                          onClick={() => setSelectedSkuDetail(sku)}
                                          className="font-medium text-[var(--text-primary)] truncate group-hover:text-[#C2410C] transition cursor-pointer text-xs"
                                          title={sku.title}
                                        >
                                          {sku.title}
                                        </div>
                                        <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5" title={sku.description || ''}>
                                          {sku.description}
                                        </div>
                                      </td>

                                      {/* 📦 Medidas da Embalagem (Packing Size - O PRINCIPAL) */}
                                      <td className="p-2.5 font-mono text-[11px] bg-amber-500/5 border-x border-amber-500/20">
                                        <div className="text-amber-800 dark:text-amber-200 font-bold tabular-nums">
                                          {p.packingLength} &times; {p.packingWidth} &times; {p.packingHeight} mm
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1">
                                          <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold tabular-nums">
                                            CBM: {p.packingCbm}
                                          </span>
                                          <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium tabular-nums">
                                            PB: {p.grossWeight} kg
                                          </span>
                                        </div>
                                      </td>

                                      {/* 🏋️ Medidas do Equipamento Montado */}
                                      <td className="p-2.5 font-mono text-[11px]">
                                        <div className="text-[var(--text-primary)] font-medium tabular-nums">
                                          {length} &times; {width} &times; {height} mm
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[var(--text-secondary)]">
                                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">PL: {netWeight} kg</span>
                                          <span>&bull;</span>
                                          <span className="tabular-nums">{calculateCbm(length, width, height)}</span>
                                        </div>
                                      </td>

                                      {/* Embalagem */}
                                      <td className="p-2.5 text-[11px] text-[var(--text-primary)]">
                                        <div className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300 truncate">
                                          <Package className="w-3.5 h-3.5 shrink-0" />
                                          <span className="truncate" title={packaging}>
                                            {packaging}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">
                                          Padrão fumigado
                                        </div>
                                      </td>

                                      {/* NCM / HS Code */}
                                      <td className="p-2.5 font-mono text-[11px] text-[var(--text-secondary)] text-center">
                                        {sku.hsCode || '95069119'}
                                      </td>

                                      {/* Botões Rápidos de Exportação por LinhaSKU (PDF e CSV) */}
                                      <td className="p-2.5 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <Button
                                            onClick={() => downloadSkuPdf(sku)}
                                            variant="destructive"
                                            size="sm"
                                            className="h-6.5 px-2 text-[10px] gap-1 font-semibold"
                                            title="Baixar Ficha Técnica em PDF deste SKU"
                                          >
                                            <FileText className="w-3 h-3" />
                                            <span>PDF</span>
                                          </Button>
                                          <Button
                                            onClick={() => exportSkusToCsv([sku], `SKU_${sku.modelNo || sku.productId}`)}
                                            variant="emerald"
                                            size="sm"
                                            className="h-6.5 px-2 text-[10px] gap-1 font-semibold"
                                            title="Baixar arquivo CSV deste SKU"
                                          >
                                            <FileSpreadsheet className="w-3 h-3" />
                                            <span>CSV</span>
                                          </Button>
                                        </div>
                                      </td>

                                      {/* Ação: Ver Ficha Técnica Completa */}
                                      <td className="p-2.5 text-right">
                                        <Button
                                          onClick={() => setSelectedSkuDetail(sku)}
                                          variant="outline"
                                          size="sm"
                                          className="h-6.5 px-2 text-[10px] font-medium"
                                        >
                                          Ficha
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* BARRA FIXA DE AÇÃO EM LOTE PARA SKUS SELECIONADOS - BOTÃO PRINCIPAL EM LARANJA (#C2410C) */}
      {selectedProductIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--bg-card)]/95 border-2 border-[#C2410C] rounded-2xl shadow-2xl px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs backdrop-blur-xl animate-in slide-in-from-bottom duration-200 max-w-5xl w-[95vw]">
          <div className="flex items-center gap-3.5">
            <span className="w-8 h-8 rounded-full bg-[#C2410C] text-white font-bold flex items-center justify-center text-sm shadow">
              {selectedProductIds.size}
            </span>
            <div>
              <div className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
                <span>{selectedProductIds.size} SKU{selectedProductIds.size > 1 ? 's' : ''} Selecionado{selectedProductIds.size > 1 ? 's' : ''}</span>
                <Badge variant="amber" className="font-mono text-xs py-0.5">
                  📦 Cubagem Total: {selectedTotalPackingCbm.toFixed(3)} m³
                </Badge>
                <Badge variant="emerald" className="font-mono text-xs py-0.5">
                  PB Total: {selectedTotalGrossWeight} kg
                </Badge>
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-mono">
                Ocupação estimada: ~{Math.round((selectedTotalPackingCbm / 28) * 100)}% de 20GP (28m³) &bull; ~{Math.round((selectedTotalPackingCbm / 68) * 100)}% de 40HQ (68m³)
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleDownloadSelectedPdf}
              variant="destructive"
              size="default"
              className="font-bold gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>Gerar PDF ({selectedProductIds.size} Fichas)</span>
            </Button>

            {/* Botão Principal da Marca em Laranja com Texto Branco (5,2:1) */}
            <Button
              onClick={handleExportSelectedCsv}
              variant="primary"
              size="default"
              className="font-bold gap-1.5 shadow-md shadow-[#C2410C]/25"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Baixar CSV Selecionados ({selectedProductIds.size})</span>
            </Button>

            <Button
              onClick={clearSelection}
              variant="outline"
              size="default"
            >
              Limpar Seleção
            </Button>
          </div>
        </div>
      )}

      {/* MODAL DE FICHA TÉCNICA DETALHADA DO SKU LOVABLE STYLE */}
      {selectedSkuDetail && (() => {
        const packing = getPackingDimensions(selectedSkuDetail);
        const length = selectedSkuDetail.lengthMm || 1040;
        const width = selectedSkuDetail.widthMm || 1450;
        const height = selectedSkuDetail.heightMm || 1630;
        const netWeight = selectedSkuDetail.netWeightKg || 210;
        const pCbmNum = parseFloat(packing.packingCbm) || 1;
        const unitsIn20Gp = Math.floor(28 / pCbmNum);
        const unitsIn40Hq = Math.floor(68 / pCbmNum);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[var(--text-primary)]">
              {/* Header da Modal */}
              <div className="p-5 border-b border-[var(--border-app)] flex items-start justify-between bg-[var(--bg-surface)]">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--bg-card)] text-[#C2410C] dark:text-[#F28C5B] border border-[var(--border-app)] font-bold">
                      Modelo: {selectedSkuDetail.modelNo}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] font-mono">
                      Linha: {selectedSkuDetail.productLine || 'Força Comercial'}
                    </span>
                    {selectedSkuDetail.modelNo === 'HS01' && (
                      <Badge variant="amber" className="text-xs font-bold">
                        Item da URL Fornecida
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                    {selectedSkuDetail.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Fábrica: <strong className="text-[var(--text-primary)]">{selectedSkuDetail.supplierName}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSkuDetail(null)}
                  className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-card)] transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Conteúdo da Ficha Técnica */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
                {/* Barra de Ações Rápidas de Exportação dentro da Modal */}
                <div className="bg-[var(--bg-surface)] p-3.5 rounded-xl border border-[var(--border-app)] flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)] block">Exportar Documentação Oficial:</span>
                    <span className="text-[11px] text-[var(--text-secondary)] font-mono">Padrão vetorial A4 sem truncamento de texto</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => downloadSkuPdf(selectedSkuDetail)}
                      variant="destructive"
                      size="sm"
                      className="font-bold gap-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Baixar Ficha Técnica em PDF</span>
                    </Button>
                    <Button
                      onClick={() => exportSkusToCsv([selectedSkuDetail], `Ficha_Tecnica_SKU_${selectedSkuDetail.modelNo || selectedSkuDetail.productId}`)}
                      variant="emerald"
                      size="sm"
                      className="font-bold gap-1.5"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Exportar CSV deste SKU</span>
                    </Button>
                  </div>
                </div>

                {/* 📦 SEÇÃO PRINCIPAL DE DESTAQUE: MEDIDAS NA EMBALAGEM (PACKING SIZE) */}
                <div className="bg-amber-500/10 p-5 rounded-xl border-2 border-amber-500/50 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <Package className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                      <span className="font-bold text-amber-900 dark:text-amber-200 text-sm tracking-wide">
                        📦 MEDIDAS DA EMBALAGEM (PACKING SIZE / CAIXA DE TRANSPORTE)
                      </span>
                    </div>
                    <Badge variant="amber" className="text-[10px] font-mono">
                      Métrica primordial para frete marítimo, container e aduana
                    </Badge>
                  </div>

                  {/* 4 Cards da Embalagem */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                    <div className="bg-[var(--bg-card)] p-3.5 rounded-xl border border-amber-500/30">
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-semibold block">Caixa (C × L × A)</span>
                      <span className="text-base font-bold text-amber-900 dark:text-amber-200 tabular-nums">
                        {packing.packingLength} &times; {packing.packingWidth} &times; {packing.packingHeight} mm
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">Dimensões externas</span>
                    </div>

                    <div className="bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold block">Volume CBM Caixa</span>
                      <span className="text-base font-bold text-emerald-800 dark:text-emerald-300 tabular-nums">
                        {packing.packingCbm}
                      </span>
                      <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 block mt-0.5">Cubagem para contêiner</span>
                    </div>

                    <div className="bg-[var(--bg-card)] p-3.5 rounded-xl border border-amber-500/30">
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-semibold block">Peso Bruto (PB)</span>
                      <span className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                        {packing.grossWeight} kg
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">Aparelho + Engradado</span>
                    </div>

                    <div className="bg-[var(--bg-card)] p-3.5 rounded-xl border border-amber-500/30">
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-semibold block">Capacidade Contêiner</span>
                      <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 block tabular-nums">
                        20GP: ~{unitsIn20Gp} unidades
                      </span>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block tabular-nums">
                        40HQ: ~{unitsIn40Hq} unidades
                      </span>
                    </div>
                  </div>

                  {/* Detalhe do Tipo da Caixa */}
                  <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-app)] text-[11px] text-[var(--text-primary)] flex items-center justify-between">
                    <div>
                      <strong className="text-amber-800 dark:text-amber-300">Tipo de Embalagem:</strong> {packing.packagingType}
                    </div>
                    <span className="text-[var(--text-secondary)] font-mono text-[10px]">Padrão Marítimo Fumigado</span>
                  </div>
                </div>

                {/* 🏋️ SEÇÃO SECUNDÁRIA: EQUIPAMENTO MONTADO (ASSEMBLED SIZE) */}
                <div className="bg-[var(--bg-surface)] p-4.5 rounded-xl border border-[var(--border-app)] space-y-2.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-app)]">
                    <Ruler className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span className="font-bold text-[var(--text-primary)] text-xs tracking-wide">
                      🏋️ DIMENSÕES DO EQUIPAMENTO MONTADO (ASSEMBLED SIZE)
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                      Espaço físico de instalação na sala de musculação
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
                    <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-app)]">
                      <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold block">Montado (C × L × A)</span>
                      <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                        {length} &times; {width} &times; {height} mm
                      </span>
                    </div>
                    <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-app)]">
                      <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold block">Peso Líquido (PL)</span>
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {netWeight} kg
                      </span>
                    </div>
                    <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-app)]">
                      <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold block">Cubagem Montado</span>
                      <span className="text-sm font-bold text-[var(--text-secondary)] tabular-nums">
                        {calculateCbm(length, width, height)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Materiais e Tubulação */}
                <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-app)] space-y-1.5">
                  <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider block">
                    Estrutura Mecânica &amp; Materiais
                  </span>
                  <p className="text-[var(--text-primary)] font-medium">
                    {selectedSkuDetail.material || 'Tubo de Aço Carbono Q235 de Alta Resistência (60x100x3.0mm)'}
                  </p>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {selectedSkuDetail.description}
                  </p>
                </div>

                {/* Atributos Brutos do Made-in-China (DT/DD) */}
                {selectedSkuDetail.rawAttributes && Object.keys(selectedSkuDetail.rawAttributes).length > 0 && (
                  <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-app)] space-y-2.5">
                    <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider block">
                      Dicionário Normalizado de Atributos Made-in-China (DT / DD)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                      {Object.entries(selectedSkuDetail.rawAttributes).map(([k, v]) => (
                        <div key={k} className="p-2.5 bg-[var(--bg-card)] rounded-lg border border-[var(--border-app)]">
                          <span className="text-[var(--text-secondary)] block text-[10px] uppercase font-mono">{k}:</span>
                          <strong className="text-[var(--text-primary)] font-mono text-xs">{String(v)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rodapé da Modal */}
              <div className="p-4 border-t border-[var(--border-app)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[var(--text-secondary)] font-mono">
                  Persistido no PostgreSQL &bull; Cloud SQL
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      const supId = selectedSkuDetail.supplierId;
                      setSelectedSkuDetail(null);
                      if (supId) {
                        onOpenCommercial(supId);
                      }
                    }}
                    variant="amber"
                    size="sm"
                    className="gap-1.5 font-bold"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ver Cotação e Informações Comerciais</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
