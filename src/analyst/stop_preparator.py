import requests
import dotenv
from arcpy import GTFSStopsToFeatures_conversion, da, AddField_management, Copy_management
from typing import Literal, TypeAlias, TypedDict

path = dotenv.dotenv_values()['DIRECTORY']
api_key = dotenv.dotenv_values()['APIKEY']

warsaw_response_point: TypeAlias = list[
    dict[
        Literal[
            'key',
            'value'
        ],
        int | str | None
    ]
]


class gdansk_response_point(TypedDict):
    routeId: int
    tripId: int
    agncyId: int
    topologyVersionId: int
    arrivalTime: str
    departureTime: str
    stopId: int
    stopSequence: int
    date: str
    variantId: int
    noteSymbol: str
    noteDescription: str
    busServiceName: str
    order: int
    passenger: bool
    nonpassenger: int
    ticketZoneBorder: int
    onDemand: int
    virtual: int
    islupek: int
    wheelchairAccessible: int
    stopShortName: str
    stopHeadsign: str


class formatted_warsaw_response_point(TypedDict):
    symbol_2: None
    symbol_1: None
    brygada: str
    kierunek: str
    trasa: str
    czas: str
    przystanek: str


class formatted_stop(TypedDict):
    time: str
    stop_id: str
    city: str

# Get stop times for a desired stop by ID, automatically switches between Warsaw and Gdańsk depending on supplied arguments


def get_stops(stop_id: int, line: int, weekend: bool = False, stop_number: str | None = None) -> list[formatted_warsaw_response_point | gdansk_response_point]:
    if stop_number == None:  # Formatted for Gdansk API
        resp: list[gdansk_response_point] = requests.get(
            'https://ckan2.multimediagdansk.pl/stopTimes',
            {
                # TODO: dates in the past don't work: modify to use future dates somehow
                'date': '2025-03-22' if weekend else '2025-03-18',
                'routeId': line
            }
        ).json()['stopTimes']
        resp = filter(lambda item: item['stopId'] == stop_id, resp)
        resp.sort(key=lambda item: item['departureTime'])
        return resp
    else:  # Formatted for Warsaw API
        res: list[warsaw_response_point] = requests.get(
            'https://api.um.warszawa.pl/api/action/dbtimetable_get/',
            {
                'id': 'e923fa0e-d96c-43f9-ae6e-60518c9f3238',
                'apikey': api_key,
                'busstopId': stop_id,
                'line': line,
                'busstopNr': stop_number
            }
        ).json()['result']
        stops: list[formatted_warsaw_response_point] = []
        for index, item in enumerate(res):
            stops.append({element['key']: element['value']
                         for element in item})
            stops[index]['przystanek'] = str(stop_id) + stop_number
        stops.sort(key=lambda item: item['czas'])
        return format_stops(stops)

# Format stops to common type


def format_stops(stops: list[formatted_warsaw_response_point | gdansk_response_point]) -> list[formatted_stop]:
    # Check for unique key only present in Warsaw stop data
    if 'przystanek' in stops[0]:
        return [{'time': item['czas'], 'stop_id': item['przystanek'], 'city': 'Warsaw'} for item in stops]
    # Check for unique key only present in Gdańsk stop data
    elif 'departureTime' in stops[0]:
        return [{'time': item['departureTime'], 'stop_id': item['stopId'], 'city': 'Gdansk'} for item in stops]
