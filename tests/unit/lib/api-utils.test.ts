import { describe, it, expect } from "vitest";
import { methodNotAllowed, createMethodHandlers } from "@/lib/api-utils";

describe("api-utils", () => {
  describe("methodNotAllowed", () => {
    it("returns 405 status with correct error message", async () => {
      const response = methodNotAllowed("POST");
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toContain("Method Not Allowed");
      expect(data.error).toContain("Use POST");
    });
  });

  describe("createMethodHandlers", () => {
    it("creates handlers for all HTTP methods", () => {
      const handlers = createMethodHandlers("GET");

      expect(handlers.GET).toBeDefined();
      expect(handlers.POST).toBeDefined();
      expect(handlers.PUT).toBeDefined();
      expect(handlers.PATCH).toBeDefined();
      expect(handlers.DELETE).toBeDefined();
    });

    it("all handlers return 405 with correct method", async () => {
      const handlers = createMethodHandlers("DELETE");

      const getResponse = await handlers.GET();
      const postResponse = await handlers.POST();
      const putResponse = await handlers.PUT();
      const patchResponse = await handlers.PATCH();
      const deleteResponse = await handlers.DELETE();

      expect(getResponse.status).toBe(405);
      expect(postResponse.status).toBe(405);
      expect(putResponse.status).toBe(405);
      expect(patchResponse.status).toBe(405);
      expect(deleteResponse.status).toBe(405);

      const deleteData = await deleteResponse.json();
      expect(deleteData.error).toContain("Use DELETE");
    });
  });
});
