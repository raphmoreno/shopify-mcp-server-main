/**
 * Formatting utilities for the Shopify MCP Server
 */

import { ProductNode, ProductVariant, ShopifyOrderGraphql } from "../ShopifyClient/ShopifyClientPort.js";

/**
 * Formats a product for display
 * @param product The product to format
 * @returns Formatted product string
 */
export function formatProduct(product: ProductNode): string {
  return `
  Product: ${product.title} 
  description: ${product.description} 
  handle: ${product.handle}
  variants: ${product.variants.edges
    .map(
      (variant) => `variant.title: ${variant.node.title}
    variant.id: ${variant.node.id}
    variant.price: ${variant.node.price}
    variant.sku: ${variant.node.sku}
    variant.inventoryPolicy: ${variant.node.inventoryPolicy}
    `
    )
    .join(", ")}
  `;
}

/**
 * Formats a product variant for display
 * @param variant The variant to format
 * @returns Formatted variant string
 */
export function formatVariant(variant: ProductVariant): string {
  return `
  Variant: ${variant.title}
  id: ${variant.id}
  price: ${variant.price}
  sku: ${variant.sku || 'N/A'}
  inventoryPolicy: ${variant.inventoryPolicy}
  availableForSale: ${variant.availableForSale}
  `;
}

/**
 * Formats an order for display
 * @param order The order to format
 * @returns Formatted order string
 */
export function formatOrder(order: ShopifyOrderGraphql): string {
  return `
  Order: ${order.name}
  id: ${order.id}
  createdAt: ${order.createdAt}
  financialStatus: ${order.displayFinancialStatus}
  email: ${order.email || 'N/A'}
  totalPrice: ${order.totalPriceSet.shopMoney.amount} ${order.totalPriceSet.shopMoney.currencyCode}
  customer: ${order.customer ? `${order.customer.email} (${order.customer.id})` : 'Guest checkout'}
  lineItems: ${order.lineItems.nodes.map(item => 
    `\n    - ${item.title} x${item.quantity} (${item.originalTotalSet.shopMoney.amount} ${item.originalTotalSet.shopMoney.currencyCode})`
  ).join('')}
  `;
} 