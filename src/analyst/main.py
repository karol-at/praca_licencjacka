import arcpy
import stop_preparator as sp
import connector as con
import env
import os
import config

errors = []
dates = os.listdir(env.path)
for date in dates:

    cwd = f'{env.path}\\{date}'

    gdb = arcpy.management.CreateFileGDB(cwd, 'base.gdb')

    arcpy.env.workspace = f'{cwd}\\base.gdb'
    
    for city in config.cities:

        if city not in ['warsaw', 'gdansk']:
            raise ValueError()

        df = sp.get_stops(f'{env.path}\\{date}\\gtfs\\{city}.zip', city)
        lines = sp.split_lines(df)

        processed_lines: list[str] = []
        for line in lines:
            processed_lines += sp.stops_to_features(cwd, city, lines[line])
            
        for line in processed_lines:
            joined_line = con.join_line(cwd, line)
            con.export_table(joined_line, cwd, line)
            with open(f'{cwd}\\{line}_errors.txt') as file:
                file.write(str(env.errors))
                env.errors = []
            print(f'processed line {line}')
            
