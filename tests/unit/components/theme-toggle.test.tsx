import { describe, it, expect, vi, beforeEach } from "vitest";
import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/components/theme-toggle";
import * as nextThemes from "next-themes";

const mockSetTheme = vi.fn();

// Mock next-themes with a controllable theme value
vi.mock("next-themes", () => ({
  useTheme: vi.fn(),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Simple render function without providers since we're mocking them
const render = (ui: React.ReactElement) => rtlRender(ui);

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock return value
    vi.mocked(nextThemes.useTheme).mockReturnValue({
      theme: "dark",
      setTheme: mockSetTheme,
      resolvedTheme: "dark",
      themes: ["light", "dark", "system"],
    } as unknown as ReturnType<typeof nextThemes.useTheme>);
  });

  it("renders all theme options", async () => {
    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Light" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Dark" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "System" })).toBeInTheDocument();
    });
  });

  it("highlights the current theme after mount", async () => {
    render(<ThemeToggle />);

    await waitFor(() => {
      const darkButton = screen.getByRole("button", { name: "Dark" });
      expect(darkButton).toHaveClass("bg-white");
    });
  });

  it("highlights only the active theme", async () => {
    vi.mocked(nextThemes.useTheme).mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      resolvedTheme: "light",
      themes: ["light", "dark", "system"],
    } as unknown as ReturnType<typeof nextThemes.useTheme>);

    render(<ThemeToggle />);

    await waitFor(() => {
      const lightButton = screen.getByRole("button", { name: "Light" });
      const darkButton = screen.getByRole("button", { name: "Dark" });
      const systemButton = screen.getByRole("button", { name: "System" });

      expect(lightButton).toHaveClass("bg-white");
      expect(darkButton).not.toHaveClass("bg-white");
      expect(systemButton).not.toHaveClass("bg-white");
    });
  });

  it("defaults to system when theme is undefined", async () => {
    vi.mocked(nextThemes.useTheme).mockReturnValue({
      theme: undefined,
      setTheme: mockSetTheme,
      resolvedTheme: undefined,
      themes: ["light", "dark", "system"],
    } as unknown as ReturnType<typeof nextThemes.useTheme>);

    render(<ThemeToggle />);

    await waitFor(() => {
      const systemButton = screen.getByRole("button", { name: "System" });
      const lightButton = screen.getByRole("button", { name: "Light" });
      const darkButton = screen.getByRole("button", { name: "Dark" });

      expect(systemButton).toHaveClass("bg-white");
      expect(lightButton).not.toHaveClass("bg-white");
      expect(darkButton).not.toHaveClass("bg-white");
    });
  });

  it("calls setTheme when clicking a theme button", async () => {
    const user = userEvent.setup();

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Light" })).toBeInTheDocument();
    });

    const lightButton = screen.getByRole("button", { name: "Light" });
    await user.click(lightButton);

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("only one theme button is active at a time", async () => {
    vi.mocked(nextThemes.useTheme).mockReturnValue({
      theme: "system",
      setTheme: mockSetTheme,
      resolvedTheme: "dark",
      themes: ["light", "dark", "system"],
    } as unknown as ReturnType<typeof nextThemes.useTheme>);

    render(<ThemeToggle />);

    await waitFor(() => {
      const lightButton = screen.getByRole("button", { name: "Light" });
      const darkButton = screen.getByRole("button", { name: "Dark" });
      const systemButton = screen.getByRole("button", { name: "System" });

      // Only system should be active
      expect(systemButton).toHaveClass("bg-white");
      expect(lightButton).not.toHaveClass("bg-white");
      expect(darkButton).not.toHaveClass("bg-white");
    });
  });
});

