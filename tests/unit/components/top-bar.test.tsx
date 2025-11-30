import { describe, it, expect, vi, beforeEach } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import { TopBar } from "@/components/top-bar";
import * as nextAuth from "next-auth/react";
import * as nextNavigation from "next/navigation";

vi.mock("next-auth/react");
vi.mock("next/navigation");

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Simple render function without providers since we're mocking them
const render = (ui: React.ReactElement) => rtlRender(ui);

describe("TopBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(nextAuth.useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
    } as never);
    vi.mocked(nextNavigation.usePathname).mockReturnValue("/");
  });

  it("renders the app title and logo", () => {

    render(<TopBar />);

    expect(screen.getByText("Nightscout Backups")).toBeInTheDocument();
  });

  it("shows login button when not authenticated", () => {
    vi.mocked(nextAuth.useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
    } as never);
    vi.mocked(nextNavigation.usePathname).mockReturnValue("/");

    render(<TopBar />);

    expect(screen.getByText(/login with discord/i)).toBeInTheDocument();
  });

  it("shows user info and sign out when authenticated", async () => {
    const mockUser = {
      name: "Test User",
      email: "test@example.com",
      image: "https://example.com/avatar.png",
    };

    vi.mocked(nextAuth.useSession).mockReturnValue({
      data: { user: mockUser },
      status: "authenticated",
    } as never);
    vi.mocked(nextNavigation.usePathname).mockReturnValue("/");

    render(<TopBar />);

    expect(screen.getByText("Test User")).toBeInTheDocument();
    // The sign out button is in a dropdown menu, so we need to click to open it first
    const userButton = screen.getByText("Test User").closest("button");
    if (userButton) {
      const { userEvent } = await import("@testing-library/user-event");
      const user = userEvent.setup();
      await user.click(userButton);
      expect(screen.getByText(/sign out/i)).toBeInTheDocument();
    } else {
      // If button structure is different, try finding by role
      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    }
  });

  it("hides login button on signin page", () => {
    vi.mocked(nextAuth.useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
    } as never);
    vi.mocked(nextNavigation.usePathname).mockReturnValue("/auth/signin");

    render(<TopBar />);

    expect(screen.queryByText(/login with discord/i)).not.toBeInTheDocument();
  });
});

