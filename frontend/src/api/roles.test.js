import { describe, it, expect, vi } from 'vitest';
import { rolesApi } from './roles';
import http from './http';

vi.mock('./http');

describe('rolesApi', () => {
  it('lists roles', async () => {
    const mockRoles = [{ id: 1, name: 'ADMIN' }];
    http.get.mockResolvedValue({ data: mockRoles });

    await rolesApi.list();

    expect(http.get).toHaveBeenCalledWith('/roles');
  });

  it('updates role', async () => {
    const roleId = '123';
    const payload = { name: 'MANAGER' };
    http.put.mockResolvedValue({ data: { success: true } });

    await rolesApi.updateRole(roleId, payload);

    expect(http.put).toHaveBeenCalledWith(`/roles/${roleId}`, payload);
  });
});
