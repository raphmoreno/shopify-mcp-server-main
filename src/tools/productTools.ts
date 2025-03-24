import { ProductVariant, ShopifyClientPort, ProductNode } from "../ShopifyClient/ShopifyClientPort.js";

export async function getVariantPrice(
  client: ShopifyClientPort,
  accessToken: string,
  myshopifyDomain: string,
  variant: ProductVariant
): Promise<string> {
  return variant.price;
}

// Extended capabilities
export async function getProductInventoryStatus(
  client: ShopifyClientPort,
  accessToken: string,
  myshopifyDomain: string,
  variant: ProductVariant
): Promise<{
  isAvailable: boolean;
  inventoryPolicy: "CONTINUE" | "DENY";
}> {
  return {
    isAvailable: variant.availableForSale,
    inventoryPolicy: variant.inventoryPolicy
  };
}

export async function getProductFullDetails(
  client: ShopifyClientPort,
  accessToken: string,
  myshopifyDomain: string,
  productId: string
): Promise<{
  product: {
    id: string;
    title: string;
    description: string;
    variants: ProductVariant[];
    images: Array<{
      src: string;
      alt?: string;
    }>;
  };
}> {
  const response = await client.loadProducts(
    accessToken,
    myshopifyDomain,
    null,
    1,
    null
  );

  const product = response.products.find((p: ProductNode) => p.id === productId);
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  return {
    product: {
      id: product.id,
      title: product.title,
      description: product.description,
      variants: product.variants.edges.map((e: { node: ProductVariant }) => e.node),
      images: product.images.edges.map((e: { node: { src: string; alt?: string } }) => ({
        src: e.node.src,
        alt: e.node.alt || undefined
      }))
    }
  };
}

export async function searchProductsByAttributes(
  client: ShopifyClientPort,
  accessToken: string,
  myshopifyDomain: string,
  attributes: {
    title?: string;
    priceRange?: {
      min: number;
      max: number;
    };
    collection?: string;
  }
): Promise<Array<{
  id: string;
  title: string;
  price: string;
  availableForSale: boolean;
}>> {
  let products: ProductNode[] = [];

  if (attributes.priceRange) {
    const priceResponse = await client.searchProductsByPriceRange(
      accessToken,
      myshopifyDomain,
      {
        minPrice: attributes.priceRange.min,
        maxPrice: attributes.priceRange.max
      }
    );
    products = priceResponse.products;
  } else if (attributes.collection) {
    const collectionResponse = await client.loadProductsByCollectionId(
      accessToken,
      myshopifyDomain,
      attributes.collection
    );
    products = collectionResponse.products;
  } else {
    const response = await client.loadProducts(
      accessToken,
      myshopifyDomain,
      attributes.title || null
    );
    products = response.products;
  }

  return products.map((product: ProductNode) => ({
    id: product.id,
    title: product.title,
    price: product.variants.edges[0]?.node.price || "0",
    availableForSale: product.variants.edges[0]?.node.availableForSale || false
  }));
}

export async function getProductAnalytics(
  client: ShopifyClientPort,
  accessToken: string,
  myshopifyDomain: string,
  productId: string,
  timeframe?: {
    start: Date;
    end: Date;
  }
): Promise<{
  views: number;
  addToCart: number;
  purchases: number;
  revenue: number;
  conversionRate: number;
}> {
  // This is a mock implementation since Shopify's Admin API doesn't directly provide analytics
  // In a real implementation, you would integrate with Shopify Analytics API or a third-party analytics service
  return {
    views: 1000,
    addToCart: 100,
    purchases: 50,
    revenue: 2500,
    conversionRate: 5
  };
}

export async function bulkUpdateProducts(
  client: ShopifyClientPort,
  accessToken: string,
  myshopifyDomain: string,
  updates: Array<{
    id: string;
    price?: string;
    compareAtPrice?: string;
    inventoryQuantity?: number;
    title?: string;
    description?: string;
  }>
): Promise<Array<{
  id: string;
  success: boolean;
  error?: string;
}>> {
  // This would be implemented using Shopify's Bulk Operations API
  // For now, returning mock success responses
  return updates.map(update => ({
    id: update.id,
    success: true
  }));
}

export async function generateProductReport(
  client: ShopifyClientPort,
  accessToken: string,
  myshopifyDomain: string,
  options: {
    includeVariants?: boolean;
    includeInventory?: boolean;
    includePricing?: boolean;
    includeAnalytics?: boolean;
  } = {}
): Promise<{
  generatedAt: string;
  products: Array<{
    id: string;
    title: string;
    variants?: Array<{
      id: string;
      title: string;
      price: string;
      inventory?: number;
    }>;
    analytics?: {
      views: number;
      purchases: number;
      revenue: number;
    };
  }>;
}> {
  const response = await client.loadProducts(
    accessToken,
    myshopifyDomain,
    null
  );

  return {
    generatedAt: new Date().toISOString(),
    products: response.products.map((product: ProductNode) => ({
      id: product.id,
      title: product.title,
      ...(options.includeVariants && {
        variants: product.variants.edges.map((v: { node: ProductVariant }) => ({
          id: v.node.id,
          title: v.node.title,
          price: v.node.price,
          inventory: 100 // Mock inventory data
        }))
      }),
      ...(options.includeAnalytics && {
        analytics: {
          views: 1000,
          purchases: 50,
          revenue: 2500
        }
      })
    }))
  };
}
