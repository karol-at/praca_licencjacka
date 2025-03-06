import { exportGeoJSON, GeoJSON } from "../GeoJSON.ts";

export type GdanskDataPoint = {
  generated: string;
  routeShortName: string;
  tripId: number;
  routeId: number;
  headsign: string;
  vechicleCode: string;
  vechicleService: string;
  vehicleId: number;
  speed: number;
  direction: number;
  delay: number;
  scheduledTripStartTime: string;
  lat: number;
  lon: number;
  gpsQuality: number;
};

function convertToGeoJSON(data: GdanskDataPoint[]): GeoJSON[] {
  return data.map((point) => {
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [point.lon, point.lat],
      },
      properties: {
        type: 1,
        vehicleNumber: point.vehicleId.toString(),
        line: point.routeId.toString(),
        tripId: 0,
        time: point.generated,
        startTime: point.scheduledTripStartTime,
      },
    };
  });
}

export function transformBusInfo(
  array: GdanskDataPoint[],
  today: string,
): void {
  const rideMap = Map.groupBy(
    convertToGeoJSON(array),
    (item) => item.properties.startTime,
  );
  for (const [time, ride] of rideMap) {
    rideMap.set(time, reduceData(ride));
  }
  const sorted: GeoJSON[][] = rideMap.values().toArray().sort((a, b) =>
    new Date(a[0].properties.startTime).getTime() -
    new Date(b[0].properties.startTime).getTime()
  );
  const sortedMap = new Map<number, GeoJSON[]>();
  for (let i = 0; i < sorted.length; i++) {
    sortedMap.set(i, sorted[i]);
  }
  exportGeoJSON(sortedMap, today, array[0].routeId.toString());
}

function reduceData(data: GeoJSON[]): GeoJSON[] {
  const result = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i].properties.time !== data[i - 1].properties.time) {
      result.push(data[i]);
    }
  }
  return result;
}
