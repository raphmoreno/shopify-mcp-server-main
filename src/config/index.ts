/**
 * Configuration module for the Shopify MCP Server
 * Centralizes all configuration options and provides validation
 */

// No need to import process as it's a global in Node.js

// Default Shopify API version - can be overridden with environment variable
const DEFAULT_API_VERSION = '2023-10';

export interface ShopifyConfig {
  accessToken: string;
  shopDomain: string;
  apiVersion: string;
}

/**
 * Validates and loads configuration from environment variables
 * @returns Validated configuration object
 * @throws Error if required environment variables are missing
 */
export function loadConfig(): ShopifyConfig {
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("SHOPIFY_ACCESS_TOKEN environment variable is required");
  }

  const shopDomain = process.env.MYSHOPIFY_DOMAIN;
  if (!shopDomain) {
    throw new Error("MYSHOPIFY_DOMAIN environment variable is required");
  }

  // Allow API version to be configurable via environment variable
  const apiVersion = process.env.SHOPIFY_API_VERSION || DEFAULT_API_VERSION;

  return {
    accessToken,
    shopDomain,
    apiVersion,
  };
}

// Export a singleton instance of the config
export const config = loadConfig(); 