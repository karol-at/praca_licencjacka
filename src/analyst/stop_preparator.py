import numpy.lib.recfunctions
import config
import arcpy
import utils
import pandas
import zipfile
from typing import Literal
import numpy


arcpy.env.overwriteOutput = True


def get_stops(path: str, city: Literal['warsaw', 'gdansk']) -> pandas.DataFrame:
    """
    Get stops from GTFS data for a given path and city.
    Args:
        path (str): Path to the GTFS zip file.
        city (Literal['warsaw', 'gdansk']): City for which to get the stops, either 'warsaw' or 'gdansk'.
    """

    search_pattern = "|".join([str(line) for line in config.lines[city]])
    date = path.split('\\')[-3].replace('-', '')

    with zipfile.ZipFile(path) as zip_file:
        with zip_file.open('stop_times.txt') as stop_times:
            stop_times_dataframe: pandas.DataFrame = pandas.read_csv(
                stop_times)  # type: ignore
        with zip_file.open('stops.txt') as stops:
            stops_dataframe: pandas.DataFrame = pandas.read_csv(
                stops)  # type: ignore
        with zip_file.open('trips.txt') as trips:
            trips_dataframe: pandas.DataFrame = pandas.read_csv(
                trips)  # type: ignore
        with zip_file.open('routes.txt') as routes:
            routes_dataframe: pandas.DataFrame = pandas.read_csv(
                routes)  # type: ignore
        with zip_file.open('calendar.txt' if 'warsaw' == city else 'calendar_dates.txt') as calendar:
            calendar_dataframe: pandas.DataFrame = pandas.read_csv(
                calendar)  # type: ignore

    join: pandas.DataFrame = stop_times_dataframe.merge(trips_dataframe, how='left', on='trip_id', suffixes=('', '-t'))\
        .merge(routes_dataframe, how='left', left_on='route_id', right_on='route_id', suffixes=('', '-r'))\
        .merge(calendar_dataframe, how='left', left_on='service_id', right_on='service_id', suffixes=('', '-c'))\
        .merge(stops_dataframe, how='left', on='stop_id', suffixes=('', '-s'))
    print(f'GTFS data joined for {date}')
    selection = join[join['route_id'].str.contains(search_pattern)]
    assert isinstance(selection, pandas.DataFrame)
    selection = selection.sort_values(by='arrival_time')
    selection['arrival_time'] = selection['arrival_time'].map(
        utils.get_timestamp, na_action='ignore')
    if city == 'warsaw':
        selection = selection.rename(columns={'start_date': 'date'})
    selection = selection[selection['date'] == int(date)]
    assert isinstance(selection, pandas.DataFrame)
    selection['trip_count'] = selection.groupby('stop_id').cumcount()
    pivoted = selection.pivot_table(
        index=['stop_id', 'stop_lat', 'stop_lon',
               'stop_name', 'route_short_name', 'trip_headsign', 'stop_sequence'],
        columns='trip_count',
        values=['arrival_time'],
        aggfunc='first'
    )
    print(f'GTFS data processed for {city}')
    pivoted.columns = [f'trip_{i}' for [_, i] in pivoted.columns]
    pivoted = pivoted.reset_index().sort_values(by=['trip_headsign', 'stop_sequence'])
    return pivoted


def split_lines(df: pandas.DataFrame):
    grouped = df.groupby('route_short_name')
    return {i: frame.dropna(axis=1, how='all').dropna(thresh=10) for i, frame in grouped}


def stops_to_features(path: str, city: Literal['warsaw', 'gdansk'], table: pandas.DataFrame) -> list[str]:
    """
    Convert a dataframe with timetables to feature classes for a single bus line
    Args:
        path (str): Path to the daily working directory
        city {'warsaw', 'gdansk'}:  the city to be processed
        table (DataFrame): pandas dataframe containing processed GTFS data for a list of bus stops with timetables
    Returns:
        a list of headsigns for specific bus lines
    """
    table.to_csv(f'{path}\\{city}.csv')
    arcpy.conversion.ExportTable(
        f'{path}\\{city}.csv', f'{city}_table')
    arcpy.XYTableToPoint_management(
        f'{city}_table', f'{city}_stops', 'stop_lon', 'stop_lat')
    freq_table = arcpy.analysis.Frequency(
        f'{city}_table', f'{city}_freq', 'trip_headsign')
    result = []
    for line in arcpy.da.SearchCursor(freq_table, 'trip_headsign'):
        arcpy.analysis.Select(f'{city}_stops', arcpy.ValidateTableName(
            line[0]), f"trip_headsign = '{line[0]}'")
        result.append(line[0])
    return result
