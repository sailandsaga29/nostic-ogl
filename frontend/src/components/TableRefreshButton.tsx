import { RefreshCw } from 'lucide-react';

type TableRefreshButtonProps = {
  onRefresh: () => void;
  loading?: boolean;
  label?: string;
  className?: string;
};

export default function TableRefreshButton({
  onRefresh,
  loading = false,
  label = 'Refresh table',
  className = '',
}: TableRefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={loading}
      title={loading ? 'Refreshing…' : label}
      aria-label={loading ? 'Refreshing table' : label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-teal-600 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <RefreshCw
        className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
        aria-hidden
      />
    </button>
  );
}
