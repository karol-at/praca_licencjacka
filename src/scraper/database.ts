import { DatabaseSync } from "node:sqlite";
import { WarsawDataPoint } from "./warsaw/WarsawConverter.ts";

const db = new DatabaseSync("base.db");

const createTables = (): void =>
  db.exec(
    `
      CREATE TABLE warsawData (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        latitude REAL,
        longitude REAL,
        time TEXT,
        brigade INTEGER,
        vehicleNumber INTEGER
      );
      CREATE TABLE gdanskData (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        latitude REAL,
        longitude REAL,
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

const dropTables = (): void =>
  db.exec(
    `
      DROP TABLE warsawData;
      DROP TABLE gdanskData
    `,
  );
