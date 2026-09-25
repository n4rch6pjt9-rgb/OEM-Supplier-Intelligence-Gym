import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  ExternalLink,
  ShieldCheck,
  Package,
  Cpu,
  Boxes,
  X,
  FileCode,
  Building,
  Tag,
  Clock,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import { ProductItem } from '../types.ts';

interface ProductCatalogProps {
  products: ProductItem[];
  loading: boolean;
  onRefresh: () => void;
  onSelectSupplier: (supplierId: string) => void;
  globalQuery: string;
  setGlobalQuery: (q: string) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  loading,
  onRefresh,
  onSelectSupplier,
  globalQuery,
  setGlobalQuery,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeDetailTab, setActiveDetailTab] = useState<'attrs' | 'jsonld' | 'overview'>('overview');

  // Filter categories
  const categories = Array.from(
    new Set(products.map(p => p.category1 || p.category2).filter(Boolean))
  ) as string[];

  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'all') {
      const matchCat =
        p.category1?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        p.category2?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        p.category3?.toLowerCase().includes(selectedCategory.toLowerCase());
      if (!matchCat) return false;
    }
    if (globalQuery.trim()) {
      const q = globalQuery.toLowerCase();
      const matchText =
        p.title.toLowerCase().includes(q) ||
        p.modelNo?.toLowerCase().includes(q) ||
        p.material?.toLowerCase().includes(q) ||
        p.hsCode?.toLowerCase().includes(q) ||
        p.supplierName?.toLowerCase().includes(q);
      if (!matchText) return false;
    }
    return true;
  });

  const exportProductJson = (prod: ProductItem) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(prod, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `oem_product_${prod.modelNo || prod.productId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              selectedCategory === 'all'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Categories ({products.length})
          </button>
          {categories.map((cat, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">
            Showing <strong className="text-white">{filteredProducts.length}</strong> OEM Items
          </span>
          <button
            onClick={onRefresh}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Product Cards Grid */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-500">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-medium">Querying Cloud SQL PostgreSQL...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <Package className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300 mb-1">No OEM Products Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Try adjusting your search query, or use the Extraction Cockpit tab to crawl Made-in-China products into PostgreSQL.
          </p>
          {globalQuery && (
            <button
              onClick={() => setGlobalQuery('')}
              className="px-3 py-1.5 bg-slate-800 text-cyan-400 text-xs rounded border border-slate-700"
            >
              Clear Search Query
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map(p => (
            <div
              key={p.productId}
              className="bg-slate-900 border border-slate-800 hover:border-cyan-500/60 rounded-xl overflow-hidden shadow-lg transition-all duration-200 flex flex-col group"
            >
              {/* Image & Badges */}
              <div className="relative h-44 bg-slate-950 overflow-hidden">
                {p.images && p.images.length > 0 ? (
                  <img
                    src={p.images[0]}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-700">
                    <Package className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                  {p.modelNo && (
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-700/80 rounded backdrop-blur-sm">
                      Model {p.modelNo}
                    </span>
                  )}
                  {p.hsCode && (
                    <span className="px-1.5 py-0.5 text-[9px] font-mono bg-slate-900/90 text-slate-300 border border-slate-700 rounded backdrop-blur-sm">
                      HS {p.hsCode}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-slate-950/90 rounded text-[11px] font-bold text-emerald-400 border border-emerald-900/60 backdrop-blur-sm">
                  ${p.priceMin} - ${p.priceMax} / {p.currency}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-medium text-cyan-400 uppercase tracking-wider block">
                    {p.category2 || p.category1 || 'OEM Component'}
                  </span>
                  <h3
                    onClick={() => setSelectedProduct(p)}
                    className="text-sm font-bold text-white line-clamp-2 hover:text-cyan-400 cursor-pointer transition mt-0.5"
                  >
                    {p.title}
                  </h3>

                  {/* Supplier Link */}
                  {p.supplierName && (
                    <div
                      onClick={() => p.supplierId && onSelectSupplier(p.supplierId)}
                      className="flex items-center gap-1.5 mt-2 text-xs text-slate-400 hover:text-cyan-300 cursor-pointer transition"
                    >
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{p.supplierName}</span>
                    </div>
                  )}
                </div>

                {/* Key OEM Specs Summary */}
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Material</span>
                    <span className="text-slate-300 font-medium truncate block">{p.material || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">MOQ</span>
                    <span className="text-slate-300 font-medium block">{p.moq} Pieces</span>
                  </div>
                </div>

                {/* Certifications Pills */}
                {p.certifications && p.certifications.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.certifications.slice(0, 3).map((cert, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.2 text-[9px] bg-slate-800/80 text-emerald-300 rounded border border-slate-700/60"
                      >
                        {cert}
                      </span>
                    ))}
                    {p.certifications.length > 3 && (
                      <span className="text-[9px] text-slate-500 self-center">
                        +{p.certifications.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedProduct(p)}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
                  >
                    View Technical Attributes
                  </button>
                  <button
                    onClick={() => exportProductJson(p)}
                    title="Export JSON record"
                    className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg transition"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deep Product Inspector Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/80">
              <div className="space-y-1 pr-6">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 rounded">
                    Model: {selectedProduct.modelNo || 'N/A'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ID: {selectedProduct.productId}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {selectedProduct.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Supplier: <strong className="text-slate-200">{selectedProduct.supplierName}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-2 px-5 py-2 border-b border-slate-800 bg-slate-950 text-xs">
              <button
                onClick={() => setActiveDetailTab('overview')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeDetailTab === 'overview'
                    ? 'bg-cyan-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Overview &amp; OEM Specs
              </button>
              <button
                onClick={() => setActiveDetailTab('attrs')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeDetailTab === 'attrs'
                    ? 'bg-cyan-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Normalized DT/DD Table ({Object.keys(selectedProduct.rawAttributes || {}).length})
              </button>
              <button
                onClick={() => setActiveDetailTab('jsonld')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeDetailTab === 'jsonld'
                    ? 'bg-cyan-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                JSON-LD Source
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {activeDetailTab === 'overview' && (
                <div className="space-y-4">
                  {/* Pricing and Commercials */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Price Range</span>
                      <span className="text-base font-bold text-emerald-400">
                        ${selectedProduct.priceMin} - ${selectedProduct.priceMax} {selectedProduct.currency}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Minimum Order (MOQ)</span>
                      <span className="text-sm font-semibold text-slate-200">{selectedProduct.moq} Pieces</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Production Capacity</span>
                      <span className="text-sm font-semibold text-slate-200">{selectedProduct.productionCapacity || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Country of Origin</span>
                      <span className="text-sm font-semibold text-slate-200">{selectedProduct.origin || 'China'}</span>
                    </div>
                  </div>

                  {/* OEM Attributes Grid */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                      Core OEM Manufacturing Specifications
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[10px] block uppercase font-semibold">Material</span>
                        <span className="text-slate-200 font-medium">{selectedProduct.material || 'N/A'}</span>
                      </div>
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[10px] block uppercase font-semibold">Specification / Dimensions</span>
                        <span className="text-slate-200 font-medium">{selectedProduct.specification || 'N/A'}</span>
                      </div>
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[10px] block uppercase font-semibold">Customs HS Code</span>
                        <span className="text-slate-200 font-mono font-medium">{selectedProduct.hsCode || 'N/A'}</span>
                      </div>
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[10px] block uppercase font-semibold">Transport Package</span>
                        <span className="text-slate-200 font-medium">{selectedProduct.transportPackage || 'Standard Export Package'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Certifications */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                      Quality &amp; Compliance Certifications
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.certifications?.map((c, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 rounded-lg flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{c}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  {selectedProduct.description && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                        Product Description
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                        {selectedProduct.description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeDetailTab === 'attrs' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Relational Key-Value pairs extracted from Made-in-China <code className="text-cyan-400 font-mono">&lt;dl class="product-attrs-list"&gt;</code>:
                  </p>
                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                        <tr>
                          <th className="p-3">Attribute Name (&lt;dt&gt;)</th>
                          <th className="p-3">Normalized Value (&lt;dd&gt;)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                        {Object.entries(selectedProduct.rawAttributes || {}).map(([key, value], idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="p-3 font-semibold text-slate-300 whitespace-nowrap">{key}</td>
                            <td className="p-3 text-slate-400 font-mono">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeDetailTab === 'jsonld' && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">
                    Semantic source payload from <code className="text-cyan-400 font-mono">&lt;script type="application/ld+json"&gt;</code>:
                  </p>
                  <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 overflow-x-auto">
                    {JSON.stringify(selectedProduct.rawJsonLd, null, 2) || '// No JSON-LD data'}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <button
                onClick={() => exportProductJson(selectedProduct)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-lg border border-slate-800 flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Product JSON</span>
              </button>
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
