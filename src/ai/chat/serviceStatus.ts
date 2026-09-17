export interface AIServiceStatus {
  configured: boolean;
  mode: 'live' | 'mock';
  model?: string;
  provider?: string;
  reason?: 'gateway-unavailable';
}

/** 前端可见的 AI 服务状态；失败一律降级为演示模式，不阻塞页面。 */
export async function getAIServiceStatus(): Promise<AIServiceStatus> {
  try {
    const response = await fetch('/api/chat');
    if (!response.ok) throw new Error(`gateway status ${response.status}`);
    const data: unknown = await response.json();
    if (typeof data !== 'object' || data === null) throw new Error('unexpected payload');
    const { configured, mode } = data as { configured?: unknown; mode?: unknown };
    if (typeof configured !== 'boolean' || (mode !== 'live' && mode !== 'mock')) throw new Error('unexpected payload');
    return data as AIServiceStatus;
  } catch {
    return { configured: false, mode: 'mock', reason: 'gateway-unavailable' };
  }
}
