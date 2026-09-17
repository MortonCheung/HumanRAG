import { useEffect } from 'react';
import type { PicoPageContext } from './picoTypes';
import { usePicoStore } from './picoStore';

/** Pages own their context; the root shell never guesses route-specific learning state. */
export function usePicoPageContext(context: PicoPageContext | null) {
  useEffect(() => {
    if (context) usePicoStore.getState().setPageContext(context);
  }, [context]);
}
