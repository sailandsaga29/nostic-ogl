import StaffOrderOptions from '../staff/StaffOrderOptions';
import type { AdminPageProps } from '../../types/adminPage';

export default function OrdersPage({ isActive = true }: AdminPageProps) {
  return <StaffOrderOptions variant="admin" isActive={isActive} />;
}
