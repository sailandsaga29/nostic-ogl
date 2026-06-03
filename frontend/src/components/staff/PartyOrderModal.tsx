import { useEffect, useMemo, useState } from 'react';
import { calculatePartyOrderAmounts } from '../../utils/partyOrderCalc';

type PartyOrderModalProps = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    partyName: string;
    totalAmount: number;
    discountPercent: number;
    totalEarnings?: number;
    note?: string;
    paymentMethod: 'CASH' | 'ONLINE';
  }) => void;
};

const formatCurrency = (value: number) =>
  `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function PartyOrderModal({
  open,
  loading,
  onClose,
  onSubmit,
}: PartyOrderModalProps) {
  const [partyName, setPartyName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [totalEarningsOverride, setTotalEarningsOverride] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ONLINE'>('CASH');
  const [useCustomEarnings, setUseCustomEarnings] = useState(false);

  const amounts = useMemo(
    () =>
      calculatePartyOrderAmounts(
        Number(totalAmount),
        Number(discountPercent),
        useCustomEarnings ? totalEarningsOverride : undefined,
      ),
    [totalAmount, discountPercent, totalEarningsOverride, useCustomEarnings],
  );

  const resetForm = () => {
    setPartyName('');
    setTotalAmount('');
    setDiscountPercent('0');
    setTotalEarningsOverride('');
    setNote('');
    setPaymentMethod('CASH');
    setUseCustomEarnings(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    const name = partyName.trim();
    const total = Number(totalAmount);
    const discount = Number(discountPercent);

    if (!name) {
      alert('Enter party / client name');
      return;
    }
    if (!total || total <= 0) {
      alert('Enter a valid total amount');
      return;
    }
    if (discount < 0 || discount > 100) {
      alert('Discount must be between 0 and 100');
      return;
    }

    onSubmit({
      partyName: name,
      totalAmount: total,
      discountPercent: discount,
      totalEarnings: useCustomEarnings
        ? amounts.totalEarnings
        : undefined,
      note: note.trim() || undefined,
      paymentMethod,
    });
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-5 text-white">
          <h2 className="text-2xl font-bold">Party / bulk order</h2>
          <p className="mt-1 text-sm text-white/90">
            Fixed total with discount % — like your party order sheet
          </p>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Party / client name
            </label>
            <input
              type="text"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              placeholder="e.g. Pace College, Mahalakshmi Event"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Total amount (₹)
              </label>
              <input
                type="number"
                min={0}
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="24000"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Discount (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="20"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm">
            <div className="flex justify-between text-gray-700">
              <span>Discount value</span>
              <span className="font-semibold">
                {formatCurrency(amounts.discountAmount)}
              </span>
            </div>
            <div className="mt-2 flex justify-between text-gray-900">
              <span className="font-medium">Amount after discount</span>
              <span className="text-lg font-bold text-orange-600">
                {formatCurrency(amounts.amountAfterDiscount)}
              </span>
            </div>
            <div className="mt-2 flex justify-between text-gray-700">
              <span>Total earnings (collected)</span>
              <span className="font-semibold text-teal-700">
                {formatCurrency(amounts.totalEarnings)}
              </span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={useCustomEarnings}
              onChange={(e) => setUseCustomEarnings(e.target.checked)}
            />
            Override total earnings manually
          </label>
          {useCustomEarnings ? (
            <input
              type="number"
              min={0}
              value={totalEarningsOverride}
              onChange={(e) => setTotalEarningsOverride(e.target.value)}
              placeholder="Custom earnings"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
            />
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">Payment</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  paymentMethod === 'CASH'
                    ? 'bg-[#33c3b3] text-white'
                    : 'border border-gray-200 text-gray-600'
                }`}
              >
                Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('ONLINE')}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  paymentMethod === 'ONLINE'
                    ? 'bg-[#33c3b3] text-white'
                    : 'border border-gray-200 text-gray-600'
                }`}
              >
                Online
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-bold text-white shadow-md disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save party order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
