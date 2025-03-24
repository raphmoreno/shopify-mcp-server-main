/**
 * Discount-related tools for the Shopify MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ShopifyClient } from "../ShopifyClient/ShopifyClient.js";
import { config } from "../config/index.js";
import { handleError } from "../utils/errorHandler.js";
import { CreateBasicDiscountCodeInput } from "../ShopifyClient/ShopifyClientPort.js";

// Define input types for better type safety
interface CreateDiscountInput {
  title: string;
  code: string;
  valueType: "percentage" | "fixed_amount";
  value: number;
  startsAt: string;
  endsAt?: string;
  appliesOncePerCustomer: boolean;
}

/**
 * Registers discount-related tools with the MCP server
 * @param server The MCP server instance
 */
export function registerDiscountTools(server: McpServer): void {
  // Create Discount Tool
  server.tool(
    "create-discount",
    "Create a basic discount code",
    {
      title: z.string().describe("Title of the discount"),
      code: z.string().describe("Discount code that customers will enter"),
      valueType: z
        .enum(["percentage", "fixed_amount"])
        .describe("Type of discount ('percentage' or 'fixed_amount')"),
      value: z.number().describe("Discount value (percentage as decimal or fixed amount)"),
      startsAt: z.string().describe("Start date in ISO format"),
      endsAt: z.string().optional().describe("Optional end date in ISO format"),
      appliesOncePerCustomer: z
        .boolean()
        .describe("Whether discount can be used only once per customer"),
    },
    async ({ title, code, valueType, value, startsAt, endsAt, appliesOncePerCustomer }: CreateDiscountInput) => {
      const client = new ShopifyClient();
      try {
        const discountInput: CreateBasicDiscountCodeInput = {
          title,
          code,
          valueType,
          value,
          startsAt,
          endsAt,
          appliesOncePerCustomer,
          includeCollectionIds: [],
          excludeCollectionIds: [],
          combinesWith: {
            productDiscounts: true,
            orderDiscounts: true,
            shippingDiscounts: true,
          },
        };

        const discount = await client.createBasicDiscountCode(
          config.accessToken,
          config.shopDomain,
          discountInput
        );

        return {
          content: [
            {
              type: "text",
              text: `Successfully created discount code:\nID: ${discount.id}\nCode: ${discount.code}`,
            },
          ],
        };
      } catch (error) {
        return handleError("Failed to create discount code", error);
      }
    }
  );
} 