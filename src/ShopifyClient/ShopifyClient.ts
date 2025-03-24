import {
  CompleteDraftOrderResponse,
  CreateBasicDiscountCodeInput,
  CreateBasicDiscountCodeResponse,
  CreateDraftOrderPayload,
  DraftOrderResponse,
  GetPriceRuleInput,
  GetPriceRuleResponse,
  LoadCollectionsResponse,
  LoadCustomersResponse,
  LoadProductsResponse,
  ProductNode,
  SearchProductsByPriceRangeResponse,
  ShopifyClientPort,
  ShopifyCollectionsQueryParams,
  ShopifyOrdersGraphqlQueryParams,
  ShopifyOrdersGraphqlResponse,
  ShopifyWebhookTopic,
  getGraphqlShopifyError,
  getGraphqlShopifyUserError,
  getHttpShopifyError,
} from "./ShopifyClientPort.js";
import { gql } from "graphql-request";

const productImagesFragment = gql`
  fragment ProductImages on Image {
    src
    height
    width
  }
`;

const productVariantsFragment = gql`
  fragment ProductVariants on ProductVariant {
    id
    title
    price
    sku
    image {
      ...ProductImages
    }
    availableForSale
    inventoryPolicy
    selectedOptions {
      name
      value
    }
  }
`;

const productFragment = gql`
  fragment Product on Product {
    id
    handle
    title
    description
    publishedAt
    updatedAt
    options {
      id
      name
      values
    }
    images(first: 20) {
      edges {
        node {
          ...ProductImages
        }
      }
    }
    variants(first: 250) {
      edges {
        node {
          ...ProductVariants
        }
      }
    }
  }
  ${productImagesFragment}
  ${productVariantsFragment}
`;

interface GraphQLResponse {
  data: any;
  errors?: any[];
}

export class ShopifyClient implements ShopifyClientPort {
  async loadProductsByCollectionId(
    accessToken: string,
    myshopifyDomain: string,
    collectionId: string,
    limit?: number,
    afterCursor?: string
  ): Promise<LoadProductsResponse> {
    const query = gql`
      query getCollectionProducts($id: ID!, $first: Int, $after: String) {
        collection(id: $id) {
          products(first: $first, after: $after) {
            edges {
              node {
                ...Product
              }
            }
          }
        }
        shop {
          currencyCode
        }
      }
      ${productFragment}
    `;

    const response = await this.graphqlRequest(accessToken, myshopifyDomain, {
      query,
      variables: {
        id: `gid://shopify/Collection/${collectionId}`,
        first: limit || 10,
        after: afterCursor
      }
    });

    return {
      products: response.data.collection.products.edges.map((edge: any) => edge.node),
      currencyCode: response.data.shop.currencyCode
    };
  }

  async loadCollections(
    accessToken: string,
    myshopifyDomain: string,
    queryParams: ShopifyCollectionsQueryParams,
    next?: string
  ): Promise<LoadCollectionsResponse> {
    const query = gql`
      query getCollections($first: Int, $after: String, $query: String) {
        collections(first: $first, after: $after, query: $query) {
          edges {
            node {
              id
              handle
              title
              description
              productsCount
              updatedAt
              image {
                src
                width
                height
                altText
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const response = await this.graphqlRequest(accessToken, myshopifyDomain, {
      query,
      variables: {
        first: queryParams.limit || 10,
        after: next,
        query: queryParams.query
      }
    });

    return {
      collections: response.data.collections.edges.map((edge: any) => ({
        id: this.getIdFromGid(edge.node.id),
        handle: edge.node.handle,
        title: edge.node.title,
        description: edge.node.description,
        products_count: edge.node.productsCount,
        updated_at: edge.node.updatedAt,
        image: edge.node.image
      })),
      next: response.data.collections.pageInfo.hasNextPage ? 
        response.data.collections.pageInfo.endCursor : undefined
    };
  }

  createDraftOrder(accessToken: string, shop: string, draftOrderData: CreateDraftOrderPayload, idempotencyKey: string): Promise<DraftOrderResponse> {
    throw new Error("Method not implemented.");
  }
  completeDraftOrder(accessToken: string, shop: string, draftOrderId: string, variantId: string): Promise<CompleteDraftOrderResponse> {
    throw new Error("Method not implemented.");
  }
  createBasicDiscountCode(accessToken: string, shop: string, discountInput: CreateBasicDiscountCodeInput): Promise<CreateBasicDiscountCodeResponse> {
    throw new Error("Method not implemented.");
  }
  getPriceRule(accessToken: string, shop: string, input: GetPriceRuleInput): Promise<GetPriceRuleResponse> {
    throw new Error("Method not implemented.");
  }
  private readonly logger = console;
  private SHOPIFY_API_VERSION = "2024-04";
  private rateLimitDelay = 500; // Minimum delay between requests in ms
  private lastRequestTime = 0;

  private async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }

  private async graphqlRequest(accessToken: string, shop: string, params: any): Promise<GraphQLResponse> {
    await this.enforceRateLimit();
    
    const url = `https://${shop}/admin/api/${this.SHOPIFY_API_VERSION}/graphql.json`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw getHttpShopifyError(await response.json(), response.status);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw getGraphqlShopifyError(result.errors, response.status);
    }

