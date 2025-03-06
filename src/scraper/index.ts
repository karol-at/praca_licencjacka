import * as warsawAPI from "./warsaw/APIHelper.ts";
import * as gdanskAPI from "./gdansk/APIHelper.ts";
import "jsr:@std/dotenv/load";
import { cron } from "https://deno.land/x/deno_cron@v1.0.0/cron.ts";
import * as lines from "./lines.ts";
import * as gdanskConverter from "./gdansk/GdanskConverter.ts";
import * as WarsawConverter from "./warsaw/WarsawConverter.ts";

let executing: boolean = true;
export let today: string = new Date().toISOString().split("T")[0];
let lastSave: string;
// deno-lint-ignore no-explicit-any
const errors: any[] = [];
let gdanskRes: gdanskConverter.GdanskDataPoint[] = [];
if (Deno.env.get("APIKEY") === undefined) {
  throw new Error("APIKEY is not set");
}
if (Deno.env.get("DIRECTORY") === undefined) {
  throw new Error("DIRECTORY is not set");
}

const progressString = (
  date: Date,
  lastSave: string,
  errors: number,
  executing: boolean,
) =>
  `Process is executing
Last data fetch: ${date.toLocaleTimeString()}
Last data save: ${lastSave}
Errors caught: ${errors}
Current executing status: ${executing}`;

//Fetch data every 10 seconds
cron("*/10 * * * * *", async () => {
  if (executing) {
    try {
      lines.warsawLines[116].array = await warsawAPI.getData(
        1,
        116,
        lines.warsawLines[116].array,
      );
    } catch (e) {
      errors.push(e);
    }
  }
  try {
    gdanskRes = await gdanskAPI.getData(gdanskRes);
  } catch (e) {
    errors.push(e);
  }
  console.clear();
  console.log(progressString(new Date(), lastSave, errors.length, executing));
});

//Start data fetching
cron("37 4 * * *", () => {
  const date = new Date();
  today = `${date.toISOString().split("T")[0]}`;
  executing = true;
});

//Save data every 30 minutes
cron("*/30 * * * *", () => {
  if (executing === true) {
    WarsawConverter.transformBusInfo(lines.warsawLines[116]);
    gdanskConverter.transformBusInfo(
      lines.gdanskLines[106],
      gdanskRes,
      106,
      today,
    );
    const date = new Date();
    lastSave = date.toLocaleTimeString();
  }
});

//Daily cleanup
cron("30 0 * * *", () => {
  executing = false;
  WarsawConverter.transformBusInfo(lines.warsawLines[116]);
  gdanskConverter.transformBusInfo(
    lines.gdanskLines[106],
    gdanskRes,
    106,
    today,
  );
  lines.gdanskCleanup(lines.gdanskLines[106]);
  lines.warsawCleanup(lines.warsawLines[116]);
  const writePath = Deno.env.get("DIRECTORY")
    ? `${Deno.env.get("DIRECTORY")}/${today}/errors.txt`
    : "./results";
  Deno.writeTextFile(writePath, JSON.stringify(errors));
  errors.length = 0;
});
