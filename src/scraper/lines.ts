import * as warsaw from './warsaw/WarsawConverter.ts';
import * as GJS from './GeoJSON.ts'

export type line = {
  array: warsaw.WarsawDataPoint[];
  filteredArray: warsaw.WarsawDataPoint[];
  busMap: Map<string, warsaw.WarsawDataPoint[]>;
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
  } as line,
};