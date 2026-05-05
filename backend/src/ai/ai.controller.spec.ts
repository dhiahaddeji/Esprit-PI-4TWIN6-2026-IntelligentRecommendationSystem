import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('AiController', () => {
  let controller: AiController;
  let aiService: jest.Mocked<AiService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: {
            chat: jest.fn(),
            extractSkillsFromDescription: jest.fn(),
            analyzeCv: jest.fn(),
            getDashboardInsights: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AiController>(AiController);
    aiService = module.get(AiService);
    jest.clearAllMocks();
  });

  describe('chat', () => {
    it('calls aiService.chat with message and context', async () => {
      const response = { reply: 'Hello from AI' };
      aiService.chat.mockResolvedValue(response as any);

      const result = await controller.chat({ message: 'Hello', context: 'HR' } as any);

      expect(aiService.chat).toHaveBeenCalledWith('Hello', 'HR');
      expect(result).toBe(response);
    });
  });

  describe('extractSkills', () => {
    it('calls aiService.extractSkillsFromDescription', async () => {
      const skills = { skills: ['Python', 'React'] };
      aiService.extractSkillsFromDescription.mockResolvedValue(skills as any);

      const result = await controller.extractSkills({ description: 'I need a dev' } as any);

      expect(aiService.extractSkillsFromDescription).toHaveBeenCalledWith('I need a dev');
      expect(result).toBe(skills);
    });
  });

  describe('analyzeCv', () => {
    it('returns empty result when no file uploaded', async () => {
      const result = await controller.analyzeCv(null as any);
      expect(result).toEqual({ skills: [], summary: 'Aucun fichier reçu.', total: 0 });
    });
  });

  describe('dashboardInsights', () => {
    it('calls getDashboardInsights with uppercased role and data', async () => {
      const insights = { summary: 'All good' };
      aiService.getDashboardInsights.mockResolvedValue(insights as any);

      const req = { user: { role: 'hr' } };
      const body = { data: { someKey: 'value' } } as any;
      const result = await controller.dashboardInsights(req as any, body);

      expect(aiService.getDashboardInsights).toHaveBeenCalledWith('HR', { someKey: 'value' });
      expect(result).toBe(insights);
    });

    it('defaults to EMPLOYEE role when user role is missing', async () => {
      aiService.getDashboardInsights.mockResolvedValue({} as any);
      const req = { user: {} };
      await controller.dashboardInsights(req as any, { data: {} } as any);
      expect(aiService.getDashboardInsights).toHaveBeenCalledWith('EMPLOYEE', {});
    });
  });
});
