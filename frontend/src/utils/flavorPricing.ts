const MEMBER_DISCOUNT_RATE = 0.1;

/** > 0.5 rounds up; 0.5 and below rounds down (e.g. 22.5 → 22, 22.6 → 23). */
export function roundMemberPrice(value: number): number {
  const safe = Number(value) || 0;
  const whole = Math.floor(safe);
  const fractional = safe - whole;
  return fractional > 0.5 ? whole + 1 : whole;
}

/** Member price is 10% lower than the staff (base) price. */
export function getMemberPrice(staffPrice: number): number {
  const price = Number(staffPrice) || 0;
  const discounted = price * (1 - MEMBER_DISCOUNT_RATE);
  return roundMemberPrice(discounted);
}

export function getInvestedAmount(
  quantity: number,
  staffPrice: number,
): number {
  return (Number(quantity) || 0) * getMemberPrice(staffPrice);
}
