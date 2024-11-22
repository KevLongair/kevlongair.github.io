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