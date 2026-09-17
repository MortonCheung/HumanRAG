// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendChat } from '../../ai/chat/chatClient';
import { usePicoStore } from './picoStore';
import type { PicoPageContext } from './picoTypes';

vi.mock('../../ai/chat/chatClient', () => ({ sendChat: vi.fn() }));

const tcp: PicoPageContext = { key: 'study:tcp', route: '/tcp', pageType: 'study', title: 'TCP 慢启动' };
const tree: PicoPageContext = { key: 'study:tree', route: '/tree', pageType: 'study', title: '二叉树' };

describe('picoStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePicoStore.setState({
      open: false, face: 'idle', presence: 'docked', pageContext: null, explicitContext: null,
      contextVersion: 0, messages: [], busy: false, focusNonce: 0, cooldownUntil: 0,
    });
  });

  it('StrictMode 重复注册同一 key 不增加版本；切换页面保留聊天并插入分隔', () => {
    usePicoStore.getState().setPageContext(tcp);
    usePicoStore.getState().setPageContext({ ...tcp, title: 'TCP' });
    expect(usePicoStore.getState().contextVersion).toBe(1);
    expect(usePicoStore.getState().messages).toHaveLength(0);
    usePicoStore.getState().setPageContext(tree);
    expect(usePicoStore.getState().contextVersion).toBe(2);
    expect(usePicoStore.getState().messages.at(-1)).toMatchObject({ role: 'context', content: '已切换到「二叉树」', contextVersion: 2 });
  });

  it('问问 Pico 只打开 Dock、设置明确上下文并请求输入焦点，不发 API', () => {
    usePicoStore.getState().setPageContext(tcp);
    usePicoStore.getState().ask({ type: 'knowledge', nodeId: 'tcp', title: 'TCP 慢启动' });
    expect(usePicoStore.getState()).toMatchObject({ open: true, focusNonce: 1, explicitContext: { type: 'knowledge', nodeId: 'tcp' } });
    expect(sendChat).not.toHaveBeenCalled();
  });

  it('发送只携带当前 contextVersion 的最近历史', async () => {
    vi.mocked(sendChat).mockResolvedValue({ text: '先看窗口增长规则。', source: 'mock' });
    usePicoStore.setState({
      pageContext: tree, contextVersion: 2,
      messages: [
        { id: 'old', role: 'user', content: '旧问题', contextVersion: 1 },
        { id: 'new', role: 'assistant', content: '新上下文开场', contextVersion: 2, source: 'mock' },
      ],
    });
    await usePicoStore.getState().send('怎么理解？');
    expect(sendChat).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'pico', message: '怎么理解？', history: [{ role: 'assistant', content: '新上下文开场' }], pageContext: tree,
    }));
    expect(usePicoStore.getState().messages.at(-1)).toMatchObject({ role: 'assistant', content: '先看窗口增长规则。', source: 'mock' });
  });

  it('请求期间切换上下文会丢弃旧响应', async () => {
    let resolve!: (value: { text: string; source: 'mock' }) => void;
    vi.mocked(sendChat).mockReturnValue(new Promise((done) => { resolve = done; }));
    usePicoStore.getState().setPageContext(tcp);
    const pending = usePicoStore.getState().send('旧问题');
    usePicoStore.getState().setPageContext(tree);
    resolve({ text: '旧响应', source: 'mock' });
    await pending;
    expect(usePicoStore.getState().messages.some((item) => item.role === 'assistant' && item.content === '旧响应')).toBe(false);
    expect(usePicoStore.getState()).toMatchObject({ busy: false, face: 'idle', contextVersion: 2 });
  });
});
