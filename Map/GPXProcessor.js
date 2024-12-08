class GPXProcessor {
    #gpxTrace = undefined;
    #gpxFeature = undefined;
    #geoJsonRuntimeFeature = undefined;
    #timeOffsets = [];
    #maxTimeOffset = undefined;
    #simulationIndex = 0;
    #bounds = undefined;
    #lastSimulatedCoords = [];
    #lastNormalisedTimes = [];
    #lastSimulatedDistances = []

    constructor(gpxTrace) {
        this.#gpxTrace = gpxTrace;
        this.#gpxFeature = gpxTrace.features[0];

        this.#generateOffsets();
        this.#createGeoJsonRuntime();
    }

    #generateOffsets() {
        let gpxProperties = this.#gpxFeature.properties;

        this.#maxTimeOffset = -Number.MAX_VALUE;

        const Times = gpxProperties.coordinateProperties.times;
        const InitialTime = new Date(gpxProperties.time)
        for (let i in Times) {
            let ThisDate = new Date(Times[i])
            let millisecondsDiff = ThisDate.getTime() - InitialTime.getTime();
            let secondsDiff = millisecondsDiff / 1000.0

            this.#timeOffsets.push(secondsDiff);
            this.#maxTimeOffset = secondsDiff
        }

        let coordList = this.#getOriginalCoords();
        let minBound = [coordList[0][0], coordList[0][1], coordList[0][2]];
        let maxBound = [coordList[0][0], coordList[0][1], coordList[0][2]];
        for (let i in coordList) {
            var coord = coordList[i];
            minBound[0] = Math.min(minBound[0], coord[0]);
            maxBound[0] = Math.max(maxBound[0], coord[0]);
            minBound[1] = Math.min(minBound[1], coord[1]);
            maxBound[1] = Math.max(maxBound[1], coord[1]);
            minBound[2] = Math.min(minBound[2], coord[2]);
            maxBound[2] = Math.max(maxBound[2], coord[2]);
        }

        this.#bounds = [minBound, maxBound];
    }

    #getOriginalCoords() {
        return this.#gpxFeature.geometry.coordinates;
    }

    #getRuntimeCoords() {
        return this.#geoJsonRuntimeFeature.geometry.coordinates;
    }

    #getOriginalCoordProperties() {
        return this.#gpxFeature.properties.coordinateProperties;
    }

    getMaxSeconds() {
        return this.#maxTimeOffset;
    }

    getFirstCoordinate() {
        return this.#getOriginalCoords()[0]
    }
    getLastCoordinate() {
        return this.#getOriginalCoords()[this.#getOriginalCoords()-1]
    }

    getBounds() {
        return this.#bounds;
    }

    getLastSimulationCoordinates() {
        return this.#lastSimulatedCoords;
    }

    getLastSimulatedTimesNormalised() {
        return this.#lastNormalisedTimes;
    }

    getLastSimulatedDistances() {
        return this.#lastSimulatedDistances;
    }

    getLastSimulationTimeNormalised() {
        var runTimeCoords = this.#getRuntimeCoords();
        var originalCoords = this.#getOriginalCoords();

        return Math.min(runTimeCoords.length / originalCoords.length, 1.0);
    }

    getOffsets() {
        return this.#timeOffsets;
    }

    getGeoJson() {
        return this.#geoJsonRuntimeFeature;
    }

    getDistance() {
        const distances = this.#getOriginalCoordProperties().distances;
        return distances[distances.length-1];
    }

    #createGeoJsonRuntime() {
        this.#geoJsonRuntimeFeature = {
            "type": "Feature", 
            "geometry": {
                "type": "LineString",
                "coordinates": [this.getFirstCoordinate()]
            }
        }
    }

    simulateToEnd() {
        this.simulateTo(60.0 * 60.0 * 24.0);
    }

    simulateTo(simulatedTime) {
        var originalCoords = this.#getOriginalCoords();
        var originalCoordProps = this.#getOriginalCoordProperties();
        this.#lastSimulatedCoords = [];
        this.#lastNormalisedTimes = [];
        this.#lastSimulatedDistances = [];
        while ((this.#simulationIndex < originalCoords.length) && (this.#timeOffsets[this.#simulationIndex] < simulatedTime)) {
            this.#getRuntimeCoords().push( originalCoords[this.#simulationIndex] );
            this.#lastSimulatedCoords.push( originalCoords[this.#simulationIndex] );
            this.#lastNormalisedTimes.push( this.#timeOffsets[this.#simulationIndex] / this.getMaxSeconds() );
            this.#lastSimulatedDistances.push( originalCoordProps.distances[this.#simulationIndex] );

            this.#simulationIndex++;
        }
    }

    isSimulationFinished() {
        return this.#simulationIndex >= this.#getOriginalCoords().length;
    }

    getCoordForNormalisedTime(normalisedTime) {
        var simulationTime = normalisedTime * this.getMaxSeconds()
        let i = 0;
        while (simulationTime < this.getMaxSeconds()) {
            if (simulationTime < this.#timeOffsets[i]) {
                return this.#getOriginalCoords()[i];
            }
            ++i
        }

        return this.getLastCoordinate();
    }
};