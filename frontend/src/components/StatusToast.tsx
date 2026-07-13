export type StatusToastState = {
  type: 'success' | 'error' | 'pending';
  message: string;
} | null;

type Props = {
  toast: StatusToastState;
};

const STYLES: Record<
  NonNullable<StatusToastState>['type'],
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

export default function StatusToast({ toast }: Props) {
  if (!toast) return null;

  const style = STYLES[toast.type];

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
        <p className="mt-0.5 text-sm font-semibold">{toast.message}</p>
      </div>
    </div>
  );
}
