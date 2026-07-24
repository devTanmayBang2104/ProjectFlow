import { useSelector } from 'react-redux';
import { useWorkspaceDetailsQuery } from './useWorkspaces';

/**
 * Custom hook to get the active workspace and its details (projects, members, tasks).
 */
export const useActiveWorkspace = () => {
  const activeWorkspaceId = useSelector((state) => state.ui.activeWorkspaceId);
  const query = useWorkspaceDetailsQuery(activeWorkspaceId);

  return {
    activeWorkspaceId,
    currentWorkspace: query.data || null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
