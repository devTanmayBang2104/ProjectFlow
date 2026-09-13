import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import uiReducer from "../src/features/uiSlice";
import themeReducer from "../src/features/themeSlice";
import UserSettingsDialog from "../src/components/UserSettingsDialog";
import * as authHooks from "../src/hooks/useAuth";

// Mock auth hooks
vi.mock("../src/hooks/useAuth", () => ({
  useProfile: vi.fn(),
  useUpdateProfile: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
  useChangePassword: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
  useDeactivateAccount: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteAccountPermanently: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
}));

const renderWithProviders = (component, initialState = {}) => {
  const store = configureStore({
    reducer: {
      ui: uiReducer,
      theme: themeReducer,
    },
    preloadedState: {
      ui: {
        activeWorkspaceId: null,
        sidebarCollapsed: false,
        modals: {
          settings: true,
        },
        selectedTaskId: null,
        ...initialState.ui,
      },
    },
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </Provider>
  );
};

describe("Frontend Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("UserSettingsDialog", () => {
    it("should render Google OAuth notice and Create Password button for Google-only users", () => {
      authHooks.useProfile.mockReturnValue({
        data: {
          id: "google-user-1",
          name: "Google User",
          email: "google@example.com",
          username: "googleuser",
          authMethods: ["GOOGLE"],
        },
      });

      renderWithProviders(<UserSettingsDialog />);

      // Switch to Security tab
      const securityTabBtn = screen.getByRole("button", { name: /Security/i });
      fireEvent.click(securityTabBtn);

      expect(screen.getByText("Google Authentication")).toBeInTheDocument();
      expect(
        screen.getByText(/You signed in with Google\. Your password is managed by Google\./i)
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Create Password/i })).toBeInTheDocument();
      expect(screen.queryByText("Current Password")).not.toBeInTheDocument();
    });

    it("should render Change Password form with Current Password field for Local password users", () => {
      authHooks.useProfile.mockReturnValue({
        data: {
          id: "local-user-1",
          name: "Local User",
          email: "local@example.com",
          username: "localuser",
          authMethods: ["LOCAL", "GOOGLE"],
        },
      });

      renderWithProviders(<UserSettingsDialog />);

      // Switch to Security tab
      const securityTabBtn = screen.getByRole("button", { name: /Security/i });
      fireEvent.click(securityTabBtn);

      expect(screen.getByRole("heading", { name: "Change Password" })).toBeInTheDocument();
      expect(screen.getByText("Current Password")).toBeInTheDocument();
    });
  });
});

