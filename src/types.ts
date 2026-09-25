export interface ProductItem {
  id: number;
  productId: string;
  sku: string | null;
  title: string;
  supplierId: string | null;
  supplierName: string | null;
  category1: string | null;
  category2: string | null;
  category3: string | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string;
  moq: number;
  modelNo: string | null;
  description: string | null;
  descriptionHtml: string | null;
  productUrl: string | null;
  images: string[];
  productLine?: string | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  netWeightKg?: number | null;
  grossWeightKg?: number | null;
  packagingType?: string | null;
  packingLengthMm?: number | null;
  packingWidthMm?: number | null;
  packingHeightMm?: number | null;
  packingCbm?: number | null;
  certifications: string[];
  material: string | null;
  specification: string | null;
  trademark: string | null;
  transportPackage: string | null;
  origin: string | null;
  hsCode: string | null;
  productionCapacity: string | null;
  rawJsonLd?: any;
  rawAttributes?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  attributesList?: Array<{
    id: number;
    productId: string;
    attributeName: string;
    attributeValue: string;
  }>;
  supplier?: SupplierItem | null;
}

export interface SupplierItem {
  id: number;
  supplierId: string;
  supplierName: string;
  homepageUrl: string | null;
  contactName: string | null;
  contactGender: string | null;
  domainUserId: string | null;
  businessType: string | null;
  foundedDate: string | null;
  employees: number;
  plantAreaSqm: number;
  registeredCapital: string | null;
  responseTimeAvg30d: string | null;
  paymentTerms: string[];
  incoterms: string[];
  minimumOrderQuantity: number;
  leadTimePeak: string | null;
  leadTimeOffpeak: string | null;
  nearestPorts: string[];
  oemAvailable: boolean;
  odmAvailable: boolean;
  customizationAvailable: boolean;
  productionLines: number;
  productionMachines: string[];
  qaInspectors: number;
  inspectionMethod: string | null;
  inspectionType: string | null;
  rdEngineers: number;
  exportYears: number;
  mainMarkets: string[];
  repeatBuyersPercent: string | null;
  foreignTradeStaff: number;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  products?: ProductItem[];
}

export interface CrawlLogItem {
  id: number;
  targetUrl: string;
  status: string;
  sourcesUsed: string[];
  productId: string | null;
  supplierId: string | null;
  summary: string | null;
  logDetails: any;
  createdAt: string;
}

export interface DatabaseStats {
  totalProducts: number;
  totalSuppliers: number;
  totalAttributes: number;
  totalCrawlJobs: number;
}
