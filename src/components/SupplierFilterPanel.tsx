import React, { useMemo } from 'react';
import {
  Filter,
  CheckCircle2,
  Cpu,
  Award,
  X,
  RotateCcw,
  Sparkles,
  Layers,
  ShieldCheck,
  Wrench,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { SupplierItem, ProductItem } from '../types.ts';
import { Badge } from './ui/badge.tsx';
import { Button } from './ui/button.tsx';

export interface FilterState {
  capabilities: string[];
  certifications: string[];
  minEmployees?: number;
  oemOdmOnly: boolean;
}

interface SupplierFilterPanelProps {
  suppliers: SupplierItem[];
  products: ProductItem[];
  selectedCapabilities: string[];
  onToggleCapability: (cap: string) => void;
  selectedCertifications: string[];
  onToggleCertification: (cert: string) => void;
  oemOdmOnly: boolean;
  onToggleOemOdmOnly: () => void;
  onResetFilters: () => void;
  totalFilteredCount: number;
  totalSuppliersCount: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

// Catálogo de Capacidades Industriais Mapeadas com ícone e rótulo claro
export const CAPABILITY_PRESETS: Array<{
  id: string;
  label: string;
  description: string;
  check: (s: SupplierItem, prods: ProductItem[]) => boolean;
}> = [
  {
    id: 'robotic_welding',
    label: 'Soldagem Robótica (Robotic Welding)',
    description: 'Células Fanuc, ABB ou Panasonic de solda automatizada',
    check: (s) => {
      const text = `${s.productionMachines?.join(' ')} ${s.inspectionMethod || ''}`.toLowerCase();
      return text.includes('robotic') || text.includes('welding') || text.includes('fanuc') || text.includes('abb') || text.includes('panasonic');
    },
  },
  {
    id: 'laser_cutting',
    label: 'Corte a Laser Tubos & Chapas',
    description: 'Laser de fibra óptica de alta potência (Han\'s Laser / Trumpf)',
    check: (s) => {
      const text = `${s.productionMachines?.join(' ')}`.toLowerCase();
      return text.includes('laser') || text.includes('fiber') || text.includes('trumpf') || text.includes('han’s');
    },
  },
  {
    id: 'powder_coating',
    label: 'Pintura Eletrostática a Pó',
    description: 'Linhas contínuas Nordson ou estufa com cura a 200°C',
    check: (s) => {
      const text = `${s.productionMachines?.join(' ')}`.toLowerCase();
      return text.includes('powder coating') || text.includes('electrostatic') || text.includes('nordson') || text.includes('coating');
    },
  },
  {
    id: 'cnc_machining',
    label: 'Usinagem CNC & Dobra 3D',
    description: 'Mandris 3D de precisão para tubos de aço Q235 e tornos CNC',
    check: (s) => {
      const text = `${s.productionMachines?.join(' ')}`.toLowerCase();
      return text.includes('cnc') || text.includes('mandrel') || text.includes('lathe') || text.includes('benders');
    },
  },
  {
    id: 'hydraulic_presses',
    label: 'Prensas Hidráulicas Pesadas',
    description: 'Prensas de 500 a 800 toneladas para estampagem e moldagem',
    check: (s) => {
      const text = `${s.productionMachines?.join(' ')}`.toLowerCase();
      return text.includes('press') || text.includes('hydraulic') || text.includes('tons') || text.includes('vulcaniz');
    },
  },
  {
    id: 'automated_testing',
    label: 'Laboratório de Teste de Fadiga',
    description: 'Ensaios contínuos de 500k a 1M ciclos e máquinas de tração/CMM',
    check: (s) => {
      const text = `${s.inspectionMethod || ''} ${s.inspectionType || ''}`.toLowerCase();
      return text.includes('fatigue') || text.includes('fadiga') || text.includes('cmm') || text.includes('cycle') || text.includes('burn-in') || text.includes('tração');
    },
  },
  {
    id: 'large_scale_lines',
    label: 'Capacidade de Massa (10+ Linhas)',
    description: 'Grandes plantas industriais com mais de 10 linhas de montagem',
    check: (s) => (s.productionLines || 0) >= 10,
  },
  {
    id: 'custom_oem',
    label: 'Customização Completa OEM / ODM',
    description: 'Capacidade de fabricar com marca própria, cores e logos sob medida',
    check: (s) => Boolean(s.oemAvailable && s.customizationAvailable),
  },
];

// Catálogo de Certificações Internacionais Homologadas
export const CERTIFICATION_PRESETS: Array<{
  id: string;
  label: string;
  badgeVariant: 'emerald' | 'amber' | 'cyan' | 'secondary';
  check: (s: SupplierItem, prods: ProductItem[]) => boolean;
}> = [
  {
    id: 'ISO9001',
    label: 'ISO 9001:2015 (Gestão de Qualidade)',
    badgeVariant: 'emerald',
    check: (s, prods) => {
      const supText = `${s.inspectionType || ''} ${s.businessType || ''}`.toLowerCase();
      const hasInProducts = prods.some(p => (p.certifications || []).some(c => c.toLowerCase().includes('iso9001')));
      return supText.includes('iso9001') || supText.includes('iso 9001') || hasInProducts;
    },
  },
  {
    id: 'CE',
    label: 'Certificação CE (Conformidade Europeia)',
    badgeVariant: 'cyan',
    check: (s, prods) => {
      const supText = `${s.inspectionType || ''}`.toLowerCase();
      const hasInProducts = prods.some(p => (p.certifications || []).some(c => c.toLowerCase().includes('ce')));
      return supText.includes('ce') || hasInProducts;
    },
  },
  {
    id: 'TUV',
    label: 'TÜV Rheinland / GS Mark (Alemanha)',
    badgeVariant: 'amber',
    check: (s, prods) => {
      const supText = `${s.inspectionType || ''}`.toLowerCase();
      const hasInProducts = prods.some(p => (p.certifications || []).some(c => c.toLowerCase().includes('tüv') || c.toLowerCase().includes('tuv')));
      return supText.includes('tüv') || supText.includes('tuv') || hasInProducts;
    },
  },
  {
    id: 'EN957',
    label: 'EN957-1/2 (Norma Europeia de Aparelhos de Academia)',
    badgeVariant: 'emerald',
    check: (s, prods) => {
      const supText = `${s.inspectionType || ''}`.toLowerCase();
      const hasInProducts = prods.some(p => (p.certifications || []).some(c => c.toLowerCase().includes('en957') || c.toLowerCase().includes('en 957')));
      return supText.includes('en957') || supText.includes('en 957') || hasInProducts;
    },
  },
  {
    id: 'RoHS',
    label: 'RoHS (Diretiva Livre de Substâncias Tóxicas)',
    badgeVariant: 'cyan',
    check: (s, prods) => {
      const supText = `${s.inspectionType || ''}`.toLowerCase();
      const hasInProducts = prods.some(p => (p.certifications || []).some(c => c.toLowerCase().includes('rohs')));
      return supText.includes('rohs') || hasInProducts;
    },
  },
  {
    id: 'ISO14001',
    label: 'ISO 14001 (Gestão Ambiental Fabril)',
    badgeVariant: 'secondary',
    check: (s) => {
      const supText = `${s.inspectionType || ''}`.toLowerCase();
      return supText.includes('iso14001') || supText.includes('iso 14001');
    },
  },
];

export const SupplierFilterPanel: React.FC<SupplierFilterPanelProps> = ({
  suppliers,
  products,
  selectedCapabilities,
  onToggleCapability,
  selectedCertifications,
  onToggleCertification,
  oemOdmOnly,
  onToggleOemOdmOnly,
  onResetFilters,
  totalFilteredCount,
  totalSuppliersCount,
  isExpanded,
  onToggleExpanded,
}) => {
  // Contadores dinâmicos para cada capacidade
  const capabilityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CAPABILITY_PRESETS.forEach(preset => {
      counts[preset.id] = suppliers.filter(s => {
        const supProds = products.filter(p => p.supplierId === s.supplierId);
        return preset.check(s, supProds);
      }).length;
    });
    return counts;
  }, [suppliers, products]);

  // Contadores dinâmicos para cada certificação
  const certificationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CERTIFICATION_PRESETS.forEach(preset => {
      counts[preset.id] = suppliers.filter(s => {
        const supProds = products.filter(p => p.supplierId === s.supplierId);
        return preset.check(s, supProds);
      }).length;
    });
    return counts;
  }, [suppliers, products]);

  const activeFiltersCount =
    selectedCapabilities.length + selectedCertifications.length + (oemOdmOnly ? 1 : 0);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-2xl shadow-xs overflow-hidden transition-all duration-200">
      {/* Barra de Gatilho / Resumo Superior */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-surface)] border-b border-[var(--border-app)]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                Filtros Avançados de Engenharia &amp; Homologação
              </h3>
              {activeFiltersCount > 0 && (
                <Badge variant="amber" className="text-[10px] font-mono py-0 px-2 font-bold">
                  {activeFiltersCount} ativo{activeFiltersCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Filtre fábricas por maquinário industrial, células de solda, laser e normas de conformidade internacional.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[#C2410C]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar Filtros</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onToggleExpanded}
            className={`gap-1.5 text-xs font-semibold ${
              isExpanded
                ? 'bg-[var(--bg-card)] text-[#C2410C] border-[#C2410C]/40 shadow-xs'
                : 'text-[var(--text-primary)]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{isExpanded ? 'Ocultar Filtros' : 'Mostrar Painel de Filtros'}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] ml-0.5">
              {totalFilteredCount} de {totalSuppliersCount} Fábricas
            </span>
          </Button>
        </div>
      </div>

      {/* Conteúdo Expansível de Filtros Multi-Select */}
      {isExpanded && (
        <div className="p-5 space-y-6 bg-[var(--bg-card)] animate-in fade-in-50 duration-200">
          {/* Seção 1: Capacidades Industriais e de Maquinário */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border-app)]">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>1. Capacidades Industriais &amp; Maquinário Homologado</span>
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] font-mono">
                {selectedCapabilities.length} selecionada(s)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {CAPABILITY_PRESETS.map(preset => {
                const isSelected = selectedCapabilities.includes(preset.id);
                const count = capabilityCounts[preset.id] || 0;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onToggleCapability(preset.id)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 border-[#C2410C] text-[var(--text-primary)] shadow-xs'
                        : 'bg-[var(--bg-surface)] border-[var(--border-app)] hover:border-[var(--text-secondary)]/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition ${
                            isSelected
                              ? 'bg-[#C2410C] border-[#C2410C] text-white'
                              : 'border-[var(--border-app)] bg-[var(--bg-card)]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className={`text-xs font-bold ${isSelected ? 'text-[#C2410C] dark:text-[#F28C5B]' : 'text-[var(--text-primary)]'}`}>
                          {preset.label.split('(')[0]}
                        </span>
                      </div>
                      <Badge variant={isSelected ? 'amber' : 'secondary'} className="font-mono text-[9px] py-0 px-1 shrink-0">
                        {count} fbr.
                      </Badge>
                    </div>

                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2 pl-6">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seção 2: Certificações Internacionais & Conformidade */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border-app)]">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>2. Certificações Internacionais de Qualidade &amp; Segurança</span>
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] font-mono">
                {selectedCertifications.length} selecionada(s)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {CERTIFICATION_PRESETS.map(preset => {
                const isSelected = selectedCertifications.includes(preset.id);
                const count = certificationCounts[preset.id] || 0;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onToggleCertification(preset.id)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-600 dark:border-emerald-400 shadow-xs'
                        : 'bg-[var(--bg-surface)] border-[var(--border-app)] hover:border-[var(--text-secondary)]/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-[var(--border-app)] bg-[var(--bg-card)]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className={`text-xs font-bold ${isSelected ? 'text-emerald-800 dark:text-emerald-300' : 'text-[var(--text-primary)]'}`}>
                          {preset.id}
                        </span>
                      </div>
                      <Badge variant={isSelected ? 'emerald' : 'secondary'} className="font-mono text-[9px] py-0 px-1">
                        {count}
                      </Badge>
                    </div>

                    <span className="text-[10px] text-[var(--text-secondary)] line-clamp-2 pl-6">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seção 3: Tags Rápidas / Filtros Especiais & Status Atual */}
          <div className="pt-3 border-t border-[var(--border-app)] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[var(--text-secondary)] font-semibold text-[11px]">
                Filtros Especiais:
              </span>
              <button
                type="button"
                onClick={onToggleOemOdmOnly}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  oemOdmOnly
                    ? 'bg-[#C2410C]/10 border-[#C2410C] text-[#C2410C] font-semibold'
                    : 'bg-[var(--bg-surface)] border-[var(--border-app)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C2410C]" />
                <span>Apenas Fabricantes 100% OEM / ODM Homologados</span>
                {oemOdmOnly && <Check className="w-3 h-3" />}
              </button>
            </div>

            {/* Badges de Filtros Ativos Selecionados */}
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedCapabilities.map(capId => {
                const cap = CAPABILITY_PRESETS.find(c => c.id === capId);
                return (
                  <span
                    key={capId}
                    onClick={() => onToggleCapability(capId)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-medium text-[11px] cursor-pointer hover:bg-amber-500/20"
                    title="Clique para remover"
                  >
                    <span>{cap?.label.split('(')[0]}</span>
                    <X className="w-3 h-3" />
                  </span>
                );
              })}

              {selectedCertifications.map(certId => (
                <span
                  key={certId}
                  onClick={() => onToggleCertification(certId)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-medium text-[11px] cursor-pointer hover:bg-emerald-500/20"
                  title="Clique para remover"
                >
                  <span>Cert: {certId}</span>
                  <X className="w-3 h-3" />
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
