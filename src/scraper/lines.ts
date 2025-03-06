import * as warsaw from "./warsaw/WarsawConverter.ts";
import * as GJS from "./GeoJSON.ts";
import * as gdansk from "./gdansk/GdanskConverter.ts";

export type warsawLine = {
  array: warsaw.WarsawDataPoint[];
  filteredArray: warsaw.WarsawDataPoint[];
  busMap: Map<string, warsaw.WarsawDataPoint[]>;
  rideMap: Map<string, GJS.GeoJSON[]>;
};

export type gdanskLine = {
  array: gdansk.GdanskDataPoint[];
  sortedMap: Map<number, GJS.GeoJSON[]>;
  rideMap: Map<string, GJS.GeoJSON[]>;
};

export const warsawLines = {
  116: {
    //raw data from the API
    array: [] as warsaw.WarsawDataPoint[],
    //data from the API with duplicates removed and split into rides
    filteredArray: [] as warsaw.WarsawDataPoint[],
    //data grouped by vehicle number
    busMap: new Map<string, warsaw.WarsawDataPoint[]>(),
    //data converted to GeoJSON, grouped by rideId
    rideMap: new Map<string, GJS.GeoJSON[]>(),
  } as warsawLine,
};

export const gdanskLines = {
  106: {
    array: [] as gdansk.GdanskDataPoint[],
    sortedMap: new Map<number, GJS.GeoJSON[]>(),
    rideMap: new Map<string, GJS.GeoJSON[]>(),
  } as gdanskLine,
};

export function gdanskCleanup(line: gdanskLine) {
  line.array.length = 0;
  line.rideMap.clear();
  line.sortedMap.clear();
}

export function warsawCleanup(line: warsawLine) {
  line.array.length = 0;
  line.busMap.clear();
  line.filteredArray.length = 0;
  line.rideMap.clear;
}