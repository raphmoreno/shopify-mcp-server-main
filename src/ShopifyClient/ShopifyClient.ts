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
  LoadBlogArticlesResponse,
  LoadBlogArticleResponse,
  CreateBlogArticleResponse,
  UpdateBlogArticleResponse
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

interface GraphQLErrorResponse {
  errors: any[];
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

    const result = await response.json() as unknown;

    const hasErrors = (obj: unknown): obj is GraphQLErrorResponse => {
      return typeof obj === 'object' && obj !== null && 'errors' in obj;
    };
    
    if (hasErrors(result)) {
      throw getGraphqlShopifyError(result.errors, response.status);
    }

    return result as GraphQLResponse;
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

  async subscribeWebhook(
    accessToken: string,
    shop: string,
    callbackUrl: string,
    topic: ShopifyWebhookTopic
  ): Promise<{ id: string; topic: string; callbackUrl: string }> {
    const mutation = gql`
      mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
          webhookSubscription {
            id
            topic
            callbackUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await this.graphqlRequest(accessToken, shop, {
      query: mutation,
      variables: {
        topic,
        webhookSubscription: {
          callbackUrl,
        },
      },
    });

    if (response.data.webhookSubscriptionCreate.userErrors?.length > 0) {
      throw getGraphqlShopifyUserError(
        response.data.webhookSubscriptionCreate.userErrors,
        { topic, callbackUrl }
      );
    }

    return response.data.webhookSubscriptionCreate.webhookSubscription;
  }

  async findWebhookByTopicAndCallbackUrl(
    accessToken: string,
    shop: string,
    callbackUrl: string,
    topic: ShopifyWebhookTopic
  ): Promise<{ id: string; topic: string; callbackUrl: string } | null> {
    const query = gql`
      query getWebhooks($first: Int!) {
        webhookSubscriptions(first: $first) {
          edges {
            node {
              id
              topic
              callbackUrl
            }
          }
        }
      }
    `;

    const response = await this.graphqlRequest(accessToken, shop, {
      query,
      variables: {
        first: 100, // Adjust this number based on your needs
      },
    });

    const webhooks = response.data.webhookSubscriptions.edges;
    return webhooks.find(
      (edge: any) => edge.node.topic === topic && edge.node.callbackUrl === callbackUrl
    )?.node || null;
  }

  async unsubscribeWebhook(
    accessToken: string,
    shop: string,
    webhookId: string
  ): Promise<void> {
    const mutation = gql`
      mutation webhookSubscriptionDelete($id: ID!) {
        webhookSubscriptionDelete(id: $id) {
          deletedWebhookSubscriptionId
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await this.graphqlRequest(accessToken, shop, {
      query: mutation,
      variables: {
        id: `gid://shopify/WebhookSubscription/${webhookId}`,
      },
    });

    if (response.data.webhookSubscriptionDelete.userErrors?.length > 0) {
      throw getGraphqlShopifyUserError(
        response.data.webhookSubscriptionDelete.userErrors,
        { webhookId }
      );
    }
  }

  async loadShopDetails(
    accessToken: string,
    shop: string
  ): Promise<{
    id: string;
    name: string;
    email: string;
    myshopifyDomain: string;
    plan: {
      displayName: string;
      partnerDevelopment: boolean;
      shopifyPlus: boolean;
    };
    ianaTimezone: string;
    currencyCode: string;
    weightUnit: string;
    billingAddress: {
      address1: string;
      address2: string;
      city: string;
      zip: string;
      country: string;
      countryCode: string;
      province: string;
      provinceCode: string;
      phone: string;
    };
    primaryDomain: {
      url: string;
      host: string;
    };
    shippingCountries: Array<{
      code: string;
      name: string;
    }>;
  }> {
    const query = gql`
      query getShopDetails {
        shop {
          id
          name
          email
          myshopifyDomain
          plan {
            displayName
            partnerDevelopment
            shopifyPlus
          }
          ianaTimezone
          currencyCode
          weightUnit
          billingAddress {
            address1
            address2
            city
            zip
            country
            countryCode
            province
            provinceCode
            phone
          }
          primaryDomain {
            url
            host
          }
          shippingCountries {
            code
            name
          }
        }
      }
    `;

    const response = await this.graphqlRequest(accessToken, shop, {
      query,
    });

    return response.data.shop;
  }

  async tagCustomer(
    accessToken: string,
    shop: string,
    customerId: string,
    tags: string[]
  ): Promise<void> {
    const mutation = gql`
      mutation customerUpdate($input: CustomerInput!) {
        customerUpdate(input: $input) {
          customer {
            id
            tags
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await this.graphqlRequest(accessToken, shop, {
      query: mutation,
      variables: {
        input: {
          id: `gid://shopify/Customer/${customerId}`,
          tags: tags.join(", "),
        },
      },
    });

    if (response.data.customerUpdate.userErrors?.length > 0) {
      throw getGraphqlShopifyUserError(
        response.data.customerUpdate.userErrors,
        { customerId, tags }
      );
    }
  }

  async loadBlogArticles(
    accessToken: string,
    myshopifyDomain: string,
    options: {
      limit?: number;
      status?: "draft" | "published";
      tag?: string;
    }
  ): Promise<LoadBlogArticlesResponse> {
    const query = gql`
      query getBlogArticles($first: Int, $query: String) {
        articles(first: $first, query: $query) {
          edges {
            node {
              id
              title
              author {
                name
              }
              bodyHtml
              publishedAt
              tags
              status
              image {
                src
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

    const queryString = [
      options.status && `status:${options.status}`,
      options.tag && `tag:${options.tag}`
    ].filter(Boolean).join(" ");

    const response = await this.graphqlRequest(accessToken, myshopifyDomain, {
      query,
      variables: {
        first: options.limit || 10,
        query: queryString
      }
    });

    return {
      articles: response.data.articles.edges.map((edge: any) => ({
        id: this.getIdFromGid(edge.node.id),
        title: edge.node.title,
        author: edge.node.author.name,
        body_html: edge.node.bodyHtml,
        published_at: edge.node.publishedAt,
        tags: edge.node.tags,
        status: edge.node.status.toLowerCase(),
        image: edge.node.image ? {
          src: edge.node.image.src,
          alt: edge.node.image.altText
        } : undefined
      })),
      next: response.data.articles.pageInfo.hasNextPage ? 
        response.data.articles.pageInfo.endCursor : undefined
    };
  }

  async loadBlogArticle(
    accessToken: string,
    myshopifyDomain: string,
    articleId: string
  ): Promise<LoadBlogArticleResponse> {
    const query = gql`
      query getBlogArticle($id: ID!) {
        article(id: $id) {
          id
          title
          author {
            name
          }
          bodyHtml
          publishedAt
          tags
          status
          image {
            src
            altText
          }
        }
      }
    `;

    const response = await this.graphqlRequest(accessToken, myshopifyDomain, {
      query,
      variables: {
        id: `gid://shopify/Article/${articleId}`
      }
    });

    const article = response.data.article;
    return {
      article: {
        id: this.getIdFromGid(article.id),
        title: article.title,
        author: article.author.name,
        body_html: article.bodyHtml,
        published_at: article.publishedAt,
        tags: article.tags,
        status: article.status.toLowerCase(),
        image: article.image ? {
          src: article.image.src,
          alt: article.image.altText
        } : undefined
      }
    };
  }

  async createBlogArticle(
    accessToken: string,
    myshopifyDomain: string,
    article: {
      title: string;
      author: string;
      body_html: string;
      published_at?: string;
      tags?: string[];
      image?: {
        src: string;
        alt?: string;
      };
      status?: "draft" | "published";
    }
  ): Promise<CreateBlogArticleResponse> {
    const mutation = gql`
      mutation createArticle($input: ArticleInput!) {
        articleCreate(input: $input) {
          article {
            id
            title
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await this.graphqlRequest(accessToken, myshopifyDomain, {
      query: mutation,
      variables: {
        input: {
          title: article.title,
          author: article.author,
          bodyHtml: article.body_html,
          publishedAt: article.published_at,
          tags: article.tags,
          image: article.image ? {
            src: article.image.src,
            altText: article.image.alt
          } : undefined,
          status: article.status?.toUpperCase()
        }
      }
    });

    if (response.data.articleCreate.userErrors.length > 0) {
      throw getGraphqlShopifyUserError(response.data.articleCreate.userErrors);
    }

    return {
      article: {
        id: this.getIdFromGid(response.data.articleCreate.article.id),
        title: response.data.articleCreate.article.title,
        status: response.data.articleCreate.article.status.toLowerCase()
      }
    };
  }

  async updateBlogArticle(
    accessToken: string,
    myshopifyDomain: string,
    articleId: string,
    updates: {
      title?: string;
      author?: string;
      body_html?: string;
      published_at?: string;
      tags?: string[];
      image?: {
        src: string;
        alt?: string;
      };
      status?: "draft" | "published";
    }
  ): Promise<UpdateBlogArticleResponse> {
    const mutation = gql`
      mutation updateArticle($id: ID!, $input: ArticleInput!) {
        articleUpdate(id: $id, input: $input) {
          article {
            id
            title
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await this.graphqlRequest(accessToken, myshopifyDomain, {
      query: mutation,
      variables: {
        id: `gid://shopify/Article/${articleId}`,
        input: {
          title: updates.title,
          author: updates.author,
          bodyHtml: updates.body_html,
          publishedAt: updates.published_at,
          tags: updates.tags,
          image: updates.image ? {
            src: updates.image.src,
            altText: updates.image.alt
          } : undefined,
          status: updates.status?.toUpperCase()
        }
      }
    });

    if (response.data.articleUpdate.userErrors.length > 0) {
      throw getGraphqlShopifyUserError(response.data.articleUpdate.userErrors);
    }

    return {
      article: {
        id: this.getIdFromGid(response.data.articleUpdate.article.id),
        title: response.data.articleUpdate.article.title,
        status: response.data.articleUpdate.article.status.toLowerCase()
      }
    };
  }

  async deleteBlogArticle(
    accessToken: string,
    myshopifyDomain: string,
    articleId: string
  ): Promise<void> {
    const mutation = gql`
      mutation deleteArticle($id: ID!) {
        articleDelete(id: $id) {
          deletedArticleId
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await this.graphqlRequest(accessToken, myshopifyDomain, {
      query: mutation,
      variables: {
        id: `gid://shopify/Article/${articleId}`
      }
    });

    if (response.data.articleDelete.userErrors.length > 0) {
      throw getGraphqlShopifyUserError(response.data.articleDelete.userErrors);
    }
  }
}
