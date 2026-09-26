import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  MapPin,
  Building2,
  Package,
  Layers,
  BarChart3,
  Anchor,
  TrendingUp,
  DollarSign,
  ArrowUpDown,
  Compass,
} from 'lucide-react';
import { ProductItem, SupplierItem } from '../types.ts';
import { Badge } from './ui/badge.tsx';
import { Button } from './ui/button.tsx';

interface SupplierRegionChartProps {
  products: ProductItem[];
  suppliers: SupplierItem[];
  activeSupplierId?: string | null;
  onSelectSupplier?: (supplierId: string) => void;
}

export type GroupingMode = 'province' | 'cluster' | 'port';
export type MetricMode = 'count' | 'cbm' | 'avgPrice';

interface RegionDataPoint {
  key: string;
  name: string;
  label: string;
  province: string;
  cluster: string;
  port: string;
  count: number;
  percentage: number;
  supplierIds: string[];
  supplierNames: string[];
  totalCbm: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  topCategories: string[];
}

// Paleta cromática refinada e consistente com o sistema de design (Laranja Industrial prioritário)
const REGION_COLORS = [
  '#C2410C', // Brand Orange (Shandong / Principal polo de força pesada)
  '#0284C7', // Sky Blue (Jiangsu / Polo de pesos livres e anilhas)
  '#059669', // Emerald (Zhejiang / Polo de aeróbicos e spin bikes)
  '#7C3AED', // Violet (Fujian / Polo de esteiras e cardio motorizado)
  '#D97706', // Amber (Guangdong / Eletrônica e cross-trainers)
  '#4B5563', // Slate / Gray
  '#DB2777', // Pink
  '#0D9488', // Teal
];

/**
 * Utilitário inteligente para identificação da Província / Região Fornecedora da China
 */
export const extractProvince = (product: ProductItem, supplier?: SupplierItem | null): string => {
  const origin = (product.origin || '').toLowerCase();
  const supName = (supplier?.supplierName || product.supplierName || '').toLowerCase();
  const ports = (supplier?.nearestPorts || []).join(' ').toLowerCase();

  if (origin.includes('shandong') || supName.includes('shandong') || supName.includes('dezhou') || ports.includes('qingdao')) {
    return 'Shandong';
  }
  if (origin.includes('jiangsu') || supName.includes('jiangsu') || supName.includes('nantong')) {
    return 'Jiangsu';
  }
  if (origin.includes('zhejiang') || supName.includes('zhejiang') || supName.includes('yongkang') || supName.includes('jinhua') || ports.includes('ningbo')) {
    return 'Zhejiang';
  }
  if (origin.includes('fujian') || supName.includes('fujian') || supName.includes('xiamen') || ports.includes('xiamen')) {
    return 'Fujian';
  }
  if (origin.includes('guangdong') || supName.includes('guangdong') || supName.includes('foshan') || supName.includes('guangzhou') || ports.includes('shenzhen')) {
    return 'Guangdong';
  }
  if (origin.includes('hebei') || supName.includes('hebei') || supName.includes('dingzhou')) {
    return 'Hebei';
  }
  if (ports.includes('tianjin')) {
    return 'Norte (Tianjin/Shandong)';
  }

  // Fallback: se houver vírgula na origem
  if (product.origin && product.origin.includes(',')) {
    const parts = product.origin.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }
  }

  return 'Shandong (Polo Central)';
};

/**
 * Utilitário inteligente para identificação do Polo / Cidade Industrial
 */
export const extractCluster = (product: ProductItem, supplier?: SupplierItem | null): string => {
  const origin = (product.origin || '').toLowerCase();
  const supName = (supplier?.supplierName || product.supplierName || '').toLowerCase();

  if (origin.includes('ningjin') || supName.includes('mbh') || supName.includes('dahao') || supName.includes('dhz')) {
    return 'Ningjin (Shandong)';
  }
  if (origin.includes('dezhou') || supName.includes('baodelong') || supName.includes('brtw') || supName.includes('tianzhan') || supName.includes('eterne')) {
    return 'Dezhou (Shandong)';
  }
  if (origin.includes('nantong') || supName.includes('ironmaster')) {
    return 'Nantong (Jiangsu)';
  }
  if (origin.includes('yongkang') || origin.includes('jinhua') || supName.includes('lianmei')) {
    return 'Yongkang (Zhejiang)';
  }
  if (origin.includes('xiamen') || supName.includes('kangrui')) {
    return 'Xiamen (Fujian)';
  }
  if (origin.includes('qingdao')) {
    return 'Qingdao (Shandong)';
  }

  const prov = extractProvince(product, supplier);
  return `${prov} (Cluster)`;
};

