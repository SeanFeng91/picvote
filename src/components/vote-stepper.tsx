"use client";

type VoteStepperProps = {
  value: number;
  max: number;
  onChange: (next: number) => void;
};

export function VoteStepper({ value, max, onChange }: VoteStepperProps) {
  return (
    <div className="vote-stepper">
      <button type="button" aria-label="减少票数" onClick={() => onChange(Math.max(1, value - 1))}>
        ↓
      </button>
      <strong>{value} 票</strong>
      <button type="button" aria-label="增加票数" onClick={() => onChange(Math.min(max, value + 1))}>
        ↑
      </button>
    </div>
  );
}
