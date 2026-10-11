import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, ApiClientError } from "../api";

describe("ApiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("correctly unwraps success envelope", async () => {
    const mockHealth = {
      status: "ok",
      database: "ok",
      sandbox: "enabled",
      llm_provider: "mock",
      llm_ready: true,
      environment: "test",
      version: "2.0.0",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockHealth,
      }),
    });

    const res = await api.getHealth();
    expect(res.status).toBe("ok");
    expect(res.version).toBe("2.0.0");
  });

  it("unpacks API error envelope and throws ApiClientError with code and correlation_id", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        success: false,
        data: null,
        error: {
          message: "Human approval required before exporting patch",
          code: "APPROVAL_REQUIRED",
          status_code: 403,
          correlation_id: "cid-test-123",
        },
      }),
    });

    try {
      await api.exportTask("tsk_test");
      expect.fail("Should have thrown ApiClientError");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiClientError);
      const apiErr = err as ApiClientError;
      expect(apiErr.code).toBe("APPROVAL_REQUIRED");
      expect(apiErr.statusCode).toBe(403);
      expect(apiErr.correlationId).toBe("cid-test-123");
      expect(apiErr.message).toContain("Human approval required");
    }
  });

  it("handles network failure gracefully", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Failed to connect"));

    await expect(api.getHealth()).rejects.toThrow("Failed to connect");
  });
});
