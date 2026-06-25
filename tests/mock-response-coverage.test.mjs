import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const workspaceRoot = "/Users/dazhuangye/Project/museum-html";
const htmlPath = path.join(workspaceRoot, "index.html");

async function loadMockResponse() {
  const html = await fs.readFile(htmlPath, "utf8");
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);

  if (!scriptMatch) {
    throw new Error("index.html 未找到内联脚本");
  }

  const context = {
    console,
    document: {
      addEventListener() {},
      getElementById() {
        return { innerHTML: "" };
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(`${scriptMatch[1]}; this.__mock = MOCK_RESPONSE;`, context);

  return context.__mock;
}

const mockResponse = await loadMockResponse();
const dailySchedules = mockResponse?.data?.daily_schedules || [];

assert.ok(dailySchedules.length >= 4, "mock 数据至少应该覆盖 4 个日期卡片场景");

const hasFloorGroup = dailySchedules.some((day) =>
  (day.floor_groups || []).some((group) => group.group_type === "floor")
);
assert.ok(hasFloorGroup, "mock 数据应该包含楼层分组场景");

const hasActivityGroup = dailySchedules.some((day) =>
  (day.floor_groups || []).some((group) => group.group_type === "activity")
);
assert.ok(hasActivityGroup, "mock 数据应该包含特展分组场景");

const hasEmptyDay = dailySchedules.some((day) =>
  !day.has_schedules && (day.floor_groups || []).length === 0 && (day.schedules || []).length === 0
);
assert.ok(hasEmptyDay, "mock 数据应该包含当天无排班的空态场景");

const hasFallbackSchedulesOnly = dailySchedules.some((day) =>
  (day.floor_groups || []).length === 0 && (day.schedules || []).length > 0
);
assert.ok(hasFallbackSchedulesOnly, "mock 数据应该包含只有 schedules、没有 floor_groups 的兜底场景");

const hasDuplicateTimes = dailySchedules.some((day) =>
  (day.floor_groups || []).some((group) => {
    const times = (group.schedules || []).map((schedule) => schedule.start_time);
    return new Set(times).size !== times.length;
  })
);
assert.ok(hasDuplicateTimes, "mock 数据应该包含重复时间去重场景");

console.log("mock 覆盖校验通过");
