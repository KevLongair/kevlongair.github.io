let raceSourceName = 'route';
let raceLayerName = 'raceLayer';

function ShowRace(map, raceData) {
    const gpxProcessor = new GPXProcessor(raceData);

    // just skip to end for now
    gpxProcessor.simulateToEnd();

    // does source exist already?
    let source = map.getSource(raceSourceName);
    if (source == undefined) {
        // no, then add it to the map
        source = map.addSource(raceSourceName, {
            'type': 'geojson',
            'data': gpxProcessor.getGeoJson()
        });
    } else {
        // yes, update the data
        source.setData(gpxProcessor.getGeoJson());
    }

    // does layer exist already?
    let layer = map.getLayer(raceLayerName);
    if (layer == undefined) {
        // no, add it to the map
        map.addLayer({
            'id': raceLayerName,
            'type': 'line',
            'source': raceSourceName,
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#888',
                'line-width': 2
            }
        });
    } // else do nothing, layer is already present


    // zoom map to new race extents
    map.fitBounds(
        gpxProcessor.getBounds(), 
        {
            padding: 16
        }
    );
}

function ClickedRaceSummary(map, raceSummary) {
    let dir = "2024/"
    fetch(dir + raceSummary.filename + '.geojson')
        .then(response => response.json())
        .then((data) => {
            ShowRace(map, data);
        });
}

function CreateMarkers(map, raceSummaries) {
    for (let i in raceSummaries) {
        let summary = raceSummaries[i];

        const link = document.createElement('a');
        var linkText = document.createTextNode(summary.title);
        link.appendChild(linkText);
        link.title = summary.title;
        link.href = "#";
        link.onclick = function MyClick() {
            ClickedRaceSummary(map, summary);
        }

        // create DOM element for the marker
        /*const el = document.createElement('div');
        el.classname = 'kev-marker';
        el.appendChild(link);*/
        const el = link;

        let popup = new maplibregl.Popup()
            .setDOMContent(el);
        
        const marker = new maplibregl.Marker()
          .setLngLat(summary.startingPoint)
          .setPopup(popup)
          .addTo(map);
    }
}

function FindBoundsOfRaceSummaries(raceSummaries) {
    let longitudeList = [ ]
    let latitudeList = [ ]

    for (let i in raceSummaries) {
        let summary = raceSummaries[i];

        longitudeList.push( summary.startingPoint[0] );
        latitudeList.push( summary.startingPoint[1] );
    }

    // find bounding box of places, we want the map to show the whole lot
    const maxLongitude = Math.max(...longitudeList);
    const minLongitude = Math.min(...longitudeList);
    const maxLatitude = Math.max(...latitudeList);
    const minLatitude = Math.min(...latitudeList);

    // offset the min/max a little so that the markers have room to show
    //  especially for the max, the entire marker can get cutoff if the bound is tight to the data
    return [
        [minLongitude, minLatitude-0.1],
        [maxLongitude, maxLatitude+0.2]
    ];
}

async function CreateMap(raceSummaries) {
    let raceBounds = FindBoundsOfRaceSummaries(raceSummaries);

    const map = new maplibregl.Map({
        container: 'map',
        style: {
            //'https://demotiles.maplibre.org/style.json',
            version: 8,
            sources: {
                osm: {
                    type: 'raster',
                    tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '&copy; OpenStreetMap Contributors',
                    maxzoom: 19
                }
            },
            layers: [
            {
                id: 'osm',
                type: 'raster',
                source: 'osm'
            }],
        },
        bounds: raceBounds,
    });

    map.on('load', () => {
        CreateMarkers(map, raceSummaries);
    });
}

async function LoadedRaceSummaries() {
    await fetch("raceSummaries.json")
        .then(response => response.json())
        .then((data) => {
            CreateMap(data);
        });
}

LoadedRaceSummaries();