import { useState, useCallback } from 'react';

/**
 * Custom hook to prevent double submissions and handle async actions
 * 
 * Usage:
 * const { execute, isLoading } = useAsyncAction();
 * 
 * const handleSubmit = async () => {
 *   await execute(async () => {
 *     // Your async action here
 *     await apiCall();
 *   });
 * };
 * 
 * <button disabled={isLoading} onClick={handleSubmit}>
 *   {isLoading ? 'Loading...' : 'Submit'}
 * </button>
 */
export const useAsyncAction = () => {
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async (action) => {
    // Prevent double execution
    if (isLoading) {
      console.warn('[useAsyncAction] Action already in progress, ignoring duplicate call');
      return;
    }

    setIsLoading(true);
    try {
      const result = await action();
      return result;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  return { execute, isLoading };
};
