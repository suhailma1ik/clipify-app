import { getApiClient } from "./apiClient";

/**
 * Rephrase API Service
 * Handles automatic text rephrasing
 */

export interface RephraseRequest {
  text: string;
  style: string;
  context: string;
  preserve_length: boolean;
  target_audience: string;
}

export interface RephraseResponse {
  rephrased_text: string;
}

export class RephraseError extends Error {
  public code?: string;
  public details?: any;

  constructor(options: { message: string; code?: string; details?: any }) {
    super(options.message);
    this.name = "RephraseError";
    this.code = options.code;
    this.details = options.details;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, RephraseError.prototype);
  }
}

/**
 * Service for handling text rephrasing functionality
 */
export class RephraseService {
  constructor() {
    // No longer need to manage API URL - handled by ApiClient
  }

  /**
   * Set JWT token for authenticated requests
   * @param token - JWT token
   */
  setJwtToken(token: string | null): void {
    try {
      const apiClient = getApiClient();
      apiClient.setJwtToken(token);
      console.log("[RephraseService] JWT token updated");
    } catch (error) {
      console.error("[RephraseService] Failed to set JWT token:", error);
      throw new RephraseError({
        message: "Failed to set JWT token - API client not initialized",
        code: "API_CLIENT_ERROR",
      });
    }
  }

  /**
   * Count words in text
   */
  public countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  /**
   * Validate text for free plan limits
   */
  public validateTextForFreePlan(text: string): {
    isValid: boolean;
    error?: string;
  } {
    const wordCount = this.countWords(text);
    const maxWords = 150;

    if (wordCount > maxWords) {
      return {
        isValid: false,
        error: `Text exceeds ${maxWords}-word limit (${wordCount} words)`,
      };
    }

    return { isValid: true };
  }

  /**
   * Send text for rephrasing
   */
  async rephrase(
    text: string,
    style: string = "formal",
    context: string = "Business communication",
    target_audience: string = "Colleagues",
    preserve_length: boolean = false
  ): Promise<RephraseResponse> {
    // Validate text for free plan (basic validation)
    const validation = this.validateTextForFreePlan(text);
    if (!validation.isValid) {
      throw new RephraseError({
        message: validation.error!,
        code: "WORD_LIMIT_EXCEEDED",
      });
    }

    try {
      console.log("[RephraseService] Sending rephrase request:", {
        textLength: text.length,
        wordCount: this.countWords(text),
        style: style,
        context: context,
        target_audience: target_audience,
        preserve_length: preserve_length,
        timestamp: new Date().toISOString(),
      });

      // Get API client instance
      const apiClient = getApiClient();

      // Check if JWT token is available
      if (!apiClient.getJwtToken()) {
        throw new RephraseError({
          message: "JWT token is required for rephrasing",
          code: "UNAUTHORIZED",
        });
      }

      // Make the API call using ApiClient
      const response = await apiClient.rephraseText(
        text,
        style,
        context,
        target_audience,
        preserve_length
      );

      // Validate response structure
      if (!response.data || !response.data.rephrased_text) {
        throw new RephraseError({
          message: "Invalid response format: missing rephrased_text",
          code: "INVALID_RESPONSE",
        });
      }

      console.log("[RephraseService] Rephrase request successful:", {
        originalLength: text.length,
        rephrasedLength: response.data.rephrased_text.length,
      });

      return response.data;
    } catch (error) {
      // Handle RephraseError instances
      if (error instanceof RephraseError) {
        throw error;
      }

      console.error("[RephraseService] Request error:", error);

      // Handle API client errors
      if (error instanceof Error) {
        const errorMessage = error.message || "";

        if (errorMessage.includes("JWT token is required")) {
          throw new RephraseError({
            message: "JWT token is required for rephrasing",
            code: "UNAUTHORIZED",
          });
        }

        if (errorMessage.includes("HTTP 401")) {
          throw new RephraseError({
            message: "Unauthorized request - invalid or expired token",
            code: "UNAUTHORIZED",
          });
        }

        if (errorMessage.includes("HTTP 403")) {
          throw new RephraseError({
            message: "Access denied",
            code: "FORBIDDEN",
          });
        }

        if (errorMessage.includes("HTTP 429")) {
          throw new RephraseError({
            message: "Quota exceeded. Please try again later.",
            code: "RATE_LIMITED",
          });
        }

        if (errorMessage.includes("HTTP 5")) {
          throw new RephraseError({
            message: "Server error. Please try again later.",
            code: "SERVER_ERROR",
          });
        }

        if (
          errorMessage.includes("fetch") ||
          errorMessage.includes("network")
        ) {
          throw new RephraseError({
            message:
              "Network error. Please check your internet connection and try again.",
            code: "NETWORK_ERROR",
            details: error,
          });
        }
      }

      throw new RephraseError({
        message: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
        code: "UNKNOWN_ERROR",
        details: error,
      });
    }
  }
}

// Create a singleton instance
export const rephraseService = new RephraseService();

// Helper function to check if an object is a RephraseError
export function isRephraseError(error: any): error is RephraseError {
  return error && typeof error === "object" && "message" in error;
}
