// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TcpTaskInputs } from './TcpTaskInputs';
import { TcpDemonstration } from './TcpLesson';
import { getTcpTask, TCP_REASONS } from '../../../data/v6/handcrafted/tcpLesson';
import { useProgressStore } from '../../../store/progressStore';

vi.mock('motion/react', () => ({ useReducedMotion: () => false }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('teaching presentation keeps real response state', () => {
  it('shows calculation reasons directly and preserves numerical drafts when a reason changes', () => {
    const task = getTcpTask('tcp-diagnostic-v1')!;
    function Input() {
      const [value, setValue] = useState('');
      return <><TcpTaskInputs task={task} value={value} onChange={setValue} /><output>{value}</output></>;
    }
    render(<Input />);
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '4' } });
    fireEvent.click(screen.getByRole('radio', { name: TCP_REASONS[0].text }));
    const saved = JSON.parse(screen.getByRole('status').textContent!);
    expect(saved.values[0]).toBe(4);
    expect(saved.reason).toBe(TCP_REASONS[0].id);
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('reveals a window only after prediction and persisted exposure, with pause and completion', () => {
    const exposure = vi.spyOn(useProgressStore.getState(), 'markExposure').mockReturnValue(true);
    const view = render(<TcpDemonstration difficulty="growth" learnerId="visual-test" />);
    fireEvent.click(screen.getByRole('button', { name: '验证这一步' }));
    expect(exposure).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('下一轮窗口预测'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: '验证这一步' }));
    expect(exposure).toHaveBeenCalledOnce();
    expect(view.container.querySelectorAll('.tcp-window__blocks .is-arriving')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '暂停' }));
    expect((view.container.querySelector('.tcp-chart__reveal') as SVGElement).style.animationPlayState).toBe('paused');
    fireEvent.click(screen.getByRole('button', { name: '继续播放' }));
    fireEvent.animationEnd(view.container.querySelector('.tcp-chart__reveal')!);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('第 1 轮，4 MSS');
    expect(view.container.querySelectorAll('.tcp-window__blocks i')).toHaveLength(4);
  });
});
