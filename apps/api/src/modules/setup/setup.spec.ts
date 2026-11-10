import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

/* ─── Mock PrismaService ─── */
const mockPrisma = {
  user: { count: jest.fn() },
  role: { findUniqueOrThrow: jest.fn() },
  appSetting: { upsert: jest.fn() },
  taxSetting: { upsert: jest.fn() },
};

const VALID_DTO = {
  profile: 'FNB',
  admin: { email: 'a@b.com', password: '123456', fullName: 'Admin' },
  company: { name: 'ACME' },
} as any;

describe('SetupController — SETUP_TOKEN', () => {
  let controller: SetupController;
  let service: SetupService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      controllers: [SetupController],
      providers: [
        {
          provide: SetupService,
          useValue: {
            needsSetup: jest.fn().mockResolvedValue(true),
            run: jest.fn().mockResolvedValue({ ok: true }),
          },
        },
      ],
    }).compile();

    controller = mod.get(SetupController);
    service = mod.get(SetupService);
  });

  afterEach(() => {
    delete process.env.SETUP_TOKEN;
  });

  describe('GET /setup/status', () => {
    it('requiresToken = false khi SETUP_TOKEN chưa đặt', async () => {
      delete process.env.SETUP_TOKEN;
      const result = await controller.status();
      expect(result).toEqual({ needsSetup: true, requiresToken: false });
    });

    it('requiresToken = true khi SETUP_TOKEN đã đặt', async () => {
      process.env.SETUP_TOKEN = 'abc123';
      const result = await controller.status();
      expect(result).toEqual({ needsSetup: true, requiresToken: true });
    });
  });

  describe('POST /setup — không có SETUP_TOKEN', () => {
    it('cho phép gọi bình thường khi chưa cấu hình token', async () => {
      delete process.env.SETUP_TOKEN;
      const result = await controller.run(VALID_DTO, undefined);
      expect(result).toEqual({ ok: true });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.run).toHaveBeenCalledWith(VALID_DTO);
    });
  });

  describe('POST /setup — có SETUP_TOKEN', () => {
    beforeEach(() => {
      process.env.SETUP_TOKEN = 'my-secret-token';
    });

    it('thiếu header → 401', () => {
      expect(() => {
        controller.run(VALID_DTO, undefined);
      }).toThrow(UnauthorizedException);
    });

    it('token sai → 401 với message tiếng Việt', () => {
      try {
        controller.run(VALID_DTO, 'wrong-token');
        throw new Error('phải ném lỗi');
      } catch (e) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        expect((e as UnauthorizedException).message).toBe('Mã cài đặt không đúng');
      }
    });

    it('token đúng → cho phép', async () => {
      const result = await controller.run(VALID_DTO, 'my-secret-token');
      expect(result).toEqual({ ok: true });
    });
  });
});

describe('SetupService — cảnh báo SETUP_TOKEN', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    delete process.env.SETUP_TOKEN;
  });

  afterEach(() => {
    warnSpy.mockRestore();
    delete process.env.SETUP_TOKEN;
  });

  it('log cảnh báo 1 lần khi needsSetup=true và SETUP_TOKEN chưa đặt', async () => {
    const prisma = { user: { count: jest.fn().mockResolvedValue(0) } } as any;
    const svc = new SetupService(prisma);
    await svc.needsSetup();
    await svc.needsSetup();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/SETUP_TOKEN/);
  });

  it('không log nếu SETUP_TOKEN đã đặt', async () => {
    process.env.SETUP_TOKEN = 'token';
    const prisma = { user: { count: jest.fn().mockResolvedValue(0) } } as any;
    const svc = new SetupService(prisma);
    await svc.needsSetup();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('không log nếu đã có user (needsSetup=false)', async () => {
    const prisma = { user: { count: jest.fn().mockResolvedValue(1) } } as any;
    const svc = new SetupService(prisma);
    await svc.needsSetup();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
