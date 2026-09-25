import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileCode2,
  Database,
  Globe,
  Settings2,
  Layers,
  Sparkles,
  ShieldCheck,
  Clock,
  Code2,
  Cpu,
  Boxes,
  Zap,
} from 'lucide-react';
import { DatabaseStats } from '../types.ts';
import { Button } from './ui/button.tsx';
import { Badge } from './ui/badge.tsx';

interface CrawlerPipelineProps {
  onExtractionComplete: () => void;
  stats: DatabaseStats | null;
}

export const CrawlerPipeline: React.FC<CrawlerPipelineProps> = ({
  onExtractionComplete,
  stats,
}) => {
  const [crawlMode, setCrawlMode] = useState<'preset' | 'url' | 'html'>('preset');
  const [selectedSupplierIndex, setSelectedSupplierIndex] = useState<number>(0);
  const [customUrl, setCustomUrl] = useState<string>('https://mbhfitness.en.made-in-china.com/product/IKDncMEUYOpu/China-Best-Selling-Commercial-Fitness-Equipment-Strength-Machine-Pin-Loaded-M9s-012.html');
  const [customHtml, setCustomHtml] = useState<string>(`<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Best Selling Commercial Fitness Equipment Strength Machine Pin Loaded M9s-012",
  "image": ["https://image.made-in-china.com/2f0j00TrzROGfDoaub/Best-Selling-Commercial-Fitness-Equipment-Strength-Machine-Pin-Loaded-M9s-012.webp"],
  "description": "Best Selling Commercial Fitness Equipment Strength Machine Pin Loaded M9s-012 - SHANDONG MBH FITNESS CO., LTD.",
  "brand": { "@type": "Brand", "name": "SHANDONG MBH FITNESS CO., LTD." },
  "sku": "794053462",
  "offers": { "priceCurrency": "USD", "price": "1500.00", "availability": "https://schema.org/InStock" }
}
</script>
<dl class="product-attrs-list">
  <dt>Model NO.</dt><dd>M9S12</dd>
  <dt>Folded</dt><dd>Unfolded</dd>
  <dt>Power Source</dt><dd>Manual</dd>
  <dt>Age Group</dt><dd>Adult</dd>
  <dt>Exercise Part</dt><dd>Back, Arm</dd>
  <dt>Material</dt><dd>Steel</dd>
  <dt>Specification</dt><dd>1465*1795*2005 (mm)</dd>
  <dt>Transport Package</dt><dd>Packed Shipment</dd>
  <dt>HS Code</dt><dd>95069119</dd>
</dl>
<div class="company-name">SHANDONG MBH FITNESS CO., LTD.</div>
`);
  const [includeProductInfoApi, setIncludeProductInfoApi] = useState<boolean>(true);
  const [includeCertApi, setIncludeCertApi] = useState<boolean>(true);
  const [includeReplyRateApi, setIncludeReplyRateApi] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<'overview' | 'attributes' | 'jsonld' | 'steps' | 'sql'>('overview');

  const definedStores = [
    {
      index: 0,
      name: 'MBH Fitness',
      company: 'SHANDONG MBH FITNESS CO., LTD.',
      url: 'https://mbhfitness.en.made-in-china.com/?pv_id=1k3a3c93gf80',
      cleanUrl: 'https://mbhfitness.en.made-in-china.com/',
      productName: 'M9s-012 (Model M9S12 Pin Loaded Lat Pulldown)',
      modelNo: 'M9S12',
      features: 'Folded: Unfolded • Steel Q235 • Manual • 380,000 m² Factory',
    },
    {
      index: 1,
      name: 'Dezhou Tianzhan Fitness',
      company: 'DEZHOU TIANZHAN FITNESS EQUIPMENT CO., LTD.',
      url: 'https://dezhoutianzhan.en.made-in-china.com/?pv_id=1k3a3do9e59f',
      cleanUrl: 'https://dezhoutianzhan.en.made-in-china.com/',
      productName: 'TZ-5000 Commercial Shoulder Press Machine',
      modelNo: 'TZ-5000',
      features: 'Converging axis • 50*100*3mm Steel • 65,000 m² Factory',
    },
    {
      index: 2,
      name: 'Eterne Sport',
      company: 'SHANDONG ETERNE SPORT EQUIPMENT CO., LTD.',
      url: 'https://eternesport.en.made-in-china.com/?pv_id=1k37vj2no166',
      cleanUrl: 'https://eternesport.en.made-in-china.com/',
      productName: 'ET-900 Magnetic Resistance Endless Rope Pull Trainer',
      modelNo: 'ET-900',
      features: '6 Magnetic Resistance Levels • Aluminum Shell • Studio Reformers',
    },
    {
      index: 3,
      name: 'BaoDelong (BRTW)',
      company: 'SHANDONG BAODELONG FITNESS CO., LTD.',
      url: 'https://brtw-fitness.en.made-in-china.com/?pv_id=1k3a4q5e7834',
      cleanUrl: 'https://brtw-fitness.en.made-in-china.com/',
      productName: '2025 New HS Series HS01 Vertical Chest Press',
      modelNo: 'HS01',
      features: 'Full Commercial • Packing 1680x920x660mm • 1.020 m³ CBM • Plywood Crate',
    },
    {
      index: 4,
      name: 'Shandong Aochuang',
      company: 'SHANDONG AOCHUANG FITNESS EQUIPMENT CO., LTD.',
      url: 'https://aochuangfitness.en.made-in-china.com/?pv_id=1k3a55v89x12',
      cleanUrl: 'https://aochuangfitness.en.made-in-china.com/',
      productName: 'AC-8000 Commercial Heavy Duty Multi Jungle 8-Stack',
      modelNo: 'AC-8000',
      features: 'Laser cutting • Robot welding • 80,000 m² Factory • ISO9001/CE',
    },
  ];

  const handleRunStoreCrawl = async (index: number) => {
    setLoading(true);
    setResult(null);
    try {
      const store = definedStores[index];
      const res = await fetch('/api/extract/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: store.cleanUrl,
          storeName: store.name,
          companyName: store.company,
          modelNo: store.modelNo,
          productTitle: store.productName,
          complementaryApis: {
            productInfo: includeProductInfoApi ? {
              prodDescript: `<p>Full commercial fitness equipment manufactured by ${store.company}. Heavy-duty mechanical structure with electrostatic powder coating.</p>`,
              contactInfo: { contactName: 'Manager Li', gender: 'Mr.' },
              similarCategory: { cat1: 'Sporting Goods', cat2: 'Fitness Equipment', cat3: 'Strength Machines' },
            } : undefined,
            certificate: includeCertApi ? {
              certifications: ['CE Certificate', 'ISO9001:2015 Management System', 'RoHS Green Environmental'],
            } : undefined,
            replyRate: includeReplyRateApi ? {
              l30BusiReplyDurAvgRange: '< 2.5h (High Responsiveness)',
            } : undefined,
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        onExtractionComplete();
      } else {
        alert(data.error || 'Extraction failed');
      }
    } catch (err: any) {
      alert('Extraction failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunCustom = async () => {
    setLoading(true);
    setResult(null);
    try {
      const payload: any = {
        url: crawlMode === 'url' ? customUrl : undefined,
        rawHtml: crawlMode === 'html' ? customHtml : undefined,
        complementaryApis: {},
      };

      if (includeProductInfoApi) {
        payload.complementaryApis.productInfo = {
          prodDescript: '<p>Enriched via Made-in-China /ref/getProductInfo endpoint with detailed specs and verified commercial contacts.</p>',
          contactInfo: { contactName: 'OEM Export Director', gender: 'Mr.' },
          similarCategory: { cat1: 'Custom OEM Components', cat2: 'Industrial Supplies', cat3: 'Precision Parts' },
        };
      }
      if (includeCertApi) {
        payload.complementaryApis.certificate = {
          certifications: ['CE', 'ISO9001:2015', 'RoHS Compliant'],
        };
      }
      if (includeReplyRateApi) {
        payload.complementaryApis.replyRate = {
          l30BusiReplyDurAvgRange: '< 2.0h (30d avg)',
        };
      }

      const res = await fetch('/api/extract/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        onExtractionComplete();
      } else {
        alert(data.error || 'Crawl extraction failed');
      }
    } catch (err: any) {
      alert('Crawl error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual PRD Extraction Architecture Pipeline */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-2xl p-5 shadow-xs transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-[var(--border-app)]">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Boxes className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span>Arquitetura do Crawler &amp; Esteira de Extração Made-in-China</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Prioridade determinística do PRD: 1. JSON-LD Semântico &rarr; 2. Atributos DT/DD &lt;dl&gt; &rarr; 3. Perfil Fabril &rarr; 4. APIs Internas &rarr; 5. Normalização no PostgreSQL
            </p>
          </div>
          <Badge variant="cyan" className="font-mono text-xs">
            Esteira PRD v2
          </Badge>
        </div>

        {/* Pipeline Diagram Flow */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs font-mono">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-app)] rounded-lg p-2.5 flex flex-col justify-center items-center">
            <span className="text-[10px] text-[var(--text-secondary)] font-sans">Passo 1</span>
            <span className="font-semibold text-[var(--text-primary)] mt-1">Homepage</span>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-app)] rounded-lg p-2.5 flex flex-col justify-center items-center">
            <span className="text-[10px] text-[var(--text-secondary)] font-sans">Passo 2</span>
            <span className="font-semibold text-[var(--text-primary)] mt-1">Categorias</span>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-app)] rounded-lg p-2.5 flex flex-col justify-center items-center">
            <span className="text-[10px] text-[var(--text-secondary)] font-sans">Passo 3</span>
            <span className="font-semibold text-[var(--text-primary)] mt-1">Paginação</span>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-app)] rounded-lg p-2.5 flex flex-col justify-center items-center">
            <span className="text-[10px] text-[var(--text-secondary)] font-sans">Passo 4</span>
            <span className="font-semibold text-[var(--text-primary)] mt-1">URLs Produto</span>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2.5 flex flex-col justify-center items-center text-cyan-800 dark:text-cyan-300">
            <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-sans font-bold">Fonte 1</span>
            <span className="font-bold mt-1">JSON-LD</span>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2.5 flex flex-col justify-center items-center text-cyan-800 dark:text-cyan-300">
            <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-sans font-bold">Fonte 2</span>
            <span className="font-bold mt-1">DT / DD</span>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2.5 flex flex-col justify-center items-center text-blue-800 dark:text-blue-300">
            <span className="text-[10px] text-blue-700 dark:text-blue-400 font-sans font-bold">Fontes 3-5</span>
            <span className="font-bold mt-1">APIs</span>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 flex flex-col justify-center items-center text-emerald-800 dark:text-emerald-300">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-sans font-bold">Destino</span>
            <span className="font-bold mt-1">Cloud SQL</span>
          </div>
        </div>
      </div>

      {/* Control Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Selection & Triggers */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-2xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center justify-between">
              <span>Entrada do Rastreador &amp; Crawler</span>
              <span className="text-xs font-normal text-[var(--text-secondary)]">Modo</span>
            </h3>

            {/* Mode Switcher */}
            <div className="grid grid-cols-3 gap-1 bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-app)] mb-4 text-xs font-medium">
              <button
                onClick={() => setCrawlMode('preset')}
                className={`py-1.5 rounded-lg transition cursor-pointer ${
                  crawlMode === 'preset'
                    ? 'bg-[var(--bg-card)] text-[#C2410C] dark:text-[#F28C5B] font-semibold shadow-xs border border-[var(--border-app)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                5 Lojas Alvo
              </button>
              <button
                onClick={() => setCrawlMode('url')}
                className={`py-1.5 rounded-lg transition cursor-pointer ${
                  crawlMode === 'url'
                    ? 'bg-[var(--bg-card)] text-[#C2410C] dark:text-[#F28C5B] font-semibold shadow-xs border border-[var(--border-app)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                URL Made-in-China
              </button>
              <button
                onClick={() => setCrawlMode('html')}
                className={`py-1.5 rounded-lg transition cursor-pointer ${
                  crawlMode === 'html'
                    ? 'bg-[var(--bg-card)] text-[#C2410C] dark:text-[#F28C5B] font-semibold shadow-xs border border-[var(--border-app)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Colar HTML Bruto
              </button>
            </div>

            {/* Preset Selection Mode */}
            {crawlMode === 'preset' && (
              <div className="space-y-3">
                <p className="text-xs text-[var(--text-secondary)]">
                  Fábricas de fitness OEM selecionadas com JSON-LD e blocos &lt;dl class="product-attrs-list"&gt; DT/DD:
                </p>
                {definedStores.map(s => (
                  <div
                    key={s.index}
                    onClick={() => setSelectedSupplierIndex(s.index)}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      selectedSupplierIndex === s.index
                        ? 'bg-[#C2410C]/5 border-[#C2410C]/60 ring-1 ring-[#C2410C]/30'
                        : 'bg-[var(--bg-surface)] border-[var(--border-app)] hover:border-[var(--text-secondary)]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-[var(--text-primary)]">{s.name}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-card)] text-[#C2410C] dark:text-[#F28C5B] font-bold border border-[var(--border-app)]">
                        {s.modelNo}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-primary)] font-medium truncate mb-0.5">{s.productName}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] font-mono truncate">{s.cleanUrl}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">{s.features}</p>
                  </div>
                ))}

                {/* Botão Principal da Marca em Laranja com Texto Branco (5,2:1) */}
                <Button
                  onClick={() => handleRunStoreCrawl(selectedSupplierIndex)}
                  disabled={loading}
                  variant="primary"
                  className="w-full mt-4 h-10 text-xs font-semibold gap-2 shadow-md shadow-[#C2410C]/25"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Executando Esteira de Extração Multi-Fonte...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Rastrear e Normalizar {definedStores[selectedSupplierIndex]?.name}</span>
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* URL Mode */}
            {crawlMode === 'url' && (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-[var(--text-primary)]">
                  URL do Produto na Made-in-China:
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-secondary)]" />
                  <input
                    type="url"
                    value={customUrl}
                    onChange={e => setCustomUrl(e.target.value)}
                    placeholder="https://xxx.made-in-china.com/product/xxx.html"
                    className="w-full pl-9 pr-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-app)] rounded-lg text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[#C2410C]"
                  />
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  O crawler executará a extração de JSON-LD, converterá os pares DT/DD de &lt;dl class="product-attrs-list"&gt;, extrairá o perfil do fabricante e fará o upsert no PostgreSQL.
                </p>

                <Button
                  onClick={handleRunCustom}
                  disabled={loading || !customUrl}
                  variant="primary"
                  className="w-full mt-3 h-10 text-xs font-semibold gap-2 shadow-md shadow-[#C2410C]/25"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Rastreando URL...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Rastrear e Extrair URL</span>
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* HTML Mode */}
            {crawlMode === 'html' && (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-[var(--text-primary)]">
                  Colar Código HTML do Produto (blocos JSON-LD e &lt;dl&gt;):
                </label>
                <textarea
                  rows={8}
                  value={customHtml}
                  onChange={e => setCustomHtml(e.target.value)}
                  className="w-full p-2.5 bg-[var(--bg-surface)] border border-[var(--border-app)] rounded-lg text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#C2410C]"
                />

                <Button
                  onClick={handleRunCustom}
                  disabled={loading || !customHtml}
                  variant="primary"
                  className="w-full mt-3 h-10 text-xs font-semibold gap-2 shadow-md shadow-[#C2410C]/25"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processando HTML e Normalizando...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Normalizar HTML no PostgreSQL</span>
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Complementary APIs Toggles */}
            <div className="mt-5 pt-4 border-t border-[var(--border-app)] space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">
                APIs Internas Complementares (Enriquecimento)
              </span>
              <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeProductInfoApi}
                  onChange={e => setIncludeProductInfoApi(e.target.checked)}
                  className="rounded bg-[var(--bg-surface)] border-[var(--border-app)] text-[#C2410C] focus:ring-0"
                />
                <span className="font-mono text-[#C2410C] dark:text-[#F28C5B]">/ref/getProductInfo</span>
                <span className="text-[11px] text-[var(--text-secondary)]">(Descrições &amp; Contato)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCertApi}
                  onChange={e => setIncludeCertApi(e.target.checked)}
                  className="rounded bg-[var(--bg-surface)] border-[var(--border-app)] text-[#C2410C] focus:ring-0"
                />
                <span className="font-mono text-[#C2410C] dark:text-[#F28C5B]">/multi-search/.../certificate</span>
                <span className="text-[11px] text-[var(--text-secondary)]">(Certificações Auditadas)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeReplyRateApi}
                  onChange={e => setIncludeReplyRateApi(e.target.checked)}
                  className="rounded bg-[var(--bg-surface)] border-[var(--border-app)] text-[#C2410C] focus:ring-0"
                />
                <span className="font-mono text-[#C2410C] dark:text-[#F28C5B]">/extend/.../replyRate</span>
                <span className="text-[11px] text-[var(--text-secondary)]">(Tempo de Resposta 30d)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Live Extraction Execution Audit & Normalized Data Viewer */}
        <div className="lg:col-span-7">
          <div className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-2xl p-5 shadow-xs min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-app)] mb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Pipeline Execution Output</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {result
                    ? `Normalized and saved to PostgreSQL table 'products' & 'suppliers'`
                    : 'Awaiting crawler run. Click "Rastrear" to execute.'}
                </p>
              </div>

              {result && (
                <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-app)] text-xs">
                  <button
                    onClick={() => setActiveResultTab('overview')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      activeResultTab === 'overview'
                        ? 'bg-[var(--bg-card)] text-[#C2410C] dark:text-[#F28C5B] font-semibold shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveResultTab('attributes')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      activeResultTab === 'attributes'
                        ? 'bg-[var(--bg-card)] text-[#C2410C] dark:text-[#F28C5B] font-semibold shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Attributes ({result.extraction?.attributes?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveResultTab('steps')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      activeResultTab === 'steps'
                        ? 'bg-[var(--bg-card)] text-[#C2410C] dark:text-[#F28C5B] font-semibold shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Steps ({result.extraction?.pipelineSteps?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveResultTab('jsonld')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      activeResultTab === 'jsonld'
                        ? 'bg-[var(--bg-card)] text-[#C2410C] dark:text-[#F28C5B] font-semibold shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    JSON-LD
                  </button>
                </div>
              )}
            </div>

            {/* Results Content */}
            {result ? (
              <div className="flex-1 overflow-y-auto max-h-[560px] space-y-4 pr-1">
                {/* Status Bar */}
                <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-semibold">Successfully Persisted to Cloud SQL</span>
                  </div>
                  <div className="flex items-center gap-3 text-[var(--text-secondary)] font-mono text-[11px]">
                    <span>Product ID: {result.extraction?.product?.productId}</span>
                    <span>•</span>
                    <span>Supplier ID: {result.extraction?.supplier?.supplierId}</span>
                  </div>
                </div>

                {/* Tab: Overview */}
                {activeResultTab === 'overview' && (
                  <div className="space-y-4">
                    {/* Product Card Highlight */}
                    <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-app)] space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Badge variant="cyan" className="text-[10px]">
                            {result.extraction?.product?.category2 || 'OEM Product'}
                          </Badge>
                          <h4 className="text-sm font-bold text-[var(--text-primary)] mt-1">
                            {result.extraction?.product?.title}
                          </h4>
                          <p className="text-xs text-[var(--text-secondary)] font-mono">
                            Model NO: <strong className="text-[#C2410C] dark:text-[#F28C5B]">{result.extraction?.product?.modelNo}</strong> | SKU: {result.extraction?.product?.sku}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                            ${result.extraction?.product?.priceMin} - ${result.extraction?.product?.priceMax}
                          </span>
                          <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                            MOQ: {result.extraction?.product?.moq} Pieces
                          </p>
                        </div>
                      </div>

                      {/* Critical OEM Fields (from PRD) */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--border-app)] text-xs">
                        <div className="bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-app)]">
                          <span className="text-[10px] text-[var(--text-secondary)] uppercase block font-semibold">Material</span>
                          <span className="text-[var(--text-primary)] text-xs truncate block font-medium">{result.extraction?.product?.material || 'N/A'}</span>
                        </div>
                        <div className="bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-app)]">
                          <span className="text-[10px] text-[var(--text-secondary)] uppercase block font-semibold">Specification</span>
                          <span className="text-[var(--text-primary)] text-xs truncate block font-medium">{result.extraction?.product?.specification || 'N/A'}</span>
                        </div>
                        <div className="bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-app)]">
                          <span className="text-[10px] text-[var(--text-secondary)] uppercase block font-semibold">HS Code</span>
                          <span className="text-[var(--text-primary)] text-xs font-mono truncate block font-medium">{result.extraction?.product?.hsCode || 'N/A'}</span>
                        </div>
                        <div className="bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-app)]">
                          <span className="text-[10px] text-[var(--text-secondary)] uppercase block font-semibold">Origin</span>
                          <span className="text-[var(--text-primary)] text-xs truncate block font-medium">{result.extraction?.product?.origin || 'China'}</span>
                        </div>
                        <div className="bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-app)]">
                          <span className="text-[10px] text-[var(--text-secondary)] uppercase block font-semibold">Production Capacity</span>
                          <span className="text-[var(--text-primary)] text-xs truncate block font-medium">{result.extraction?.product?.productionCapacity || 'N/A'}</span>
                        </div>
                        <div className="bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-app)]">
                          <span className="text-[10px] text-[var(--text-secondary)] uppercase block font-semibold">Certifications</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {result.extraction?.product?.certifications?.map((c: string, idx: number) => (
                              <span key={idx} className="px-1.5 py-0.5 text-[9px] bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 rounded font-medium border border-emerald-500/20">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Supplier Snapshot */}
                    <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-app)] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                          Extracted Supplier Profile
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)] font-mono">
                          Avg Response: {result.extraction?.supplier?.responseTimeAvg30d}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {result.extraction?.supplier?.supplierName}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                        <div className="p-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-app)]">
                          <span className="text-[10px] text-[var(--text-secondary)] block">Employees</span>
                          <span className="font-semibold text-[var(--text-primary)]">{result.extraction?.supplier?.employees} Staff</span>
                        </div>
                        <div className="p-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-app)]">
                          <span className="text-[10px] text-[var(--text-secondary)] block">Plant Area</span>
                          <span className="font-semibold text-[var(--text-primary)]">{result.extraction?.supplier?.plantAreaSqm?.toLocaleString()} m²</span>
                        </div>
                        <div className="p-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-app)]">
                          <span className="text-[10px] text-[var(--text-secondary)] block">Lead Time</span>
                          <span className="font-semibold text-[var(--text-primary)]">{result.extraction?.supplier?.leadTimePeak}</span>
                        </div>
                        <div className="p-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-app)]">
                          <span className="text-[10px] text-[var(--text-secondary)] block">Repeat Buyers</span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">{result.extraction?.supplier?.repeatBuyersPercent}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Attributes (DT/DD dictionary from PRD) */}
                {activeResultTab === 'attributes' && (
                  <div className="space-y-3">
                    <p className="text-xs text-[var(--text-secondary)]">
                      Converted automatically from &lt;dl class="product-attrs-list"&gt; &lt;dt&gt;/&lt;dd&gt; blocks into PostgreSQL table <code className="text-[#C2410C] dark:text-[#F28C5B] font-mono">product_attributes</code>:
                    </p>
                    <div className="border border-[var(--border-app)] rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[var(--bg-surface)] text-[var(--text-secondary)] font-mono border-b border-[var(--border-app)]">
                          <tr>
                            <th className="p-2.5">Attribute Name (&lt;dt&gt;)</th>
                            <th className="p-2.5">Attribute Value (&lt;dd&gt;)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-app)] bg-[var(--bg-card)] font-sans">
                          {result.extraction?.attributes?.map((attr: any, idx: number) => (
                            <tr key={idx} className="hover:bg-[var(--bg-surface)]">
                              <td className="p-2.5 font-medium text-[var(--text-primary)] whitespace-nowrap">
                                {attr.name}
                              </td>
                              <td className="p-2.5 text-[var(--text-secondary)] font-mono">
                                {attr.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab: Pipeline Execution Steps */}
                {activeResultTab === 'steps' && (
                  <div className="space-y-3">
                    <p className="text-xs text-[var(--text-secondary)]">
                      Step-by-step verification of all data sources consulted during crawl:
                    </p>
                    <div className="space-y-2">
                      {result.extraction?.pipelineSteps?.map((step: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 bg-[var(--bg-surface)] border border-[var(--border-app)] rounded-xl space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                              {step.status === 'success' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              )}
                              <span>{step.step}</span>
                            </span>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-app)] text-[var(--text-secondary)]">
                              {step.source}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)]">{step.details}</p>
                          {step.extractedFields?.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {step.extractedFields.slice(0, 10).map((f: string, i: number) => (
                                <span
                                  key={i}
                                  className="text-[9px] font-mono px-1.5 py-0.2 bg-[var(--bg-card)] border border-[var(--border-app)] rounded text-cyan-800 dark:text-cyan-300"
                                >
                                  {f}
                                </span>
                              ))}
                              {step.extractedFields.length > 10 && (
                                <span className="text-[9px] text-[var(--text-secondary)] self-center">
                                  +{step.extractedFields.length - 10} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab: Raw JSON-LD */}
                {activeResultTab === 'jsonld' && (
                  <div className="space-y-2">
                    <p className="text-xs text-[var(--text-secondary)]">
                      Parsed semantic payload from &lt;script type="application/ld+json"&gt;:
                    </p>
                    <pre className="p-3 bg-[var(--bg-surface)] border border-[var(--border-app)] rounded-xl text-xs font-mono text-[var(--text-primary)] overflow-x-auto max-h-[400px]">
                      {JSON.stringify(result.extraction?.product?.rawJsonLd, null, 2) ||
                        '// No direct JSON-LD block parsed'}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-[var(--border-app)] rounded-xl">
                <Cpu className="w-12 h-12 text-[var(--text-secondary)]/40 mb-3" />
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Crawler Ready
                </h4>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mb-4">
                  Choose a preset or enter a Made-in-China product URL to run the 5-stage extraction pipeline and normalize into Cloud SQL.
                </p>
                <Button
                  onClick={() => handleRunStoreCrawl(0)}
                  variant="outline"
                  size="default"
                  className="gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run MBH Fitness (M9S12) Extraction</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
