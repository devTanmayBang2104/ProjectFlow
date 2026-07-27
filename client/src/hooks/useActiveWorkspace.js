import { useSelector } from 'react-redux';
import { useWorkspaceDetailsQuery } from './useWorkspaces';
import { useProfile } from './useAuth';
import { useMemo } from 'react';

/**
 * Custom hook to get the active workspace and its details (projects, members, tasks).
 */
export const useActiveWorkspace = () => {
  const activeWorkspaceId = useSelector((state) => state.ui.activeWorkspaceId);
  const query = useWorkspaceDetailsQuery(activeWorkspaceId);
  const { data: currentUser } = useProfile();

  const isAdminOrOwner = useMemo(() => {
    const workspace = query.data;
    if (!workspace || !currentUser) return false;
    if (workspace.ownerId === currentUser.id) return true;
    const member = workspace.members?.find((m) => m.userId === currentUser.id);
    return member?.role === 'ADMIN';
  }, [query.data, currentUser]);

  return {
    activeWorkspaceId,
    currentWorkspace: query.data || null,
    isAdminOrOwner,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
