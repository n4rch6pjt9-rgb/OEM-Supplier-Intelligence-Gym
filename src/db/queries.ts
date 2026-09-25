import { and, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  crawlLogs,
  productAttributes,
  products,
  suppliers,
  users,
} from './schema.ts';
import { ExtractionResult } from '../services/extractor.ts';

export async function saveExtractionResult(extraction: ExtractionResult, targetUrl: string) {
  const { product, supplier, attributes, sourcesUsed, pipelineSteps } = extraction;

  try {
    // 1. Upsert Supplier
    await db
      .insert(suppliers)
      .values({
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,
        homepageUrl: supplier.homepageUrl,
        contactName: supplier.contactName,
        contactGender: supplier.contactGender,
        domainUserId: supplier.domainUserId,
        businessType: supplier.businessType,
        foundedDate: supplier.foundedDate,
        employees: supplier.employees,
        plantAreaSqm: supplier.plantAreaSqm,
        registeredCapital: supplier.registeredCapital,
        responseTimeAvg30d: supplier.responseTimeAvg30d,
        paymentTerms: supplier.paymentTerms,
        incoterms: supplier.incoterms,
        minimumOrderQuantity: supplier.minimumOrderQuantity,
        leadTimePeak: supplier.leadTimePeak,
        leadTimeOffpeak: supplier.leadTimeOffpeak,
        nearestPorts: supplier.nearestPorts,
        oemAvailable: supplier.oemAvailable,
        odmAvailable: supplier.odmAvailable,
        customizationAvailable: supplier.customizationAvailable,
        productionLines: supplier.productionLines,
        productionMachines: supplier.productionMachines,
        qaInspectors: supplier.qaInspectors,
        inspectionMethod: supplier.inspectionMethod,
        inspectionType: supplier.inspectionType,
        rdEngineers: supplier.rdEngineers,
        exportYears: supplier.exportYears,
        mainMarkets: supplier.mainMarkets,
        repeatBuyersPercent: supplier.repeatBuyersPercent,
        foreignTradeStaff: supplier.foreignTradeStaff,
        sourceUrl: supplier.sourceUrl,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: suppliers.supplierId,
        set: {
          supplierName: supplier.supplierName,
          homepageUrl: supplier.homepageUrl,
          contactName: supplier.contactName,
          responseTimeAvg30d: supplier.responseTimeAvg30d,
          employees: supplier.employees,
          plantAreaSqm: supplier.plantAreaSqm,
          oemAvailable: supplier.oemAvailable,
          odmAvailable: supplier.odmAvailable,
          productionLines: supplier.productionLines,
          updatedAt: new Date(),
        },
      });

    // 2. Upsert Product
    await db
      .insert(products)
      .values({
        productId: product.productId,
        sku: product.sku,
        title: product.title,
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,
        category1: product.category1,
        category2: product.category2,
        category3: product.category3,
        priceMin: product.priceMin,
        priceMax: product.priceMax,
        currency: product.currency,
        moq: product.moq,
        modelNo: product.modelNo,
        description: product.description,
        descriptionHtml: product.descriptionHtml,
        productUrl: product.productUrl,
        images: product.images,
        productLine: product.productLine,
        lengthMm: product.lengthMm,
        widthMm: product.widthMm,
        heightMm: product.heightMm,
        netWeightKg: product.netWeightKg,
        grossWeightKg: product.grossWeightKg,
        packagingType: product.packagingType,
        packingLengthMm: product.packingLengthMm,
        packingWidthMm: product.packingWidthMm,
        packingHeightMm: product.packingHeightMm,
        packingCbm: product.packingCbm,
        certifications: product.certifications,
        material: product.material,
        specification: product.specification,
        trademark: product.trademark,
        transportPackage: product.transportPackage,
        origin: product.origin,
        hsCode: product.hsCode,
        productionCapacity: product.productionCapacity,
        rawJsonLd: product.rawJsonLd,
        rawAttributes: product.rawAttributes,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: products.productId,
        set: {
          title: product.title,
          sku: product.sku,
          priceMin: product.priceMin,
          priceMax: product.priceMax,
          currency: product.currency,
          moq: product.moq,
          modelNo: product.modelNo,
          productLine: product.productLine,
          lengthMm: product.lengthMm,
          widthMm: product.widthMm,
          heightMm: product.heightMm,
          netWeightKg: product.netWeightKg,
          grossWeightKg: product.grossWeightKg,
          packagingType: product.packagingType,
          packingLengthMm: product.packingLengthMm,
          packingWidthMm: product.packingWidthMm,
          packingHeightMm: product.packingHeightMm,
          packingCbm: product.packingCbm,
          material: product.material,
          specification: product.specification,
          hsCode: product.hsCode,
          productionCapacity: product.productionCapacity,
          rawAttributes: product.rawAttributes,
          updatedAt: new Date(),
        },
      });

    // 3. Normalized Product Attributes (Delete old, insert fresh pairs)
    await db.delete(productAttributes).where(eq(productAttributes.productId, product.productId));

    if (attributes.length > 0) {
      await db.insert(productAttributes).values(
        attributes.map(attr => ({
          productId: product.productId,
          attributeName: attr.name,
          attributeValue: attr.value,
        }))
      );
    }

    // 4. Record Crawl / Extraction Log
    await db.insert(crawlLogs).values({
      targetUrl,
      status: 'completed',
      sourcesUsed,
      productId: product.productId,
      supplierId: supplier.supplierId,
      summary: `Extracted OEM product "${product.title}" (${product.modelNo}) with ${attributes.length} technical attributes and supplier profile.`,
      logDetails: {
        pipelineSteps,
        sourcesCount: sourcesUsed.length,
        attributesExtracted: attributes.length,
      },
    });

    return { success: true, productId: product.productId, supplierId: supplier.supplierId };
  } catch (error) {
    console.error('saveExtractionResult failed:', error);
    throw new Error('Database normalization transaction failed.', { cause: error });
  }
}