/**
 * Utilitário inteligente para identificação do Corredor Portuário de Embarque
 */
export const extractPortCorridor = (supplier?: SupplierItem | null): string => {
  const ports = (supplier?.nearestPorts || []).join(' ').toLowerCase();
  if (ports.includes('qingdao')) return 'Porto de Qingdao (Corredor Shandong)';
  if (ports.includes('tianjin')) return 'Porto de Tianjin (Corredor Norte)';
  if (ports.includes('shanghai') || ports.includes('nantong')) return 'Porto de Shanghai (Corredor Leste)';
  if (ports.includes('ningbo')) return 'Porto de Ningbo (Corredor Zhejiang)';
  if (ports.includes('xiamen')) return 'Porto de Xiamen (Corredor Sudeste)';
  if (ports.includes('shenzhen') || ports.includes('guangzhou')) return 'Porto de Shenzhen/Guangzhou (Corredor Sul)';
  return 'Corredor Portuário Qingdao / Tianjin';
};

export const SupplierRegionChart: React.FC<SupplierRegionChartProps> = ({
  products,
  suppliers,
  activeSupplierId,
  onSelectSupplier,
}) => {
  const [grouping, setGrouping] = useState<GroupingMode>('province');
  const [metric, setMetric] = useState<MetricMode>('count');
  const [sortDescending, setSortDescending] = useState<boolean>(true);
  const [selectedBarKey, setSelectedBarKey] = useState<string | null>(null);

  // Mapeamento fornecedor por ID para lookup O(1)
  const supplierMap = useMemo(() => {
    const map = new Map<string, SupplierItem>();
    suppliers.forEach(s => map.set(s.supplierId, s));
    return map;
  }, [suppliers]);

  // Agregação dos dados por Região
  const chartData = useMemo(() => {
    if (!products || products.length === 0) return [];

    const groupMap = new Map<string, {
      name: string;
      label: string;
      province: string;
      cluster: string;
      port: string;
      products: ProductItem[];
      supplierIds: Set<string>;
      supplierNames: Set<string>;
      totalCbm: number;
      priceSum: number;
      priceCount: number;
      minPrice: number;
      maxPrice: number;
      categories: Map<string, number>;
    }>();

    products.forEach(p => {
      const sup = p.supplierId ? supplierMap.get(p.supplierId) : undefined;
      const prov = extractProvince(p, sup);
      const clus = extractCluster(p, sup);
      const port = extractPortCorridor(sup);

      let key = prov;
      let label = prov;

      if (grouping === 'cluster') {
        key = clus;
        label = clus;
      } else if (grouping === 'port') {
        key = port;
        label = port;
      }

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          name: key,
          label,
          province: prov,
          cluster: clus,
          port,
          products: [],
          supplierIds: new Set<string>(),
          supplierNames: new Set<string>(),
          totalCbm: 0,
          priceSum: 0,
          priceCount: 0,
          minPrice: Infinity,
          maxPrice: 0,
          categories: new Map<string, number>(),
        });
      }

      const item = groupMap.get(key)!;
      item.products.push(p);

      if (p.supplierId) item.supplierIds.add(p.supplierId);
      if (p.supplierName) item.supplierNames.add(p.supplierName);

      // CBM cálculo
      const pL = p.packingLengthMm || Math.round(Math.max(p.lengthMm || 1400, p.heightMm || 1500) * 0.95 + 100);
      const pW = p.packingWidthMm || Math.round((p.widthMm || 1200) * 0.65);
      const pH = p.packingHeightMm || 650;
      const cbm = p.packingCbm || ((pL / 1000) * (pW / 1000) * (pH / 1000));
      item.totalCbm += cbm;

      // Preço
      if (typeof p.priceMin === 'number' && p.priceMin > 0) {
        const avg = p.priceMax ? (p.priceMin + p.priceMax) / 2 : p.priceMin;
        item.priceSum += avg;
        item.priceCount += 1;
        item.minPrice = Math.min(item.minPrice, p.priceMin);
        item.maxPrice = Math.max(item.maxPrice, p.priceMax || p.priceMin);
      }

      // Categoria
      const cat = p.category3 || p.category2 || p.productLine || 'Aparelhos de Força';
      item.categories.set(cat, (item.categories.get(cat) || 0) + 1);
    });

    const totalProductsCount = products.length;

    const list: RegionDataPoint[] = Array.from(groupMap.entries()).map(([key, data]) => {
      // Top categories ordenadas
      const topCats = Array.from(data.categories.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([c]) => c);

      return {
        key,
        name: data.name,
        label: data.label,
        province: data.province,
        cluster: data.cluster,
        port: data.port,
        count: data.products.length,
        percentage: Math.round((data.products.length / totalProductsCount) * 100),
        supplierIds: Array.from(data.supplierIds),
        supplierNames: Array.from(data.supplierNames),
        totalCbm: Number(data.totalCbm.toFixed(2)),
        avgPrice: data.priceCount > 0 ? Math.round(data.priceSum / data.priceCount) : 0,
        minPrice: data.minPrice !== Infinity ? data.minPrice : 0,
        maxPrice: data.maxPrice,
        topCategories: topCats,
      };
    });

    // Ordenação
    return list.sort((a, b) => {
      let valA = a.count;
      let valB = b.count;
      if (metric === 'cbm') {
        valA = a.totalCbm;
        valB = b.totalCbm;
      } else if (metric === 'avgPrice') {
        valA = a.avgPrice;
        valB = b.avgPrice;
      }

      return sortDescending ? valB - valA : valA - valB;
    });
  }, [products, supplierMap, grouping, metric, sortDescending]);

  // Estatísticas de topo
  const stats = useMemo(() => {
    const totalRegions = chartData.length;
    const totalSkus = products.length;
    const topRegion = chartData[0];
    const avgSkusPerRegion = totalRegions > 0 ? (totalSkus / totalRegions).toFixed(1) : '0';
    const totalFactories = new Set(products.map(p => p.supplierId).filter(Boolean)).size;

    return {
      totalRegions,
      totalSkus,
      topRegionName: topRegion ? topRegion.name : 'N/A',
      topRegionCount: topRegion ? topRegion.count : 0,
      topRegionPercentage: topRegion ? topRegion.percentage : 0,
      avgSkusPerRegion,
      totalFactories,
    };
  }, [chartData, products]);

  // Custom Tooltip estilizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data: RegionDataPoint = payload[0].payload;

    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-app)] p-3.5 rounded-xl shadow-xl text-xs space-y-2 max-w-xs z-50">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-app)] pb-2">
          <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
            <MapPin className="w-3.5 h-3.5 text-[#C2410C]" />
            <span className="truncate">{data.label}</span>
          </div>
          <Badge variant="amber" className="text-[10px] font-mono py-0 px-1.5">
            {data.percentage}% do total
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
          <div className="p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-app)]">
            <span className="text-[10px] text-[var(--text-secondary)] block">Produtos / SKUs</span>
            <span className="font-bold text-[var(--text-primary)] font-mono text-sm">
              {data.count} SKUs
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-app)]">
            <span className="text-[10px] text-[var(--text-secondary)] block">Fábricas OEM</span>
            <span className="font-bold text-[var(--text-primary)] font-mono text-sm">
              {data.supplierNames.length} {data.supplierNames.length === 1 ? 'fábrica' : 'fábricas'}
            </span>
          </div>
        </div>

        <div className="space-y-1 text-[11px] text-[var(--text-secondary)]">
          <div className="flex justify-between items-center">
            <span>Preço Médio FOB:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">
              ${data.avgPrice > 0 ? data.avgPrice.toLocaleString() : 'N/D'} USD
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Cubagem Total:</span>
            <span className="font-bold text-amber-800 dark:text-amber-300 font-mono">
              {data.totalCbm} m³
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Porto de Embarque:</span>
            <span className="font-medium text-[var(--text-primary)] truncate max-w-[140px]" title={data.port}>
              {data.port.split('(')[0]}
            </span>
          </div>
        </div>

        {data.supplierNames.length > 0 && (
          <div className="pt-1.5 border-t border-[var(--border-app)]">
            <span className="text-[10px] text-[var(--text-secondary)] block mb-1 font-semibold uppercase">
              Fábricas nesta região:
            </span>
            <div className="space-y-0.5">
              {data.supplierNames.slice(0, 3).map((name, idx) => (
                <div key={idx} className="truncate text-[10px] text-[var(--text-primary)] flex items-center gap-1">
                  <Building2 className="w-2.5 h-2.5 text-[#C2410C] shrink-0" />
                  <span className="truncate">{name}</span>
                </div>
              ))}
              {data.supplierNames.length > 3 && (
                <span className="text-[10px] text-[var(--text-secondary)] italic">
                  + {data.supplierNames.length - 3} outra(s)
                </span>
              )}
            </div>
          </div>
        )}

        <div className="text-[10px] text-[#C2410C] pt-1 font-medium flex items-center gap-1">
          <span>Clique na barra para filtrar esta região</span>
        </div>
      </div>
    );
  };

  const handleBarClick = (entry: RegionDataPoint) => {
    setSelectedBarKey(selectedBarKey === entry.key ? null : entry.key);
    if (entry.supplierIds.length > 0 && onSelectSupplier) {
      onSelectSupplier(entry.supplierIds[0]);
    }
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-2xl p-6 shadow-xs space-y-6 transition-colors">
      {/* 1. Header do Gráfico com Título e Descrição */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[var(--border-app)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="brand" className="gap-1.5 text-xs py-0.5">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Distribuição Geográfica OEM &bull; Polos da China</span>
            </Badge>
            <span className="text-xs text-[var(--text-secondary)] font-mono hidden sm:inline">
              Made-in-China Industrial Clusters
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
            Volume de Produtos por Região Fornecedora
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            Comparativo analítico de SKUs homologados por província fabricante, polos de biomecânica pesada e rotas de escoamento marítimo internacional (Portos de Qingdao, Tianjin, Shanghai e Ningbo).
          </p>
        </div>

        {/* Controles de Agrupamento e Métrica */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Seletor de Agrupamento */}
          <div className="inline-flex rounded-xl p-1 bg-[var(--bg-surface)] border border-[var(--border-app)] text-xs font-medium">
            <button
              onClick={() => setGrouping('province')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                grouping === 'province'
                  ? 'bg-[var(--bg-card)] text-[#C2410C] font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Província</span>
            </button>
            <button
              onClick={() => setGrouping('cluster')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                grouping === 'cluster'
                  ? 'bg-[var(--bg-card)] text-[#C2410C] font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Polo / Cidade</span>
            </button>
            <button
              onClick={() => setGrouping('port')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                grouping === 'port'
                  ? 'bg-[var(--bg-card)] text-[#C2410C] font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Anchor className="w-3.5 h-3.5" />
              <span>Corredor Portuário</span>
            </button>
          </div>

          {/* Alternar Métrica */}
          <div className="inline-flex rounded-xl p-1 bg-[var(--bg-surface)] border border-[var(--border-app)] text-xs font-medium">
            <button
              onClick={() => setMetric('count')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                metric === 'count'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Quantidade de Produtos homologados"
            >
              Qtd. SKUs
            </button>
            <button
              onClick={() => setMetric('cbm')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                metric === 'cbm'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Cubagem total de embalagem em m³"
            >
              Volume CBM
            </button>
            <button
              onClick={() => setMetric('avgPrice')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                metric === 'avgPrice'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Preço Médio FOB em USD"
            >
              Preço Médio
            </button>
          </div>

          {/* Botão de Ordenação */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDescending(!sortDescending)}
            className="h-8 px-2.5 text-xs text-[var(--text-secondary)]"
            title="Inverter ordem do gráfico"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 2. KPIs Rápidos sobre a Distribuição Regional */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
        <div className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-app)]">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-[#C2410C]" />
            <span>Regiões Ativas</span>
          </span>
          <span className="text-xl font-bold text-[var(--text-primary)] font-mono mt-1 block">
            {stats.totalRegions} {grouping === 'province' ? 'Províncias' : grouping === 'cluster' ? 'Polos' : 'Corredores'}
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
            {stats.totalFactories} fabricantes OEM cadastrados
          </span>
        </div>

        <div className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-app)]">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Principal Polo Fabricante</span>
          </span>
          <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-1 block truncate" title={stats.topRegionName}>
            {stats.topRegionName.split(' ')[0]}
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
            {stats.topRegionCount} SKUs ({stats.topRegionPercentage}% do catálogo)
          </span>
        </div>

        <div className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-app)]">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold flex items-center gap-1.5">
            <Package className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>Total de SKUs Analisados</span>
          </span>
          <span className="text-xl font-bold text-amber-800 dark:text-amber-300 font-mono mt-1 block">
            {stats.totalSkus} Equipamentos
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
            Média de {stats.avgSkusPerRegion} por região
          </span>
        </div>

        <div className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-app)]">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold flex items-center gap-1.5">
            <Anchor className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>Rota Marítima Direta</span>
          </span>
          <span className="text-xl font-bold text-[var(--text-primary)] font-mono mt-1 block">
            Porto de Qingdao
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
            Menor lead time p/ Santos e Paranaguá
          </span>
        </div>
      </div>

      {/* 3. Área do Gráfico de Barras com Recharts */}
      <div className="pt-2">
        <div className="h-72 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 15, left: -10, bottom: 25 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length) {
                  handleBarClick(e.activePayload[0].payload);
                }
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border-app)"
                opacity={0.6}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--border-app)' }}
                tickLine={false}
                interval={0}
                tickFormatter={(value: string) => {
                  if (value.length > 18) {
                    return value.slice(0, 16) + '…';
                  }
                  return value;
                }}
              />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                tickFormatter={(val: number) => {
                  if (metric === 'cbm') return `${val}m³`;
                  if (metric === 'avgPrice') return `$${val}`;
                  return `${val}`;
                }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-surface)', opacity: 0.5 }} />
              <Bar
                dataKey={metric === 'count' ? 'count' : metric === 'cbm' ? 'totalCbm' : 'avgPrice'}
                radius={[6, 6, 0, 0]}
                maxBarSize={55}
                className="cursor-pointer transition-all duration-200"
              >
                {chartData.map((entry, index) => {
                  const isSelected = selectedBarKey === entry.key;
                  const color = REGION_COLORS[index % REGION_COLORS.length];

                  return (
                    <Cell
                      key={`cell-${entry.key}`}
                      fill={color}
                      opacity={selectedBarKey ? (isSelected ? 1 : 0.45) : 0.9}
                      stroke={isSelected ? '#1C1917' : 'transparent'}
                      strokeWidth={isSelected ? 2 : 0}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Mini Cards Interativos das Regiões (Legenda Rica) */}
      <div className="pt-2 border-t border-[var(--border-app)]">
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            Detalhamento por Região &bull; Selecione para Analisar Fornecedor
          </span>
          {selectedBarKey && (
            <button
              onClick={() => setSelectedBarKey(null)}
              className="text-xs text-[#C2410C] hover:underline font-medium cursor-pointer"
            >
              Limpar Filtro ({selectedBarKey})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {chartData.map((item, idx) => {
            const isSelected = selectedBarKey === item.key;
            const barColor = REGION_COLORS[idx % REGION_COLORS.length];

            return (
              <div
                key={item.key}
                onClick={() => handleBarClick(item)}
                className={`p-3 rounded-xl border text-xs transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#C2410C] bg-amber-500/10 shadow-xs'
                    : 'border-[var(--border-app)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: barColor }}
                      />
                      <span className="font-bold text-[var(--text-primary)] truncate" title={item.label}>
                        {item.label}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#C2410C] shrink-0">
                      {item.count} SKUs
                    </span>
                  </div>

                  <p className="text-[10px] text-[var(--text-secondary)] truncate">
                    {item.supplierNames.join(', ') || 'Fabricante Homologado'}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-[var(--border-app)] flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                  <span>Cubagem: <strong className="text-[var(--text-primary)]">{item.totalCbm} m³</strong></span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                    ${item.avgPrice} FOB
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
