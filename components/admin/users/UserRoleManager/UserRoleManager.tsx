'use client';

import { useState, type FC } from 'react';
import { useAssignRole, useRevokeRole } from '@/api/hooks/useUsers';
import { Button } from '@/components/common/Button';
import { Select } from '@/components/common/Select';
import type { RoleName } from '@/types/api-schema/common';
import type { User } from '@/types/api-schema/user';
import styles from './UserRoleManager.module.scss';

interface UserRoleManagerProps {
  user: User;
}

const AVAILABLE_ROLES: { label: string; value: RoleName }[] = [
  { label: 'User', value: 'user' },
  { label: 'Admin', value: 'admin' },
  { label: 'Content Manager', value: 'content_manager' },
];

export const UserRoleManager: FC<UserRoleManagerProps> = ({ user }) => {
  const [selectedRole, setSelectedRole] = useState<RoleName | ''>('');
  const assignRole = useAssignRole();
  const revokeRole = useRevokeRole();

  const handleAddRole = async () => {
    if (!selectedRole) return;
    
    try {
      await assignRole.mutateAsync({ id: user.id, role: selectedRole });
      setSelectedRole('');
    } catch (error) {
      console.error('Failed to assign role:', error);
    }
  };

  const handleRemoveRole = async (role: RoleName) => {
    if (!confirm(`Are you sure you want to remove role "${role}"?`)) return;

    try {
      await revokeRole.mutateAsync({ id: user.id, role });
    } catch (error) {
      console.error('Failed to revoke role:', error);
    }
  };

  const availableRolesToAdd = AVAILABLE_ROLES.filter(
    (role) => !user.roles.includes(role.value)
  );

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Roles Management</h3>

      <div className={styles.rolesList}>
        {user.roles.map((role) => (
          <div key={role} className={styles.roleBadge}>
            <span>{role}</span>
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => handleRemoveRole(role)}
              aria-label={`Remove role ${role}`}
              disabled={revokeRole.isPending}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className={styles.addRole}>
        <Select
          options={availableRolesToAdd}
          value={selectedRole}
          onChange={(value) => setSelectedRole(value as RoleName)}
          placeholder="Select role to add"
          disabled={availableRolesToAdd.length === 0}
        />
        <Button
          onClick={handleAddRole}
          disabled={!selectedRole || assignRole.isPending}
          loading={assignRole.isPending}
          size="sm"
        >
          Add Role
        </Button>
      </div>
    </div>
  );
};
