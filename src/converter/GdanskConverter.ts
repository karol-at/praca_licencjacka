import { exportGeoJSON, GeoJSON, getTimestamp } from "./GeoJSON.ts";

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
  return data.filter((v) => v.scheduledTripStartTime != "null").map((point) => {
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [point.lon, point.lat],
      },
      properties: {
        vehicleNumber: point.vehicleId,
        line: point.routeId,
        routeShortName: point.routeShortName,
        headsign: point.routeId + " -> " + point.headsign,
        vechicleCode: point.vechicleCode,
        vechicleService: point.vechicleService,
        speed: point.speed,
        direction: point.direction,
        delay: point.delay,
        gpsQuality: point.gpsQuality,
        tripId: 0,
        time: point.generated,
        timestamp: getTimestamp(point.generated) + 7200,
        startTime: point.scheduledTripStartTime,
        startTimestamp: getTimestamp(point.scheduledTripStartTime) + 7200,
      },
    };
  });
}

export function transformBusInfo(
  array: GdanskDataPoint[],
  today: string,
) {
  if (array.length === 0) return;
  const rideMap = Map.groupBy(
    convertToGeoJSON(array),
    (item) => item.properties.startTime,
  );
  const sortedMap = new Map<number, GeoJSON[]>();
  let i = 1;
  for (const [_time, ride] of rideMap) {
    sortedMap.set(i, reduceData(ride));
    i++;
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
