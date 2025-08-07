import config
import arcpy
import utils
import pandas
import zipfile
from typing import Literal
from route import Route
from itertools import groupby


arcpy.env.overwriteOutput = True


def load_gtfs(path: str, city: Literal['warsaw', 'gdansk']) -> pandas.DataFrame:
    """
    Load GTFS Schedule data for a given path and city.
    Args:
        path (str): path to the GTFS Schedule file
        city (Literal['warsaw', 'gdansk'])
    Returns:
        a dataframe containing loaded and merged stop data for selected lines with converted headsigns
    """

    search_pattern = "|".join([str(line) for line in config.lines[city]])
    date = path.split('\\')[-3].replace('-', '')

    with zipfile.ZipFile(path) as zip_file:
        with zip_file.open('stop_times.txt') as stop_times:
            stop_times_dataframe: pandas.DataFrame = pandas.read_csv(
                stop_times)
        with zip_file.open('stops.txt') as stops:
            stops_dataframe: pandas.DataFrame = pandas.read_csv(
                stops)
        with zip_file.open('trips.txt') as trips:
            trips_dataframe: pandas.DataFrame = pandas.read_csv(
                trips)
        with zip_file.open('routes.txt') as routes:
            routes_dataframe: pandas.DataFrame = pandas.read_csv(
                routes)
        with zip_file.open('calendar.txt' if 'warsaw' == city else 'calendar_dates.txt') as calendar:
            calendar_dataframe: pandas.DataFrame = pandas.read_csv(
                calendar)

    join = stop_times_dataframe.merge(trips_dataframe, how='left', on='trip_id', suffixes=('', '-t'))\
        .merge(routes_dataframe, how='left', left_on='route_id', right_on='route_id', suffixes=('', '-r'))\
        .merge(calendar_dataframe, how='left', left_on='service_id', right_on='service_id', suffixes=('', '-c'))\
        .merge(stops_dataframe, how='left', on='stop_id', suffixes=('', '-s'))\
        .astype({'route_id': 'str'})

    del stop_times_dataframe
    del trips_dataframe
    del routes_dataframe
    del calendar_dataframe
    del stops_dataframe
    collect()

    join = join[join['route_id'].str.contains(search_pattern)]

    assert isinstance(join, pandas.DataFrame)

    if city == 'warsaw':
        join = join.rename(columns={'start_date': 'date'})
        join['trip_headsign'] == join['trip_headsign'].map(
            lambda x: x if x not in config.route_aliases else config.route_aliases[x])

    join = join[join['date'] == date]

    assert isinstance(join, pandas.DataFrame)

    join = join.sort_values(by='arrival_time')
    join['arrival_time'] = join['arrival_time'].map(
        utils.get_timestamp, na_action='ignore')
    join['trip_headsign'] = join[['trip_headsign', 'route_id']].apply(
        lambda x: f'{x[1]} -> {x[0]}', axis=1, raw=True)
    return join


def split_shapes(df: pandas.DataFrame) -> dict[str, Route]:
    """
    Split merged GTFS Schedule data into timetables for each found shape_id
    Args:
        df (DataFrame): a DataFrame containing merged GTFS Schedule data for a given day and select routes. A result of _load_gtfs_
    """

    shapes = df[['shape_id', 'trip_headsign']].drop_duplicates()

    shapes = sorted(shapes.to_numpy().tolist(), key=lambda x: x[1])

    groups = groupby(shapes, lambda x: x[1])
    lines: dict[str, Route] = {key: Route(key, value) for key, value in groups}

    for line in lines:
        for shape in lines[line].shapes:
            shape.timetable = getnerate_pivot_table(df, shape.id)

    return lines


def getnerate_pivot_table(df: pandas.DataFrame, shape_id: str) -> pandas.DataFrame:
    """
    Convert a dataframe to a timetable pivot table for a spcific shape_id.
    Args:
        df (DataFrame): a DataFrame containing merged GTFS Schedule data
        shape_id (str): an id for he shape for which the timetable will be generated
    """

    shape_df = df[df['shape_id'] == shape_id]
    shape_df['trip_count'] = shape_df.groupby('stop_sequence').cumcount()

    pivot = shape_df.pivot_table(
        index=['stop_id', 'stop_lat', 'stop_lon',
               'stop_name', 'route_short_name', 'trip_headsign', 'stop_sequence'],
        columns='trip_count',
        values=['arrival_time'],
        aggfunc='first',
        dropna=True,
    )

    del shape_df

    pivot.columns = [f'{name}_{i}' for [name, i] in pivot.columns]
    pivot = pivot.reset_index().sort_values(by=['stop_sequence'])

    assert isinstance(pivot, pandas.DataFrame)

    return pivot
