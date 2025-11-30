import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignInPage from "@/app/auth/signin/page";

const mockSignIn = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

describe("SignInPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the sign in page", () => {
    render(<SignInPage />);

    expect(screen.getByText("Sign in to continue")).toBeInTheDocument();
    expect(screen.getByText(/nightscout admin/i)).toBeInTheDocument();
    expect(screen.getByText(/sign in with discord/i)).toBeInTheDocument();
  });

  it("calls signIn when button is clicked", async () => {
    render(<SignInPage />);

    const signInButton = screen.getByText(/sign in with discord/i);
    const user = userEvent.setup();
    await user.click(signInButton);

    expect(mockSignIn).toHaveBeenCalledWith("discord", { callbackUrl: "/" });
  });

  it("displays access restriction message", () => {
    render(<SignInPage />);

    expect(
      screen.getByText(/access is limited to a single discord account/i)
    ).toBeInTheDocument();
  });
});

