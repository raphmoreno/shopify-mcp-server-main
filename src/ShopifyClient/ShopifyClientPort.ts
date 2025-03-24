// Base types
export type Nullable<T> = T | null;
export type ISODate = string;
export type Maybe<T> = T | null | undefined;

// Customer types
export type LoadCustomersResponse = {
  customers: Array<{
    id?: number;
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    orders_count?: number;
    tags?: string;
    currency?: string;
  }>;
  next?: string;
};

// Order types
export type ShopifyOrdersGraphqlQueryParams = {
  first?: number;
  after?: string;
  query?: string;
  sortKey?: "PROCESSED_AT" | "TOTAL_PRICE" | "ID" | "CREATED_AT" | "UPDATED_AT" | "ORDER_NUMBER";
  reverse?: boolean;
};

export type ShopifyOrderGraphql = {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  email: string;
  phone: string | null;
  totalPriceSet: {
    shopMoney: { amount: string; currencyCode: string };
    presentmentMoney: { amount: string; currencyCode: string };
  };
  customer: {
    id: string;
    email: string;
  } | null;
  shippingAddress: {
    provinceCode: string | null;
    countryCode: string;
  } | null;
  lineItems: {
    nodes: Array<{
      id: string;
      title: string;
      quantity: number;
      originalTotalSet: {
        shopMoney: { amount: string; currencyCode: string };
      };
      variant: {
        id: string;
        title: string;
        sku: string | null;
        price: string;
      } | null;
    }>;
  };
};

