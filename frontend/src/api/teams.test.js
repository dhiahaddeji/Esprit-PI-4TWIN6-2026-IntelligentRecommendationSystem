import { describe, it, expect, vi } from 'vitest';
import { teamsApi } from './teams';
import http from './http';

vi.mock('./http');

describe('teamsApi', () => {
  it('lists teams', async () => {
    const mockTeams = [{ id: 1, name: 'Team A' }];
    http.get.mockResolvedValue({ data: mockTeams });

    await teamsApi.list();

    expect(http.get).toHaveBeenCalledWith('/teams');
  });

  it('creates team', async () => {
    const payload = { name: 'New Team' };
    http.post.mockResolvedValue({ data: { id: 2 } });

    await teamsApi.create(payload);

    expect(http.post).toHaveBeenCalledWith('/teams', payload);
  });

  it('updates team', async () => {
    const id = '123';
    const payload = { name: 'Updated Team' };
    http.put.mockResolvedValue({ data: { success: true } });

    await teamsApi.update(id, payload);

    expect(http.put).toHaveBeenCalledWith(`/teams/${id}`, payload);
  });

  it('removes team', async () => {
    const id = '123';
    http.delete.mockResolvedValue({ data: { success: true } });

    await teamsApi.remove(id);

    expect(http.delete).toHaveBeenCalledWith(`/teams/${id}`);
  });
});
