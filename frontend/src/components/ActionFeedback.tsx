export type ActionFeedbackState = {
  type: 'success' | 'error' | 'pending';
  message: string;
} | null;

type Props = {
  feedback: ActionFeedbackState;
  className?: string;
};

export default function ActionFeedback({ feedback, className = '' }: Props) {
  if (!feedback) return null;

  const colorClass =
    feedback.type === 'success'
      ? 'text-green-600'
      : feedback.type === 'pending'
        ? 'text-orange-600'
        : 'text-red-600';

  return (
    <p
      role="status"
      className={`mt-1 text-xs font-medium ${colorClass} ${className}`.trim()}
    >
      {feedback.message}
    </p>
  );
}
