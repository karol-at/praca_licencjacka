import { GeoJSON } from "./GeoJSON.ts";

type WarsawDataPoint = {
    Lines: string;
    Lon: number;
    Lat: number;
    Time: string;
    Brigade: string;
    VehicleNumber: string;
};

function reduceData(data: WarsawDataPoint[]): WarsawDataPoint[] {
    const results: WarsawDataPoint[] = [];
    for (let i = 0; i < data.length; i++) {
        if (data[i].Time === data[i + 1].Time) {
            results.push(data[i]);
        }
    }
    return results;
}