export async function getProducts(options?: {
  query?: string;
  category?: string;
  supplierId?: string;
  minPrice?: number;
  maxPrice?: number;
  maxMoq?: number;
  limit?: number;
  offset?: number;
}) {
  try {
    const conditions: any[] = [];

    if (options?.query) {
      const q = `%${options.query}%`;
      conditions.push(
        or(
          ilike(products.title, q),
          ilike(products.modelNo, q),
          ilike(products.material, q),
          ilike(products.hsCode, q),
          ilike(products.supplierName, q)
        )
      );
    }

    if (options?.category) {
      conditions.push(
        or(
          ilike(products.category1, `%${options.category}%`),
          ilike(products.category2, `%${options.category}%`),
          ilike(products.category3, `%${options.category}%`)
        )
      );
    }

    if (options?.supplierId) {
      conditions.push(eq(products.supplierId, options.supplierId));
    }

    if (options?.minPrice !== undefined && options.minPrice > 0) {
      conditions.push(gte(products.priceMin, options.minPrice));
    }

    if (options?.maxPrice !== undefined && options.maxPrice > 0) {
      conditions.push(lte(products.priceMax, options.maxPrice));
    }

    if (options?.maxMoq !== undefined && options.maxMoq > 0) {
      conditions.push(lte(products.moq, options.maxMoq));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const items = await db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.updatedAt))
      .limit(limit)
      .offset(offset);

    return items;
  } catch (error) {
    console.error('getProducts query failed:', error);
    throw new Error('Database query for products failed.', { cause: error });
  }
}

export async function getProductById(productId: string) {
  try {
    const productRows = await db
      .select()
      .from(products)
      .where(eq(products.productId, productId))
      .limit(1);

    if (productRows.length === 0) return null;
    const product = productRows[0];

    // Fetch related attributes
    const attrs = await db
      .select()
      .from(productAttributes)
      .where(eq(productAttributes.productId, productId));

    // Fetch supplier
    let supplier = null;
    if (product.supplierId) {
      const supplierRows = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.supplierId, product.supplierId))
        .limit(1);
      if (supplierRows.length > 0) {
        supplier = supplierRows[0];
      }
    }

    return {
      ...product,
      attributesList: attrs,
      supplier,
    };
  } catch (error) {
    console.error('getProductById query failed:', error);
    throw new Error('Database query for product detail failed.', { cause: error });
  }
}

export async function getSuppliers(options?: { query?: string; oemOnly?: boolean; limit?: number }) {
  try {
    const conditions: any[] = [];

    if (options?.query) {
      const q = `%${options.query}%`;
      conditions.push(
        or(
          ilike(suppliers.supplierName, q),
          ilike(suppliers.businessType, q),
          ilike(suppliers.contactName, q)
        )
      );
    }

    if (options?.oemOnly) {
      conditions.push(eq(suppliers.oemAvailable, true));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = options?.limit || 50;

    const items = await db
      .select()
      .from(suppliers)
      .where(whereClause)
      .orderBy(desc(suppliers.updatedAt))
      .limit(limit);

    return items;
  } catch (error) {
    console.error('getSuppliers query failed:', error);
    throw new Error('Database query for suppliers failed.', { cause: error });
  }
}

export async function getSupplierById(supplierId: string) {
  try {
    const supplierRows = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.supplierId, supplierId))
      .limit(1);

    if (supplierRows.length === 0) return null;
    const supplier = supplierRows[0];

    const supplierProducts = await db
      .select()
      .from(products)
      .where(eq(products.supplierId, supplierId))
      .limit(20);

    return {
      ...supplier,
      products: supplierProducts,
    };
  } catch (error) {
    console.error('getSupplierById query failed:', error);
    throw new Error('Database query for supplier detail failed.', { cause: error });
  }
}

export async function getCrawlLogs(limit = 30) {
  try {
    return await db
      .select()
      .from(crawlLogs)
      .orderBy(desc(crawlLogs.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('getCrawlLogs failed:', error);
    throw new Error('Database query for crawler logs failed.', { cause: error });
  }
}

export async function getDatabaseStats() {
  try {
    const [prodCount] = await db.select({ count: sql<number>`count(*)` }).from(products);
    const [supCount] = await db.select({ count: sql<number>`count(*)` }).from(suppliers);
    const [attrCount] = await db.select({ count: sql<number>`count(*)` }).from(productAttributes);
    const [logCount] = await db.select({ count: sql<number>`count(*)` }).from(crawlLogs);

    return {
      totalProducts: Number(prodCount?.count || 0),
      totalSuppliers: Number(supCount?.count || 0),
      totalAttributes: Number(attrCount?.count || 0),
      totalCrawlJobs: Number(logCount?.count || 0),
    };
  } catch (error) {
    console.error('getDatabaseStats failed:', error);
    throw new Error('Failed to retrieve database stats.', { cause: error });
  }
}
