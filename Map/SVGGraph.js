
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