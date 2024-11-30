import { TricityDataPoint } from "./TricityConverter.ts";

const URI = 'https://ckan2.multimediagdansk.pl/gpsPositions?v=2'

async function callAPI ():Promise<TricityDataPoint[]> {
    const res = await fetch(URI);
    const data = await res.json()
    return data.vehicles;
}