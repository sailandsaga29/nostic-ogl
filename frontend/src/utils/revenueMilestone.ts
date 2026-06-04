export const REVENUE_MILESTONE_AMOUNT = 10_000;

export const REVENUE_MILESTONE_ACK_KEY = 'nostic_revenue_10k_acknowledged';

/** Set on successful login; cleared after dashboard checks milestone. */
export const REVENUE_MILESTONE_LOGIN_CHECK_KEY =
  'nostic_check_revenue_celebration';

export function isRevenueMilestoneAcknowledged(): boolean {
  return localStorage.getItem(REVENUE_MILESTONE_ACK_KEY) === 'true';
}

export function acknowledgeRevenueMilestone(): void {
  localStorage.setItem(REVENUE_MILESTONE_ACK_KEY, 'true');
}

export function markLoginForRevenueCelebrationCheck(): void {
  sessionStorage.setItem(REVENUE_MILESTONE_LOGIN_CHECK_KEY, '1');
}

export function consumeLoginRevenueCelebrationCheck(): boolean {
  const pending =
    sessionStorage.getItem(REVENUE_MILESTONE_LOGIN_CHECK_KEY) === '1';
  sessionStorage.removeItem(REVENUE_MILESTONE_LOGIN_CHECK_KEY);
  return pending;
}

export function shouldShowRevenueCelebration(totalRevenue: number): boolean {
  return (
    totalRevenue >= REVENUE_MILESTONE_AMOUNT &&
    !isRevenueMilestoneAcknowledged()
  );
}
