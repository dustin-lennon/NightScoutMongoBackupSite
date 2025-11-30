import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock NextAuth before importing
const mockHandler = vi.fn();

vi.mock("next-auth", () => ({
  default: vi.fn(() => mockHandler),
}));

vi.mock("next-auth/providers/discord", () => ({
  default: vi.fn(() => ({
    id: "discord",
    name: "Discord",
  })),
}));

describe("NextAuth route handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DISCORD_CLIENT_ID = "test-client-id";
    process.env.DISCORD_CLIENT_SECRET = "test-client-secret";
    process.env.NEXTAUTH_SECRET = "test-secret";
  });

  it("exports GET and POST handlers", async () => {
    // Reset modules to ensure fresh import
    vi.resetModules();
    
    const route = await import("@/app/api/auth/[...nextauth]/route");
    
    // NextAuth exports the handler as both GET and POST
    expect(route.GET).toBeDefined();
    expect(route.POST).toBeDefined();
    // They are the same handler function
    expect(route.GET).toBe(route.POST);
  });
});

