import * as GJS from "./GeoJSON.ts";
import * as tricity from "./tricity/TricityConverter.ts";

export type tricityLine = {
  array: tricity.TricityDataPoint[];
  sortedMap: Map<number, GJS.GeoJSON[]>;
  rideMap: Map<string, GJS.GeoJSON[]>;
};

export const tricityLines = {
  106: {
    array: [] as tricity.TricityDataPoint[],
    sortedMap: new Map<number, GJS.GeoJSON[]>(),
    rideMap: new Map<string, GJS.GeoJSON[]>(),
  } as tricityLine,
};

export function tricityCleanup(line: tricityLine) {
  line.array.length = 0;
  line.rideMap.clear();
  line.sortedMap.clear();
}
