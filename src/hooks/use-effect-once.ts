import { useEffect } from 'react';

/**
 * A custom hook that runs an effect only once when a component mounts.
 * This is essentially useEffect with an empty dependency array but with
 * a more semantic name for better code readability.
 * 
 * @param effect The effect callback to run once on mount
 */
export const useEffectOnce = (effect: () => void | (() => void)) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
}; 