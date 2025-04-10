/**
 * Standardized response interfaces for service methods
 */

/**
 * Generic service response with optional data and error
 */
export interface ServiceResponse<T> {
  data: T | null;
  error: Error | null;
  message?: string;
  statusCode?: number;
}

/**
 * Collection response with pagination data
 */
export interface CollectionResponse<T> extends ServiceResponse<T[]> {
  pagination?: {
    total?: number;
    limit: number;
    page: number;
    totalPages?: number;
  };
}

/**
 * Create a successful response
 */
export function createSuccessResponse<T>(data: T, message?: string): ServiceResponse<T> {
  return {
    data,
    error: null,
    message,
    statusCode: 200
  };
}

/**
 * Create an error response
 */
export function createErrorResponse<T>(
  errorOrMessage: Error | string,
  statusCode = 400
): ServiceResponse<T> {
  const error = typeof errorOrMessage === 'string' 
    ? new Error(errorOrMessage) 
    : errorOrMessage;

  return {
    data: null,
    error,
    message: error.message,
    statusCode
  };
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total?: number,
  limit = 20,
  page = 0
): CollectionResponse<T> {
  const totalPages = total !== undefined ? Math.ceil(total / limit) : undefined;
  
  return {
    data,
    error: null,
    statusCode: 200,
    pagination: {
      total,
      limit,
      page,
      totalPages
    }
  };
}

/**
 * Create a not found response
 */
export function createNotFoundResponse<T>(
  resourceType: string,
  id?: string | number
): ServiceResponse<T> {
  const message = id 
    ? `${resourceType} with ID ${id} not found` 
    : `${resourceType} not found`;
  
  return createErrorResponse(message, 404);
}

/**
 * Create an unauthorized response
 */
export function createUnauthorizedResponse<T>(
  message = 'Unauthorized access'
): ServiceResponse<T> {
  return createErrorResponse(message, 401);
}

/**
 * Create a forbidden response
 */
export function createForbiddenResponse<T>(
  message = 'Forbidden access'
): ServiceResponse<T> {
  return createErrorResponse(message, 403);
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse<T>(
  validationErrors: Record<string, string>
): ServiceResponse<T> {
  const error = new Error('Validation error');
  (error as any).validationErrors = validationErrors;
  
  return {
    data: null,
    error,
    message: 'Validation error',
    statusCode: 422
  };
}

/**
 * Create a server error response
 */
export function createServerErrorResponse<T>(
  message = 'Internal server error'
): ServiceResponse<T> {
  return createErrorResponse(message, 500);
}

/**
 * Result of a deletion operation
 */
export interface DeletionResult {
  success: boolean;
  message?: string;
}

/**
 * Create a successful deletion response
 */
export function createDeletionResponse(
  success: boolean,
  message?: string
): ServiceResponse<DeletionResult> {
  if (success) {
    return createSuccessResponse({
      success,
      message: message || 'Resource deleted successfully'
    });
  } else {
    return createErrorResponse<DeletionResult>(
      message || 'Failed to delete resource',
      400
    );
  }
}

/**
 * Create a success response with no content
 */
export function createNoContentResponse(): ServiceResponse<null> {
  return {
    data: null,
    error: null,
    statusCode: 204
  };
}

/**
 * Create a response for rate limiting
 */
export function createRateLimitResponse<T>(
  retryAfterSeconds: number
): ServiceResponse<T> {
  const error = new Error('Rate limit exceeded');
  return {
    data: null,
    error,
    message: `Rate limit exceeded. Try again after ${retryAfterSeconds} seconds.`,
    statusCode: 429
  };
}

/**
 * Create a response for a successful creation operation
 */
export function createCreatedResponse<T>(
  data: T,
  message?: string
): ServiceResponse<T> {
  return {
    data,
    error: null,
    message: message || 'Resource created successfully',
    statusCode: 201
  };
}

/**
 * Create a partial success response (for bulk operations)
 */
export interface PartialSuccessResult<T> {
  successful: T[];
  failed: Array<{
    item: any;
    error: string;
  }>;
  totalSuccessful: number;
  totalFailed: number;
}

export function createPartialSuccessResponse<T>(
  successful: T[],
  failed: Array<{ item: any; error: string }>
): ServiceResponse<PartialSuccessResult<T>> {
  return {
    data: {
      successful,
      failed,
      totalSuccessful: successful.length,
      totalFailed: failed.length
    },
    error: failed.length > 0 ? new Error('Partial success') : null,
    message: `Operation completed with ${successful.length} successes and ${failed.length} failures`,
    statusCode: failed.length > 0 ? 207 : 200
  };
}

/**
 * Type for file upload operations
 */
export interface FileOperationResponse extends ServiceResponse<{
  fileId: string;
  url?: string;
}> {
  progress?: number;
}

/**
 * Type for batch processing results
 */
export interface BatchProcessingResponse<T> extends ServiceResponse<T> {
  successCount: number;
  failureCount: number;
  processingTime?: number;
}

/**
 * Helper to create batch processing responses
 */
export function createBatchResponse<T>(
  data: T,
  successCount: number,
  failureCount: number,
  processingTime?: number
): BatchProcessingResponse<T> {
  return {
    data,
    error: null,
    successCount,
    failureCount,
    processingTime
  };
}

/**
 * Helper to create batch error response
 */
export function createBatchErrorResponse<T>(
  error: Error | string,
  successCount: number = 0,
  failureCount: number = 0
): BatchProcessingResponse<T> {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  return {
    data: null,
    error: errorObj,
    successCount,
    failureCount
  };
} 