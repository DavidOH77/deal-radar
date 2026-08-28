import { describe, expect, it } from "vitest";
import { MAX_REQUESTED_DEAL_IDS, parseRequestedDealIds } from "./query";

describe("parseRequestedDealIds", () => {
  it("deduplicates valid deal ids", () => {
    const params = new URLSearchParams();
    params.append("id", "ppomppu_123");
    params.append("id", "ppomppu_123");
    params.append("id", "algumon_456");

    expect(parseRequestedDealIds(params)).toEqual(["ppomppu_123", "algumon_456"]);
  });

  it("rejects malformed or oversized id requests", () => {
    expect(parseRequestedDealIds(new URLSearchParams({ id: "../../store" }))).toBeUndefined();

    const params = new URLSearchParams();
    for (let index = 0; index <= MAX_REQUESTED_DEAL_IDS; index += 1) params.append("id", `deal_${index}`);
    expect(parseRequestedDealIds(params)).toBeUndefined();
  });
});
