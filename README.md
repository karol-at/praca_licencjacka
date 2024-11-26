# Monorepo conataining a set of scripts used to write my bachelor's in geography

## scraper_warsaw

this directory contains a script for downloading current bus location data for a
selected line of Warsaw public transport

to run the project install [Deno](deno.land), then create a .env file in the
project directory and enter your API key and directory you want to save the data
to as APIKEY and DIRECTORY variables as shown in .env.example, then run
`deno run prod` in terminal in the folder containing this repository
