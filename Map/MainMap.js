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

const svgNamespace = 'http://www.w3.org/2000/svg';
class SvgGraph {
    #elevationMin = 0;
    #elevationMax = 0;
    #distance = 0;

    constructor(elevationMin, elevationMax, distance) {
        this.#elevationMin = elevationMin;
        this.#elevationMax = elevationMax;
        this.#distance = distance/1000.0;

        let svgOuter = document.getElementById('outerSvg');
        svgOuter.classList.remove('nodisplay');

        var graphXLeftMargin = 50;
        var graphXRightMargin = 10;
        var graphYTopMargin = 10;
        var graphYBottomMargin = 50;

        // graph
        var svgGraphBox = document.getElementById('graphSvg');
        {
            let svgContainer = svgGraphBox.parentNode;
            let viewBoxRect = svgContainer.viewBox.baseVal;
            svgGraphBox.setAttribute('x', graphXLeftMargin);
            svgGraphBox.setAttribute('width', viewBoxRect.width-(graphXLeftMargin+graphXRightMargin));
            svgGraphBox.setAttribute('y', graphYTopMargin);
            svgGraphBox.setAttribute('height', viewBoxRect.height-(graphYTopMargin+graphYBottomMargin));
        }

        // clear previous elevation points
        var svgElevationLine = document.getElementById("elevationLine");
        svgElevationLine.points.clear();

        this.#setupYAxis(graphYTopMargin);
        this.#setupXAxis(graphXLeftMargin, graphYTopMargin, graphYBottomMargin);
    }

    #niceStringForRange(value) {
        // show 1 dp
        var str = value.toFixed(1);

