# Error Handling Migration Plan

## Current Issues

1. **Duplicate Error Handling Services**
   - `src/services/ErrorHandlingService.ts`
   - `src/services/utils/ErrorHandlingService.ts` (now deprecated)

2. **Inconsistent Error Type Handling**
   - Some areas use `error as Error` type assertions
   - Others handle `PostgrestError` specifically
   - Many deprecated methods still in use

3. **Database Error Exposure**
   - Raw database errors are exposed to consumers
   - No consistent transformation of database-specific errors

## Migration Plan

### Phase 1: Error Handling Standardization ✅

1. ✅ **Create common error utilities**
   - ✅ Added type guards for error types
   - ✅ Standardized error processing
   - ✅ Introduced consistent error handling patterns

2. ✅ **Fix immediate type issues**
   - ✅ Fixed PostgrestError import in DatabaseDiagnosticService.ts
   - ⚠️ Adapter.ts changes causing type conflicts - needs further analysis

3. ✅ **Update repositories to use standardized error handling**
   - ✅ Updated AnalyticsRepository.ts with withStandardizedErrorHandling
   - ✅ Updated TranscriptsRepository.ts with standardized approach
   - ⏳ Other repository classes need updating

### Phase 2: Error Handling Service Consolidation ✅

1. ✅ **Choose primary error handling service**
   - ✅ Selected `src/services/ErrorHandlingService.ts` as the main implementation
   - ✅ Marked `src/services/utils/ErrorHandlingService.ts` as deprecated with warnings

2. ✅ **Create adapter between services**
   - ✅ Created `ErrorBridgeService.ts` with bidirectional adapters
   - ✅ Added seamless transition layer for existing code
   - ✅ Implemented proper event handling between systems

3. ✅ **Begin migration of service usage**
   - ✅ Updated error-utils.ts to use the main error handler
   - ✅ Added deprecation warnings to legacy service methods
   - ✅ Implemented automatic forwarding to main service

### Phase 3: Interface Standardization ✅

1. ✅ **Define consistent error response format**
   - ✅ Created `ResponseTypes.ts` with standardized response interfaces
   - ✅ Added helper functions for creating consistent responses
   - ✅ Defined specialized response types for common operations

2. ✅ **Update service methods**
   - ✅ Updated UserService with standardized response format
   - ✅ Updated BulkUploadService with consistent error handling
   - ⏳ Other services to be updated incrementally

3. ✅ **Client-side error handling**
   - ✅ Created ErrorDisplay component for standardized error UI
   - ✅ Implemented useErrorDisplay hook for component-level error handling
   - ✅ Added withErrorHandling HOC pattern for consistent error experience

### Phase 4: Clean-up and Documentation ✅

1. ✅ **Reduce deprecated code**
   - ✅ Streamlined legacy error handling service
   - ✅ Enhanced compatibility layer for smoother transition
   - ✅ Fixed import conflicts and naming clashes

2. ✅ **Documentation**
   - ✅ Created comprehensive error handling guide (ERROR_HANDLING.md)
   - ✅ Documented best practices with code examples
   - ✅ Added FAQ section for common error handling scenarios

3. ✅ **Prepare for testing**
   - ✅ Documented testing approaches for error handling
   - ✅ Added code examples for testing error paths
   - ✅ Prepared for continued adoption across the application

## Next Steps

Beyond the initial migration plan, we should:

1. **Complete incremental adoption**
   - Continue updating remaining services to use the standardized approach
   - Focus on high-value/high-traffic code paths first
   - Create a tracking system for conversion progress

2. **Add automated testing**
   - Implement unit tests for error paths in key services
   - Add integration tests for error flows in critical user journeys
   - Create test helpers for simulating various error scenarios

3. **Enhance monitoring**
   - Add telemetry for error frequency and categorization
   - Create dashboards for error trends
   - Set up alerts for critical error patterns

4. **Final cleanup (future)**
   - Remove the compatibility layer once all code is migrated
   - Remove deprecated service entirely
   - Refine error categories based on real-world usage

## Adoption Guidelines

When updating a component or service:

1. **Replace try/catch blocks** with `withStandardizedErrorHandling`
2. **Use type guards** instead of type assertions (`as Error`)
3. **Add context** to all error handling calls
4. **Categorize errors** appropriately for analytics and UI feedback
5. **Provide fallback values** for error cases where appropriate
6. **Return consistent response objects** using the helpers in `ResponseTypes.ts`

## Example Usage

```typescript
// Before (deprecated)
import { ErrorHandlingService } from '@/services/utils/ErrorHandlingService';

try {
  const result = await someOperation();
  return result;
} catch (error) {
  ErrorHandlingService.getInstance().handleError(error);
  return { data: null, error: error as Error };
}

// After (recommended)
import { withStandardizedErrorHandling } from '@/services/utils/error-utils';
import { ServiceResponse, createSuccessResponse } from '@/services/ResponseTypes';

return withStandardizedErrorHandling<ServiceResponse<YourDataType>>(
  async () => {
    const result = await someOperation();
    return createSuccessResponse(result);
  },
  'ServiceName.operationName',
  {
    fallbackValue: { data: null, error: new Error('Operation failed') },
    severity: 'error'
  }
);
``` 