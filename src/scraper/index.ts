import "jsr:@std/dotenv/load";
import { cron } from "https://deno.land/x/deno_cron@v1.0.0/cron.ts";
import * as database from "./database.ts";

let today: string = new Date().toISOString().split("T")[0];
// deno-lint-ignore no-explicit-any
const errors: any[] = [];
if (Deno.env.get("APIKEY") === undefined) {
  throw new Error("APIKEY is not set");
}
if (Deno.env.get("DIRECTORY") === undefined) {
  throw new Error("DIRECTORY is not set");
}
database.createTables()

const progressString = (
  date: Date,
  errors: number,
) =>
  `Process is executing
Last data fetch: ${date.toLocaleTimeString()}
Errors caught: ${errors}`;

//Fetch data every 10 seconds
cron("*/10 * * * * *", async () => {
  const now = new Date().toISOString().split('T')[0];
  if (now !== today) {
    today = now;
    database.reconnect(today)
    database.createTables()
    const writePath = Deno.env.get("DIRECTORY")
      ? `${Deno.env.get("DIRECTORY")}/${today}/errors.txt`
      : "./results";
    Deno.writeTextFile(writePath, JSON.stringify(errors));
    errors.length = 0;
  }
  console.clear();
  console.log(progressString(new Date(), errors.length));
  try {
    await database.fetchData("warsawData", [116, 731, 158]);
  } catch (e) {
    errors.push(e);
  }
  try {
    await database.fetchData("gdanskData", [106, 112, 208]);
  } catch (e) {
    errors.push(e);
  }
});
