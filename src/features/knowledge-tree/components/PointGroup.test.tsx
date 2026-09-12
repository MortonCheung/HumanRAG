// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KnowledgePoint } from '../../../domain/knowledge/types';
import { PointGroup } from './PointGroup';

const point: KnowledgePoint = {
  id: 'tcp', name: 'TCP可靠传输', kind: 'knowledge', description: '', content: '', color: '#fff',
  position: [0, 0, 0], tags: [], learningObjectives: [], misconceptions: [], recommendedContent: [],
};

beforeEach(() => vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('PointGroup', () => {
  it('keeps non-recommended groups collapsed and exposes an accessible toggle', () => {
    render(<PointGroup group={{ id: 'net', name: '计算机网络', points: [point] }} defaultOpen={false} forceOpen={false}>{(item) => <li key={item.id}>{item.name}</li>}</PointGroup>);
    const toggle = screen.getByRole('button', { name: /计算机网络/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('TCP可靠传输')).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('TCP可靠传输')).not.toBeNull();
  });

  it('automatically opens for a selected point or search result', () => {
    const { rerender } = render(<PointGroup group={{ id: 'net', name: '计算机网络', points: [point] }} defaultOpen={false} forceOpen={false}>{(item) => <li key={item.id}>{item.name}</li>}</PointGroup>);
    rerender(<PointGroup group={{ id: 'net', name: '计算机网络', points: [point] }} defaultOpen={false} forceOpen>{(item) => <li key={item.id}>{item.name}</li>}</PointGroup>);
    expect(screen.getByRole('button', { name: /计算机网络/ }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('TCP可靠传输')).not.toBeNull();
  });
});
