import { describe, expect, it } from "vitest";
import { mobileColumnGroups } from "./mobile-table-columns";
const columns = (labels: string[]) => labels.map((label, index) => ({ label, index }));
describe("phone column groups", () => {
  it("keeps every metric available exactly once and keeps the source column order", () => {
    const source = columns(["Player", "GP", "G", "A", "PTS", "+/-", "S", "PPP", "PIM", "Hits"]);
    const groups = mobileColumnGroups(source, 0);
    expect(groups[0].map(c => c.label)).toEqual(["G", "A", "PTS"]);
    expect(groups.flat().map(c => c.index).sort((a,b) => a-b)).toEqual([1,2,3,4,5,6,7,8,9]);
    expect(groups.every(group => group.length <= 3)).toBe(true);
  });
  it("keeps the second-column team identity while retaining rank as a selectable metric", () => {
    const groups = mobileColumnGroups(columns(["Rank", "Team", "GP", "W", "L", "OTL", "PTS"]), 1);
    expect(groups[0].map(c => c.label)).toEqual(["GP", "W", "PTS"]);
    expect(groups.flat().map(c => c.index).sort((a,b) => a-b)).toEqual([0,2,3,4,5,6]);
  });
  it("handles short and unfamiliar tables without dropping columns", () => {
    expect(mobileColumnGroups(columns(["Period", "Away", "Home"]), 0).flat().map(c => c.label)).toEqual(["Away", "Home"]);
    expect(mobileColumnGroups(columns(["Player"]), 0)).toEqual([]);
  });
});
