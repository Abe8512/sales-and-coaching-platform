# Error Handling Guide

This guide outlines the standardized error handling approach for the Future Sentiment Analytics application. Following these guidelines will ensure consistent error handling throughout the application.

## Core Principles

1. **Centralized Error Handling**: All errors should flow through our central error handling services
2. **Standardized Error Responses**: Service methods should return consistent response objects
3. **User-Friendly Messages**: Errors exposed to users should be clear and actionable
4. **Detailed Logging**: Technical details should be logged for debugging
5. **Contextual Information**: Errors should include context about where and why they occurred

## Error Handling Services

We have two error handling services:

- **`ErrorHandlingService`** (main): Located at `src/services/ErrorHandlingService.ts`
- **`ErrorHandlingService`** (legacy): Located at `src/services/utils/ErrorHandlingService.ts` (deprecated)

New code should use the main implementation. A bridge adapter is provided to ensure compatibility during migration.

## Standard Usage Patterns

### 1. Using `withStandardizedErrorHandling` Higher-Order Function

The preferred way to handle errors in service methods:

```typescript
import { withStandardizedErrorHandling } from '@/services/utils/error-utils';
import { ServiceResponse, createSuccessResponse } from '@/services/ResponseTypes';

async function fetchUserData(userId: string): Promise<ServiceResponse<UserData>> {
  return withStandardizedErrorHandling(
    async () => {
      const data = await someApiCall(userId);
      return createSuccessResponse(data);
    },
    'UserService.fetchUserData',
    {
      fallbackValue: { data: null, error: new Error('Failed to fetch user data') },
      severity: 'warning'
    }
  );
}
```

### 2. Error Type Guards

Use type guards to safely work with error types:

```typescript
import { isPostgrestError, isErrorObject } from '@/services/utils/error-utils';

if (isPostgrestError(error)) {
  // Handle Supabase database error
} else if (isErrorObject(error)) {
  // Handle standard Error object
} else {
  // Handle unknown error type
}
```

### 3. Standardized Response Objects

All service methods should return consistent response objects:

```typescript
import { 
  ServiceResponse, 
  createSuccessResponse,
  createErrorResponse,
  createNotFoundResponse
} from '@/services/ResponseTypes';

// Success response
return createSuccessResponse(data);

// Error response
return createErrorResponse('Something went wrong');

// Not found response
return createNotFoundResponse('User', userId);
```

## Error Categories

Errors are categorized to help with analysis and appropriate handling:

- **Authentication**: User login, session, credentials issues
- **Authorization**: Permission and access control issues
- **Validation**: Invalid input data
- **API**: External service communication failures
- **Database**: Data storage and retrieval issues
- **Network**: Connection and timeout issues
- **Internal**: Application logic errors
- **Runtime**: Execution environment issues
- **Unknown**: Uncategorized errors

## Component-Level Error Handling

Components should use standardized error handling components and hooks:

```tsx
import { useErrorDisplay } from '@/hooks/useErrorDisplay';
import ErrorDisplay from '@/components/ErrorDisplay';

function UserProfile({ userId }) {
  const { error, setError, clearError } = useErrorDisplay();
  
  // Later in your code:
  try {
    // Some operation that might fail
  } catch (err) {
    setError(err, 'Failed to load profile');
  }
  
  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchData} />;
  }
  
  return <div>User profile content</div>;
}
```

Alternatively, use the HOC pattern:

```tsx
import { withErrorHandling } from '@/components/hoc/withErrorHandling';

const UserProfileWithErrorHandling = withErrorHandling(UserProfile, {
  fallback: UserProfileErrorState,
  errorMessage: 'Unable to display user profile'
});
```

## Handling Database Errors

Database errors should be transformed into user-friendly messages:

```typescript
import { mapDatabaseError } from '@/services/utils/error-utils';

try {
  // Database operation
} catch (error) {
  const friendlyError = mapDatabaseError(error);
  // friendlyError has a user-friendly message based on the error code
}
```

## Error Logging

Errors are automatically logged when using our standardized error handling. For manual logging:

```typescript
import { utilsToMainAdapter } from '@/services/utils/ErrorBridgeService';

utilsToMainAdapter.handleError(error, {
  severity: 'error',
  operationContext: 'ComponentName.operationName',
  userId: currentUser.id,
  // Additional context
});
```

## Error Tracking in Production

In production, errors are automatically captured and sent to our error tracking service. To add custom context:

```typescript
try {
  // Operation
} catch (error) {
  utilsToMainAdapter.handleError(error, {
    // Add business context to help with debugging
    orderId: order.id,
    transactionAmount: payment.amount,
    userRole: user.role
  });
}
```

## Error Boundary Components

Use React Error Boundaries for component-level error isolation:

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary fallback={<ErrorFallback />}>
  <ComponentThatMightFail />
</ErrorBoundary>
```

## Contextual Error Information

Always include meaningful context with errors:

```typescript
utilsToMainAdapter.handleError(error, {
  operationContext: 'PaymentProcessor.processPayment',
  userId: user.id,
  paymentMethod: payment.method,
  amount: payment.amount,
  // Additional context to help with debugging
});
```

## Testing Error Scenarios

See the testing guide in `src/services/test/ErrorHandlingTests.md` for details on testing error scenarios.

## Best Practices

1. **Never expose raw database errors** to users
2. **Always provide fallback UI** when errors occur
3. **Include retry mechanisms** when appropriate
4. **Add context to errors** to aid in debugging
5. **Use the appropriate error category** for better analytics
6. **Log sensitive operation errors** even if they're handled
7. **Provide specific error messages** instead of generic ones
8. **Include useful error codes** for reference in user-facing errors

## Migration Plan

See `src/services/migration-plan.md` for details on our ongoing error handling migration.

## Example Implementation

See `src/services/example/SampleService.ts` for a complete implementation example.

## FAQs

**Q: When should I use `withStandardizedErrorHandling` vs. try/catch?**  
A: Use `withStandardizedErrorHandling` in service methods. Use try/catch in UI components or when you need custom, immediate error handling.

**Q: How do I handle expected errors vs. unexpected errors?**  
A: Expected errors (like validation failures) should return error responses but not trigger global error handling. Unexpected errors should flow through the error handling service.

**Q: How do I add custom error types?**  
A: Extend the Error class with your custom error type, then use the error handling service's type guards to detect it.

**Q: How do I handle errors in async components?**  
A: Use React Suspense with Error Boundaries for loading states and error handling in async components.

**Q: What should I do with network errors?**  
A: Network errors should be caught, logged, and transformed into user-friendly messages about connectivity issues with retry options.

## Conclusion

Following these guidelines will ensure a consistent error handling experience throughout the application, improving both developer experience and user experience. 