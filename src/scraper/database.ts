import { DatabaseSync } from "node:sqlite";
import { WarsawDataPoint } from "./warsaw/WarsawConverter.ts";
import { TricityDataPoint } from "./tricity/TricityConverter.ts";
import * as WarsawAPI from "./warsaw/APIHelper.ts";
import * as GdanskAPI from "./tricity/APIHelper.ts";
import "jsr:@std/dotenv/load";

const path = Deno.env.get("DATABASE");

if (path === undefined) throw new Deno.errors.InvalidData();

const db: DatabaseSync = new DatabaseSync(path);

interface LineNames {
  warsawData: string;
  gdanskData: string;
}

export const createTables = (): void =>
  db.exec(
    `
      CREATE TABLE warsawData (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        Lines INTEGER,
        Lat REAL,
        Lon REAL,
        Time TEXT,
        Brigade INTEGER,
        VehicleNumber INTEGER
      );
      CREATE TABLE gdanskData (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lat REAL,
        lon REAL,
        generated TEXT,
        routeShortName TEXT,
        tripId INTEGER,
        routeId INTEGER,
        headsign TEXT,
        vehicleCode TEXT,
        vehicleService TEXT,
        vehicleId TEXT,
        speed REAL,
        direction REAL,
        delay INTEGER,
        scheduledTripStartTime TEXT,
        gpsQuality INTEGER
      )
    `,
  );

export const dropTables = (): void =>
  db.exec(
    `
      DROP TABLE warsawData;
      DROP TABLE gdanskData
    `,
  );

function createInsertQuery(
  item: WarsawDataPoint | TricityDataPoint,
  table: keyof LineNames,
): string {
  let query: string = `INSERT INTO ${table} (\n`;
  Object.keys(item).forEach(
    (key) => query += `${key},\n`,
  );
  query = query.slice(0, -2) + "\n)\n";
  query += "VALUES (\n";
  Object.values(item).forEach(
    (value) => query += `'${value}',\n`,
  );
  query = query.slice(0, -2) + "\n);";
  return query;
}

const execQuery = (query: string) => db.exec(query);

export const getWarsawBuses = (line: number): WarsawDataPoint[] =>
  db.prepare(
    `
  SELECT * FROM warsawData
  WHERE Lines = ${line};
  `,
  ).all();

export async function fetchData(
  database: keyof LineNames,
  lines: number[],
): Promise<void> {
  if (database === "gdanskData") {
    const array: TricityDataPoint[] = await GdanskAPI.getData(lines);
    const query = array.map((item) =>
      createInsertQuery(item, "gdanskData")
    ).flat()[0];
    execQuery(query);
  }
  if (database === "warsawData") {
    const array: WarsawDataPoint[] = await WarsawAPI.getData(1, lines);
    const query = array.map((item) =>
      createInsertQuery(item, "warsawData")
    ).flat()[0];
    execQuery(query);
  }
}
