/**
 * Error handling utilities for the Shopify MCP Server
 */

import { CustomError } from "../ShopifyClient/ShopifyClientPort.js";

/**
 * Standard error response format for MCP tools
 */
export interface ErrorResponse {
  content: { type: "text"; text: string }[];
  isError: boolean;
}

/**
 * Handles errors in a consistent way across all MCP tools
 * @param defaultMessage Default error message if specific error details are not available
 * @param error The error object that was caught
 * @returns Formatted error response for MCP
 */
export function handleError(
  defaultMessage: string,
  error: unknown
): ErrorResponse {
  let errorMessage = defaultMessage;
  const timestamp = new Date().toISOString();
  const errorId = Math.random().toString(36).substring(7);
  
  if (error instanceof CustomError) {
    errorMessage = `${defaultMessage}: ${error.message}`;
    
    // Add additional context for specific error types
    if (error.code) {
      errorMessage += ` (Code: ${error.code})`;
    }
    
    if (error.contextData) {
      errorMessage += `\nContext: ${JSON.stringify(error.contextData, null, 2)}`;
    }
    
    if (error.innerError) {
      errorMessage += `\nInner Error: ${JSON.stringify(error.innerError, null, 2)}`;
    }

    // Log detailed error information
    console.error(`[${timestamp}] Error ID: ${errorId}`, {
      message: errorMessage,
      code: error.code,
      contextData: error.contextData,
      innerError: error.innerError,
      stack: error.stack
    });
  } else if (error instanceof Error) {
    errorMessage = `${defaultMessage}: ${error.message}`;
    console.error(`[${timestamp}] Error ID: ${errorId}`, {
      message: errorMessage,
      stack: error.stack
    });
  }

  return {
    content: [{ 
      type: "text", 
      text: `${errorMessage}\nError ID: ${errorId}` 
    }],
    isError: true,
  };
}

/**
 * Formats a successful response
 * @param data The data to include in the response
 * @returns Formatted success response for MCP
 */
export function formatSuccess(data: any): {
  content: { type: "text"; text: string }[];
} {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}