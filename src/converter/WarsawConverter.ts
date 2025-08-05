import { exportGeoJSON, GeoJSON, getTimestamp } from "./GeoJSON.ts";
import { booleanPointInPolygon, point } from "npm:@turf/turf";
import { polygons } from "./Polygons.ts";

function truncateData(
  data: WarsawDataPoint[],
  criteria: FilterCriteria,
): WarsawDataPoint[] {
  data = reduceData(data);
  let splitPoints = createSplitPoints(data, criteria);
  if (splitPoints.length == 1) return [];
  splitPoints = splitPoints.filter((e, i, a) => e != a[i - 1] + 1);
  return splitData(data, splitPoints).flat();
}

//type for data points from Warsaw API
export type WarsawDataPoint = {
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
//the elements should be typed in going counter clockwise on a circle stating from -180 on the left
type FilterCriteria = {
  // deno-lint-ignore no-explicit-any
  polygons: any[];
  angles: [(a: number) => boolean, (a: number) => boolean];
  headsigns: { [key: number]: string };
};

const criteria: { [key: number]: FilterCriteria } = {
  116: {
    polygons: [polygons.chomiczowka, polygons.wilanow],
    angles: [
      (x) => x < 180 && x > 90,
      (x) => x < -45 && x > -135,
    ],
    headsigns: {
      1: "116 -> Wilanów",
      2: "116 -> Chomiczówka",
    },
  },
  731: {
    polygons: [polygons.żerań, polygons.legionowo],
    angles: [
      (x) => x < 180 && x > 90,
      (x) => x < -90 && x > -180,
    ],
    headsigns: {
      1: "731 -> Os. Młodych",
      2: "731 -> Żerań FSO",
    },
  },
  158: {
    polygons: [polygons.reduta, polygons.witolin],
    angles: [
      (x) => x < 90 && x > 0,
      (x) => !(x < 135 && x > -135),
    ],
    headsigns: {
      1: "158 -> Witolin",
      2: "158 -> CH  Reduta",
    },
  },
};

export function transformBusInfo(
  array: WarsawDataPoint[],
  today: string,
  line: number,
) {
  if (array.length === 0) return;
  const busMap = Map.groupBy(array, (point) => point.VehicleNumber);
  const filteredArray: WarsawDataPoint[] = [];
  for (const item of busMap.values()) {
    truncateData(item, criteria[line]).forEach((point) => {
      filteredArray.push(point);
    });
  }
  const rideMap = Map.groupBy(
    convertToGeoJSON(filteredArray),
    (point) => point.properties.startTime.toString(),
  );
  let i: number = 0;
  for (const [key, value] of rideMap) {
    i++;
    rideMap.set(
      key,
      value.map(
        (item) => {
          item.properties.tripId = i;
          return item;
        },
      ),
    );
  }
  const newRideMap = Map.groupBy(
    rideMap.values().toArray().flat(),
    (item) => item.properties.tripId,
  );
  for (const [id, ride] of newRideMap) {
    let variant = 2;
    if (
      booleanPointInPolygon(
        point([
          ride[0].geometry.coordinates[0],
          ride[0].geometry.coordinates[1],
        ]),
        criteria[line].polygons[0],
      )
    ) {
      variant = 1;
    }
    newRideMap.set(
      id,
      ride.map((e) => {
        e.properties.headsign = criteria[line].headsigns[variant];
        return e;
      }),
    );
  }
  exportGeoJSON(newRideMap, today, array[0].Lines);
}

export function convertToGeoJSON(data: WarsawDataPoint[]): GeoJSON[] {
  return data.map((point) => {
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [point.Lon, point.Lat],
      },
      properties: {
        line: Number(point.Lines),
        brigade: point.Brigade,
        vehicleNumber: point.VehicleNumber,
        time: convertToUTC(point.Time),
        timestamp: getTimestamp(point.Time),
        startTime: convertToUTC(point.StartTime ?? ""),
        startTimestamp: getTimestamp(point.StartTime ?? ""),
        tripId: 0,
      },
    };
  });
}

function convertToUTC(time: string): string {
  const split = time.split(" ");
  return split[0] + "T" + split[1] + "+01:00";
}

function reduceData(data: WarsawDataPoint[]): WarsawDataPoint[] {
  const results: WarsawDataPoint[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    if (data[i].Time !== data[i - 1].Time) {
      results.push(data[i]);
    }
  }
  return results;
}

function createSplitPoints(
  data: WarsawDataPoint[],
  criteria: FilterCriteria,
): number[] {
  const results: number[] = [0];
  const locations = data.map((point, index) => {
    if (data[index + 1] === undefined) {
      return {
        Time: point.Time,
        Lon: point.Lon,
        Lat: point.Lat,
        angle: 0,
      };
    }
    return {
      Time: point.Time,
      Lon: point.Lon,
      Lat: point.Lat,
      angle: Math.atan2(
        data[index + 1].Lat - point.Lat,
        data[index + 1].Lon - point.Lon,
      ) * 180 / Math.PI,
    };
  });
  const points = locations.filter((value) =>
    criteria.angles[0](value.angle) &&
      booleanPointInPolygon(
        point([value.Lon, value.Lat]),
        criteria.polygons[0],
      ) ||
    criteria.angles[1](value.angle) &&
      booleanPointInPolygon(
        point([value.Lon, value.Lat]),
        criteria.polygons[1],
      )
  );
  for (const item of points) {
    results.push(locations.indexOf(item));
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
    for (let j = 0; j < results[i].length; j++) {
      results[i][j].StartTime = data[splitPoints[i]].Time;
    }
  }
  return results;
}
