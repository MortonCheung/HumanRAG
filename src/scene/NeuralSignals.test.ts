import { describe, expect, it } from 'vitest';
import { signalProgress } from './NeuralSignals';

describe('continuous relation signals', () => {
  it('keeps travelling after the old three-second pulse ended', () => {
    expect(signalProgress(4, 0.1, 0.12)).not.toBe(signalProgress(5, 0.1, 0.12));
    expect(signalProgress(40, 0.1, 0.12)).not.toBe(signalProgress(41, 0.1, 0.12));
  });
  it('wraps tails onto their same edge and preserves phase when its active clock pauses', () => {
    expect(signalProgress(0, 0, 0.1, 1)).toBeCloseTo(0.991);
    expect(signalProgress(9, 0.1, 0.1)).toBeCloseTo(0);
    const frozen = signalProgress(3.5, 0.1, 0.12);
    expect(signalProgress(3.5, 0.1, 0.12)).toBe(frozen);
  });
});
