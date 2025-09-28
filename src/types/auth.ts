/**
 * Authentication-related types for the Iyzico SDK
 */

/**
 * Configuration options for generating authentication headers
 */
export interface AuthConfig {
  /** The API key to use for authentication */
  apiKey: string;
  /** The secret key to use for HMAC signature generation */
  secretKey: string;
  /** The API endpoint path */
  path: string;
  /** The request body as a JSON string */
  body: string;
}

/**
 * Authentication headers required for Iyzico API requests
 */
export interface IyzicoAuthHeaders {
  /** Authorization header with IYZWSv2 prefix and base64 encoded auth string */
  Authorization: string;
  /** Random key used for signature generation and replay attack prevention */
  'x-iyzi-rnd': string;
  /** Content type header for JSON requests */
  'Content-Type': 'application/json';
  /** Accept header for JSON responses */
  Accept: 'application/json';
}

/**
 * Internal authentication payload structure
 */
export interface AuthPayload {
  /** The random key component */
  randomKey: string;
  /** The API endpoint path */
  path: string;
  /** The request body */
  body: string;
}

/**
 * Authentication string components
 */
export interface AuthString {
  /** The API key component */
  apiKey: string;
  /** The random key component */
  randomKey: string;
  /** The HMAC-SHA256 signature */
  signature: string;
}

/**
 * Authentication generation result
 */
export interface AuthResult {
  /** The generated headers */
  headers: IyzicoAuthHeaders;
  /** The random key used (for debugging/testing) */
  randomKey: string;
  /** The signature generated (for debugging/testing) */
  signature: string;
}

/**
 * Authentication manager configuration
 */
export interface AuthManagerConfig {
  /** Whether to enable debug logging */
  debug?: boolean;
  /** Custom timestamp provider for testing */
  timestampProvider?: () => number;
  /** Custom random number provider for testing */
  randomProvider?: () => number;
}