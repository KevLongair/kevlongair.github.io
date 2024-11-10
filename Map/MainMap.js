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

function ClickedRaceSummary(map, filename) {
    let dir = "2024/"
    fetch(dir + filename + '.geojson')
        .then(response => response.json())
        .then((data) => {
            ShowRace(map, data);
        });
}

function FindBoundsOfGeoRaceSummaries(raceSummaries) {
    let longitudeList = [ ]
    let latitudeList = [ ]

    for (let i in raceSummaries.features) {
        let summary = raceSummaries.features[i];

        longitudeList.push( summary.geometry.coordinates[0] );
        latitudeList.push( summary.geometry.coordinates[1] );
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

async function CreateSymbols(map, raceSummaries) {
    map.addSource('symbols', {
        'type': 'geojson',
        'data': raceSummaries
    });

    map.addLayer({
        'id': 'poi-labels',
        'type': 'symbol',
        'source': 'symbols',
        'layout': {
            'text-field': ['get', 'title'],
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-font': ['Noto Sans Regular'],
            'text-anchor': 'bottom',
            //'text-overlap': 'always',
            'text-optional': true,
            'icon-image': 'custom-marker',
            'icon-size': 1.0,
            'icon-anchor': 'bottom',
            'icon-allow-overlap': true,
            'icon-overlap': 'always'
            /*,
            'cluster': true,
            'clusterMaxZoom': 14, // Max zoom to cluster points on
            'clusterRadius': 50*/
            },
        'paint': {
            'text-halo-color': '#fff',
            'text-halo-width': 1,
        }
    });

    map.on('click', 'poi-labels', (e) => {
        map.flyTo({
            center: e.features[0].geometry.coordinates,
            zoom: 12
        });

        let filename = e.features[0].properties.filename;

        const link = document.createElement('a');
        var linkText = document.createTextNode(e.features[0].properties.title);
        link.appendChild(linkText);
        link.title = e.features[0].properties.title;
        link.href = "#";
        link.onclick = function MyClick() {
            ClickedRaceSummary(map, filename);
        }

        // create DOM element for the marker
        /*const el = document.createElement('div');
        el.classname = 'kev-marker';
        el.appendChild(link);*/
        let el = link;

        let popup = new maplibregl.Popup()
            .setLngLat(e.features[0].geometry.coordinates)
            .setDOMContent(el)
            .addTo(map);

    });

     // Change the cursor to a pointer when the it enters a feature in the 'symbols' layer.
    map.on('mouseenter', 'poi-labels', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    // Change it back to a pointer when it leaves.
    map.on('mouseleave', 'poi-labels', () => {
        map.getCanvas().style.cursor = '';
    });
}

async function CreateGeoMap(raceSummaries) {
    let raceBounds = FindBoundsOfGeoRaceSummaries(raceSummaries);

    // calculated via geojson.io
    //  just to find 'corners' of UK
    const UKBounds = [
        [-8.387823421597375,
          49.92024040107307],
        [1.7688261027427359,
          58.79845924465005]
        ];

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
            glyphs: "./fonts/{fontstack}/{range}.pbf",
        },
        bounds: raceBounds,
        maxBounds: UKBounds,
        dragRotate: false
    });

    // disable rotation for touch controls (mobile)
    map.touchZoomRotate.disableRotation();

    map.on('load', async () => {
        // Add an image to use as a custom marker
        const image = await map.loadImage('./icons/MapPin.png');
        map.addImage('custom-marker', image.data)

        CreateSymbols(map, raceSummaries);
    });
}

async function LoadedRaceSummaries() {
    await fetch("raceSummaries.geojson")
        .then(response => response.json())
        .then((data) => {
            CreateGeoMap(data);
        });
}

LoadedRaceSummaries();