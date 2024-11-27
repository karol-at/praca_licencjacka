import { GeoJSON } from "../GeoJSON.ts";
import { booleanPointInPolygon, point } from "npm:@turf/turf";
import { polygons } from "./Polygons.ts";

export function truncateData(
  data: WarsawDataPoint[],
  criteria: FilterCriteria,
): WarsawDataPoint[] {
  data = reduceData(data);
  const splitPoints = createSplitPoints(data, criteria);
  return splitData(data, splitPoints).flat();
}

//type for data points from Warsaw API
type WarsawDataPoint = {
  Lines: string;
  Lon: number;
  Lat: number;
  Time: string;
  Brigade: string;
  VehicleNumber: string;
  StartTime: string | null;
};

//criteria for filtering data
//polygons should contain the starting and ending points of the route
//angles should contain the minimum and maximum angles for the starting and ending points
//the elements should be typed in going clockwise on a circle stating from -180 on the left
type FilterCriteria = {
  // deno-lint-ignore no-explicit-any
  polygons: any[];
  angles: [number[], number[]];
};

export const criteria116: FilterCriteria = {
  polygons: [polygons.chomiczowka, polygons.wilanow],
  angles: [[-45, -135], [180, 90]],
};

export function convertToGeoJSON(data: WarsawDataPoint[]): GeoJSON[] {
  return data.map((point, index) => {
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [point.Lon, point.Lat],
      },
      properties: {
        type: 1,
        line: point.Lines,
        vehicleNumber: point.VehicleNumber,
        time: point.Time,
        startTime: point.StartTime ?? "",
        tripId: index,
      },
    };
  });
}

function reduceData(data: WarsawDataPoint[]): WarsawDataPoint[] {
  const results: WarsawDataPoint[] = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i].Time === data[i + 1].Time) {
      results.push(data[i]);
    }
  }
  return results;
}

function createSplitPoints(
  data: WarsawDataPoint[],
  criteria: FilterCriteria,
): number[] {
  const results = [];
  const locations = data.map((point, index) => {
    return {
      Lon: point.Lon,
      Lat: point.Lat,
      angle: Math.atan2(
        data[index + 1].Lat - point.Lat,
        data[index + 1].Lon - point.Lon,
      ) * 180 / Math.PI,
    };
  });
  for (let i = 0; i < locations.length; i++) {
    if (
      locations[i].angle < criteria.angles[0][0] &&
      locations[i].angle > criteria.angles[0][1]
    ) {
      if (
        booleanPointInPolygon(
          point([locations[i].Lon, locations[i].Lat]),
          criteria.polygons[0],
        )
      ) {
        results.push(i);
        i += 10;
      }
    }
    if (
      locations[i].angle < criteria.angles[1][0] &&
      locations[i].angle > criteria.angles[1][1]
    ) {
      if (
        booleanPointInPolygon(
          point([locations[i].Lon, locations[i].Lat]),
          criteria.polygons[1],
        )
      ) {
        results.push(i);
        i += 10;
      }
    }
  }
  return results;
}

function splitData(
  data: WarsawDataPoint[],
  splitPoints: number[],
): WarsawDataPoint[][] {
  const results: WarsawDataPoint[][] = [];
  for (let i = 0; i < splitPoints.length; i++) {
    results.push(data.slice(splitPoints[i], splitPoints[i + 1]));
    for (let j = splitPoints[i]; j < splitPoints[i + 1]; j++) {
      results[i][j].StartTime = data[i].Time;
    }
  }
  return results;
}
