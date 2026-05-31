import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import api from '../../services/api';

type PhonePeQrModalProps = {
  open: boolean;
  merchantTransactionId: string;
  qrString: string;
  amount: number;
  expiresAt?: string;
  mockMode?: boolean;
  onSuccess: () => void;
  onClose: () => void;
};

export default function PhonePeQrModal({
  open,
  merchantTransactionId,
  qrString,
  amount,
  expiresAt,
  mockMode = false,
  onSuccess,
  onClose,
}: PhonePeQrModalProps) {
  const [qrImage, setQrImage] = useState('');
  const [status, setStatus] = useState<'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED'>('PENDING');
  const [message, setMessage] = useState(
    mockMode
      ? 'Test mode: use the buttons below to simulate payment.'
      : 'Waiting for customer to scan and pay...',
  );
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStatus('PENDING');
    setMessage(
      mockMode
        ? 'Test mode: use the buttons below to simulate payment.'
        : 'Waiting for customer to scan and pay...',
    );
  }, [open, mockMode, merchantTransactionId]);

  useEffect(() => {
    if (!open || !qrString) return;

    QRCode.toDataURL(qrString, {
      width: 320,
      margin: 2,
      color: { dark: '#111827', light: '#ffffff' },
    })
      .then(setQrImage)
      .catch(() => setQrImage(''));
  }, [open, qrString]);

  useEffect(() => {
    if (!open || !expiresAt) {
      setSecondsLeft(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);
    };

    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [open, expiresAt]);

  useEffect(() => {
    if (!open || !merchantTransactionId || status !== 'PENDING') return;

    let cancelled = false;

    const poll = async () => {
      try {
        const response = await api.get(
          `/payments/phonepe/status/${merchantTransactionId}`,
        );
        if (cancelled) return;

        const nextStatus = response.data.status as typeof status;
        if (nextStatus === 'SUCCESS') {
          setStatus('SUCCESS');
          setMessage('Payment received successfully.');
          window.setTimeout(onSuccess, 800);
          return;
        }

        if (nextStatus === 'FAILED' || nextStatus === 'EXPIRED') {
          setStatus(nextStatus);
          setMessage(
            response.data.message ||
              (nextStatus === 'EXPIRED'
                ? 'QR expired. Generate a new payment.'
                : 'Payment failed. Try again or use cash.'),
          );
        }
      } catch {
        if (!cancelled) {
          setMessage('Checking payment status...');
        }
      }
    };

    poll();
    const interval = window.setInterval(poll, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [open, merchantTransactionId, status, onSuccess]);

  const simulatePayment = async (outcome: 'success' | 'failed') => {
    try {
      setSimulating(true);
      const response = await api.post('/payments/phonepe/mock/simulate', {
        merchantTransactionId,
        outcome,
      });

      const nextStatus = response.data.status as typeof status;
      if (nextStatus === 'SUCCESS') {
        setStatus('SUCCESS');
        setMessage('Test payment completed successfully.');
        window.setTimeout(onSuccess, 800);
        return;
      }

      setStatus(nextStatus === 'EXPIRED' ? 'EXPIRED' : 'FAILED');
      setMessage(
        response.data.message ||
          (outcome === 'failed'
            ? 'Test payment failed.'
            : 'Unable to simulate payment.'),
      );
    } catch {
      setMessage('Failed to simulate test payment.');
    } finally {
      setSimulating(false);
    }
  };

  const statusColor = useMemo(() => {
    if (status === 'SUCCESS') return 'text-green-600';
    if (status === 'FAILED' || status === 'EXPIRED') return 'text-red-600';
    return 'text-[#33c3b3]';
  }, [status]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {mockMode ? 'Test QR Payment' : 'Scan to Pay'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {mockMode
                ? 'Mock PhonePe mode — QR is for display only'
                : 'Customer can scan with PhonePe, GPay, Paytm, or any UPI app'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-200"
          >
            Close
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center">
          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            {qrImage ? (
              <img
                src={qrImage}
                alt="PhonePe payment QR code"
                className="h-64 w-64 max-w-[70vw] object-contain"
              />
            ) : (
              <div className="flex h-64 w-64 max-w-[70vw] items-center justify-center rounded-2xl bg-gray-50 text-sm text-gray-500">
                Generating QR...
              </div>
            )}
          </div>

          <p className="mt-5 text-3xl font-bold text-[#33c3b3]">
            ₹{amount.toFixed(2)}
          </p>

          <p className={`mt-3 text-center text-sm font-medium ${statusColor}`}>
            {message}
          </p>

          {secondsLeft !== null && status === 'PENDING' && (
            <p className="mt-2 text-xs text-gray-400">
              QR expires in {Math.floor(secondsLeft / 60)}:
              {(secondsLeft % 60).toString().padStart(2, '0')}
            </p>
          )}
        </div>

        {mockMode && status === 'PENDING' && (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={() => simulatePayment('success')}
              disabled={simulating}
              className="rounded-2xl bg-green-500 px-4 py-3 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
            >
              Simulate Payment Success
            </button>
            <button
              onClick={() => simulatePayment('failed')}
              disabled={simulating}
              className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
            >
              Simulate Payment Failed
            </button>
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
          {mockMode
            ? 'Test mode is active. No real money is charged. Use the simulate buttons to complete the POS flow.'
            : 'Show this QR on your phone, tablet, or desktop screen at the counter. Payment will confirm automatically once the customer completes UPI payment.'}
        </div>
      </div>
    </div>
  );
}
