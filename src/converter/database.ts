import { DatabaseSync } from "node:sqlite";
import "jsr:@std/dotenv/load";
import * as WarsawConverterTs from "./WarsawConverter.ts";
import * as GdanskConverterTs from "./GdanskConverter.ts";

const dir = Deno.env.get("DATABASE") ?? "";

const dbList = Deno.readDir(dir);

export async function convert(): Promise<void> {
  for await (const dbFile of dbList) {
    const dbPath = dir + "/" + dbFile.name;
    const db = new DatabaseSync(dbPath);
    const warsawData: WarsawConverterTs.WarsawDataPoint[] = db.prepare(
      `SELECT * FROM warsawData;`,
    )
      .all();
    const gdanskData: GdanskConverterTs.GdanskDataPoint[] = db.prepare(
      `SELECT * FROM gdanskData;`,
    )
      .all();
      const warsawLines = Map.groupBy(warsawData, e => e.Lines);
    const gdanskLines = Map.groupBy(gdanskData, e=> e.routeId)
    for (const [line, ride] of warsawLines) {
      WarsawConverterTs.transformBusInfo(
        ride,
        dbFile.name.split(".")[0],
        Number(line),
      );
    }
    for (const [_line, ride] of gdanskLines){
    GdanskConverterTs.transformBusInfo(
      ride,
      dbFile.name.split(".")[0],
    );
  }
  }
}
