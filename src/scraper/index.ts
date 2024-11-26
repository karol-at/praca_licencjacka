import * as GJS from "./GeoJSON.ts";
import * as APIHelper from "./APIHelper.ts";
import "jsr:@std/dotenv/load";
import { cron } from "https://deno.land/x/deno_cron@v1.0.0/cron.ts";

let executing: boolean = true;
let dataMap: Map<string, GJS.GeoJSON[]> = new Map<string, GJS.GeoJSON[]>();
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

async function getData(
  dataMap: Map<string, GJS.GeoJSON[]>,
): Promise<Map<string, GJS.GeoJSON[]>> {
  const URI = APIHelper.buildConnectionString(
    "20f2e5503e-927d-4ad3-9500-4ab9e55deb59",
    Deno.env.get("APIKEY") ?? "",
    1,
    116,
  );
  const data: APIHelper.LocationDataPoint[] = await APIHelper.callAPI(URI);
  const geoJSON: GJS.GeoJSON[] = GJS.convertToGeoJSON(data);
  GJS.mapByVNumbers(geoJSON, dataMap);
  return dataMap;
}

//Fetch data every 10 seconds
cron("*/10 * * * * *", async () => {
  if (executing) {
    try {
      dataMap = await getData(dataMap);
    } catch (e) {
      errors.push(e);
    }
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
    GJS.exportGeoJSON(dataMap, today);
    const date = new Date();
    lastSave = date.toLocaleTimeString();
  }
});

//Daily cleanup
cron("30 0 * * *", () => {
  executing = false;
  GJS.exportGeoJSON(dataMap, today);
  dataMap.clear();
  const writePath = Deno.env.get("DIRECTORY")
    ? `${Deno.env.get("DIRECTORY")}/${today}/errors.txt`
    : "./results";
  Deno.writeTextFile(writePath, JSON.stringify(errors));
  errors.length = 0;
});
