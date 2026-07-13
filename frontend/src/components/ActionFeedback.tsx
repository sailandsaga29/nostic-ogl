export type ActionFeedbackState = {
  type: 'success' | 'error' | 'pending';
  message: string;
} | null;

type Props = {
  feedback: ActionFeedbackState;
  /** Kept for call-site compatibility; toasts are fixed so layout classes are ignored. */
  className?: string;
};

const STYLES: Record<
  NonNullable<ActionFeedbackState>['type'],
  { bar: string; label: string }
> = {
  success: {
    bar: 'border-green-500 bg-green-50 text-green-800',
    label: 'Success',
  },
  error: {
    bar: 'border-red-500 bg-red-50 text-red-800',
    label: 'Failed',
  },
  pending: {
    bar: 'border-orange-500 bg-orange-50 text-orange-800',
    label: 'Pending',
  },
};

export default function ActionFeedback({ feedback }: Props) {
  if (!feedback) return null;

  const style = STYLES[feedback.type];

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex justify-center px-4"
    >
      <div
        className={`pointer-events-auto w-full max-w-md rounded-xl border-l-4 px-4 py-3 shadow-lg ${style.bar}`}
      >
        <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">
          {style.label}
        </p>
        <p className="mt-0.5 text-sm font-semibold">{feedback.message}</p>
      </div>
    </div>
  );
}
