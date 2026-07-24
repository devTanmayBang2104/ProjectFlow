import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeWorkspaceId: localStorage.getItem('currentWorkspaceId') || null,
  sidebarCollapsed: false,
  modals: {
    createWorkspace: false,
    inviteMember: false,
    createProject: false,
    createTask: false,
    createSprint: false,
    taskDetails: false,
    settings: false,
  },
  selectedTaskId: null, // For displaying task detail drawer/modal
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveWorkspaceId: (state, action) => {
      state.activeWorkspaceId = action.payload;
      if (action.payload) {
        localStorage.setItem('currentWorkspaceId', action.payload);
      } else {
        localStorage.removeItem('currentWorkspaceId');
      }
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = action.payload;
    },
    openModal: (state, action) => {
      const modalName = action.payload;
      if (state.modals[modalName] !== undefined) {
        state.modals[modalName] = true;
      }
    },
    closeModal: (state, action) => {
      const modalName = action.payload;
      if (state.modals[modalName] !== undefined) {
        state.modals[modalName] = false;
      }
    },
    setSelectedTaskId: (state, action) => {
      state.selectedTaskId = action.payload;
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach((key) => {
        state.modals[key] = false;
      });
      state.selectedTaskId = null;
    },
  },
});

export const {
  setActiveWorkspaceId,
  toggleSidebar,
  setSidebarCollapsed,
  openModal,
  closeModal,
  setSelectedTaskId,
  closeAllModals,
} = uiSlice.actions;

export default uiSlice.reducer;
