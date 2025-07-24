import arcpy
import stop_preparator as sp
import connector as con
import env
import os
import config

dates = os.listdir(env.path)
for date in dates:
    for city in config.cities:

        if city not in ['warsaw', 'gdansk']:
            raise ValueError()
        
        cwd = f'{env.path}\\{date}'

        df = sp.get_stops(f'{env.path}\\{date}\\gtfs\\{city}.zip', city)
        lines = sp.split_lines(df)

        gdb = arcpy.management.CreateFileGDB(cwd, 'base.gdb')

        arcpy.env.workspace = f'{cwd}\\base.gdb'

        processed_lines: list[str] = []
        for line in lines:
            processed_lines += sp.stops_to_features(cwd, city, lines[line])
            
        for line in processed_lines:
            con.join_line(cwd, line)
            
