<div align="center">
  <h1>Shopify MCP Server</h1>
  <p><strong>GraphQL-powered integration with Shopify Admin API</strong></p>
  <p>
    <a href="https://example.com/build-status"><img src="https://img.shields.io/badge/build-passing-brightgreen" alt="Build Status"></a>
    <a href="https://www.npmjs.com/package/shopify-mcp-server"><img src="https://img.shields.io/badge/npm-1.0.1-blue" alt="npm version"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>
    <a href="https://discord.gg/kR2DFxV8"><img src="https://img.shields.io/badge/Discord-Join%20Us-7289DA?logo=discord&logoColor=white" alt="Discord"></a>
  </p>
</div>

## 🚀 Overview

Shopify MCP Server provides a powerful bridge between your applications and the Shopify ecosystem through the Model Context Protocol. Easily manage products, customers, orders, and more with simple API calls to Shopify's Admin API.

## 📋 Table of Contents

- [Installation](#-installation)
- [Features](#-features)
- [Available Tools](#-available-tools)
- [Getting Started](#-getting-started)
- [Use Cases](#-use-cases)
- [Setup Guide](#-setup-guide)
- [Development](#-development)
- [Community](#-community)

## 📥 Installation

Choose your preferred installation method:

| Method | Instructions |
|--------|--------------|
| **Smithery** | [![smithery badge](https://smithery.ai/badge/@rezapex/shopify-mcp-server-main)](https://smithery.ai/server/@rezapex/shopify-mcp-server-main) |
| **Glama.ai** | [![glama.ai badge](https://img.shields.io/badge/glama.ai-MCP%20Server-blue)](https://glama.ai/mcp/servers/@rezapex/shopify-mcp-server-main) |
| **NPM** | `npm install shopify-mcp-server` |

## ✨ Features

- **🛍️ Comprehensive Product Management** - Search, retrieve, and manage product data
- **👥 Customer Data Access** - Get customer information and manage tags
- **📦 Advanced Order Processing** - Filter, sort, and manage orders easily
- **⚡ Direct GraphQL Integration** - Connect directly to Shopify's Admin API
- **🛡️ Robust Error Handling** - Clear feedback for troubleshooting

## 🧰 Available Tools

### Product Management

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `get-products` | Find products by title | `searchTitle`, `limit` |
| `get-products-by-collection` | Get collection products | `collectionId`, `limit` |
| `get-products-by-ids` | Retrieve specific products | `productIds` |
| `get-variants-by-ids` | Get variant details | `variantIds` |

### Customer Management

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `get-customers` | Retrieve customer data | `limit`, `next` |
| `tag-customer` | Add tags to customers | `customerId`, `tags` |

### Order Management

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `get-orders` | Filter and sort orders | `first`, `after`, `query`, `sortKey` |
| `get-order` | Get single order details | `orderId` |

### Shop & Collection Tools

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `get-collections` | Retrieve shop collections | `limit`, `name` |
| `get-shop` | Get basic shop details | None |
| `get-shop-details` | Get extended shop info | None |

### Discount Management

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `create-discount` | Create discount codes | `title`, `code`, `valueType`, `value` |

## 🏁 Getting Started

1. **Install the package**
   ```bash
   npm install shopify-mcp-server
   ```

2. **Set up environment variables**
   ```
   SHOPIFY_ACCESS_TOKEN=your_token
   MYSHOPIFY_DOMAIN=your-store.myshopify.com
   ```

3. **Initialize the server**
   ```javascript
   require('shopify-mcp-server').start();
   ```

4. **Make your first API call**
   ```javascript
   const products = await shopifyMcpServer.tools.getProducts({ limit: 10 });
   console.log(products);
   ```

## 💡 Use Cases

- **E-commerce Platform Integration** - Sync products and orders between systems
- **Custom Admin Dashboards** - Build tailored interfaces for your business needs
- **Order Automation** - Set up workflows for automatic order processing
- **Multi-channel Sales Management** - Manage inventory across all sales channels

## 🔧 Setup Guide

### Getting a Shopify Access Token

1. From your Shopify admin, go to **Settings** > **Apps and sales channels**
2. Click **Develop apps** > **Create an app**
3. Name your app (e.g., "Shopify MCP Server")
4. Configure API scopes:
   - `read_products`, `write_products`
   - `read_customers`, `write_customers`
   - `read_orders`, `write_orders`
5. Click **Save** and **Install app**
6. Copy your **Admin API access token**

> **Security Note:** Store your access token securely. Never commit it to version control.

### Using with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "shopify": {
      "command": "npx",
      "args": ["-y", "shopify-mcp-server"],
      "env": {
        "SHOPIFY_ACCESS_TOKEN": "<TOKEN>",
        "MYSHOPIFY_DOMAIN": "<SHOP>.myshopify.com"
      }
    }
  }
}
```

## 👨‍💻 Development

```bash
# Clone the repository
git clone https://github.com/your-username/shopify-mcp-server.git

# Install dependencies
cd shopify-mcp-server
npm install

# Set up environment variables
# Create a .env file with your Shopify credentials

# Build and test
npm run build
npm test
```

## 🤝 Community

| Resource | Link |
|----------|------|
| GitHub Discussions | [Join the conversation](https://github.com/modelcontextprotocol/servers/discussions) |
| Issue Tracker | [Report bugs](https://github.com/rezapex/shopify-mcp-server/issues) |
| Twitter | [@rezajafar](https://twitter.com/rezajafar) |
| Discord | [Join our server](https://discord.gg/kR2DFxV8) |

---

<div align="center">
  <p>Built with ❤️ using the <a href="https://modelcontextprotocol.io">Model Context Protocol</a></p>
</div> 