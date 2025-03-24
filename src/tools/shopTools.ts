/**
 * Shop and collection related tools for the Shopify MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ShopifyClient } from "../ShopifyClient/ShopifyClient.js";
import { config } from "../config/index.js";
import { handleError, formatSuccess } from "../utils/errorHandler.js";

// Define input types for better type safety
interface GetCollectionsInput {
  limit?: number;
  name?: string;
}

/**
 * Registers shop and collection related tools with the MCP server
 * @param server The MCP server instance
 */
export function registerShopTools(server: McpServer): void {
  // Get Collections Tool
  server.tool(
    "get-collections",
    "Get all collections",
    {
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Maximum number of collections to return"),
      name: z.string().optional().describe("Filter collections by name"),
    },
    async ({ limit, name }: GetCollectionsInput) => {
      const client = new ShopifyClient();
      try {
        const collections = await client.loadCollections(
          config.accessToken,
          config.shopDomain,
          { limit, name }
        );
        return formatSuccess(collections);
      } catch (error) {
        return handleError("Failed to retrieve collections", error);
      }
    }
  );

  // Get Shop Tool
  server.tool(
    "get-shop",
    "Get shop details",
    {},
    async () => {
      const client = new ShopifyClient();
      try {
        const shop = await client.loadShop(
          config.accessToken,
          config.shopDomain
        );
        return formatSuccess(shop);
      } catch (error) {
        return handleError("Failed to retrieve shop details", error);
      }
    }
  );

  // Get Shop Details Tool
  server.tool(
    "get-shop-details",
    "Get extended shop details including shipping countries",
    {},
    async () => {
      const client = new ShopifyClient();
      try {
        const shopDetails = await client.loadShopDetail(
          config.accessToken,
          config.shopDomain
        );
        return formatSuccess(shopDetails);
      } catch (error) {
        return handleError("Failed to retrieve extended shop details", error);
      }
    }
  );
} 