export type ShopifyOrdersGraphqlResponse = {
  orders: ShopifyOrderGraphql[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
};

// Product types
export type ProductNode = {
  id: string;
  handle: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  options: ProductOption[];
  images: {
    edges: {
      node: ProductImage;
    }[];
  };
  variants: {
    edges: {
      node: ProductVariant;
    }[];
  };
};

export type ProductImage = {
  src: string;
  height: number;
  width: number;
};

export type ProductOption = {
  id: string;
  name: string;
  values: string[];
};

export type ProductVariant = {
  id: string;
  title: string;
  price: string;
  sku: string;
  availableForSale: boolean;
  image: Nullable<ProductImage>;
  inventoryPolicy: "CONTINUE" | "DENY";
  selectedOptions: SelectedProductOption[];
};

export type SelectedProductOption = {
  name: string;
  value: string;
};

// Response types
export type SearchProductsByPriceRangeResponse = {
  products: ProductNode[];
  currencyCode: string;
};

export type ProductAnalytics = {
  productId: string;
  metrics: {
    views?: number;
    addToCart?: number;
    purchases?: number;
    revenue?: number;
    conversionRate?: number;
  };
};

export type ProductImageOperation = {
  id?: string;
  url?: string;
  altText?: string;
  position?: number;
};

export type LoadProductsResponse = {
  currencyCode: string;
  products: ProductNode[];
  next?: string;
};

export type LoadVariantsByIdResponse = {
  currencyCode: string;
  variants: ProductVariantWithProductDetails[];
};

export type LoadProductsByIdsResponse = {
  currencyCode: string;
  products: ProductNode[];
};

export type ProductVariantWithProductDetails = ProductVariant & {
  product: {
    id: string;
    title: string;
    description: string;
    images: {
      edges: {
        node: ProductImage;
      }[];
    };
  };
};

// Collection types
export type ShopifyCollection = {
  id: number;
  handle: string;
  title: string;
  updated_at: string;
  body_html: Nullable<string>;
  published_at: string;
  sort_order: string;
  template_suffix?: Nullable<string>;
  published_scope: string;
  image?: {
    src: string;
    alt: string;
  };
};

export type LoadCollectionsResponse = {
  collections: ShopifyCollection[];
  next?: string;
};

export type ShopifySmartCollectionsResponse = {
  smart_collections: ShopifyCollection[];
};

export type ShopifyCustomCollectionsResponse = {
  custom_collections: ShopifyCollection[];
};

export type ShopifyCollectionsQueryParams = {
  query: any;
  sinceId?: string;
  name?: string;
  limit: number;
};

// Draft Order types
export type CreateDraftOrderPayload = {
  lineItems: Array<{
    variantId: string;
    quantity: number;
    appliedDiscount?: {
      title: string;
      value: number;
      valueType: "FIXED_AMOUNT" | "PERCENTAGE";
    };
  }>;
  shippingAddress: {
    address1: string;
    address2?: string;
    countryCode: string;
    firstName: string;
    lastName: string;
    zip: string;
    city: string;
    country: string;
    province?: string;
    provinceCode?: string;
    phone?: string;
  };
  billingAddress: {
    address1: string;
    address2?: string;
    countryCode: string;
    firstName: string;
    lastName: string;
    zip: string;
    city: string;
    country: string;
    province?: string;
    provinceCode?: string;
    phone?: string;
  };
  email: string;
  tags: string;
  note: string;
};

export type DraftOrderResponse = {
  draftOrderId: string;
  draftOrderName: string;
};

export type CompleteDraftOrderResponse = {
  draftOrderId: string;
  draftOrderName: string;
  orderId: string;
};

// Shop types
export type ShopResponse = {
  data: {
    shop: {
      shipsToCountries: string[];
    };
  };
};

export type LoadStorefrontsResponse = {
  shop: {
    id: string;
    name: string;
    domain: string;
    myshopify_domain: string;
    currency: string;
    enabled_presentment_currencies: string[];
    address1: string;
    created_at: string;
    updated_at: string;
  };
};

// Discount types
export type GetPriceRuleInput = {
  id: string;
};

export type GetPriceRuleResponse = {
  priceRule: {
    id: string;
    valueType: string;
    value: string;
    title: string;
    targetType: string;
    startsAt: string;
    endsAt?: string;
    status: string;
    allocationMethod: string;
    usageLimit?: number;
    customerSelection: string;
    oncePerCustomer: boolean;
    prerequisiteSubtotalRange?: {
      greaterThanOrEqualTo?: string;
      lessThanOrEqualTo?: string;
    };
    prerequisiteQuantityRange?: {
      greaterThanOrEqualTo?: number;
      lessThanOrEqualTo?: number;
    };
    prerequisiteShippingPriceRange?: {
      greaterThanOrEqualTo?: string;
      lessThanOrEqualTo?: string;
    };
    entitledProductIds?: string[];
    entitledVariantIds?: string[];
    entitledCollectionIds?: string[];
    entitledCountryIds?: string[];
    prerequisiteProductIds?: string[];
    prerequisiteVariantIds?: string[];
    prerequisiteCollectionIds?: string[];
    prerequisiteSavedSearchIds?: string[];
    prerequisiteCustomerIds?: string[];
  };
};

export type CreateBasicDiscountCodeInput = {
  title: string;
  code: string;
  startsAt: ISODate;
  endsAt?: ISODate;
  valueType: string;
  value: number;
  usageLimit?: number;
  includeCollectionIds: string[];
  excludeCollectionIds: string[];
  appliesOncePerCustomer: boolean;
  combinesWith: {
    productDiscounts: boolean;
    orderDiscounts: boolean;
    shippingDiscounts: boolean;
  };
};

export type CreateBasicDiscountCodeResponse = {
  id: string;
  code: string;
};

export type BasicDiscountCodeResponse = {
  data: {
    discountCodeBasicCreate: {
      codeDiscountNode: {
        id: string;
        codeDiscount: {
          title: string;
          codes: {
            nodes: Array<{
              code: string;
            }>;
          };
          startsAt: string;
          endsAt: string;
          customerSelection: {
            allCustomers: boolean;
          };
          customerGets: {
            appliesOnOneTimePurchase: boolean;
            appliesOnSubscription: boolean;
            value: {
              percentage?: number;
              amount?: {
                amount: number;
                currencyCode: string;
              };
            };
            items: {
              allItems: boolean;
            };
          };
          appliesOncePerCustomer: boolean;
          recurringCycleLimit: number;
        };
      };
      userErrors: Array<{
        field: string[];
        code: string;
        message: string;
      }>;
    };
  };
};

export type CreatePriceRuleInput = {
  title: string;
  targetType: "LINE_ITEM" | "SHIPPING_LINE";
  allocationMethod: "ACROSS" | "EACH";
  valueType: "fixed_amount" | "percentage";
  value: string;
  entitledCollectionIds: string[];
  usageLimit?: number;
  startsAt: ISODate;
  endsAt?: ISODate;
};

export type CreatePriceRuleResponse = {
  id: string;
};

export type CreateDiscountCodeResponse = {
  id: string;
  priceRuleId: string;
  code: string;
  usageCount: number;
};

// Error handling
export type CustomErrorPayload = {
  customCode?: string;
  message?: string;
  innerError?: any;
  contextData?: any;
};

export class CustomError extends Error {
  public code: string;
  public innerError: any;
  public contextData: any;

  constructor(message: string, code: string, payload: CustomErrorPayload = {}) {
    super(message);
    this.code = payload.customCode ? `${code}.${payload.customCode}` : code;
    this.innerError = payload.innerError;
    this.contextData = payload.contextData;
    this.name = this.constructor.name;
  }
}

export class ShopifyClientErrorBase extends CustomError {
  static code = "SHOPIFY_CLIENT_ERROR";

  constructor(message: string, code: string = ShopifyClientErrorBase.code, payload: CustomErrorPayload = {}) {
    super(message, code, payload);
  }
}

export class ShopifyAuthorizationError extends ShopifyClientErrorBase {
  static code = "SHOPIFY_CLIENT.AUTHORIZATION_ERROR";

  constructor(payload: CustomErrorPayload = {}) {
    super("Shopify authorization error", ShopifyAuthorizationError.code, payload);
  }
}

export class ShopifyInputError extends ShopifyClientErrorBase {
  static code = "SHOPIFY_CLIENT.INPUT_ERROR";

  constructor(payload: CustomErrorPayload = {}) {
    super("Shopify input error", ShopifyInputError.code, payload);
  }
}

export class ShopifyRequestError extends ShopifyClientErrorBase {
  static code = "SHOPIFY_CLIENT.REQUEST_ERROR";

  constructor(payload: CustomErrorPayload = {}) {
    super("Shopify request error", ShopifyRequestError.code, payload);
  }
}

export class ShopifyPaymentError extends ShopifyClientErrorBase {
  static code = "SHOPIFY_CLIENT.PAYMENT_ERROR";

  constructor(payload: CustomErrorPayload = {}) {
    super("Shopify payment error", ShopifyPaymentError.code, payload);
  }
}

export class ShopifyProductVariantNotFoundError extends ShopifyClientErrorBase {
  static code = "SHOPIFY_CLIENT.PRODUCT_VARIANT_NOT_FOUND";

  constructor(payload: CustomErrorPayload = {}) {
    super("Product variant not found", ShopifyProductVariantNotFoundError.code, payload);
  }
}

export class ShopifyProductVariantNotAvailableForSaleError extends ShopifyClientErrorBase {
  static code = "SHOPIFY_CLIENT.PRODUCT_VARIANT_NOT_AVAILABLE_FOR_SALE";

  constructor(payload: CustomErrorPayload = {}) {
    super("Product variant not available for sale", ShopifyProductVariantNotAvailableForSaleError.code, payload);
  }
}

export class GeneralShopifyClientError extends ShopifyClientErrorBase {
  static code = "SHOPIFY_CLIENT.GENERAL_ERROR";

  constructor(payload: CustomErrorPayload = {}) {
    super("General Shopify client error", GeneralShopifyClientError.code, payload);
  }
}

export function getHttpShopifyError(
  error: any,
  statusCode: number,
  contextData?: Record<string, any>
): ShopifyClientErrorBase {
  switch (statusCode) {
    case 401:
    case 403:
      return new ShopifyAuthorizationError({ innerError: error, contextData });
    case 400:
    case 404:
      return new ShopifyInputError({ innerError: error, contextData });
    case 402:
      return new ShopifyPaymentError({ innerError: error, contextData });
    default:
      return new GeneralShopifyClientError({ innerError: error, contextData });
  }
}

export function getGraphqlShopifyError(
  errors: any[],
  statusCode: number,
  contextData?: Record<string, any>
): ShopifyClientErrorBase {
  switch (statusCode) {
    case 403:
      return new ShopifyAuthorizationError({ innerError: errors, contextData });
    case 400:
      return new ShopifyInputError({ innerError: errors, contextData });
    case 402:
      return new ShopifyPaymentError({ innerError: errors, contextData });
    default:
      return new GeneralShopifyClientError({ innerError: errors, contextData });
  }
}

export function getGraphqlShopifyUserError(
  errors: any[],
  contextData?: Record<string, any>
): ShopifyClientErrorBase {
  if (errors.some(e => e.message?.includes("variant not found"))) {
    return new ShopifyProductVariantNotFoundError({ innerError: errors, contextData });
  }
  if (errors.some(e => e.message?.includes("not available for sale"))) {
    return new ShopifyProductVariantNotAvailableForSaleError({ innerError: errors, contextData });
  }
  return new GeneralShopifyClientError({ innerError: errors, contextData });
}

// Webhook types
export enum ShopifyWebhookTopic {
  ORDERS_UPDATED = "orders/updated"
}

export enum ShopifyWebhookTopicGraphql {
  ORDERS_UPDATED = "ORDERS_UPDATED"
}

export type ShopifyWebhook = {
  id: string;
  callbackUrl: string;
  topic: ShopifyWebhookTopic;
};

// The main client interface
export interface ShopifyClientPort {
  searchProductsByPriceRange(
    accessToken: string,
    shop: string,
    params: {
      minPrice: number;
      maxPrice: number;
      currencyCode?: string;
      limit?: number;
    }
  ): Promise<SearchProductsByPriceRangeResponse>;

  loadOrders(
    accessToken: string,
    shop: string,
    queryParams: ShopifyOrdersGraphqlQueryParams
  ): Promise<ShopifyOrdersGraphqlResponse>;

  loadCustomers(
    accessToken: string,
    myshopifyDomain: string,
    limit?: number,
    next?: string
  ): Promise<LoadCustomersResponse>;

  loadProducts(
    accessToken: string,
    myshopifyDomain: string,
    searchTitle: string | null,
    limit?: number,
    afterCursor?: string
  ): Promise<LoadProductsResponse>;

  loadProductsByCollectionId(
    accessToken: string,
    myshopifyDomain: string,
    collectionId: string,
    limit?: number,
    afterCursor?: string
  ): Promise<LoadProductsResponse>;

  loadCollections(
    accessToken: string,
    myshopifyDomain: string,
    queryParams: ShopifyCollectionsQueryParams,
    next?: string
  ): Promise<LoadCollectionsResponse>;

  createDraftOrder(
    accessToken: string,
    shop: string,
    draftOrderData: CreateDraftOrderPayload,
    idempotencyKey: string
  ): Promise<DraftOrderResponse>;

  completeDraftOrder(
    accessToken: string,
    shop: string,
    draftOrderId: string,
    variantId: string
  ): Promise<CompleteDraftOrderResponse>;

  createBasicDiscountCode(
    accessToken: string,
    shop: string,
    discountInput: CreateBasicDiscountCodeInput
  ): Promise<CreateBasicDiscountCodeResponse>;

  getPriceRule(
    accessToken: string,
    shop: string,
    input: GetPriceRuleInput
  ): Promise<GetPriceRuleResponse>;

  manageInventory(
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
  }>;

  bulkVariantOperations(
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
  ): Promise<void>;

  manageProductMetafields(
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
  ): Promise<void>;

  manageProductCollections(
    accessToken: string,
    shop: string,
    params: {
      action: "ADD" | "REMOVE";
      productIds: string[];
      collectionIds: string[];
    }
  ): Promise<void>;

  manageProductImages(
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
  ): Promise<void>;

  bulkUpdateVariantPrices(
    accessToken: string,
    shop: string,
    updates: Array<{
      variantId: string;
      newPrice: number;
    }>
  ): Promise<Array<{
    variantId: string;
    newPrice: number;
  }>>;

  createProduct(
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
  ): Promise<ProductNode>;

  updateProduct(
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
  ): Promise<ProductNode>;

  bulkUpdateProducts(
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
  ): Promise<ProductNode[]>;
}
