import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as Sentry from "@sentry/nextjs";
import ErrorPage from "@/app/error";

// Simple render function
const render = (ui: React.ReactElement) => rtlRender(ui);

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("ErrorPage", () => {
  const mockError = {
    message: "Test error message",
    name: "TestError",
    digest: "test-digest-123",
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
    render(<ErrorPage error={mockError} reset={mockReset} />);

    expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
    expect(
      screen.getByText(
        "An error occurred while loading this page. The error has been reported to our team."
      )
    ).toBeInTheDocument();
  });

  it("calls Sentry.captureException with the error", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);

    expect(mockCaptureException).toHaveBeenCalledWith(mockError);
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
  });

  it("calls reset when Try again button is clicked", async () => {
    const user = userEvent.setup();
    render(<ErrorPage error={mockError} reset={mockReset} />);

    const resetButton = screen.getByRole("button", { name: /try again/i });
    await user.click(resetButton);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("shows error details in development mode", () => {
    vi.stubEnv("NODE_ENV", "development");
    render(<ErrorPage error={mockError} reset={mockReset} />);

    expect(screen.getByText("Error details (dev only)")).toBeInTheDocument();
    expect(screen.getByText("Test error message")).toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it("does not show error details in production mode", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(<ErrorPage error={mockError} reset={mockReset} />);

    expect(
      screen.queryByText("Error details (dev only)")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Test error message")).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it("handles error without digest", () => {
    const errorWithoutDigest = {
      message: "Error without digest",
      name: "Error",
    };

    render(<ErrorPage error={errorWithoutDigest} reset={mockReset} />);

    expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
    expect(mockCaptureException).toHaveBeenCalledWith(errorWithoutDigest);
  });

  it("calls captureException when error changes", () => {
    const { rerender } = render(
      <ErrorPage error={mockError} reset={mockReset} />
    );

    expect(mockCaptureException).toHaveBeenCalledTimes(1);

    const newError = {
      message: "New error message",
      name: "NewError",
    };

    rerender(<ErrorPage error={newError} reset={mockReset} />);

    expect(mockCaptureException).toHaveBeenCalledTimes(2);
    expect(mockCaptureException).toHaveBeenLastCalledWith(newError);
  });
});

