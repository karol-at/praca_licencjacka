import pandas
from typing import Literal
from collections.abc import Iterable
import os
import yaml
from utils import get_closest_trip


class DelayMap():
    def __init__(self):
        self.descending = 0
        self.shape_mismatch = 0
        self.repeated_travel = 0


def clean_tables(path: str, shape_map: dict[str, list[str]], city: Literal['warsaw', 'gdansk']) -> dict[str, list[dict[str, dict]]]:
    """
    Remove mismatched columns with delays above 1800 seconds or differences delay-to-delay exceeding 900 seconds
    Args:
        path (str): path to current daily working directory
        shape_map (dict[str, list[str]]): a dictionary describing lines and shapes

    """

    try:
        os.mkdir(f'{path}/delays')
    except:
        pass
    result: dict[str, list[dict[str, dict]]] = {}
    for k in shape_map:
        result[k] = []
        for l in shape_map[k]:
            if isinstance(l, dict):
                l = list(l.keys())[0]
            df = pandas.read_csv(
                f'{path}/delays_raw/{l}.csv', delimiter=';', decimal=',', encoding='utf-8')
            df, dm = clean_table(df, city)
            df.to_csv(f'{path}/delays/{l}.csv', sep=';',
                      decimal=',', encoding='utf-8')
            result[k] += [{l: dm.__dict__}]
    return result


def clean_table(df: pandas.DataFrame, city: Literal['warsaw', 'gdansk']) -> tuple[pandas.DataFrame, DelayMap]:
    delays = df.filter(regex=r'delay_\d')
    correct_columns: list[str] = []
    dm = DelayMap()
    column_replace_map: dict[str, str] = {}
    for column in delays:
        selected_column = delays[column]
        selected_column_slice = selected_column[:-1]
        column_index = column[6:]
        timestamp_column = df[f'timestamp_{column_index}']
        assert isinstance(selected_column_slice, pandas.Series)
        assert isinstance(timestamp_column, pandas.Series)
        assert isinstance(selected_column, pandas.Series)
        if get_max_difference(selected_column_slice) > 900:
            dm.repeated_travel += 1
            continue
        if is_descending(timestamp_column):
            dm.descending += 1
            continue
        if selected_column_slice.max() > 1800 or selected_column_slice.min() < -1800:
            dm.shape_mismatch += 1
            continue
        match_trip_start_time = match_trip(df, timestamp_column)
        column_replace_map[column] = f'{column}_{match_trip_start_time}'
        correct_columns += [column]
    final_columns: list[str] = ['stop_id', 'stop_lat', 'stop_lon',
                                'stop_name', 'route_short_name', 'trip_headsign', 'stop_sequence',]
    final_columns += list(df.filter(regex='arrival_time.',).columns)
    final_columns += list(df.filter(regex='departure_time.',).columns)
    for column in correct_columns:
        column_index: str = column[6:]

        final_columns += [
            x + column_index for x in (
                ['delay_', 'timestamp_']
                if city == 'warsaw' else
                ['delay_', 'timestamp_', 'startTime_',
                    'startTimestamp_', 'delay_ZTM_']
            )
        ]
    final_df = df[final_columns].copy()
    assert isinstance(final_df, pandas.DataFrame)
    final_df = final_df.rename(columns=column_replace_map)

    return final_df, dm


def get_max_difference(l: Iterable) -> int:
    l = list(l)
    max_diff = 0
    curr_diff = 0
    for i in range(0, len(l) - 1):
        curr_diff = abs(l[i] - l[i + 1])
        if curr_diff > max_diff:
            max_diff = curr_diff
    return max_diff


def is_descending(l: Iterable) -> bool:
    l = list(l)
    threshold = 6
    for i in range(0, len(l) - 1):
        if l[i] > l[i + 1]:
            threshold -= 1
        if threshold == 0:
            return True
    return False


def match_trip(df: pandas.DataFrame, column: pandas.Series) -> str:
    i = 1
    while (pandas.isna(column[i])):
        i += 1
    arrivals_df = df.filter(regex='arrival_time_.')
    arrivals: pandas.Series = arrivals_df.iloc[i]
    start_time_index = get_closest_trip(list(arrivals), int(column[i]))
    start_time: int = arrivals.iloc[start_time_index]
    return str(start_time)

