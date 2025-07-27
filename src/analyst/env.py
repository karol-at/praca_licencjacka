import dotenv
import sys

# dotenv files parsed into variables to avoid repeat parsing

path = dotenv.dotenv_values()['DIRECTORY']
if path == None:
    raise ValueError("DIRECTORY not defined in .env")
path = path.replace('/', '\\')

initial_dir = sys.argv[1]

gtfs = dotenv.dotenv_values()['GTFS']
if gtfs == None:
    raise ValueError("GTFS not defined in .env")
gtfs = gtfs.replace('/', '\\')

api_key = dotenv.dotenv_values()['APIKEY']

errors = []