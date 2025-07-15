import config
import arcpy
import os
import env
import pandas
import zipfile
from typing import Literal, TypeAlias, TypedDict


arcpy.env.overwriteOutput = True
if not os.path.isdir(fr"{env.path}\database.gdb"):
    arcpy.management.CreateFileGDB(env.path, "database.gdb", "CURRENT")
arcpy.env.workspace = f"{env.path}\\database.gdb"


"""
Get stops from GTFS data for a given path and city.
:param path: Path to the GTFS zip file.
:param city: City for which to get the stops, either 'warsaw' or 'gdansk'.
"""


def get_stops(path: str, city: Literal['warsaw', 'gdansk']) -> pandas.DataFrame:

    search_pattern = "|".join([str(line) for line in config.lines[city]])
    date = path.split('\\')[-3].replace('-', '')

    with zipfile.ZipFile(path) as zip_file:
        with zip_file.open('stop_times.txt') as stop_times:
            stop_times_dataframe: pandas.DataFrame = pandas.read_csv(
                stop_times) # type: ignore
        with zip_file.open('stops.txt') as stops:
            stops_dataframe: pandas.DataFrame = pandas.read_csv(
                stops)  # type: ignore       
        with zip_file.open('trips.txt') as trips:
            trips_dataframe: pandas.DataFrame = pandas.read_csv(trips) # type: ignore
        with zip_file.open('routes.txt') as routes:
            routes_dataframe: pandas.DataFrame = pandas.read_csv(
                routes) # type: ignore
        with zip_file.open('calendar.txt' if 'warsaw' == city else 'calendar_dates.txt') as calendar:
            calendar_dataframe: pandas.DataFrame = pandas.read_csv(
                calendar) # type: ignore

    join: pandas.DataFrame = stop_times_dataframe.merge(trips_dataframe, how='left', on='trip_id', suffixes=('', '-t'))\
        .merge(routes_dataframe, how='left', left_on='route_id', right_on='route_id', suffixes=('', '-r'))\
        .merge(calendar_dataframe, how='left', left_on='service_id', right_on='service_id', suffixes=('', '-c'))\
        .merge(stops_dataframe, how='left', on='stop_id', suffixes=('', '-s'))
    print('GTFS data joined')
    selection = join[join['route_id'].str.contains(search_pattern)]
    assert isinstance(selection, pandas.DataFrame)
    selection = selection.sort_values(by='arrival_time')
    if city == 'warsaw':
        selection = selection.rename(columns={'start_date': 'date'})
    selection = selection[selection['date'] == int(date)]
    assert isinstance(selection, pandas.DataFrame)
    selection['trip_count'] = selection.groupby('stop_id').cumcount()
    pivoted = selection.pivot_table(
        index=['stop_id', 'stop_lat', 'stop_lon', 'stop_name', 'trip_headsign'],
        columns='trip_count',
        values=['arrival_time'],
        aggfunc='first'
    )
    print(f'GTFS data processed for {city}')
    print(pivoted.head(10))
    pivoted.columns = [f'trip_{i}' for [_, i] in pivoted.columns]
    pivoted = pivoted.reset_index()
    return pivoted



# TODO: GTFS data processed -> convert to feature -> spatial join -> produce results

