/**
 * Webhook-related tools for the Shopify MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ShopifyClient } from "../ShopifyClient/ShopifyClient.js";
import { config } from "../config/index.js";
import { handleError } from "../utils/errorHandler.js";
import { ShopifyWebhookTopic } from "../ShopifyClient/ShopifyClientPort.js";

// Define input types for better type safety
interface ManageWebhookInput {
  action: "subscribe" | "find" | "unsubscribe";
  callbackUrl: string;
  topic: ShopifyWebhookTopic;
  webhookId?: string;
}

/**
 * Registers webhook-related tools with the MCP server
 * @param server The MCP server instance
 */
export function registerWebhookTools(server: McpServer): void {
  // Manage Webhook Tool
  server.tool(
    "manage-webhook",
    "Subscribe, find, or unsubscribe webhooks",
    {
      action: z
        .enum(["subscribe", "find", "unsubscribe"])
        .describe("Action to perform ('subscribe', 'find', 'unsubscribe')"),
      callbackUrl: z.string().describe("Webhook callback URL"),
      topic: z
        .enum(Object.values(ShopifyWebhookTopic) as [ShopifyWebhookTopic, ...ShopifyWebhookTopic[]])
        .describe("Webhook topic to subscribe to"),
      webhookId: z
        .string()
        .optional()
        .describe("Webhook ID (required for unsubscribe)"),
    },
    async ({ action, callbackUrl, topic, webhookId }: ManageWebhookInput) => {
      const client = new ShopifyClient();
      try {
        if (action === "subscribe") {
          const webhook = await client.subscribeWebhook(
            config.accessToken,
            config.shopDomain,
            callbackUrl,
            topic
          );
          return {
            content: [
              {
                type: "text",
                text: `Successfully subscribed to webhook:\nID: ${webhook.id}\nTopic: ${webhook.topic}\nCallback URL: ${webhook.callbackUrl}`,
              },
            ],
          };
        } else if (action === "find") {
          const webhook = await client.findWebhookByTopicAndCallbackUrl(
            config.accessToken,
            config.shopDomain,
            callbackUrl,
            topic
          );
          
          if (webhook) {
            return {
              content: [
                {
                  type: "text",
                  text: `Found webhook:\nID: ${webhook.id}\nTopic: ${webhook.topic}\nCallback URL: ${webhook.callbackUrl}`,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: "text",
                  text: `No webhook found for topic ${topic} and callback URL ${callbackUrl}`,
                },
              ],
            };
          }
        } else if (action === "unsubscribe") {
          if (!webhookId) {
            return {
              content: [
                {
                  type: "text",
                  text: "Webhook ID is required for unsubscribe action",
                },
              ],
              isError: true,
            };
          }
          
          await client.unsubscribeWebhook(
            config.accessToken,
            config.shopDomain,
            webhookId
          );
          
          return {
            content: [
              {
                type: "text",
                text: `Successfully unsubscribed webhook ${webhookId}`,
              },
            ],
          };
        }
        
        // This should never happen due to the enum validation
        return {
          content: [
            {
              type: "text",
              text: `Invalid action: ${action}`,
            },
          ],
          isError: true,
        };
      } catch (error) {
        return handleError(`Failed to ${action} webhook`, error);
      }
    }
  );
} 