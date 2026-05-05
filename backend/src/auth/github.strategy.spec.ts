import { Test, TestingModule } from '@nestjs/testing';
import { GithubStrategy } from './github.strategy';
import { AuthService } from './auth.service';

describe('GithubStrategy', () => {
  let strategy: GithubStrategy;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubStrategy,
        {
          provide: AuthService,
          useValue: { loginWithGithub: jest.fn() },
        },
      ],
    }).compile();

    strategy = module.get<GithubStrategy>(GithubStrategy);
    authService = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('calls loginWithGithub with extracted profile data', async () => {
      const tokens = { accessToken: 'tok', user: { userId: 'u1', role: 'EMPLOYEE' } };
      authService.loginWithGithub.mockResolvedValue(tokens as any);

      const profile = {
        id: 'github-123',
        username: 'alice',
        displayName: 'Alice Dev',
        emails: [{ value: 'alice@github.com' }],
      };

      const result = await strategy.validate('access-tok', 'refresh-tok', profile);

      expect(authService.loginWithGithub).toHaveBeenCalledWith({
        githubId: 'github-123',
        email: 'alice@github.com',
        name: 'Alice Dev',
      });
      expect(result).toBe(tokens);
    });

    it('falls back to username@github.com when no email in profile', async () => {
      authService.loginWithGithub.mockResolvedValue({} as any);

      const profile = {
        id: 'github-456',
        username: 'bob',
        displayName: null,
        emails: [],
      };

      await strategy.validate('tok', 'rtok', profile);

      expect(authService.loginWithGithub).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'bob@github.com' }),
      );
    });

    it('falls back to username when displayName is null', async () => {
      authService.loginWithGithub.mockResolvedValue({} as any);

      await strategy.validate('tok', 'rtok', {
        id: 'g-1', username: 'carol', displayName: null, emails: [],
      });

      expect(authService.loginWithGithub).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'carol' }),
      );
    });
  });
});
