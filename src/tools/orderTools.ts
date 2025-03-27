/**
 * Order-related tools for the Shopify MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ShopifyClient } from "../ShopifyClient/ShopifyClient.js";
import { config } from "../config/index.js";
import { handleError } from "../utils/errorHandler.js";
import { formatOrder } from "../utils/formatters.js";
import { CreateDraftOrderPayload, DraftOrderResponse } from "../ShopifyClient/ShopifyClientPort.js";

// Define input types for better type safety
interface GetOrdersInput {
  first?: number;
  after?: string;
  query?: string;
  sortKey?: "PROCESSED_AT" | "TOTAL_PRICE" | "ID" | "CREATED_AT" | "UPDATED_AT" | "ORDER_NUMBER";
  reverse?: boolean;
}

interface GetOrderInput {
  id: string;
}

interface CreateDraftOrderInput {
  email: string;
  lineItems: Array<{
    variantId: string;
    quantity: number;
  }>;
  shippingAddress?: {
    address1: string;
    address2?: string;
    city: string;
    province: string;
    country: string;
    zip: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  note?: string;
}

interface CompleteDraftOrderInput {
  draftOrderId: string;
  variantId: string;
}

/**
 * Registers order-related tools with the MCP server
 * @param server The MCP server instance
 */
export function registerOrderTools(server: McpServer): void {
  // Get Orders Tool
  server.tool(
    "get-orders",
    "Get all orders",
    {
      first: z
        .number()
        .optional()
        .default(10)
        .describe("Maximum number of orders to return"),
      after: z
        .string()
        .optional()
        .describe("Cursor for pagination"),
      query: z
        .string()
        .optional()
        .describe("Search query for filtering orders"),
      sortKey: z
        .enum(["PROCESSED_AT", "TOTAL_PRICE", "ID", "CREATED_AT", "UPDATED_AT", "ORDER_NUMBER"])
        .optional()
        .describe("Field to sort orders by"),
      reverse: z
        .boolean()
        .optional()
        .describe("Whether to sort in reverse order"),
    },
    async ({ first, after, query, sortKey, reverse }: GetOrdersInput) => {
      const client = new ShopifyClient();
      try {
        const orders = await client.loadOrders(
          config.accessToken,
          config.shopDomain,
          { first, after, query, sortKey, reverse }
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(orders, null, 2),
            },
          ],
        };
      } catch (error) {
        return handleError("Failed to retrieve orders", error);
      }
    }
  );

  // Get Order Tool
  server.tool(
    "get-order",
    "Get a specific order by ID",
    {
      id: z.string().describe("Order ID"),
    },
    async ({ id }: GetOrderInput) => {
      const client = new ShopifyClient();
      try {
        const order = await client.loadOrders(
          config.accessToken,
          config.shopDomain,
          { query: `id:${id}` }
        );
        
        if (!order.orders.length) {
          return {
            content: [
              {
                type: "text",
                text: `Order with ID ${id} not found`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(order.orders[0], null, 2),
            },
          ],
        };
      } catch (error) {
        return handleError("Failed to retrieve order", error);
      }
    }
  );

  // Create Draft Order Tool
  server.tool(
    "create-draft-order",
    "Create a draft order",
    {
      email: z.string().email().describe("Customer email"),
      lineItems: z
        .array(
          z.object({
            variantId: z.string().describe("Product variant ID"),
            quantity: z.number().min(1).describe("Quantity of items"),
          })
        )
        .describe("Order line items"),
      shippingAddress: z
        .object({
          address1: z.string().describe("Street address"),
          address2: z.string().optional().describe("Apartment, suite, etc."),
          city: z.string().describe("City"),
          province: z.string().describe("State/Province"),
          country: z.string().describe("Country"),
          zip: z.string().describe("ZIP/Postal code"),
          firstName: z.string().describe("First name"),
          lastName: z.string().describe("Last name"),
          phone: z.string().optional().describe("Phone number"),
        })
        .optional()
        .describe("Shipping address"),
      note: z.string().optional().describe("Order note"),
    },
    async ({ email, lineItems, shippingAddress, note }: CreateDraftOrderInput) => {
      const client = new ShopifyClient();
      try {
        const draftOrderData: CreateDraftOrderPayload = {
          email,
          lineItems,
          shippingAddress: shippingAddress ? {
            ...shippingAddress,
            countryCode: shippingAddress.country,
            provinceCode: shippingAddress.province,
          } : {
            address1: "",
            city: "",
            province: "",
            country: "",
            zip: "",
            firstName: "",
            lastName: "",
            countryCode: "",
          },
          billingAddress: shippingAddress ? {
            ...shippingAddress,
            countryCode: shippingAddress.country,
            provinceCode: shippingAddress.province,
          } : {
            address1: "",
            city: "",
            province: "",
            country: "",
            zip: "",
            firstName: "",
            lastName: "",
            countryCode: "",
          },
          tags: "",
          note: note || "",
        };

        const draftOrder = await client.createDraftOrder(
          config.accessToken,
          config.shopDomain,
          draftOrderData,
          `draft_order_${Date.now()}` // Generate a unique idempotency key
        );

        return {
          content: [
            {
              type: "text",
              text: `Successfully created draft order:\nID: ${draftOrder.draftOrderId}\nName: ${draftOrder.draftOrderName}`,
            },
          ],
        };
      } catch (error) {
        return handleError("Failed to create draft order", error);
      }
    }
  );

  // Complete Draft Order Tool
  server.tool(
    "complete-draft-order",
    "Complete a draft order",
    {
      draftOrderId: z.string().describe("ID of the draft order to complete"),
      variantId: z.string().describe("ID of the variant in the draft order"),
    },
    async ({ draftOrderId, variantId }: CompleteDraftOrderInput) => {
      const client = new ShopifyClient();
      try {
        const completedOrder = await client.completeDraftOrder(
          config.accessToken,
          config.shopDomain,
          draftOrderId,
          variantId
        );
        
        return {
          content: [
            {
              type: "text",
              text: `Successfully completed draft order:\nDraft Order ID: ${completedOrder.draftOrderId}\nDraft Order Name: ${completedOrder.draftOrderName}\nOrder ID: ${completedOrder.orderId}`,
            },
          ],
        };
      } catch (error) {
        return handleError(`Failed to complete draft order ${draftOrderId}`, error);
      }
    }
  );
} 