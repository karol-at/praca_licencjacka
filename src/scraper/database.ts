import { DatabaseSync } from "node:sqlite";
import { WarsawDataPoint } from "./warsaw/WarsawConverter.ts";
import { TricityDataPoint } from "./tricity/TricityConverter.ts";

const db: DatabaseSync = new DatabaseSync("base.db");

interface LineNames {
  warsawData: string,
  gdanskData: string
}

const lineNames = {
  'warsawData': 'Lines',
  'gdanskData': 'routeId'
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

export function createInsertQuery(
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

export const execQuery = (query: string) => db.exec(query);

export const getBuses = (dbName: keyof LineNames, line: number): WarsawDataPoint[] | TricityDataPoint[] => db.prepare(
  `
  SELECT * FROM ${dbName}
  WHERE ${lineNames[dbName]} = ${line};
  `
).all()
