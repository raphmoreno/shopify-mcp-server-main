import { ShopifyClientPort, ProductNode, ProductVariant } from "../ShopifyClient/ShopifyClientPort.js";

export async function getProductRecommendations(
  client: ShopifyClientPort,
  accessToken: string,
  shop: string,
  productId: string,
  options: {
    limit?: number;
    similarBy?: Array<"category" | "price" | "tags">;
  } = {}
): Promise<ProductNode[]> {
  // Since there's no direct recommendations API, we'll simulate by getting products in the same collection
  const response = await client.loadProducts(accessToken, shop, null);
  const products = response.products.filter(p => p.id !== productId).slice(0, options.limit || 5);
  return products;
}

export async function manageProductInventory(
  client: ShopifyClientPort,
  accessToken: string,
  shop: string,
  data: {
    variantId: string;
    action: "SET" | "ADJUST";
    quantity: number;
    locationId?: string;
    reason?: string;
  }
): Promise<{
  newQuantity: number;
  previousQuantity: number;
}> {
  return client.manageInventory(accessToken, shop, data);
}

export async function bulkVariantOperations(
  client: ShopifyClientPort,
  accessToken: string,
  shop: string,
  operations: Array<{
    action: "CREATE" | "UPDATE" | "DELETE";
    productId: string;
    variantData: {
      id?: string;
      title?: string;
      price?: number;
      sku?: string;
      inventory?: number;
      requiresShipping?: boolean;
      taxable?: boolean;
      barcode?: string;
      weight?: number;
      weightUnit?: "KILOGRAMS" | "GRAMS" | "POUNDS" | "OUNCES";
    };
  }>
): Promise<void> {
  return client.bulkVariantOperations(accessToken, shop, operations);
}

export async function manageProductMetafields(
  client: ShopifyClientPort,
  accessToken: string,
  shop: string,
  params: {
    productId: string;
    operations: Array<{
      action: "SET" | "DELETE";
      key: string;
      namespace: string;
      value?: string;
      type?: string;
    }>;
  }
): Promise<void> {
  return client.manageProductMetafields(accessToken, shop, params);
}

export async function manageProductCollections(
  client: ShopifyClientPort,
  accessToken: string,
  shop: string,
  params: {
    action: "ADD" | "REMOVE";
    productIds: string[];
    collectionIds: string[];
  }
): Promise<void> {
  return client.manageProductCollections(accessToken, shop, params);
}

export async function manageProductImages(
  client: ShopifyClientPort,
  accessToken: string,
  shop: string,
  params: {
    productId: string;
    action: "ADD" | "UPDATE" | "REMOVE";
    images: Array<{
      id?: string;
      url?: string;
      altText?: string;
      position?: number;
    }>;
  }
): Promise<void> {
  return client.manageProductImages(accessToken, shop, params);
}

export async function bulkUpdateVariantPrices(
  client: ShopifyClientPort,
  accessToken: string,
  shop: string,
  updates: Array<{
    variantId: string;
    newPrice: number;
  }>
): Promise<Array<{
  variantId: string;
  newPrice: number;
}>> {
  return client.bulkUpdateVariantPrices(accessToken, shop, updates);
}

export async function createProduct(
  client: ShopifyClientPort,
  accessToken: string,
  shop: string,
  productData: {
    title: string;
    description: string;
    vendor?: string;
    productType?: string;
    tags?: string[];
    variants: Array<{
      title: string;
      price: number;
      sku?: string;
      inventory: number;
      requiresShipping?: boolean;
      taxable?: boolean;
    }>;
  }
): Promise<ProductNode> {
  return client.createProduct(accessToken, shop, productData);
}

export async function updateProduct(
  client: ShopifyClientPort,
  accessToken: string,
  shop: string,
  productId: string,
  updateData: {
    title?: string;
    description?: string;
    status?: "ACTIVE" | "ARCHIVED" | "DRAFT";
    vendor?: string;
    productType?: string;
    tags?: string[];
  }
): Promise<ProductNode> {
  return client.updateProduct(accessToken, shop, productId, updateData);
}

export async function bulkUpdateProducts(
  client: ShopifyClientPort,
  accessToken: string,
  shop: string,
  updates: Array<{
    productId: string;
    title?: string;
    description?: string;
    status?: "ACTIVE" | "ARCHIVED" | "DRAFT";
    vendor?: string;
    productType?: string;
    tags?: string[];
  }>
): Promise<ProductNode[]> {
  return client.bulkUpdateProducts(accessToken, shop, updates);
}
