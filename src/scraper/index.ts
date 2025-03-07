import "jsr:@std/dotenv/load";
import { cron } from "https://deno.land/x/deno_cron@v1.0.0/cron.ts";
import * as database from "./database.ts";
import * as gdanskConverter from "./gdansk/GdanskConverter.ts";
import * as WarsawConverter from "./warsaw/WarsawConverter.ts";

let executing: boolean = true;
let today: string = new Date().toISOString().split("T")[0];
let lastSave: string;
// deno-lint-ignore no-explicit-any
const errors: any[] = [];
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
cron("*/10 * * * * *",async () => {
  console.clear();
  console.log(progressString(new Date(), lastSave, errors.length, executing));
  if (!executing) return;
  try {
    await database.fetchData("warsawData", [116]);
  } catch (e) {
    errors.push(e);
  }
  try {
    await database.fetchData("gdanskData", [106]);
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
  
  WarsawConverter.transformBusInfo(
    database.getWarsawBuses(116),
    today
);
  gdanskConverter.transformBusInfo(
    database.getGdanskBuses(106),
    today,
  );
  const date = new Date();
  lastSave = date.toLocaleTimeString();
});

//Daily cleanup
cron("30 0 * * *", () => {
  executing = false;
  WarsawConverter.transformBusInfo(
    database.getWarsawBuses(116), 
    today
  );
  gdanskConverter.transformBusInfo(
    database.getGdanskBuses(106),
    today,
  );
  database.dropTables();
  const writePath = Deno.env.get("DIRECTORY")
    ? `${Deno.env.get("DIRECTORY")}/${today}/errors.txt`
    : "./results";
  Deno.writeTextFile(writePath, JSON.stringify(errors));
  errors.length = 0;
});
