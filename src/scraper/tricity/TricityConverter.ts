import { tricityLine } from "../lines.ts";
import { exportGeoJSON, GeoJSON } from "../GeoJSON.ts";

export type TricityDataPoint = {
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

function convertToGeoJSON(data: TricityDataPoint[]): GeoJSON[] {
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

const getLine = (data: TricityDataPoint[], index: number): TricityDataPoint[] =>
  Map.groupBy(data, (item) => item.routeId).get(index) ?? [];

export function transformBusInfo(
  line: tricityLine,
  data: TricityDataPoint[],
  index: number,
  today: string,
): void {
  line.array = getLine(data, index);
  line.rideMap = Map.groupBy(
    convertToGeoJSON(line.array),
    (item) => item.properties.startTime,
  );
  for (const [time, ride] of line.rideMap) {
    line.rideMap.set(time, reduceData(ride));
  }
  const sorted: GeoJSON[][] = line.rideMap.values().toArray().sort((a, b) =>
    new Date(a[0].properties.startTime).getTime() -
    new Date(b[0].properties.startTime).getTime()
  );
  for (let i = 0; i < sorted.length; i++) {
    line.sortedMap.set(i, sorted[i]);
  }
  exportGeoJSON(line.sortedMap, today, index.toString());
}

function reduceData(data: GeoJSON[]): GeoJSON[] {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i].properties.time !== data[i - 1].properties.time) {
      result.push(data[i]);
    }
  }
  return result;
}
