import { SupportController } from './support.controller';
import { DEFAULT_BRANDING } from '../settings/branding';

const mockBrandingSvc = { get: jest.fn() };

function makeController() {
  return new SupportController(mockBrandingSvc as any);
}

describe('SupportController', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    process.env.TELEGRAM_CHAT_ID = '123';
    mockBrandingSvc.get.mockResolvedValue(DEFAULT_BRANDING);
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it('returns error when Telegram is not configured', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const ctrl = makeController();
    const result = await ctrl.send({ message: 'help' }, { user: { fullName: 'A', email: 'a@b.com' } });
    expect(result).toEqual({ ok: false, error: 'Telegram chưa cấu hình' });
  });

  it('sends message with branding name from DB', async () => {
    mockBrandingSvc.get.mockResolvedValue({ ...DEFAULT_BRANDING, name: 'My Shop' });
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ json: () => Promise.resolve({ ok: true }) } as any);

    const ctrl = makeController();
    const result = await ctrl.send({ message: 'help' }, { user: { fullName: 'A', email: 'a@b.com' } });

    expect(result).toEqual({ ok: true });
    const sentBody = JSON.parse((fetchSpy.mock.calls[0][1] as any).body);
    expect(sentBody.text).toContain('[WMS - My Shop]');
    fetchSpy.mockRestore();
  });

  it('uses default branding name when DB has no override', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ json: () => Promise.resolve({ ok: true }) } as any);

    const ctrl = makeController();
    await ctrl.send({ message: 'x' }, { user: { fullName: 'B', email: 'b@c.com' } });

    const sentBody = JSON.parse((fetchSpy.mock.calls[0][1] as any).body);
    expect(sentBody.text).toContain('[WMS - Kho Việt]');
    fetchSpy.mockRestore();
  });
});
