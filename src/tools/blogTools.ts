import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ShopifyClient } from "../ShopifyClient/ShopifyClient.js";
import { config } from "../config/index.js";
import { handleError, formatSuccess } from "../utils/errorHandler.js";
import { ShopifyClientPort } from "../ShopifyClient/ShopifyClientPort.js";

// Schema for blog article
const BlogArticleSchema = z.object({
  title: z.string(),
  author: z.string(),
  body_html: z.string(),
  published_at: z.string().optional(),
  tags: z.array(z.string()).optional(),
  image: z.object({
    src: z.string(),
    alt: z.string().optional()
  }).optional(),
  status: z.enum(["draft", "published"]).optional()
});

export async function getBlogArticles(
  client: ShopifyClientPort,
  accessToken: string,
  myshopifyDomain: string,
  options: {
    limit?: number;
    status?: "draft" | "published";
    tag?: string;
  } = {}
): Promise<Array<{
  id: string;
  title: string;
  author: string;
  published_at: string;
  tags: string[];
  status: string;
}>> {
  try {
    const response = await client.loadBlogArticles(
      accessToken,
      myshopifyDomain,
      options
    );
    return response.articles;
  } catch (error) {
    throw handleError("Failed to get blog articles", error);
  }
}

export async function getBlogArticle(
  client: ShopifyClientPort,
  accessToken: string,
  myshopifyDomain: string,
  articleId: string
): Promise<{
  id: string;
  title: string;
  author: string;
  body_html: string;
  published_at: string;
  tags: string[];
  status: string;
  image?: {
    src: string;
    alt?: string;
  };
}> {
  try {
    const response = await client.loadBlogArticle(
      accessToken,
      myshopifyDomain,
      articleId
    );
    return response.article;
  } catch (error) {
    throw handleError("Failed to get blog article", error);
  }
}

export async function createBlogArticle(
  client: ShopifyClientPort,
  accessToken: string,
  myshopifyDomain: string,
  article: z.infer<typeof BlogArticleSchema>
): Promise<{
  id: string;
  title: string;
  status: string;
}> {
  try {
    // Validate article data
    const validatedArticle = BlogArticleSchema.parse(article);
    
    const response = await client.createBlogArticle(
      accessToken,
      myshopifyDomain,
      validatedArticle
    );
    return response.article;
  } catch (error) {
    throw handleError("Failed to create blog article", error);
  }
}

export async function updateBlogArticle(
  client: ShopifyClientPort,
  accessToken: string,
  myshopifyDomain: string,
  articleId: string,
  updates: Partial<z.infer<typeof BlogArticleSchema>>
): Promise<{
  id: string;
  title: string;
  status: string;
}> {
  try {
    // Validate updates
    const validatedUpdates = BlogArticleSchema.partial().parse(updates);
    
    const response = await client.updateBlogArticle(
      accessToken,
      myshopifyDomain,
      articleId,
      validatedUpdates
    );
    return response.article;
  } catch (error) {
    throw handleError("Failed to update blog article", error);
  }
}

export async function deleteBlogArticle(
  client: ShopifyClientPort,
  accessToken: string,
  myshopifyDomain: string,
  articleId: string
): Promise<boolean> {
  try {
    await client.deleteBlogArticle(
      accessToken,
      myshopifyDomain,
      articleId
    );
    return true;
  } catch (error) {
    throw handleError("Failed to delete blog article", error);
  }
}

export function registerBlogTools(server: McpServer): void {
  // Define parameter types for handlers
  type GetBlogArticlesParams = {
    limit?: number;
    status?: "draft" | "published";
    tag?: string;
  };

  type GetBlogArticleParams = {
    articleId: string;
  };

  type CreateBlogArticleParams = z.infer<typeof BlogArticleSchema>;

  type UpdateBlogArticleParams = {
    articleId: string;
    updates: Partial<z.infer<typeof BlogArticleSchema>>;
  };

  type DeleteBlogArticleParams = {
    articleId: string;
  };

  // Register tools with proper type definitions
  server.tool(
    "get_blog_articles",
    "Get a list of blog articles with optional filtering",
    {
      limit: z.number().optional(),
      status: z.enum(["draft", "published"]).optional(),
      tag: z.string().optional()
    },
    async ({ limit, status, tag }: GetBlogArticlesParams) => {
      const client = new ShopifyClient();
      try {
        const articles = await getBlogArticles(
          client,
          config.accessToken,
          config.shopDomain,
          { limit, status, tag }
        );
        return formatSuccess(articles);
      } catch (error) {
        return handleError("Failed to get blog articles", error);
      }
    }
  );

  server.tool(
    "get_blog_article",
    "Get details of a specific blog article",
    {
      articleId: z.string()
    },
    async ({ articleId }: GetBlogArticleParams) => {
      const client = new ShopifyClient();
      try {
        const article = await getBlogArticle(
          client,
          config.accessToken,
          config.shopDomain,
          articleId
        );
        return formatSuccess(article);
      } catch (error) {
        return handleError("Failed to get blog article", error);
      }
    }
  );

  server.tool(
    "create_blog_article",
    "Create a new blog article",
    BlogArticleSchema.shape,
    async (article: CreateBlogArticleParams) => {
      const client = new ShopifyClient();
      try {
        const result = await createBlogArticle(
          client,
          config.accessToken,
          config.shopDomain,
          article
        );
        return formatSuccess(result);
      } catch (error) {
        return handleError("Failed to create blog article", error);
      }
    }
  );

  server.tool(
    "update_blog_article",
    "Update an existing blog article",
    {
      articleId: z.string(),
      updates: BlogArticleSchema.partial()
    },
    async ({ articleId, updates }: UpdateBlogArticleParams) => {
      const client = new ShopifyClient();
      try {
        const result = await updateBlogArticle(
          client,
          config.accessToken,
          config.shopDomain,
          articleId,
          updates
        );
        return formatSuccess(result);
      } catch (error) {
        return handleError("Failed to update blog article", error);
      }
    }
  );

  server.tool(
    "delete_blog_article",
    "Delete a blog article",
    {
      articleId: z.string()
    },
    async ({ articleId }: DeleteBlogArticleParams) => {
      const client = new ShopifyClient();
      try {
        const result = await deleteBlogArticle(
          client,
          config.accessToken,
          config.shopDomain,
          articleId
        );
        return formatSuccess(result);
      } catch (error) {
        return handleError("Failed to delete blog article", error);
      }
    }
  );
} 