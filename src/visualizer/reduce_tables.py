import pandas
import numpy
import os
import dotenv

PATH = dotenv.dotenv_values()['DIRECTORY']
if PATH == None:
    raise ValueError('DIRECTORY not defined in .env')

dates = os.listdir(PATH)
lines_dataframes: dict[str, list[pandas.DataFrame]] = {}

for date in dates:
    lines = filter(lambda x: '.csv' in x and x not in [
                   'warsaw.csv', 'gdansk.csv'], os.listdir(PATH + '\\' + date))
    for line in lines:
        df = pandas.read_csv(fr'{PATH}\{date}\{line}', delimiter=';')
        columns: list[str] = list(
            filter(lambda x: 'delay_' in x and 'delay_ZTM' not in x, df.columns))
        index_columns = list(filter(lambda x: x in ['stop_id', 'stop_name',
                         'stop_sequence', 'route_short_name', 'trip_headsign'], df.columns.tolist()))
        if len(columns) == 0:
            continue

        reduced = df[columns].apply(numpy.average, axis=1)
        index_df = df[index_columns].copy()

        assert isinstance(index_df, pandas.DataFrame)

        index_df['delay_avg'] = reduced

        try:
            lines_dataframes[line].append(index_df)
        except KeyError as _e:
            lines_dataframes[line] = [index_df]
    print('reduced data for' + date)
    


for line in lines_dataframes.keys():
    index_df = lines_dataframes[line][0][['stop_id', 'stop_name',
                                          'stop_sequence', 'route_short_name', 'trip_headsign']]
    for i, series in enumerate(lines_dataframes[line]):
        index_df = index_df.merge(series, how='left',
                       left_on='stop_id', right_on='stop_id', suffixes=('', '_r'))
        merge_columns = tuple(filter(lambda x: '_r' not in x, index_df.columns))
        index_df = index_df[merge_columns]

    work_df = index_df[['stop_id', 'stop_name',
                        'stop_sequence', 'route_short_name', 'trip_headsign']]

    assert isinstance(work_df, pandas.DataFrame)
    
    delay_fields = tuple(filter(lambda x: 'delay' in x, index_df.columns))

    work_df['delay_avg'] = work_df.apply(numpy.average, axis=1) 

    # wykombinować jak to zrobić, skąd wziąć kolumny do indeksowania najłatwiej
    work_df.to_csv(f'{PATH}\\{line}.csv')
