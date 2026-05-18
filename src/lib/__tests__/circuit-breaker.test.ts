import { describe, expect, it, vi } from "vitest";
import { CircuitBreaker } from "@/lib/circuit-breaker";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBreaker(failureThreshold = 3, cooldownMs = 1_000) {
  return new CircuitBreaker({
    name: "test-breaker",
    failureThreshold,
    cooldownMs,
  });
}

function fail(): Promise<never> {
  return Promise.reject(new Error("upstream error"));
}

function succeed(value = "ok"): Promise<string> {
  return Promise.resolve(value);
}

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

describe("CircuitBreaker — closed state (normal)", () => {
  it("passes through a successful call and returns its value", async () => {
    const cb = makeBreaker();
    const result = await cb.run(() => succeed("hello"));
    expect(result).toBe("hello");
  });

  it("re-throws the original error on failure", async () => {
    const cb = makeBreaker();
    await expect(cb.run(fail)).rejects.toThrow("upstream error");
  });

  it("stays closed if failures are below the threshold", async () => {
    const cb = makeBreaker(3);
    // 2 failures — still closed
    await expect(cb.run(fail)).rejects.toThrow();
    await expect(cb.run(fail)).rejects.toThrow();
    const status = cb.getStatus();
    expect(status.state).toBe("closed");
    expect(status.failureCount).toBe(2);
  });

  it("resets failure count after a successful call", async () => {
    const cb = makeBreaker(3);
    await expect(cb.run(fail)).rejects.toThrow();
    await cb.run(() => succeed());
    expect(cb.getStatus().failureCount).toBe(0);
    expect(cb.getStatus().state).toBe("closed");
  });
});

// ---------------------------------------------------------------------------
// Opening the circuit
// ---------------------------------------------------------------------------

describe("CircuitBreaker — opening", () => {
  it("opens after exactly failureThreshold consecutive failures", async () => {
    const cb = makeBreaker(3);
    for (let i = 0; i < 3; i++) {
      await expect(cb.run(fail)).rejects.toThrow("upstream error");
    }
    expect(cb.getStatus().state).toBe("open");
  });

  it("rejects immediately when open — without calling fn", async () => {
    const cb = makeBreaker(1);
    await expect(cb.run(fail)).rejects.toThrow(); // trips the breaker
    const spy = vi.fn(succeed);
    await expect(cb.run(spy)).rejects.toThrow(/OPEN/i);
    expect(spy).not.toHaveBeenCalled();
  });

  it("error message includes the breaker name when open", async () => {
    const cb = new CircuitBreaker({ name: "my-service", failureThreshold: 1, cooldownMs: 10_000 });
    await expect(cb.run(fail)).rejects.toThrow();
    await expect(cb.run(succeed)).rejects.toThrow(/my-service/);
  });

  it("error message mentions cooldown remaining when open", async () => {
    const cb = makeBreaker(1, 60_000);
    await expect(cb.run(fail)).rejects.toThrow();
    await expect(cb.run(succeed)).rejects.toThrow(/Cooldown remaining/i);
  });
});

// ---------------------------------------------------------------------------
// Half-open → recovery
// ---------------------------------------------------------------------------

describe("CircuitBreaker — half-open and recovery", () => {
  it("transitions to half-open after the cooldown elapses", async () => {
    vi.useFakeTimers();
    const cb = makeBreaker(1, 1_000);
    await expect(cb.run(fail)).rejects.toThrow();
    expect(cb.getStatus().state).toBe("open");

    vi.advanceTimersByTime(1_001);
    // Trigger a call — cb will check the clock and move to half-open internally
    await cb.run(() => succeed());
    expect(cb.getStatus().state).toBe("closed");
    vi.useRealTimers();
  });

  it("closes on successful half-open probe, resets failure count", async () => {
    vi.useFakeTimers();
    const cb = makeBreaker(1, 500);
    await expect(cb.run(fail)).rejects.toThrow();

    vi.advanceTimersByTime(501);
    await cb.run(() => succeed("probe"));
    const status = cb.getStatus();
    expect(status.state).toBe("closed");
    expect(status.failureCount).toBe(0);
    vi.useRealTimers();
  });

  it("reopens if the half-open probe fails", async () => {
    vi.useFakeTimers();
    const cb = makeBreaker(1, 500);
    await expect(cb.run(fail)).rejects.toThrow();

    vi.advanceTimersByTime(501);
    await expect(cb.run(fail)).rejects.toThrow("upstream error");
    expect(cb.getStatus().state).toBe("open");
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// getStatus
// ---------------------------------------------------------------------------

describe("CircuitBreaker — getStatus", () => {
  it("returns closed with 0 failures when freshly created", () => {
    const cb = makeBreaker();
    expect(cb.getStatus()).toEqual({ state: "closed", failureCount: 0 });
  });

  it("increments failureCount on each failure", async () => {
    const cb = makeBreaker(10);
    await expect(cb.run(fail)).rejects.toThrow();
    expect(cb.getStatus().failureCount).toBe(1);
    await expect(cb.run(fail)).rejects.toThrow();
    expect(cb.getStatus().failureCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Default thresholds
// ---------------------------------------------------------------------------

describe("CircuitBreaker — default options", () => {
  it("uses failureThreshold=5 by default", async () => {
    const cb = new CircuitBreaker({ name: "defaults" });
    for (let i = 0; i < 4; i++) {
      await expect(cb.run(fail)).rejects.toThrow();
    }
    expect(cb.getStatus().state).toBe("closed");
    await expect(cb.run(fail)).rejects.toThrow();
    expect(cb.getStatus().state).toBe("open");
  });
});