        // however, if that means it ends in zero trim so it appears as integer
        let suffix = ".0";
        if (str.endsWith(suffix)) {
            str = str.slice(0, -suffix.length);
        }
        return str;
    }

    #estimateSteps(howManySteps, initialIncrement, range) {
        if (Array.isArray(initialIncrement)) {
            var steps = 100;
            for (let i in initialIncrement) {
                steps = range / initialIncrement[i];
                if (steps < howManySteps) {
                    return initialIncrement[i];
                }
            }
            return initialIncrement[initialIncrement.length-1];
        }

        var steps = 100;
        var stepIncrement = initialIncrement * 0.5;
        do {
            stepIncrement *= 2;
            steps = range / stepIncrement;
        } while (steps > howManySteps);
        return stepIncrement;
    }

    #setupYAxis(graphYTopMargin) {
        var svgGraphBox = document.getElementById('graphSvg');
        var xLabelOffset = Number(svgGraphBox.getAttribute('x'));
        var yLabelOffset = Number(svgGraphBox.getAttribute('y'));

        let svgOuter = document.getElementById('outerSvg');
        var viewBoxRect = svgOuter.viewBox.baseVal;
        var width = Number(svgGraphBox.getAttribute('width'));
        var height = Number(svgGraphBox.getAttribute('height'));

        var yRange = this.#elevationMax - this.#elevationMin;
        // reckon we'd like about 5 or 6 labels for elevation
        var yStepIncrement = this.#estimateSteps(6, 12.5, yRange);
        var firstYStep = Math.floor((this.#elevationMin + yStepIncrement) / yStepIncrement) * yStepIncrement;
        var ySteps = Math.floor(yRange / yStepIncrement);

        // setup y-axis labels
        var svgYAxis = document.getElementById("y-axis");
        svgYAxis.replaceChildren();

        // top of range
        var maxRangeText = document.createElementNS(svgNamespace, 'text');
        maxRangeText.setAttribute('x', xLabelOffset);
        maxRangeText.setAttribute('y', graphYTopMargin);
        maxRangeText.setAttribute('text-anchor', 'end');
        maxRangeText.setAttribute('dominant-baseline', 'middle');
        maxRangeText.setAttribute('fill', '#000');
        maxRangeText.textContent = this.#elevationMax.toFixed(0);
        svgYAxis.appendChild(maxRangeText);

        // bottom of range
        var minRangeText = document.createElementNS(svgNamespace, 'text');
        minRangeText.setAttribute('x', xLabelOffset);
        minRangeText.setAttribute('y', graphYTopMargin+height);
        minRangeText.setAttribute('text-anchor', 'end');
        minRangeText.setAttribute('dominant-baseline', 'middle');
        minRangeText.setAttribute('fill', '#000');
        minRangeText.textContent = this.#elevationMin.toFixed(0);
        svgYAxis.appendChild(minRangeText);

        // range
        for (let y = 0; y < ySteps; ++y) {
            var thisY = firstYStep + (y * yStepIncrement);
            var yGraphed = (thisY-this.#elevationMin) / yRange;

            var midRangeText = document.createElementNS(svgNamespace, 'text');
            midRangeText.setAttribute('x', xLabelOffset);
            midRangeText.setAttribute('y', graphYTopMargin + ((1.0 - yGraphed) * height));
            midRangeText.setAttribute('text-anchor', 'end');
            midRangeText.setAttribute('dominant-baseline', 'middle');
            midRangeText.setAttribute('fill', '#000');
            midRangeText.textContent = thisY.toFixed(0);
            svgYAxis.appendChild(midRangeText);
        }

        // label
        var labelText = document.createElementNS(svgNamespace, 'text');
        labelText.setAttribute('class', 'label-title');
        labelText.setAttribute('fill', '#000');
        labelText.setAttribute('transform', 'rotate(-90 20,' + (height*0.5) + ')');
        labelText.setAttribute('x', 20);
        labelText.setAttribute('y', height*0.5);
        labelText.textContent = 'Elevation';
        svgYAxis.appendChild(labelText); 
    }

    #setupXAxis(graphXLeftMargin, graphYTopMargin, graphYBottomMargin) {
        var svgGraphBox = document.getElementById('graphSvg');
        var xLabelOffset = Number(svgGraphBox.getAttribute('x'));
        var yLabelOffset = Number(svgGraphBox.getAttribute('y'));

        let svgOuter = document.getElementById('outerSvg');
        var viewBoxRect = svgOuter.viewBox.baseVal;
        var width = Number(svgGraphBox.getAttribute('width'));
        var height = Number(svgGraphBox.getAttribute('height'));

        // setup x-axis labels
        var svgXAxis = document.getElementById("x-axis");
        svgXAxis.replaceChildren();

        // end of range
        var minRangeText = document.createElementNS(svgNamespace, 'text');
        minRangeText.setAttribute('x', graphXLeftMargin+width);
        minRangeText.setAttribute('y', graphYTopMargin+height+2);
        minRangeText.setAttribute('text-anchor', 'end');
        minRangeText.setAttribute('dominant-baseline', 'hanging');
        minRangeText.setAttribute('fill', '#000');
        minRangeText.textContent = this.#niceStringForRange(this.#distance);
        svgXAxis.appendChild(minRangeText);

        var xRange = this.#distance;
        // reckon we'd like about 5 or 6 labels for distance
        var xStepIncrement = this.#estimateSteps(6, [1, 2, 2.5, 5, 10], xRange);
        var firstXStep = xStepIncrement;
        var xSteps = Math.floor(xRange / xStepIncrement);
        if (((xSteps*xStepIncrement)+(0.5*xStepIncrement)) > Math.round(this.#distance)) {
            --xSteps;
        }

        // range
        for (let x = 0; x < xSteps; ++x) {
            var thisX = firstXStep + (x * xStepIncrement);
            var xGraphed = thisX / xRange;

            var midRangeText = document.createElementNS(svgNamespace, 'text');
            midRangeText.setAttribute('x', graphXLeftMargin+(width*xGraphed));
            midRangeText.setAttribute('y', graphYTopMargin+height+2);
            midRangeText.setAttribute('text-anchor', 'middle');
            midRangeText.setAttribute('dominant-baseline', 'hanging');
            midRangeText.setAttribute('fill', '#000');
            midRangeText.textContent = thisX;
            svgXAxis.appendChild(midRangeText);
        }

        // label
        var labelText = document.createElementNS(svgNamespace, 'text');
        labelText.setAttribute('class', 'label-title');
        labelText.setAttribute('fill', '#000');
        labelText.setAttribute('text-anchor', 'middle');
        labelText.setAttribute('x', graphXLeftMargin+(width*0.5));
        labelText.setAttribute('y', graphYTopMargin+height+graphYBottomMargin*0.5);
        labelText.textContent = 'Distance';
        svgXAxis.appendChild(labelText); 
    }

    Hide() {
        let svgOuter = document.getElementById('outerSvg');
        svgOuter.classList.add('nodisplay');

        // clear previous elevation points
        var svgElevationLine = document.getElementById("elevationLine");
        svgElevationLine.points.clear();
    }
};

let routeSourceName = 'route';
let routeLayerName = 'raceLayer';
let placesSourceName = 'places';
let placesLayerName = 'placeLayer';

let RouteSim = undefined;
let gSvgGraph = undefined;
let currentRaceName = '';

async function ShowRace(map, raceData) {
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


    var elevationMin = gpxProcessor.getBounds()[0][2];
    var elevationMax = gpxProcessor.getBounds()[1][2];
    gSvgGraph = new SvgGraph(elevationMin, elevationMax, gpxProcessor.getDistance());

    await waitForReflow();

    // zoom map to new race extents
    map.fitBounds(
        gpxProcessor.getBounds(), 
        {
            padding: 64
        }
    );

    RouteSim = new RouteSimulation(10.0, gpxProcessor.getMaxSeconds());
    map.once('idle', (e) => {
        RouteSim.begin((simulatedTime) => {
            // raceResultsProcessor.simulateTo(simulatedTime);

            gpxProcessor.simulateTo(simulatedTime);

            var lastSimCoords = gpxProcessor.getLastSimulationCoordinates();
            var lastSimTimesNormalised = gpxProcessor.getLastSimulatedTimesNormalised();
            var lastDistances = gpxProcessor.getLastSimulatedDistances();

            var bounds = gpxProcessor.getBounds();
            const minElevation = bounds[0][2];
            const maxElevation = bounds[1][2];

            map.getSource('route').setData(gpxProcessor.getGeoJson());
            //map.getSource('myCustomRoute').setData(raceResultsProcessor.getGeoJson());
            //map.panTo(raceResultsProcessor.getLeaderCoordinate(), {"duration": frameRealTimeMilliseconds});

            /*
            */
            var svgElevationLine = document.getElementById("elevationLine");
            let svgContainer = svgElevationLine.parentNode;
            let viewBoxRect = svgContainer.viewBox.baseVal;
            let width = viewBoxRect.width;
            let height = viewBoxRect.height;

            for (let index in lastSimCoords) {
                var elevation = lastSimCoords[index][2];
                var timeNormalised = lastSimTimesNormalised[index];
                var distanceNormalised = lastDistances[index] / gpxProcessor.getDistance();
                var elevationNormalised = (elevation - minElevation) / (maxElevation - minElevation);

                var newPoint = svgElevationLine.ownerSVGElement.createSVGPoint();
                newPoint.x = width * distanceNormalised;//width * timeNormalised;
                newPoint.y = height * (1.0 - elevationNormalised);     // svg coords are y-down, so flip
                svgElevationLine.points.appendItem(newPoint);
            }
            /////

            //return !raceResultsProcessor.isSimulationFinished();
            return !gpxProcessor.isSimulationFinished();
        });
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForReflow() {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

async function ResetSimulation() {
    if (RouteSim != undefined) {
        RouteSim.end();
        RouteSim = undefined;
    }
}

async function ResetMap(map) {
    ResetSimulation();

    // Hide elevation
    if (gSvgGraph != undefined) {
        gSvgGraph.Hide();
        gSvgGraph = undefined;
    }

    await waitForReflow();

    map.fitBounds( map.raceBounds );
}

async function FocusOnRace(map, raceName) {
    if (raceName == undefined) {
        ResetMap(map);
    } else {
        ResetSimulation();

        let placesSource = map.getSource(placesSourceName);
        let placesData = await placesSource.getData();
        let placeInfo = placesData.features.find(element => {
            return element.properties.filename == raceName
        });

        let filename = raceName;
        let dir = "2024/"
        fetch(dir + filename + '.geojson')
            .then(response => response.json())
            .then((data) => {
                currentRaceName = filename;
                ShowRace(map, data);
            });
    }
}

async function CreateSymbols(map, raceSummaries) {
    map.addSource(placesSourceName, {
        'type': 'geojson',
        'data': raceSummaries
    });

    let layoutProperties = {
        'text-field': ['get', 'title'],
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': 0.5,
        'text-justify': 'auto',
        'text-font': ['Noto Sans Regular'],
        'text-anchor': 'bottom',
        //'text-overlap': 'always',
        'text-optional': true,
        'icon-image': [
            'match',
            ['get', 'eventKind'],
            'race',
            'map-pin',
            'scoreEvent',
            'map-map',
            ''  // fallback
        ],
        'icon-size': 1.0,
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
        'icon-overlap': 'always'
        /*,
        'cluster': true,
        'clusterMaxZoom': 14, // Max zoom to cluster points on
        'clusterRadius': 50*/
        };

    let paintProperties = {
        'text-halo-color': '#fff',
        'text-halo-width': 1,
    };

    map.addLayer({
        'id': placesLayerName,
        'type': 'symbol',
        'source': placesSourceName,
        'layout': layoutProperties,
        'paint': paintProperties
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
                    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
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
        const pinImage = await map.loadImage('./icons/MapPin.png');
        map.addImage('map-pin', pinImage.data)

        const mapImage = await map.loadImage('./icons/MapPinMap.png');
        map.addImage('map-map', mapImage.data)

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