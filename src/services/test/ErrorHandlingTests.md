# Error Handling Testing Guide

This guide provides recommendations for testing error handling in the Future Sentiment Analytics application.

## Testing Approach

When testing error handling, we should focus on both the technical aspects (correct error propagation, appropriate fallbacks) and the user experience (clear error messages, recovery options).

## Test Categories

### 1. Unit Tests for Error Utilities

Test the core error handling utilities to ensure they work as expected:

```typescript
// Example test for withStandardizedErrorHandling
import { withStandardizedErrorHandling } from '@/services/utils/error-utils';

describe('withStandardizedErrorHandling', () => {
  test('should return operation result on success', async () => {
    // Setup
    const mockOperation = jest.fn().mockResolvedValue({ data: 'success', error: null });
    
    // Execute
    const result = await withStandardizedErrorHandling(
      mockOperation,
      'TestContext'
    );
    
    // Verify
    expect(mockOperation).toHaveBeenCalled();
    expect(result).toEqual({ data: 'success', error: null });
  });
  
  test('should handle errors and return fallback value', async () => {
    // Setup
    const mockError = new Error('Operation failed');
    const mockOperation = jest.fn().mockRejectedValue(mockError);
    const fallback = { data: null, error: new Error('Fallback error') };
    
    // Execute
    const result = await withStandardizedErrorHandling(
      mockOperation,
      'TestContext',
      { fallbackValue: fallback }
    );
    
    // Verify
    expect(mockOperation).toHaveBeenCalled();
    expect(result).toEqual(fallback);
  });
  
  test('should rethrow error when no fallback provided', async () => {
    // Setup
    const mockError = new Error('Operation failed');
    const mockOperation = jest.fn().mockRejectedValue(mockError);
    
    // Execute & Verify
    await expect(
      withStandardizedErrorHandling(mockOperation, 'TestContext')
    ).rejects.toThrow('Operation failed');
  });
});
```

### 2. Service Layer Tests

Test that services properly handle errors and return standardized responses:

```typescript
// Example test for a service method
import { userService } from '@/services/UserService';
import * as supabase from '@/integrations/supabase/client';

describe('UserService', () => {
  test('getCurrentUser returns anonymous user when auth fails', async () => {
    // Setup
    jest.spyOn(supabase, 'supabase').mockImplementation(() => ({
      auth: {
        getUser: jest.fn().mockRejectedValue(new Error('Auth error'))
      }
    }));
    
    // Execute
    const result = await userService.getCurrentUser();
    
    // Verify
    expect(result.error).not.toBeNull();
    expect(result.error?.message).toContain('Failed to get current user');
    expect(result.data).not.toBeNull();
    expect(result.data?.isAnonymous).toBe(true);
  });
});
```

### 3. Component Integration Tests

Test that components properly handle and display errors:

```tsx
// Example test for a component with error handling
import { render, screen, waitFor } from '@testing-library/react';
import UserProfile from '@/components/UserProfile';
import { userService } from '@/services/UserService';

jest.mock('@/services/UserService');

describe('UserProfile', () => {
  test('displays error message when user data fails to load', async () => {
    // Setup
    const mockError = new Error('Failed to load user data');
    (userService.getUserData as jest.Mock).mockResolvedValue({
      data: null,
      error: mockError
    });
    
    // Render
    render(<UserProfile userId="123" />);
    
    // Verify
    await waitFor(() => {
      expect(screen.getByText('An error occurred')).toBeInTheDocument();
      expect(screen.getByText('Failed to load user data')).toBeInTheDocument();
    });
  });
  
  test('renders retry button when data loading fails', async () => {
    // Setup
    const mockError = new Error('Failed to load user data');
    (userService.getUserData as jest.Mock).mockResolvedValue({
      data: null,
      error: mockError
    });
    
    // Render
    render(<UserProfile userId="123" />);
    
    // Verify
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});
```

### 4. Error Scenarios to Test

Make sure to test these common error scenarios:

1. **Network Errors**
   - Test behavior when the user is offline
   - Test behavior when requests time out
   - Test behavior when the server is unreachable

2. **Authentication Errors**
   - Test expired sessions
   - Test invalid credentials
   - Test insufficient permissions

3. **Validation Errors**
   - Test invalid input formats
   - Test missing required fields
   - Test value constraint violations

4. **Server Errors**
   - Test 5XX responses
   - Test malformed server responses
   - Test unexpected status codes

5. **Resource Not Found**
   - Test accessing non-existent resources
   - Test deleted resources
   - Test stale/cached references

## Mock Strategies

### Mocking API Failures

```typescript
// Mock fetch with network error
global.fetch = jest.fn().mockImplementation(() => {
  throw new Error('Network error');
});

// Mock fetch with error response
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: false,
    status: 500,
    json: () => Promise.resolve({ error: 'Server error' })
  })
);
```

### Mocking Supabase Errors

```typescript
// Mock Supabase client with error
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            error: { message: 'Database error' },
            data: null
          }))
        }))
      }))
    }))
  }
}));
```

### Mocking Component Props for Error States

```tsx
// Testing component error states directly
render(
  <ErrorDisplay 
    error={new Error('Test error')}
    title="Error Test"
    severity="error"
    retry={() => {}}
  />
);
```

## Best Practices

1. **Test Both Success and Failure Paths**: Don't just test the happy path; make sure error scenarios are covered.

2. **Mock External Dependencies**: Use mock implementations for APIs, databases, and other external systems.

3. **Test Error Recovery**: Verify that retry mechanisms and fallbacks work as expected.

4. **Test Error Messaging**: Ensure error messages are appropriate and helpful to users.

5. **Test Error Context**: Verify that errors include enough context for debugging.

6. **Integration Test Error Boundaries**: Test that React error boundaries catch and handle errors properly.

7. **Test Loading States**: Verify that loading states transition properly even during errors.

## Example Test Suite Structure

```
services/
  __tests__/
    ErrorHandlingService.test.ts  // Tests for core error service
    error-utils.test.ts           // Tests for error utilities
    UserService.test.ts           // Tests service with error scenarios
components/
  __tests__/
    ErrorDisplay.test.tsx         // Tests for error display component
    UserProfile.test.tsx          // Tests component with error scenarios
    ErrorBoundary.test.tsx        // Tests for React error boundary
```

## Testing Tools

- **Jest**: Main testing framework
- **React Testing Library**: For testing components
- **MSW (Mock Service Worker)**: For mocking API responses
- **jest-fetch-mock**: For mocking fetch requests

## Continuous Integration

Consider adding dedicated error handling checks to your CI pipeline:

- Ensure tests with mocked errors pass
- Verify error coverage (percentage of error paths tested)
- Check for proper error logging in integration tests

By following these testing strategies, we can ensure that our error handling works correctly, provides a good user experience, and helps with debugging production issues. 