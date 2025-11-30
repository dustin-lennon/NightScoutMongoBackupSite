import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as Sentry from "@sentry/nextjs";
import GlobalError from "@/app/global-error";

// Simple render function
const render = (ui: React.ReactElement) => rtlRender(ui);

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("GlobalError", () => {
  const mockError = {
    message: "Test global error message",
    name: "TestGlobalError",
    digest: "test-digest-456",
  };

  const mockReset = vi.fn();
  const mockCaptureException = vi.mocked(Sentry.captureException);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders error message", () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
    expect(
      screen.getByText(
        "A critical error occurred. The error has been reported to our team."
      )
    ).toBeInTheDocument();
  });

  it("renders html and body tags", () => {
    const { container } = render(
      <GlobalError error={mockError} reset={mockReset} />
    );

    expect(container.querySelector("html")).toBeInTheDocument();
    expect(container.querySelector("body")).toBeInTheDocument();
    expect(container.querySelector("html")?.getAttribute("lang")).toBe("en");
  });

  it("calls Sentry.captureException with the error", () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(mockCaptureException).toHaveBeenCalledWith(mockError);
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
  });

  it("calls reset when Try again button is clicked", async () => {
    const user = userEvent.setup();
    render(<GlobalError error={mockError} reset={mockReset} />);

    const resetButton = screen.getByRole("button", { name: /try again/i });
    await user.click(resetButton);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("shows error details in development mode", () => {
    vi.stubEnv("NODE_ENV", "development");
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(screen.getByText("Error details (dev only)")).toBeInTheDocument();
    expect(screen.getByText("Test global error message")).toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it("does not show error details in production mode", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(
      screen.queryByText("Error details (dev only)")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Test global error message")
    ).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it("handles error without digest", () => {
    const errorWithoutDigest = {
      message: "Error without digest",
      name: "Error",
    };

    render(<GlobalError error={errorWithoutDigest} reset={mockReset} />);

    expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
    expect(mockCaptureException).toHaveBeenCalledWith(errorWithoutDigest);
  });

  it("calls captureException when error changes", () => {
    const { rerender } = render(
      <GlobalError error={mockError} reset={mockReset} />
    );

    expect(mockCaptureException).toHaveBeenCalledTimes(1);

    const newError = {
      message: "New global error message",
      name: "NewGlobalError",
    };

    rerender(<GlobalError error={newError} reset={mockReset} />);

    expect(mockCaptureException).toHaveBeenCalledTimes(2);
    expect(mockCaptureException).toHaveBeenLastCalledWith(newError);
  });

  it("displays different message than regular error page", () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(
      screen.getByText(
        "A critical error occurred. The error has been reported to our team."
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "An error occurred while loading this page. The error has been reported to our team."
      )
    ).not.toBeInTheDocument();
  });
});

