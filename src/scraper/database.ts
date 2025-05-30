import { DatabaseSync } from "node:sqlite";
import { WarsawDataPoint } from "../converter/WarsawConverter.ts";
import { GdanskDataPoint } from "../converter/GdanskConverter.ts";
import * as WarsawAPI from "./warsaw/APIHelper.ts";
import * as GdanskAPI from "./gdansk/APIHelper.ts";
import "jsr:@std/dotenv/load";

const path = Deno.env.get("DIRECTORY");
const today = new Date();

if (path === undefined) throw new Deno.errors.InvalidData();

Deno.mkdir(path + "/" + today.toISOString().split("T")[0], { recursive: true });
let db: DatabaseSync = new DatabaseSync(
  path + "/" + today.toISOString().split("T")[0] + "/database.db",
);

interface LineNames {
  warsawData: string;
  gdanskData: string;
}

export const createTables = (): void =>
  db.exec(
    `
      CREATE TABLE IF NOT EXISTS warsawData (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        Lines INTEGER,
        Lat REAL,
        Lon REAL,
        Time TEXT,
        Brigade INTEGER,
        VehicleNumber INTEGER
      );
      CREATE TABLE IF NOT EXISTS gdanskData (
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

export function reconnect(date: string) {
  db.close();
  Deno.mkdir(path + "/" + date, { recursive: true });
  db = new DatabaseSync(path + "/" + date + "/database.db");
}

function createInsertQuery(
  item: WarsawDataPoint | GdanskDataPoint,
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

export const getGdanskBuses = (line: number): GdanskDataPoint[] =>
  db.prepare(
    `
    SELECT * FROM gdanskData
    WHERE routeId = ${line}
    `,
  ).all();

export async function fetchData(
  database: keyof LineNames,
  lines: number[],
): Promise<void> {
  let array: GdanskDataPoint[] | WarsawDataPoint[] = [];
  if (database === "gdanskData") {
    array = await GdanskAPI.getData(lines);
  }
  if (database === "warsawData") {
    array = await WarsawAPI.getData(1, lines);
  }
  if (array.length === 0) return;
  const query = array.map((item) => createInsertQuery(item, database)).join(
    "\n",
  );
  execQuery(query);
}