    return result;
  }

  async manageInventory(
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
    const mutation = `
      mutation inventoryAdjustQuantity(
        $input: InventoryAdjustQuantityInput!
      ) {
        inventoryAdjustQuantity(input: $input) {
          inventoryLevel {
            available
          }
          userErrors {
            field
            message
          }
        }
      }`;

    const { variantId, action, quantity, locationId } = data;
    const variables = {
      input: {
        inventoryItemId: variantId,
        availableDelta: action === "ADJUST" ? quantity : undefined,
        availableQuantity: action === "SET" ? quantity : undefined,
        locationId: locationId,
      },
    };

    const response = await this.graphqlRequest(accessToken, shop, {
      query: mutation,
      variables,
    });

    if (response.data.inventoryAdjustQuantity.userErrors?.length > 0) {
      throw getGraphqlShopifyUserError(
        response.data.inventoryAdjustQuantity.userErrors,
        { variantId, action, quantity }
      );
    }

    return {
      newQuantity: response.data.inventoryAdjustQuantity.inventoryLevel.available,
      previousQuantity: response.data.inventoryAdjustQuantity.inventoryLevel.available - quantity,
    };
  }

  async bulkVariantOperations(
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
    const mutation = `
      mutation productVariantBulkUpdate($input: ProductVariantsBulkInput!) {
        productVariantsBulkUpdate(input: $input) {
          variants {
            id
          }
          userErrors {
            field
            message
          }
        }
      }`;

    const variables = {
      input: {
        operations: operations.map(op => ({
          id: op.variantData.id,
          productId: op.productId,
          ...op.variantData,
        })),
      },
    };

    const response = await this.graphqlRequest(accessToken, shop, {
      query: mutation,
      variables,
    });

    if (response.data.productVariantsBulkUpdate.userErrors?.length > 0) {
      throw getGraphqlShopifyUserError(
        response.data.productVariantsBulkUpdate.userErrors,
        { operations }
      );
    }
  }

  async manageProductMetafields(
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
    const mutation = `
      mutation metafieldBulkOperation($input: [MetafieldInput!]!) {
        bulkOperationRunMutation(
          mutation: "mutation metafieldSet($input: MetafieldInput!) { metafieldSet(input: $input) { metafield { id } userErrors { field message } } }"
          stagedUploadPath: null
          inputs: $input
        ) {
          bulkOperation {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }`;

    const variables = {
      input: params.operations.map(op => ({
        id: op.action === "DELETE" ? undefined : `gid://shopify/Product/${params.productId}`,
        key: op.key,
        namespace: op.namespace,
        value: op.value,
        type: op.type,
      })),
    };

    const response = await this.graphqlRequest(accessToken, shop, {
      query: mutation,
      variables,
    });

    if (response.data.bulkOperationRunMutation.userErrors?.length > 0) {
      throw getGraphqlShopifyUserError(
        response.data.bulkOperationRunMutation.userErrors,
        params
      );
    }
  }

  async manageProductCollections(
    accessToken: string,
    shop: string,
    params: {
      action: "ADD" | "REMOVE";
      productIds: string[];
      collectionIds: string[];
    }
  ): Promise<void> {
    const mutation = `
      mutation collectionAddProducts($input: CollectionAddProductsInput!) {
        collectionAddProducts(input: $input) {
          job {
            id
          }
          userErrors {
            field
            message
          }
        }
      }`;

    for (const collectionId of params.collectionIds) {
      const variables = {
        input: {
          id: `gid://shopify/Collection/${collectionId}`,
          productIds: params.productIds.map(id => `gid://shopify/Product/${id}`),
        },
      };

      const response = await this.graphqlRequest(accessToken, shop, {
        query: mutation,
        variables,
      });

      if (response.data.collectionAddProducts.userErrors?.length > 0) {
        throw getGraphqlShopifyUserError(
          response.data.collectionAddProducts.userErrors,
          { collectionId, ...params }
        );
      }
    }
  }

  async manageProductImages(
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
    const mutation = `
      mutation productImageUpdate($input: ProductImageUpdateInput!) {
        productImageUpdate(input: $input) {
          image {
            id
          }
          userErrors {
            field
            message
          }
        }
      }`;

    for (const image of params.images) {
      const variables = {
        input: {
          id: image.id ? `gid://shopify/ProductImage/${image.id}` : undefined,
          productId: `gid://shopify/Product/${params.productId}`,
          src: image.url,
          altText: image.altText,
          position: image.position,
        },
      };

      const response = await this.graphqlRequest(accessToken, shop, {
        query: mutation,
        variables,
      });

      if (response.data.productImageUpdate.userErrors?.length > 0) {
        throw getGraphqlShopifyUserError(
          response.data.productImageUpdate.userErrors,
          { image, ...params }
        );
      }
    }
  }

  async bulkUpdateVariantPrices(
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
    const mutation = `
      mutation productVariantPriceUpdate($input: ProductVariantPriceUpdateInput!) {
        productVariantPriceUpdate(input: $input) {
          variant {
            id
            price
          }
          userErrors {
            field
            message
          }
        }
      }`;

    const results = [];
    for (const update of updates) {
      const variables = {
        input: {
          id: `gid://shopify/ProductVariant/${update.variantId}`,
          price: update.newPrice.toString(),
        },
      };

      const response = await this.graphqlRequest(accessToken, shop, {
        query: mutation,
        variables,
      });

      if (response.data.productVariantPriceUpdate.userErrors?.length > 0) {
        throw getGraphqlShopifyUserError(
          response.data.productVariantPriceUpdate.userErrors,
          update
        );
      }

      results.push({
        variantId: update.variantId,
        newPrice: parseFloat(response.data.productVariantPriceUpdate.variant.price),
      });
    }

    return results;
  }

  async createProduct(
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
    const mutation = `
      mutation productCreate($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            handle
            title
            description
            publishedAt
            updatedAt
            options {
              id
              name
              values
            }
            images(first: 10) {
              edges {
                node {
                  src
                  height
                  width
                }
              }
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  price
                  sku
                  availableForSale
                  inventoryPolicy
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`;

    const variables = {
      input: {
        title: productData.title,
        descriptionHtml: productData.description,
        vendor: productData.vendor,
        productType: productData.productType,
        tags: productData.tags,
        variants: productData.variants.map(v => ({
          title: v.title,
          price: v.price.toString(),
          sku: v.sku,
          inventoryQuantity: v.inventory,
          requiresShipping: v.requiresShipping,
          taxable: v.taxable,
        })),
      },
    };

    const response = await this.graphqlRequest(accessToken, shop, {
      query: mutation,
      variables,
    });

    if (response.data.productCreate.userErrors?.length > 0) {
      throw getGraphqlShopifyUserError(
        response.data.productCreate.userErrors,
        productData
      );
    }

    return response.data.productCreate.product;
  }

  async updateProduct(
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
    const mutation = `
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            handle
            title
            description
            publishedAt
            updatedAt
            options {
              id
              name
              values
            }
            images(first: 10) {
              edges {
                node {
                  src
                  height
                  width
                }
              }
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  price
                  sku
                  availableForSale
                  inventoryPolicy
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`;

    const variables = {
      input: {
        id: `gid://shopify/Product/${productId}`,
        title: updateData.title,
        descriptionHtml: updateData.description,
        status: updateData.status,
        vendor: updateData.vendor,
        productType: updateData.productType,
        tags: updateData.tags,
      },
    };

    const response = await this.graphqlRequest(accessToken, shop, {
      query: mutation,
      variables,
    });

    if (response.data.productUpdate.userErrors?.length > 0) {
      throw getGraphqlShopifyUserError(
        response.data.productUpdate.userErrors,
        { productId, ...updateData }
      );
    }

    return response.data.productUpdate.product;
  }

  async bulkUpdateProducts(
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
    const mutation = `
      mutation productBulkUpdate($input: [ProductInput!]!) {
        productBulkUpdate(input: $input) {
          products {
            id
            handle
            title
            description
            publishedAt
            updatedAt
            options {
              id
              name
              values
            }
            images(first: 10) {
              edges {
                node {
                  src
                  height
                  width
                }
              }
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  price
                  sku
                  availableForSale
                  inventoryPolicy
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`;

    const variables = {
      input: updates.map(update => ({
        id: `gid://shopify/Product/${update.productId}`,
        title: update.title,
        descriptionHtml: update.description,
        status: update.status,
        vendor: update.vendor,
        productType: update.productType,
        tags: update.tags,
      })),
    };

    const response = await this.graphqlRequest(accessToken, shop, {
      query: mutation,
      variables,
    });

    if (response.data.productBulkUpdate.userErrors?.length > 0) {
      throw getGraphqlShopifyUserError(
        response.data.productBulkUpdate.userErrors,
        updates
      );
    }

    return response.data.productBulkUpdate.products;
  }

  async searchProductsByPriceRange(
    accessToken: string, 
    shop: string,
    params: {
      minPrice: number;
      maxPrice: number;
      currencyCode?: string;
      limit?: number;
    }
  ): Promise<SearchProductsByPriceRangeResponse> {
    const query = gql`
      query getProductsByPriceRange($query: String!, $first: Int!) {
        products(query: $query, first: $first) {
          edges {
            node {
              ...Product
            }
          }
        }
        shop {
          currencyCode
        }
      }
      ${productFragment}
    `;

    const response = await this.graphqlRequest(accessToken, shop, {
      query,
      variables: {
        query: `variants.price:>=${params.minPrice} AND variants.price:<=${params.maxPrice}`,
        first: params.limit || 10
      }
    });

    return {
      products: response.data.products.edges.map((edge: any) => edge.node),
      currencyCode: response.data.shop.currencyCode
    };
  }

  async loadOrders(
    accessToken: string,
    shop: string,
    queryParams: ShopifyOrdersGraphqlQueryParams
  ): Promise<ShopifyOrdersGraphqlResponse> {
    const query = gql`
      query getOrders($first: Int, $after: String, $query: String, $sortKey: OrderSortKeys, $reverse: Boolean) {
        orders(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
          edges {
            node {
              id
              name
              createdAt
              displayFinancialStatus
              email
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
                presentmentMoney {
                  amount
                  currencyCode
                }
              }
              customer {
                id
                email
              }
              lineItems(first: 10) {
                nodes {
                  id
                  title
                  quantity
                  originalTotalSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  variant {
                    id
                    title
                    sku
                    price
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const response = await this.graphqlRequest(accessToken, shop, {
      query,
      variables: queryParams
    });

    return {
      orders: response.data.orders.edges.map((edge: any) => edge.node),
      pageInfo: response.data.orders.pageInfo
    };
  }

  async loadCustomers(
    accessToken: string,
    myshopifyDomain: string,
    limit?: number,
    next?: string
  ): Promise<LoadCustomersResponse> {
    const query = gql`
      query getCustomers($first: Int, $after: String) {
        customers(first: $first, after: $after) {
          edges {
            node {
              id
              email
              firstName
              lastName
              phone
              ordersCount
              tags
              defaultAddress {
                countryCodeV2
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const response = await this.graphqlRequest(accessToken, myshopifyDomain, {
      query,
      variables: {
        first: limit || 10,
        after: next
      }
    });

    return {
      customers: response.data.customers.edges.map((edge: any) => ({
        id: this.getIdFromGid(edge.node.id),
        email: edge.node.email,
        first_name: edge.node.firstName,
        last_name: edge.node.lastName,
        phone: edge.node.phone,
        orders_count: edge.node.ordersCount,
        tags: edge.node.tags,
        currency: edge.node.defaultAddress?.countryCodeV2
      })),
      next: response.data.customers.pageInfo.hasNextPage ? 
        response.data.customers.pageInfo.endCursor : undefined
    };
  }

  async loadProducts(
    accessToken: string,
    myshopifyDomain: string,
    searchTitle: string | null,
    limit?: number,
    afterCursor?: string
  ): Promise<LoadProductsResponse> {
    const query = gql`
      query getProducts($query: String, $first: Int, $after: String) {
        products(query: $query, first: $first, after: $after) {
          edges {
            node {
              ...Product
            }
          }
        }
        shop {
          currencyCode
        }
      }
      ${productFragment}
    `;

    const response = await this.graphqlRequest(accessToken, myshopifyDomain, {
      query,
      variables: {
        query: searchTitle,
        first: limit || 10,
        after: afterCursor
      }
    });

    return {
      products: response.data.products.edges.map((edge: any) => edge.node),
      currencyCode: response.data.shop.currencyCode
    };
  }

  getIdFromGid(gid: string): string {
    const parts = gid.split('/');
    return parts[parts.length - 1];
  }
}
