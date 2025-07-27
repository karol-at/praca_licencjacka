# Monorepo conataining a set of scripts used to write my bachelor's in geography

## scraper

A script designed

### warsaw

the scraper for the city of Warsaw, requires an API key, collective location
data is split based on cutting data with the turf.js library on start and end
points of the journey. turf.js polygons need to be provided in Polygons.ts

### tricity

the scraper for the city fo Gdańsk using

to run the project install [Deno](deno.land), then create a .env file in the
project directory and enter your API key and directory you want to save the data
to as APIKEY and DIRECTORY variables as shown in .env.example, then run
`deno run prod` in terminal in the folder containing this repository
