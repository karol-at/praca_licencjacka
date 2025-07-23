import { DatabaseSync } from "node:sqlite";
import "jsr:@std/dotenv/load";
import * as WarsawConverterTs from "./WarsawConverter.ts";
import * as GdanskConverterTs from "./GdanskConverter.ts";

const dir = Deno.env.get("DIRECTORY") ?? "";

const days = Deno.readDir(dir);

export async function convert(): Promise<void> {
  const directories: Deno.DirEntry[] = []
  for await (const day of days) {
    directories.push(day)
  }
  for (const day of directories) {
    const dbPath = dir + "/" + day.name + "/database.db";
    const db: DatabaseSync = new DatabaseSync(dbPath);
    console.log(dbPath);
    const warsawData: WarsawConverterTs.WarsawDataPoint[] = db.prepare(
      `SELECT * FROM warsawData;`,
    )
      .all();
    const gdanskData: GdanskConverterTs.GdanskDataPoint[] = db.prepare(
      `SELECT * FROM gdanskData;`,
    )
      .all();
    const warsawLines = Map.groupBy(warsawData, (e) => e.Lines);
    const gdanskLines = Map.groupBy(gdanskData, (e) => e.routeId);
    for (const [line, ride] of warsawLines) {
      WarsawConverterTs.transformBusInfo(
        ride,
        day.name,
        Number(line),
      );
    }
    for (const [_line, ride] of gdanskLines) {
      GdanskConverterTs.transformBusInfo(
        ride,
        day.name,
      );
    }
    console.log (`data converted for ${day.name}`)
  }
}
