#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "./config/index.js";
import { registerProductTools } from "./tools/productTools.js";
import { registerCustomerTools } from "./tools/customerTools.js";
import { registerOrderTools } from "./tools/orderTools.js";
import { registerShopTools } from "./tools/shopTools.js";
import { registerDiscountTools } from "./tools/discountTools.js";
import { registerWebhookTools } from "./tools/webhookTools.js";

/**
 * Main entry point for the Shopify MCP Server
 * Initializes the server and registers all tools
 */
async function main() {
  let server: McpServer | null = null;

  async function shutdown(signal: string) {
    console.error(`Received ${signal}. Shutting down gracefully...`);
    if (server) {
      try {
        await server.disconnect();
      } catch (error) {
        console.error('Error during shutdown:', error);
      }
    }
    process.exit(0);
  }

  // Handle graceful shutdown
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  try {
    // Validate required environment variables
    if (!process.env.SHOPIFY_ACCESS_TOKEN || !process.env.MYSHOPIFY_DOMAIN) {
      throw new Error('Missing required environment variables. Please check README.md for setup instructions.');
    }

    // Create the MCP server
    server = new McpServer({
      name: "shopify-tools",
      version: "1.0.1",
      description: "Shopify API integration tools for MCP"
    });

    // Register all tools
    registerProductTools(server);
    registerCustomerTools(server);
    registerOrderTools(server);
    registerShopTools(server);
    registerDiscountTools(server);
    registerWebhookTools(server);

    // Connect to the transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error("Shopify MCP Server running on stdio");
    console.error(`Connected to shop: ${process.env.MYSHOPIFY_DOMAIN}`);
    
    // Keep the process running
    process.stdin.resume();
  } catch (error) {
    console.error("Fatal error during server initialization:", error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
