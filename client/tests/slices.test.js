import { describe, it, expect, beforeEach } from "vitest";
import themeReducer, { toggleTheme, setTheme } from "../src/features/themeSlice";
import uiReducer, {
  setActiveWorkspaceId,
  toggleSidebar,
  openModal,
  closeModal,
  closeAllModals,
  setSelectedTaskId,
} from "../src/features/uiSlice";

describe("Redux Slices Test Suite", () => {
  describe("themeSlice", () => {
    it("should toggle theme between light and dark", () => {
      const state1 = themeReducer({ theme: "light" }, toggleTheme());
      expect(state1.theme).toBe("dark");

      const state2 = themeReducer(state1, toggleTheme());
      expect(state2.theme).toBe("light");
    });

    it("should set specific theme via setTheme", () => {
      const state = themeReducer({ theme: "light" }, setTheme("dark"));
      expect(state.theme).toBe("dark");
    });
  });

  describe("uiSlice", () => {
    const initialUiState = {
      activeWorkspaceId: null,
      sidebarCollapsed: false,
      modals: {
        createWorkspace: false,
        inviteMember: false,
        createProject: false,
        createTask: false,
        createSprint: false,
        taskDetails: false,
        settings: false,
        workspaceSettings: false,
      },
      selectedTaskId: null,
    };

    it("should set active workspace ID and persist to state", () => {
      const state = uiReducer(initialUiState, setActiveWorkspaceId("ws-100"));
      expect(state.activeWorkspaceId).toBe("ws-100");
    });

    it("should toggle sidebar collapsed state", () => {
      const state1 = uiReducer(initialUiState, toggleSidebar());
      expect(state1.sidebarCollapsed).toBe(true);

      const state2 = uiReducer(state1, toggleSidebar());
      expect(state2.sidebarCollapsed).toBe(false);
    });

    it("should open and close specific modal dialogs", () => {
      const openedState = uiReducer(initialUiState, openModal("createTask"));
      expect(openedState.modals.createTask).toBe(true);

      const closedState = uiReducer(openedState, closeModal("createTask"));
      expect(closedState.modals.createTask).toBe(false);
    });

    it("should close all modals and reset selected task on closeAllModals", () => {
      const modifiedState = {
        ...initialUiState,
        modals: {
          ...initialUiState.modals,
          createTask: true,
          settings: true,
        },
        selectedTaskId: "task-123",
      };

      const resetState = uiReducer(modifiedState, closeAllModals());
      expect(resetState.modals.createTask).toBe(false);
      expect(resetState.modals.settings).toBe(false);
      expect(resetState.selectedTaskId).toBeNull();
    });
  });
});

