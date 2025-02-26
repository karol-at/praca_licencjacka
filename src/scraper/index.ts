import * as GJS from "./GeoJSON.ts";
import * as warsawAPI from "./warsaw/APIHelper.ts";
import * as tricityAPI from "./tricity/APIHelper.ts";
import * as warsaw from "./warsaw/WarsawConverter.ts";
import "jsr:@std/dotenv/load";
import { cron } from "https://deno.land/x/deno_cron@v1.0.0/cron.ts";
import * as lines from "./lines.ts";
import * as TricityConverter from "./tricity/TricityConverter.ts";

let executing: boolean = true;
let today: string = new Date().toISOString().split("T")[0];
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

function transformBusInfo(line: lines.warsawLine) {
  line.busMap = Map.groupBy(line.array, (point) => point.VehicleNumber);
  line.filteredArray.length = 0;
  for (const item of line.busMap.values()) {
    warsaw.truncateData(item, warsaw.criteria116).forEach((point) => {
      line.filteredArray.push(point);
    });
  }
  line.rideMap = Map.groupBy(
    warsaw.convertToGeoJSON(line.filteredArray),
    (point) => point.properties.tripId.toString(),
  );
  GJS.exportGeoJSON(line.rideMap, today, line.array[0].Lines);
}

function cleanup(line: lines.warsawLine) {
  line.array.length = 0;
  line.busMap.clear();
  line.filteredArray.length = 0;
  line.rideMap.clear;
}

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
    tricityRes = await tricityAPI.getData(tricityRes);
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
    transformBusInfo(lines.warsawLines[116]);
    TricityConverter.transformBusInfo(
      lines.tricityLines[106],
      tricityRes,
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
  transformBusInfo(lines.warsawLines[116]);
  TricityConverter.transformBusInfo(
    lines.tricityLines[106],
    tricityRes,
    106,
    today,
  );
  lines.tricityCleanup(lines.tricityLines[106]);
  cleanup(lines.warsawLines[116]);
  const writePath = Deno.env.get("DIRECTORY")
    ? `${Deno.env.get("DIRECTORY")}/${today}/errors.txt`
    : "./results";
  Deno.writeTextFile(writePath, JSON.stringify(errors));
  errors.length = 0;
});
