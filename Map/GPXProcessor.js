class GPXProcessor {
    #gpxTrace
    #gpxFeature
    #geoJsonRuntimeFeature
    #timeOffsets
    #maxTimeOffset
    #simulationIndex
    #bounds

    constructor(gpxTrace) {
        this.#gpxTrace = gpxTrace;
        this.#timeOffsets = [];
        this.#gpxFeature = gpxTrace.features[0];
        this.#simulationIndex = 0;

        this.#generateOffsets();
        this.#createGeoJsonRuntime();
    }

    #generateOffsets() {
        let gpxProperties = this.#gpxFeature.properties;

        this.#maxTimeOffset = -Number.MAX_VALUE;
        this.#timeOffsets = [];
        const Times = gpxProperties.coordinateProperties.times;
        const InitialTime = new Date(gpxProperties.time)
        for (let i in Times) {
            let ThisDate = new Date(Times[i])
            let millisecondsDiff = ThisDate.getTime() - InitialTime.getTime();
            let secondsDiff = millisecondsDiff / 1000.0

            this.#timeOffsets.push(secondsDiff);
            this.#maxTimeOffset = secondsDiff
        }

        let coordList = this.#gpxFeature.geometry.coordinates;
        let minBound = [coordList[0][0], coordList[0][1]];
        let maxBound = [coordList[0][0], coordList[0][1]];
        for (let i in coordList) {
            var coord = coordList[i];
            minBound[0] = Math.min(minBound[0], coord[0]);
            maxBound[0] = Math.max(maxBound[0], coord[0]);
            minBound[1] = Math.min(minBound[1], coord[1]);
            maxBound[1] = Math.max(maxBound[1], coord[1]);
        }

        this.#bounds = [minBound, maxBound];
    }

    getMaxSeconds() {
        return this.#maxTimeOffset;
    }

    getFirstCoordinate() {
        return this.#gpxFeature.geometry.coordinates[0]
    }
    getLastCoordinate() {
        return this.#gpxFeature.geometry.coordinates[this.#gpxFeature.geometry.coordinates.length-1]
    }

    getBounds() {
        return this.#bounds;
    }

    getLastSimulationCoordinate() {
        var coordinates = this.#geoJsonRuntimeFeature.geometry.coordinates;
        return coordinates[coordinates.length-1];
    }

    getOffsets() {
        return this.#timeOffsets;
    }

    getGeoJson() {
        return this.#geoJsonRuntimeFeature;
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
        var originalCoords = this.#gpxFeature.geometry.coordinates;
        while ((this.#simulationIndex < originalCoords.length) && (this.#timeOffsets[this.#simulationIndex] < simulatedTime)) {
            this.#geoJsonRuntimeFeature.geometry.coordinates.push(
                    originalCoords[this.#simulationIndex]
                );
            this.#simulationIndex++;
        }
    }

    isSimulationFinished() {
        return this.#simulationIndex >= this.#gpxFeature.geometry.coordinates.length;
    }

    getCoordForNormalisedTime(normalisedTime) {
        var simulationTime = normalisedTime * this.getMaxSeconds()
        let i = 0;
        while (simulationTime < this.getMaxSeconds()) {
            if (simulationTime < this.#timeOffsets[i]) {
                return this.#gpxFeature.geometry.coordinates[i];
            }
            ++i
        }

        return this.getLastCoordinate();
    }
};