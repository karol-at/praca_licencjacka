import dotenv

# dotenv files parsed into variables to avoid repeat parsing

path = dotenv.dotenv_values()['DIRECTORY'].replace('/', '\\')
gtfs = dotenv.dotenv_values()['GTFS'].replace('/','\\')
api_key = dotenv.dotenv_values()['APIKEY']