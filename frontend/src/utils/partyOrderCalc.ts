export function calculatePartyOrderAmounts(
  totalAmount: number,
  discountPercent: number,
  totalEarningsOverride?: number | '',
) {
  const safeTotal = Math.max(0, Number(totalAmount) || 0);
  const safeDiscount = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const discountAmount = safeTotal * (safeDiscount / 100);
  const amountAfterDiscount =
    Math.round((safeTotal - discountAmount) * 100) / 100;
  const hasOverride =
    totalEarningsOverride !== undefined &&
    totalEarningsOverride !== '' &&
    !Number.isNaN(Number(totalEarningsOverride));
  const totalEarnings = hasOverride
    ? Math.round(Number(totalEarningsOverride) * 100) / 100
    : amountAfterDiscount;

  return {
    totalAmount: safeTotal,
    discountPercent: safeDiscount,
    discountAmount: Math.round(discountAmount * 100) / 100,
    amountAfterDiscount,
    totalEarnings,
  };
}

export function formatRupeeAmount(value: number) {
  return Number(value ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
