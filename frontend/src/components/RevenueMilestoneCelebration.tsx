import { useMemo } from 'react';
import { REVENUE_MILESTONE_AMOUNT } from '../utils/revenueMilestone';

type Props = {
  totalRevenue: number;
  onAcknowledge: () => void;
};

const CONFETTI_COLORS = [
  '#f43f5e',
  '#f59e0b',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
];

const formatCurrency = (value: number) =>
  `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function RevenueMilestoneCelebration({
  totalRevenue,
  onAcknowledge,
}: Props) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 120 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2.5,
        duration: 2.2 + Math.random() * 2.8,
        drift: -40 + Math.random() * 80,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        width: 4 + Math.random() * 8,
        height: 10 + Math.random() * 14,
        rotation: Math.random() * 360,
      })),
    [],
  );

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="revenue-milestone-title"
    >
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translate3d(0, -12vh, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--drift), 110vh, 0) rotate(720deg);
            opacity: 0.85;
          }
        }
        @keyframes modal-pop {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {confetti.map((piece) => (
        <span
          key={piece.id}
          className="pointer-events-none absolute rounded-sm"
          style={{
            left: `${piece.left}%`,
            top: '-5%',
            width: piece.width,
            height: piece.height,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            animation: `confetti-fall ${piece.duration}s linear ${piece.delay}s infinite`,
            ['--drift' as string]: `${piece.drift}px`,
          }}
        />
      ))}

      <div
        className="relative z-10 w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl"
        style={{ animation: 'modal-pop 0.45s ease-out forwards' }}
      >
        <p className="text-5xl" aria-hidden>
          🎊
        </p>
        <h2
          id="revenue-milestone-title"
          className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl"
        >
          Congratulations!
        </h2>
        <p className="mt-3 text-base text-slate-600">
          Nostic has crossed{' '}
          <span className="font-bold text-teal-600">
            {formatCurrency(REVENUE_MILESTONE_AMOUNT)}
          </span>{' '}
          in total revenue.
        </p>
        <p className="mt-2 text-2xl font-bold text-[#33c3b3]">
          {formatCurrency(totalRevenue)}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Keep scooping success — your franchise is on fire!
        </p>
        <button
          type="button"
          onClick={onAcknowledge}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[#00a8c5] to-[#63d471] py-3.5 text-base font-bold text-white shadow-lg transition hover:scale-[1.02] hover:shadow-xl"
        >
          Awesome! 🍦
        </button>
      </div>
    </div>
  );
}
