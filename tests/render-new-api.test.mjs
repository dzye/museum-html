import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const workspaceRoot = "/Users/dazhuangye/Project/museum-html";
const htmlPath = path.join(workspaceRoot, "index.html");

const newApiResponse = {
  success: true,
  data: {
    venues: [
      {
        id: 0,
        venue_name: "全部排班",
        daily_schedules: []
      }
    ],
    daily_schedules: [
      {
        date: "2026-06-25",
        day_of_week: "星期四",
        floor_groups: [
          {
            floor: 1,
            floor_text: "二楼",
            activity_name: null,
            group_key: "二楼",
            group_type: "floor",
            group_name: "二楼",
            schedule_count: 2,
            schedules: [
              {
                id: 101,
                floor_text: "二楼",
                activity_name: null,
                start_time: "09:30"
              },
              {
                id: 105,
                floor_text: "二楼",
                activity_name: null,
                start_time: "14:30"
              }
            ]
          },
          {
            floor: 2,
            floor_text: "三楼",
            activity_name: null,
            group_key: "三楼",
            group_type: "floor",
            group_name: "三楼",
            schedule_count: 1,
            schedules: [
              {
                id: 102,
                floor_text: "三楼",
                activity_name: null,
                start_time: "14:00"
              }
            ]
          },
          {
            floor: 0,
            floor_text: "特展讲解",
            activity_name: "特展讲解",
            group_key: "特展讲解",
            group_type: "activity",
            group_name: "特展讲解",
            schedule_count: 2,
            schedules: [
              {
                id: 104,
                floor_text: "未知",
                activity_name: "特展讲解",
                start_time: "15:00"
              },
              {
                id: 106,
                floor_text: "未知",
                activity_name: "特展讲解",
                start_time: "10:00"
              }
            ]
          }
        ],
        schedules: [
          { id: 101, floor_text: "二楼", activity_name: null, start_time: "09:30" },
          { id: 102, floor_text: "三楼", activity_name: null, start_time: "14:00" },
          { id: 104, floor_text: "未知", activity_name: "特展讲解", start_time: "15:00" },
          { id: 105, floor_text: "二楼", activity_name: null, start_time: "14:30" },
          { id: 106, floor_text: "未知", activity_name: "特展讲解", start_time: "10:00" }
        ],
        schedule_count: 5,
        has_schedules: true,
        is_today: false,
        no_schedule_message: null
      }
    ],
    total_count: 5,
    start_date: "2026-06-25",
    end_date: "2026-06-25"
  },
  error: ""
};

function createElement() {
  return {
    innerHTML: ""
  };
}

async function loadPageScript() {
  const html = await fs.readFile(htmlPath, "utf8");
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);

  if (!scriptMatch) {
    throw new Error("index.html 未找到内联脚本");
  }

  return scriptMatch[1];
}

async function renderWithResponse(responsePayload) {
  const statusContainer = createElement();
  const venueContainer = createElement();
  const script = await loadPageScript();

  const context = {
    console,
    fetch: async () => ({
      ok: true,
      json: async () => responsePayload
    }),
    document: {
      getElementById(id) {
        if (id === "statusContainer") return statusContainer;
        if (id === "venueContainer") return venueContainer;
        throw new Error(`未知节点: ${id}`);
      },
      addEventListener() {}
    },
    Date,
    setTimeout,
    clearTimeout
  };

  vm.createContext(context);
  vm.runInContext(script, context);
  await context.fetchAllVenues();

  return {
    statusHtml: statusContainer.innerHTML,
    venueHtml: venueContainer.innerHTML
  };
}

const { statusHtml, venueHtml } = await renderWithResponse(newApiResponse);

assert.equal(statusHtml, "", "接口成功后不应该继续显示加载或错误状态");
assert.match(venueHtml, /二楼/, "页面应该展示楼层大分组标题");
assert.match(venueHtml, /三楼/, "页面应该展示后端返回的楼层分组");
assert.match(venueHtml, /特展讲解/, "页面应该展示特展大分组标题");
assert.match(venueHtml, /09:30/, "页面应该展示分组内的导览时间");
assert.match(venueHtml, /10:00.*15:00|15:00.*10:00/s, "页面应该展示特展分组下的多个时间");
assert.doesNotMatch(venueHtml, /暂无导览排班/, "新版接口有排班时不应该落入空态");

console.log("新版接口渲染校验通过");
