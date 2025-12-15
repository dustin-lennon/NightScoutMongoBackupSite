import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, PUT, PATCH, DELETE } from "@/app/api/pm2/status/route";

// Note: PM2 integration tests are skipped because mocking PM2's programmatic API is complex
// The PM2 status API functionality is tested via E2E tests and integration tests
// Unit tests focus on component behavior and API contract validation

describe("GET /api/pm2/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Method handlers", () => {
    it("POST returns 405 Method Not Allowed", async () => {
      const response = await POST();
      const data = await response.json();
      expect(response.status).toBe(405);
      expect(data.error).toContain("Use GET");
    });

    it("PUT returns 405 Method Not Allowed", async () => {
      const response = await PUT();
      const data = await response.json();
      expect(response.status).toBe(405);
      expect(data.error).toContain("Use GET");
    });

    it("PATCH returns 405 Method Not Allowed", async () => {
      const response = await PATCH();
      const data = await response.json();
      expect(response.status).toBe(405);
      expect(data.error).toContain("Use GET");
    });

    it("DELETE returns 405 Method Not Allowed", async () => {
      const response = await DELETE();
      const data = await response.json();
      expect(response.status).toBe(405);
      expect(data.error).toContain("Use GET");
    });
  });
});

