import ActionFeedback, {
  type ActionFeedbackState,
} from './ActionFeedback';

export type StatusToastState = ActionFeedbackState;

type Props = {
  toast: StatusToastState;
};

/** Alias for ActionFeedback — same green / red / orange toast on all screens. */
export default function StatusToast({ toast }: Props) {
  return <ActionFeedback feedback={toast} />;
}
