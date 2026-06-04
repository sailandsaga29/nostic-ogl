import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActionFeedbackState } from '../components/ActionFeedback';

export const FEEDBACK_DURATION_MS = 5000;

export function useTimedFeedback() {
  const [feedback, setFeedbackState] = useState<ActionFeedbackState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFeedback = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setFeedbackState(null);
  }, []);

  const setFeedback = useCallback((next: ActionFeedbackState) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setFeedbackState(next);
    if (next) {
      timerRef.current = setTimeout(() => {
        setFeedbackState(null);
        timerRef.current = null;
      }, FEEDBACK_DURATION_MS);
    }
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { feedback, setFeedback, clearFeedback };
}
