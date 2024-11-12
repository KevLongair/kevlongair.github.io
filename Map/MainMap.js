class RouteSimulation {

    #realSimulationTime = 0.0;
    #maxSeconds = 0.0;
    #playbackRate = 1.0;

    #zeroTime = 0.0;
    #lastTime = 0.0;

    #updateFunction = undefined;
    #animRequestID = undefined;

    constructor(wallClockTime, maxSeconds) {
        this.#realSimulationTime = wallClockTime;
        this.#maxSeconds = maxSeconds;

        this.#playbackRate = maxSeconds / wallClockTime;
    }

    _animate(timestamp) {
        const elapsedRealTime = (timestamp - this.#zeroTime) / 1000.0;
        const frameRealTimeMilliseconds = timestamp - this.#lastTime;
        this.#lastTime = timestamp;

        var simulatedTime = this.#playbackRate * elapsedRealTime;

        var bContinueUpdate = this.#updateFunction.call(this, simulatedTime);

        if (bContinueUpdate) {
            self = this;
            this.#animRequestID = requestAnimationFrame((timestamp) => {
                self._animate(timestamp);
            });
        }
    }

    begin(updateFunction) {
        if (typeof updateFunction !== 'function') {
            throw new TypeError('updateFunction must be a function!');
        }
        this.#updateFunction = updateFunction;

        self = this;
        this.#animRequestID = requestAnimationFrame((timestamp) => {
            self._firstFrame(timestamp);
        });
    }

    _firstFrame(timestamp) {
        this.#zeroTime = timestamp;
        this.#lastTime = this.#zeroTime;
        this._animate(timestamp);
    }

    end() {
        cancelAnimationFrame(this.#animRequestID);
    }
};

let routeSourceName = 'route';
let routeLayerName = 'raceLayer';
let placesSourceName = 'places';
let placesLayerName = 'placeLayer';

let RouteSim = undefined;
let currentRaceName = '';

function ShowRace(map, raceData) {
    const gpxProcessor = new GPXProcessor(raceData);

    // just skip to end for now
    //gpxProcessor.simulateToEnd();

    // does source exist already?
    let source = map.getSource(routeSourceName);
    if (source == undefined) {
        // no, then add it to the map
        source = map.addSource(routeSourceName, {
            'type': 'geojson',
            'data': gpxProcessor.getGeoJson()
        });
    } else {
        // yes, update the data
        source.setData(gpxProcessor.getGeoJson());
    }

    // does layer exist already?
    let layer = map.getLayer(routeLayerName);
    if (layer == undefined) {
        // no, add it to the map
        map.addLayer({
            'id': routeLayerName,
            'type': 'line',
            'source': routeSourceName,
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#888',
                'line-width': 2
            }},
            placesLayerName
        );
    } // else do nothing, layer is already present


    // zoom map to new race extents
    map.fitBounds(
        gpxProcessor.getBounds(), 
        {
            padding: 64
        }
    );

    if (RouteSim != undefined) {
        RouteSim.end();
    }
    RouteSim = new RouteSimulation(10.0, gpxProcessor.getMaxSeconds());

    map.once('idle', (e) => {
        RouteSim.begin((simulatedTime) => {
            // raceResultsProcessor.simulateTo(simulatedTime);

            gpxProcessor.simulateTo(simulatedTime);

            map.getSource('route').setData(gpxProcessor.getGeoJson());
            //map.getSource('myCustomRoute').setData(raceResultsProcessor.getGeoJson());
            //map.panTo(raceResultsProcessor.getLeaderCoordinate(), {"duration": frameRealTimeMilliseconds});

            //return !raceResultsProcessor.isSimulationFinished();
            return !gpxProcessor.isSimulationFinished();
        });
    });
}

function ClickedRaceSummary(map, filename) {
    let dir = "2024/"
    fetch(dir + filename + '.geojson')
        .then(response => response.json())
        .then((data) => {
            currentRaceName = filename;
            ShowRace(map, data);
        });
}

function FindBoundsOfGeoRaceSummaries(raceSummaries) {
    let longitudeList = [ ]
    let latitudeList = [ ]

    // add to the lists every coordinate
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

async function FocusOnRace(map, raceName) {
    if (raceName == undefined) {
        map.fitBounds( map.raceBounds );
    } else {
        let placesSource = map.getSource(placesSourceName);
        let placesData = await placesSource.getData();
        let placeInfo = placesData.features.find(element => {
            return element.properties.filename == raceName
        });

        map.flyTo({
            center: placeInfo.geometry.coordinates,
            zoom: 12
        });

        ClickedRaceSummary(map, raceName);
    }
}

async function CreateSymbols(map, raceSummaries) {
    map.addSource(placesSourceName, {
        'type': 'geojson',
        'data': raceSummaries
    });

    map.addLayer({
        'id': placesLayerName,
        'type': 'symbol',
        'source': placesSourceName,
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

/*
    let layerID = 'myLayer';

    const mapNav = document.getElementById('inMapNav');
    // Add checkbox and label elements for the layer.
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = layerID;
    input.checked = true;
    mapNav.appendChild(input);

    const label = document.createElement('label');
    label.setAttribute('for', layerID);
    label.textContent = 'my content';
    mapNav.appendChild(label);*/

    map.on('click', placesLayerName, (e) => {
        let filename = e.features[0].properties.filename;

        if (filename != currentRaceName) {
            const url = new URL(window.location);
            url.searchParams.set("raceName", filename);
            window.history.pushState({}, "", url);
            FocusOnRace(map, filename);
        }
    });

     // Change the cursor to a pointer when the it enters a feature in the 'symbols' layer.
    map.on('mouseenter', placesLayerName, () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    // Change it back to a pointer when it leaves.
    map.on('mouseleave', placesLayerName, () => {
        map.getCanvas().style.cursor = '';
    });
}

async function CreateGeoMap(raceSummaries, selectRace) {
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

    map.raceBounds = raceBounds;

    map.on('load', async () => {
        // Add an image to use as a custom marker
        const image = await map.loadImage('./icons/MapPin.png');
        map.addImage('custom-marker', image.data)

        CreateSymbols(map, raceSummaries);

        window.addEventListener("popstate", (event) => {
            const params = new URLSearchParams(window.location.search);
            let raceName = params.get('raceName');
            FocusOnRace(map, raceName);
        });

        FocusOnRace(map, selectRace);
    });
}

async function LoadedRaceSummaries() {
    const params = new URLSearchParams(window.location.search);
    let raceName = params.get('raceName');

    await fetch("raceSummaries.geojson")
        .then(response => response.json())
        .then((data) => {
            CreateGeoMap(data, raceName);
        });
}

LoadedRaceSummaries();