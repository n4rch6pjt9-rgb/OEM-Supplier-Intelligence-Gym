import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Users table (Firebase Auth linked)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// OEM Suppliers table (Supplier Profile & Operational Intelligence)
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  supplierId: text('supplier_id').notNull().unique(),
  supplierName: text('supplier_name').notNull(),
  homepageUrl: text('homepage_url'),
  contactName: text('contact_name'),
  contactGender: text('contact_gender'),
  domainUserId: text('domain_user_id'),
  businessType: text('business_type'),
  foundedDate: text('founded_date'),
  employees: integer('employees').default(0),
  plantAreaSqm: integer('plant_area_sqm').default(0),
  registeredCapital: text('registered_capital'),
  responseTimeAvg30d: text('response_time_avg_30d'),

  // Commercial Capabilities ("About Our Factory & Business Background")
  paymentTerms: jsonb('payment_terms').$type<string[]>().default([]),
  incoterms: jsonb('incoterms').$type<string[]>().default([]),
  minimumOrderQuantity: integer('minimum_order_quantity').default(0),
  leadTimePeak: text('lead_time_peak'),
  leadTimeOffpeak: text('lead_time_offpeak'),
  nearestPorts: jsonb('nearest_ports').$type<string[]>().default([]),
  oemAvailable: boolean('oem_available').default(false),
  odmAvailable: boolean('odm_available').default(false),
  customizationAvailable: boolean('customization_available').default(false),

  // Production Capabilities ("Our Production Capability & Technical Expertise")
  productionLines: integer('production_lines').default(0),
  productionMachines: jsonb('production_machines').$type<string[]>().default([]),
  qaInspectors: integer('qa_inspectors').default(0),
  inspectionMethod: text('inspection_method'),
  inspectionType: text('inspection_type'),
  rdEngineers: integer('rd_engineers').default(0),

  // Market & Trade ("Our Industry Experience & Global Business Record")
  exportYears: integer('export_years').default(0),
  mainMarkets: jsonb('main_markets').$type<string[]>().default([]),
  repeatBuyersPercent: text('repeat_buyers_percent'),
  foreignTradeStaff: integer('foreign_trade_staff').default(0),

  sourceUrl: text('source_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Products table (Core OEM Specification & Normalized Metadata)
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  productId: text('product_id').notNull().unique(),
  sku: text('sku'),
  title: text('title').notNull(),
  supplierId: text('supplier_id').references(() => suppliers.supplierId),
  supplierName: text('supplier_name'),
  category1: text('category_1'),
  category2: text('category_2'),
  category3: text('category_3'),
  priceMin: doublePrecision('price_min').default(0),
  priceMax: doublePrecision('price_max').default(0),
  currency: text('currency').default('USD'),
  moq: integer('moq').default(0),
  modelNo: text('model_no'),
  description: text('description'),
  descriptionHtml: text('description_html'),
  productUrl: text('product_url'),
  images: jsonb('images').$type<string[]>().default([]),

  // Critical OEM Fields extracted from Product Attributes & JSON-LD
  productLine: text('product_line'), // Linha / Série do Produto na fábrica
  lengthMm: doublePrecision('length_mm'), // Comprimento em mm (Montado)
  widthMm: doublePrecision('width_mm'), // Largura em mm (Montado)
  heightMm: doublePrecision('height_mm'), // Altura em mm (Montado)
  netWeightKg: doublePrecision('net_weight_kg'), // Peso Líquido (kg)
  grossWeightKg: doublePrecision('gross_weight_kg'), // Peso Bruto (kg)
  packagingType: text('packaging_type'), // Tipo da Embalagem

  // Medidas da Embalagem / Packing Size (O PRINCIPAL PARA CUBAGEM, CONTAINER E FRETE)
  packingLengthMm: doublePrecision('packing_length_mm'), // Comprimento da Caixa (mm)
  packingWidthMm: doublePrecision('packing_width_mm'), // Largura da Caixa (mm)
  packingHeightMm: doublePrecision('packing_height_mm'), // Altura da Caixa (mm)
  packingCbm: doublePrecision('packing_cbm'), // Volume CBM da Caixa (m³)

  certifications: jsonb('certifications').$type<string[]>().default([]),
  material: text('material'),
  specification: text('specification'),
  trademark: text('trademark'),
  transportPackage: text('transport_package'),
  origin: text('origin'),
  hsCode: text('hs_code'),
  productionCapacity: text('production_capacity'),

  rawJsonLd: jsonb('raw_json_ld'),
  rawAttributes: jsonb('raw_attributes').$type<Record<string, string>>().default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Normalized Product Attributes (DT/DD key-value pairs)
export const productAttributes = pgTable('product_attributes', {
  id: serial('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.productId),
  attributeName: text('attribute_name').notNull(),
  attributeValue: text('attribute_value').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Crawler Pipeline Logs & Extraction Trace
export const crawlLogs = pgTable('crawl_logs', {
  id: serial('id').primaryKey(),
  targetUrl: text('target_url').notNull(),
  status: text('status').notNull().default('completed'), // 'pending', 'processing', 'completed', 'failed'
  sourcesUsed: jsonb('sources_used').$type<string[]>().default([]),
  productId: text('product_id'),
  supplierId: text('supplier_id'),
  summary: text('summary'),
  logDetails: jsonb('log_details').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.supplierId],
  }),
  attributes: many(productAttributes),
}));

export const productAttributesRelations = relations(productAttributes, ({ one }) => ({
  product: one(products, {
    fields: [productAttributes.productId],
    references: [products.productId],
  }),
}));
