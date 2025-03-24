/**
 * Retry utilities for API requests
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: Array<string | RegExp>;
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryableErrors: [
    /rate limit/i,
    /timeout/i,
    /network/i,
    /5\d\d/,  // 5XX server errors
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED'
  ]
};

/**
 * Implements an exponential backoff retry mechanism
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      const shouldRetry = opts.retryableErrors.some(pattern => 
        pattern instanceof RegExp 
          ? pattern.test(lastError.message) 
          : lastError.message.includes(pattern)
      );

      if (!shouldRetry || attempt === opts.maxRetries) {
        throw error;
      }

      // Log retry attempt
      console.error(
        `Operation failed (attempt ${attempt}/${opts.maxRetries}), retrying in ${delay}ms:`,
        error
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next attempt, but don't exceed maxDelay
      delay = Math.min(delay * opts.backoffFactor, opts.maxDelay);
    }
  }

  throw lastError!;
}