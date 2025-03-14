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
  if (array.length === 0) return;
  const rideMap = Map.groupBy(
    convertToGeoJSON(array),
    (item) => item.properties.startTime,
  );
  const sortedMap = new Map<number, GeoJSON[]>();
  let i = 1;
  for (const [_time, ride] of rideMap) {
    sortedMap.set(i, reduceData(ride))
    i++
  }
  exportGeoJSON(sortedMap, today, array[0].routeId.toString());
}

function reduceData(data: GeoJSON[]): GeoJSON[] {
  const result = [data[0]];
  for (let i = 1; i < data.length; i++) {
    if (data[i].properties.time !== data[i - 1].properties.time) {
      result.push(data[i]);
    }
  }
  return result;
}
