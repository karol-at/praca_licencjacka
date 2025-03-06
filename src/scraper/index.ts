import "jsr:@std/dotenv/load";
import { cron } from "https://deno.land/x/deno_cron@v1.0.0/cron.ts";
import * as lines from "./lines.ts";
import * as TricityConverter from "./tricity/TricityConverter.ts";
import * as Warsaw from "./warsaw/WarsawConverter.ts";
import * as database from "./database.ts";

let executing: boolean = true;
export let today: string = new Date().toISOString().split("T")[0];
let lastSave: string;
// deno-lint-ignore no-explicit-any
const errors: any[] = [];
let tricityRes: TricityConverter.TricityDataPoint[] = [];
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
  console.clear();
  console.log(progressString(new Date(), lastSave, errors.length, executing));
  if (!executing) return;
  try {
    database.fetchData("warsawData", [116]);
  } catch (e) {
    errors.push(e);
  }
  try {
    database.fetchData("gdanskData", [106]);
  } catch (e) {
    errors.push(e);
  }
});

//Start data fetching
cron("37 4 * * *", () => {
  const date = new Date();
  today = `${date.toISOString().split("T")[0]}`;
  database.createTables();
  executing = true;
});

//Save data every 30 minutes
cron("*/30 * * * *", () => {
  if (!executing) return;
  let array: Warsaw.WarsawDataPoint[] = database.getWarsawBuses(116);
  Warsaw.transformBusInfo(array);
  TricityConverter.transformBusInfo(
    lines.tricityLines[106],
    tricityRes,
    106,
    today,
  );
  const date = new Date();
  lastSave = date.toLocaleTimeString();
});

//Daily cleanup
cron("30 0 * * *", () => {
  executing = false;
  let array: Warsaw.WarsawDataPoint[] = database.getWarsawBuses(116);
  Warsaw.transformBusInfo(array);
  TricityConverter.transformBusInfo(
    lines.tricityLines[106],
    tricityRes,
    106,
    today,
  );
  lines.tricityCleanup(lines.tricityLines[106]);
  database.dropTables();
  const writePath = Deno.env.get("DIRECTORY")
    ? `${Deno.env.get("DIRECTORY")}/${today}/errors.txt`
    : "./results";
  Deno.writeTextFile(writePath, JSON.stringify(errors));
  errors.length = 0;
});
