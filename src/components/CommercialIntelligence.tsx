import React, { useState } from 'react';
import {
  Sparkles,
  DollarSign,
  Truck,
  Anchor,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Users,
  ExternalLink,
  Award,
  Layers,
  Calculator,
  Package,
} from 'lucide-react';
import { SupplierItem, ProductItem } from '../types.ts';
import { Button } from './ui/button.tsx';
import { Badge } from './ui/badge.tsx';

interface CommercialIntelligenceProps {
  suppliers: SupplierItem[];
  products: ProductItem[];
  selectedSupplierId?: string | null;
  onRefresh: () => void;
}

export const CommercialIntelligence: React.FC<CommercialIntelligenceProps> = ({
  suppliers,
  products,
  selectedSupplierId,
  onRefresh,
}) => {
  const [activeSupplierId, setActiveSupplierId] = useState<string>(
    selectedSupplierId || (suppliers[0]?.supplierId ?? '')
  );

  React.useEffect(() => {
    if (selectedSupplierId) {
      setActiveSupplierId(selectedSupplierId);
    } else if (!activeSupplierId && suppliers.length > 0) {
      setActiveSupplierId(suppliers[0].supplierId);
    }
  }, [selectedSupplierId, suppliers]);

  const activeSupplier =
    suppliers.find(s => s.supplierId === activeSupplierId) || suppliers[0];

  const supplierProducts = products.filter(
    p => p.supplierId === activeSupplier?.supplierId
  );

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Banner Lovable Style "A Cereja do Bolo" */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-app)] bg-[var(--bg-card)] p-6 shadow-xs backdrop-blur-xl transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="amber" className="gap-1.5 text-xs py-0.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>A Cereja do Bolo &bull; Compras &amp; Negociação OEM</span>
              </Badge>
              <span className="text-xs text-[var(--text-secondary)] font-mono hidden sm:inline">
                Dados estratégicos para negociação, preços de exportação e logística
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Inteligência Comercial, Preços de Fábrica &amp; Condições de Importação
            </h2>
            <p className="text-xs text-[var(--text-secondary)] max-w-4xl leading-relaxed">
              Fatores decisivos para viabilizar a importação: Incoterms negociados, prazos de entrega em fábrica, portos chineses homologados, faixas de preço para atacado, lote mínimo (MOQ), cubagem e canais diretos de contato.
            </p>
          </div>

          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            className="shrink-0"
          >
            Atualizar Cotações
          </Button>
        </div>
      </div>

      {/* Seleção de Fábrica Segmentada */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {suppliers.map(s => {
          const isSelected = s.supplierId === activeSupplier?.supplierId;
          return (
            <button
              key={s.supplierId}
              onClick={() => setActiveSupplierId(s.supplierId)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-xs font-semibold'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-app)]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{s.supplierName.split(' ')[1] || s.supplierName.split(' ')[0]}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[var(--bg-surface)] border border-[var(--border-app)] font-mono text-[var(--text-secondary)]">
                {s.responseTimeAvg30d}
              </span>
            </button>
          );
        })}
      </div>

      {activeSupplier && (
        <div className="space-y-6">
          {/* 1. Visão Geral da Fábrica Selecionada */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-[var(--border-app)]">
              <div>
                <Badge variant="amber" className="font-mono text-xs">
                  Fábrica Selecionada para Negociação
                </Badge>
                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight mt-1.5">
                  {activeSupplier.supplierName}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Contato de Exportação: <strong className="text-[var(--text-primary)]">{activeSupplier.contactName}</strong> ({activeSupplier.contactGender || 'Representante'}) &bull; Tempo médio de resposta: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{activeSupplier.responseTimeAvg30d}</strong>
                </p>
              </div>

              {activeSupplier.homepageUrl && (
                <a
                  href={activeSupplier.homepageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-[#C2410C] dark:text-[#F28C5B] rounded-xl text-xs font-semibold border border-[var(--border-app)] flex items-center gap-1.5 transition shrink-0"
                >
                  <span>Página Oficial Made-in-China</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Painel de 4 Pilares Comerciais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
              {/* Pilar 1: Condições de Pagamento */}
              <div className="bg-[var(--bg-surface)] p-4.5 rounded-xl border border-[var(--border-app)] space-y-2">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider block">
                  Condições de Pagamento
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeSupplier.paymentTerms && activeSupplier.paymentTerms.length > 0 ? (
                    activeSupplier.paymentTerms.map((term, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs bg-[var(--bg-card)] border border-[var(--border-app)] text-amber-800 dark:text-amber-300 rounded-md font-mono font-medium"
                      >
                        {term}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--text-secondary)] font-mono">T/T, L/C à vista</span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] pt-1 leading-relaxed">
                  Padrão comum: 30% sinal para iniciar produção + 70% contra cópia do B/L.
                </p>
              </div>

              {/* Pilar 2: Termos de Entrega / Incoterms */}
              <div className="bg-[var(--bg-surface)] p-4.5 rounded-xl border border-[var(--border-app)] space-y-2">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider block">
                  Incoterms Aceitos
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeSupplier.incoterms && activeSupplier.incoterms.length > 0 ? (
                    activeSupplier.incoterms.map((inc, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs bg-[var(--bg-card)] border border-[var(--border-app)] text-cyan-700 dark:text-cyan-300 rounded-md font-mono font-medium"
                      >
                        {inc}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--text-secondary)] font-mono">FOB, CIF, CFR, EXW</span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] pt-1 leading-relaxed">
                  Recomendado para Brasil: FOB no porto de origem para controle de frete marítimo.
                </p>
              </div>

              {/* Pilar 3: Portos de Embarque */}
              <div className="bg-[var(--bg-surface)] p-4.5 rounded-xl border border-[var(--border-app)] space-y-2">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider block flex items-center gap-1.5">
                  <Anchor className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Portos Mais Próximos</span>
                </span>
                <div className="space-y-1">
                  {activeSupplier.nearestPorts?.map((port, i) => (
                    <div key={i} className="text-xs text-[var(--text-primary)] font-medium flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span>{port}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] pt-1 leading-relaxed">
                  Fácil acesso às principais rotas marítimas com saídas semanais para Santos e Paranaguá.
                </p>
              </div>

              {/* Pilar 4: Prazos de Produção (Lead Time) */}
              <div className="bg-[var(--bg-surface)] p-4.5 rounded-xl border border-[var(--border-app)] space-y-2">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider block flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Prazo de Fabricação (Lead Time)</span>
                </span>
                <div className="space-y-1 text-xs">
                  <div>
                    <span className="text-[var(--text-secondary)] block text-[10px]">Temporada de Pico</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400 font-mono">{activeSupplier.leadTimePeak || '25-30 dias'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)] block text-[10px]">Baixa Temporada</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">{activeSupplier.leadTimeOffpeak || '15-20 dias'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Métricas de Confiabilidade da Fábrica */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-5 pt-5 border-t border-[var(--border-app)] text-xs">
              <div className="p-3.5 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-app)]">
                <span className="text-[10px] text-[var(--text-secondary)] block font-semibold uppercase">Taxa de Recompra</span>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{activeSupplier.repeatBuyersPercent || '95%+'}</span>
                <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">Compradores fiéis internacionais</span>
              </div>
              <div className="p-3.5 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-app)]">
                <span className="text-[10px] text-[var(--text-secondary)] block font-semibold uppercase">Tempo de Exportação</span>
                <span className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{activeSupplier.exportYears} Anos</span>
                <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">Experiência aduaneira comprovada</span>
              </div>
              <div className="p-3.5 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-app)]">
                <span className="text-[10px] text-[var(--text-secondary)] block font-semibold uppercase">Personalização OEM/ODM</span>
                <span className="text-lg font-bold text-cyan-700 dark:text-cyan-400">Totalmente Habilitada</span>
                <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">Logo, cores e etiquetas</span>
              </div>
              <div className="p-3.5 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-app)]">
                <span className="text-[10px] text-[var(--text-secondary)] block font-semibold uppercase">Equipe de Comércio Exterior</span>
                <span className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{activeSupplier.foreignTradeStaff} Especialistas</span>
                <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">Atendimento ágil em inglês</span>
              </div>
            </div>
          </div>

          {/* 2. Tabela de Preços de Fábrica & MOQ por SKU */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[var(--border-app)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Tabela de Preços OEM, Lotes Mínimos (MOQ) &amp; Embalagem por SKU</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Cotações FOB de fábrica e cubagem unitária para planejamento de container.
                </p>
              </div>
              <Badge variant="emerald" className="font-mono text-xs py-0.5">
                Moeda: USD ($)
              </Badge>
            </div>

            <div className="w-full overflow-hidden rounded-xl border border-[var(--border-app)]">
              <table className="w-full text-left text-xs table-fixed">
                <thead className="bg-[var(--bg-surface)] text-[var(--text-secondary)] font-mono border-b border-[var(--border-app)] text-[11px]">
                  <tr>
                    <th className="p-2.5 w-[110px]">Modelo / SKU</th>
                    <th className="p-2.5 w-auto min-w-[180px]">Equipamento</th>
                    <th className="p-2.5 w-[150px]">Preço FOB (USD)</th>
                    <th className="p-2.5 w-[210px] bg-amber-500/10 text-amber-800 dark:text-amber-300 border-x border-amber-500/20">📦 Embalagem / Packing Size</th>
                    <th className="p-2.5 w-[90px]">Lote (MOQ)</th>
                    <th className="p-2.5 w-[130px]">Capacidade</th>
                    <th className="p-2.5 w-[85px]">NCM</th>
                    <th className="p-2.5 w-[100px]">Customização</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-app)] bg-[var(--bg-card)]">
                  {supplierProducts.map(p => {
                    const pL = p.packingLengthMm || Math.round(Math.max(p.lengthMm || 1400, p.heightMm || 1500) * 0.95 + 100);
                    const pW = p.packingWidthMm || Math.round((p.widthMm || 1200) * 0.65);
                    const pH = p.packingHeightMm || 650;
                    const cbm = p.packingCbm ? p.packingCbm.toFixed(3) : ((pL / 1000) * (pW / 1000) * (pH / 1000)).toFixed(3);

                    return (
                      <tr key={p.productId} className="hover:bg-[var(--bg-surface)] transition">
                        <td className="p-2.5 font-mono font-bold text-[#C2410C] dark:text-[#F28C5B]">
                          {p.modelNo || p.sku}
                        </td>
                        <td className="p-2.5 text-[var(--text-primary)] font-medium truncate" title={p.title}>
                          {p.title}
                        </td>
                        <td className="p-2.5 whitespace-nowrap font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm tabular-nums">
                          ${p.priceMin} - ${p.priceMax}
                        </td>
                        <td className="p-2.5 font-mono bg-amber-500/5 border-x border-amber-500/20">
                          <div className="text-amber-800 dark:text-amber-300 font-semibold text-[11px] tabular-nums">
                            {pL} &times; {pW} &times; {pH} mm
                          </div>
                          <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold tabular-nums">
                            {cbm} m³
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-[var(--text-primary)]">
                          {p.moq} {p.moq === 1 ? 'Peça' : 'Peças'}
                        </td>
                        <td className="p-2.5 text-[var(--text-secondary)] truncate">
                          {p.productionCapacity || '3.000 Sets / Mês'}
                        </td>
                        <td className="p-2.5 font-mono text-[var(--text-secondary)]">
                          {p.hsCode || '9506.91.19'}
                        </td>
                        <td className="p-2.5">
                          <Badge variant="cyan" className="text-[10px]">
                            Logo &amp; Cores
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
