// mini-chart.js
class MiniChartManager {
    constructor() {
        this.miniChartContainer = null;
        this.miniSvg = null;

        this.miniWidth = 0;
        this.miniHeight = 0;
        this.miniMargin = { top: 10, right: 10, bottom: 20, left: 30 };
        this.miniInnerWidth = 0;
        this.miniInnerHeight = 0;

        this.miniXScale = d3.scaleLinear();
        this.miniYScale = d3.scaleLinear();

        this.miniData = []; // Stores objects { accumulatedValue, category }
        this.miniAccumulatedValue = 0;
        this.miniSupports = [];
        this.miniResistances = [];

        this.miniEmaFastPeriod = 3;
        this.miniEmaSlowPeriod = 5;
        this.miniEmaFast = [];
        this.miniEmaSlow = [];

        this.miniMaxDataPoints = 30;
        this.currentMiniZoomLevel = 0;

        this.miniFibonacciState = 'inactive'; // 'inactive', 'selecting', 'active'
        this.miniFibonacciPoints = []; // Stores [{x, y}, {x, y}] screen coordinates from selection
        this.miniFibonacciAnchorY = { y1_100_value: null, y2_0_value: null }; // Stores chart data values
        this.miniFibLevels = [
            { level: 0.0, label: '0.0%' },
            { level: 0.236, label: '23.6%' },
            { level: 0.382, label: '38.2%' },
            { level: 0.5, label: '50.0%' },
            { level: 0.618, label: '61.8%' },
            { level: 0.786, label: '78.6%' },
            { level: 1.0, label: '100.0%' }
        ];
        this.miniFibonacciGroup = null; // Will be appended to miniSvg
        this.lastRedZone = null;
        this.lastGreenZone = null;
    }

    // Initializes DOM-dependent elements and calls initial resize/draw
    init() {
        this.miniChartContainer = document.getElementById('mini-chart-container');
        this.miniSvg = d3.select("#mini-chart");
        this.miniFibonacciGroup = this.miniSvg.append('g').attr('class', 'mini-fibonacci-group');
        this.resizeMiniChart(); // Initial resize and draw
    }

    // --- Mini Fibonacci Functions ---
    clearMiniFibonacci() {
        this.miniFibonacciGroup.selectAll("*").remove();
        this.miniFibonacciPoints = [];
        this.miniFibonacciAnchorY = { y1_100_value: null, y2_0_value: null };
        this.miniFibonacciState = 'inactive';
        this.miniSvg.on('click', null); // Unbind the click listener
        this.miniSvg.style('cursor', 'default');
        console.log("Mini Fibonacci: Levels cleared.");
    }

    drawMiniFibonacciLevels(chart_y1_100_value, chart_y2_0_value) {
        this.miniFibonacciGroup.selectAll("*").remove();

        this.miniFibonacciAnchorY = { y1_100_value: chart_y1_100_value, y2_0_value: chart_y2_0_value };

        const y1_100_screen = this.miniYScale(chart_y1_100_value);
        const y2_0_screen = this.miniYScale(chart_y2_0_value);

        const fibLineData = this.miniFibLevels.map(d => {
            const levelY_screen = y2_0_screen + (y1_100_screen - y2_0_screen) * d.level;
            return {
                ...d,
                y: levelY_screen,
                isAnchor: d.level === 0.0 || d.level === 1.0
            };
        });

        const level50 = fibLineData.find(d => d.level === 0.5);
        const level618 = fibLineData.find(d => d.level === 0.618);

        if (level50 && level618) {
            const bandTopY = Math.min(level50.y, level618.y);
            const bandHeight = Math.abs(level50.y - level618.y);

            this.miniFibonacciGroup.append("rect")
                .attr("class", "mini-golden-zone-band")
                .attr("x", this.miniMargin.left)
                .attr("y", bandTopY)
                .attr("width", this.miniWidth - this.miniMargin.left - this.miniMargin.right)
                .attr("height", bandHeight);
        }

        this.miniFibonacciGroup.selectAll(".mini-fibonacci-anchor-line")
            .data(fibLineData.filter(d => d.isAnchor))
            .enter().append("line")
            .attr("class", "mini-fibonacci-anchor-line")
            .attr("x1", this.miniMargin.left)
            .attr("x2", this.miniWidth - this.miniMargin.right)
            .attr("y1", d => d.y)
            .attr("y2", d => d.y)
            .call(d3.drag()
                .on("start", (event, d) => this.miniDragstarted(event, d))
                .on("drag", (event, d) => this.miniDragged(event, d))
                .on("end", (event, d) => this.miniDragended(event, d)));
    }

    miniDragstarted(event, d) {
        d3.select(event.subject).attr("stroke", "cyan").attr("stroke-width", 2);
    }

    miniDragged(event, d) {
        const newY_screen = Math.max(this.miniMargin.top, Math.min(this.miniHeight - this.miniMargin.bottom, event.y));
        const newY_value = this.miniYScale.invert(newY_screen);

        if (d.level === 1.0) {
            this.miniFibonacciAnchorY.y1_100_value = newY_value;
        } else if (d.level === 0.0) {
            this.miniFibonacciAnchorY.y2_0_value = newY_value;
        }

        const currentY100_value = this.miniFibonacciAnchorY.y1_100_value;
        const currentY0_value = this.miniFibonacciAnchorY.y2_0_value;

        const updatedLineData = this.miniFibLevels.map(f => {
            const levelY_screen = this.miniYScale(currentY0_value) + (this.miniYScale(currentY100_value) - this.miniYScale(currentY0_value)) * f.level;
            return { ...f, y: levelY_screen, isAnchor: f.level === 0.0 || f.level === 1.0 };
        });

        this.miniFibonacciGroup.selectAll(".mini-fibonacci-anchor-line")
            .data(updatedLineData.filter(d => d.isAnchor))
            .attr("y1", f => f.y)
            .attr("y2", f => f.y);

        const updatedLevel50 = updatedLineData.find(d => d.level === 0.5);
        const updatedLevel618 = updatedLineData.find(d => d.level === 0.618);

        if (updatedLevel50 && updatedLevel618) {
            const updatedBandTopY = Math.min(updatedLevel50.y, updatedLevel618.y);
            const updatedBandHeight = Math.abs(updatedLevel50.y - updatedLevel618.y);
            this.miniFibonacciGroup.select(".mini-golden-zone-band")
                .attr("y", updatedBandTopY)
                .attr("height", updatedBandHeight);
        }
    }

    miniDragended(event, d) {
        d3.select(event.subject).attr("stroke", "rgba(255, 215, 0, 0.3)").attr("stroke-width", 1);
    }

    handleMiniFibonacciClick(event) {
        if (this.miniFibonacciState !== 'selecting') return;

        const targetTagName = event.target.tagName;
        if (targetTagName === 'BUTTON') {
            console.log("Button clicked, ignoring mini chart Fibonacci selection.");
            return;
        }

        const miniSvgNode = this.miniSvg.node();
        const miniSvgRect = miniSvgNode.getBoundingClientRect();
        const mouseX = event.clientX - miniSvgRect.left;
        const mouseY = event.clientY - miniSvgRect.top;

        const clickableAreaLeft = this.miniMargin.left;
        const clickableAreaRight = this.miniWidth - this.miniMargin.right;
        const clickableAreaTop = this.miniMargin.top;
        const clickableAreaBottom = this.miniHeight - this.miniMargin.bottom;

        if (mouseX < clickableAreaLeft || mouseX > clickableAreaRight || mouseY < clickableAreaTop || mouseY > clickableAreaBottom) {
            console.log("Click outside mini chart area ignored for Fibonacci selection.");
            return;
        }

        this.miniFibonacciPoints.push({ x: mouseX, y: mouseY });

        if (this.miniFibonacciPoints.length === 1) {
            console.log("Mini Fibonacci: Select the second point (0.0%) on the mini chart.");
            this.miniFibonacciGroup.append("circle")
                .attr("class", "mini-fibonacci-temp-anchor")
                .attr("cx", mouseX)
                .attr("cy", mouseY)
                .attr("r", 3)
                .attr("fill", "#ffd700");

        } else if (this.miniFibonacciPoints.length === 2) {
            this.miniSvg.on('click', null);
            this.miniSvg.style('cursor', 'default');
            this.miniFibonacciState = 'active';

            const y1_100_screen = this.miniFibonacciPoints[0].y;
            const y2_0_screen = this.miniFibonacciPoints[1].y;

            const chart_y1_100_value = this.miniYScale.invert(y1_100_screen);
            const chart_y2_0_value = this.miniYScale.invert(y2_0_screen);

            this.miniFibonacciGroup.selectAll(".mini-fibonacci-temp-anchor").remove();
            this.drawMiniFibonacciLevels(chart_y1_100_value, chart_y2_0_value);
            console.log("Mini Fibonacci: Golden Zone drawn. Drag the faint dashed lines to adjust.");
        }
    }

    toggleMiniFibonacci() {
        if (this.miniFibonacciState === 'inactive') {
            this.clearMiniFibonacci();
            this.miniFibonacciState = 'selecting';
            this.miniFibonacciPoints = [];
            this.miniSvg.style('cursor', 'crosshair');
            this.miniSvg.on('click', (e) => this.handleMiniFibonacciClick(e)); // Bind context
            console.log("Mini Fibonacci: Select the first point (100%) on the mini chart.");
        } else {
            this.clearMiniFibonacci();
            console.log("Mini Fibonacci: Deactivated.");
        }
    }

    get fibonacciState() {
        return this.miniFibonacciState;
    }
    // --- End Mini Fibonacci Functions ---

    // --- Helper Functions for Mini Chart Calculations ---
    calculateMiniEMA(dataArr, period) {
        const ema = [];
        if (dataArr.length === 0) return [];
        let multiplier = 2 / (period + 1);
        if (dataArr.length < period) return new Array(dataArr.length).fill(null);
        let sma = dataArr.slice(0, period).reduce((a, b) => a + b, 0) / period;
        ema.push(sma);
        for (let i = period; i < dataArr.length; i++) {
            ema.push((dataArr[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]);
        }
        const padding = new Array(period - 1).fill(null);
        return padding.concat(ema);
    }

    findMiniSwingPoints(dataArr, lookback = 5) {
        const swingLows = [];
        const swingHighs = [];
        if (dataArr.length === 0) return { swingLows, swingHighs };
        const startIndex = Math.max(0, dataArr.length - lookback);

        for (let i = startIndex; i < dataArr.length; i++) {
            let isLow = true;
            for (let j = Math.max(startIndex, i - lookback); j <= Math.min(dataArr.length - 1, i + lookback); j++) {
                if (j !== i && dataArr[i] > dataArr[j]) {
                    isLow = false;
                    break;
                }
            }

            let isHigh = true;
            for (let j = Math.max(startIndex, i - lookback); j <= Math.min(dataArr.length - 1, i + lookback); j++) {
                if (j !== i && dataArr[i] < dataArr[j]) {
                    isHigh = false;
                    break;
                }
            }

            const tolerance = 0.01;
            const isDistinctLow = (i === 0 || dataArr[i] < dataArr[i - 1] - tolerance) && (i === dataArr.length - 1 || dataArr[i] < dataArr[i + 1] - tolerance);
            const isDistinctHigh = (i === 0 || dataArr[i] > dataArr[i - 1] + tolerance) && (i === dataArr.length - 1 || dataArr[i] > dataArr[i + 1] + tolerance);

            if (isLow && isDistinctLow) swingLows.push({ index: i, value: dataArr[i] });
            if (isHigh && isDistinctHigh) swingHighs.push({ index: i, value: dataArr[i] });
        }
        return { swingLows, swingHighs };
    }

    calculateMiniSupportResistance(dataArr) {
        const lookbackPeriod = Math.min(dataArr.length, 10);

        if (dataArr.length < 3) return { supports: [], resistances: [] };

        const valuesOnly = dataArr.map(d => d.accumulatedValue);
        const { swingLows, swingHighs } = this.findMiniSwingPoints(valuesOnly, lookbackPeriod);

        swingLows.sort((a, b) => b.index - a.index);
        swingHighs.sort((a, b) => b.index - a.index);

        const uniqueSupports = [];
        const uniqueResistances = [];
        const tolerance = 0.02;

        if (swingLows.length > 0) {
            uniqueSupports.push(swingLows[0]);
            for (let i = 1; i < swingLows.length; i++) {
                if (Math.abs(swingLows[i].value - uniqueSupports[0].value) >= tolerance) {
                    uniqueSupports.push(swingLows[i]);
                    break;
                }
            }
        }

        if (swingHighs.length > 0) {
            uniqueResistances.push(swingHighs[0]);
            for (let i = 1; i < swingHighs.length; i++) {
                if (Math.abs(swingHighs[i].value - uniqueResistances[0].value) >= tolerance) {
                    uniqueResistances.push(swingHighs[i]);
                    break;
                }
            }
        }
        return { supports: uniqueSupports.slice(0, 1), resistances: uniqueResistances.slice(0, 1) };
    }

    getMiniChartTrend() {
        if (this.miniData.length < this.miniEmaSlowPeriod) return 'neutral';
        const lastEmaFast = this.miniEmaFast[this.miniEmaFast.length - 1];
        const lastEmaSlow = this.miniEmaSlow[this.miniEmaSlow.length - 1];
        if (lastEmaFast === null || lastEmaSlow === null) return 'neutral';
        const trendTolerance = 0.005;
        if (lastEmaFast > lastEmaSlow + trendTolerance) return 'alcista';
        else if (lastEmaFast < lastEmaSlow - trendTolerance) return 'bajista';
        else return 'lateral';
    }

    getMiniChartMomentum(lookback = 3) {
        if (this.miniData.length < lookback) return 0;
        const recentData = this.miniData.slice(-lookback).map(d => d.accumulatedValue);
        return recentData[recentData.length - 1] - recentData[0];
    }

    getMiniChartAverageRange(lookback = 10) {
        if (this.miniData.length < 2) return 0.01;
        const recentData = this.miniData.slice(-Math.min(this.miniData.length, lookback)).map(d => d.accumulatedValue);
        const maxVal = d3.max(recentData);
        const minVal = d3.min(recentData);
        return Math.max(0.01, (maxVal - minVal) / (recentData.length || 1));
    }

    getMiniChartVisibleData() {
        let numVisible;
        let startIndex;

        if (this.currentMiniZoomLevel >= 0) {
            numVisible = this.miniMaxDataPoints - this.currentMiniZoomLevel * 2;
            numVisible = Math.max(5, numVisible);
            startIndex = Math.max(0, this.miniData.length - numVisible);
        } else {
            numVisible = this.miniMaxDataPoints + Math.abs(this.currentMiniZoomLevel) * 5;
            numVisible = Math.min(this.miniData.length, numVisible);
            startIndex = Math.max(0, this.miniData.length - numVisible);
            if (numVisible === this.miniData.length) startIndex = 0;
        }

        return {
            data: this.miniData.slice(startIndex),
            startIndex: startIndex
        };
    }

    getMiniPointColor(category) {
        switch (category) {
            case "-5": case "-4": case "-3": return "red";
            case "-2": case "-1": return "white";
            case "1": case "2": return "#00ff00";
            case "3": case "4": return "gold";
            case "5": return "deeppink";
            default: return "gray";
        }
    }
    // --- End Helper Functions ---

    // --- Core Mini Chart Logic ---
    updateMiniChart() {
        if (!this.miniSvg) return; // Ensure SVG is initialized

        this.miniSvg.selectAll("*:not(.mini-fibonacci-group)").remove();

        const { data: visibleMiniData, startIndex: miniStartIndex } = this.getMiniChartVisibleData();
        const visibleMiniValues = visibleMiniData.map(d => d.accumulatedValue);

        this.miniSupports = this.calculateMiniSupportResistance(this.miniData);
        this.miniResistances = this.miniSupports.resistances;
        this.miniSupports = this.miniSupports.supports;

        this.miniEmaFast = this.calculateMiniEMA(this.miniData.map(d => d.accumulatedValue), this.miniEmaFastPeriod);
        this.miniEmaSlow = this.calculateMiniEMA(this.miniData.map(d => d.accumulatedValue), this.miniEmaSlowPeriod);

        const allValues = [...visibleMiniValues, ...this.miniSupports.map(d => d.value), ...this.miniResistances.map(d => d.value)];

        const visibleEmaFastValues = this.miniEmaFast.slice(miniStartIndex).map((value, index) => ({ index: miniStartIndex + index, value: value })).filter(d => d.value !== null);
        const visibleEmaSlowValues = this.miniEmaSlow.slice(miniStartIndex).map((value, index) => ({ index: miniStartIndex + index, value: value })).filter(d => d.value !== null);

        const fibChartValues = [];
        if (this.miniFibonacciState === 'active' && this.miniFibonacciAnchorY.y1_100_value !== null && this.miniFibonacciAnchorY.y2_0_value !== null) {
            fibChartValues.push(this.miniFibonacciAnchorY.y1_100_value);
            fibChartValues.push(this.miniFibonacciAnchorY.y2_0_value);
        }

        this.miniXScale.domain([miniStartIndex, miniStartIndex + visibleMiniData.length - 1]);
        this.miniYScale.domain(d3.extent([0, ...allValues, ...visibleEmaFastValues.map(d => d.value), ...visibleEmaSlowValues.map(d => d.value), ...fibChartValues]));

        if (!visibleMiniData || visibleMiniData.length === 0) {
            if (this.miniFibonacciState === 'active' && this.miniFibonacciAnchorY.y1_100_value !== null && this.miniFibonacciAnchorY.y2_0_value !== null) {
                this.drawMiniFibonacciLevels(this.miniFibonacciAnchorY.y1_100_value, this.miniFibonacciAnchorY.y2_0_value);
            }
            return;
        }

        // Draw persistent mini zones as two dashed lines (top and bottom). Only one zone should be visible (the last one set).
        // Remove any previous zone lines to ensure only the last zone is shown.
        this.miniFibonacciGroup.selectAll(".mini-last-zone-line").remove();

        if (this.lastRedZone) {
            const mid = this.lastRedZone.midpoint != null ? this.lastRedZone.midpoint : (this.lastRedZone.high + this.lastRedZone.low) / 2;
            const cy = this.miniYScale(mid);
            const halfH = (this.lastRedZone.pixelHeight != null)
                ? (this.lastRedZone.pixelHeight / 2)
                : Math.max(1, Math.abs(this.miniYScale(this.lastRedZone.high) - this.miniYScale(this.lastRedZone.low)) / 2);
            const yTop = cy - halfH;
            const yBottom = cy + halfH;

            // Top dashed line
            this.miniFibonacciGroup.append('line')
                .attr('class', 'mini-last-zone-line mini-last-red-top')
                .attr('x1', this.miniMargin.left)
                .attr('x2', this.miniWidth - this.miniMargin.right)
                .attr('y1', yTop)
                .attr('y2', yTop)
                .attr('stroke', 'rgba(139,0,0,0.9)')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '6,4')
                .attr('pointer-events', 'none');

            // Bottom dashed line
            this.miniFibonacciGroup.append('line')
                .attr('class', 'mini-last-zone-line mini-last-red-bottom')
                .attr('x1', this.miniMargin.left)
                .attr('x2', this.miniWidth - this.miniMargin.right)
                .attr('y1', yBottom)
                .attr('y2', yBottom)
                .attr('stroke', 'rgba(139,0,0,0.9)')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '6,4')
                .attr('pointer-events', 'none');

            // Translucent red rectangle
            const bandTop = Math.min(yTop, yBottom);
            const bandH = Math.max(1, Math.abs(yBottom - yTop));
            this.miniFibonacciGroup.append('rect')
                .attr('class', 'mini-last-zone-rect mini-last-red-band')
                .attr('x', this.miniMargin.left)
                .attr('y', bandTop)
                .attr('width', this.miniWidth - this.miniMargin.left - this.miniMargin.right)
                .attr('height', bandH)
                .attr('fill', 'rgba(139,0,0,0.14)')
                .attr('pointer-events', 'none');
        } else if (this.lastGreenZone) {
            const midG = this.lastGreenZone.midpoint != null ? this.lastGreenZone.midpoint : (this.lastGreenZone.high + this.lastGreenZone.low) / 2;
            const cyG = this.miniYScale(midG);
            const halfHG = (this.lastGreenZone.pixelHeight != null)
                ? (this.lastGreenZone.pixelHeight / 2)
                : Math.max(1, Math.abs(this.miniYScale(this.lastGreenZone.high) - this.miniYScale(this.lastGreenZone.low)) / 2);
            const yTopG = cyG - halfHG;
            const yBottomG = cyG + halfHG;

            // Top dashed line (green)
            this.miniFibonacciGroup.append('line')
                .attr('class', 'mini-last-zone-line mini-last-green-top')
                .attr('x1', this.miniMargin.left)
                .attr('x2', this.miniWidth - this.miniMargin.right)
                .attr('y1', yTopG)
                .attr('y2', yTopG)
                .attr('stroke', 'rgba(0,128,0,0.9)')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '6,4')
                .attr('pointer-events', 'none');

            // Bottom dashed line (green)
            this.miniFibonacciGroup.append('line')
                .attr('class', 'mini-last-zone-line mini-last-green-bottom')
                .attr('x1', this.miniMargin.left)
                .attr('x2', this.miniWidth - this.miniMargin.right)
                .attr('y1', yBottomG)
                .attr('y2', yBottomG)
                .attr('stroke', 'rgba(0,128,0,0.9)')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '6,4')
                .attr('pointer-events', 'none');

            // Translucent green rectangle
            const bandTopG = Math.min(yTopG, yBottomG);
            const bandHG = Math.max(1, Math.abs(yBottomG - yTopG));
            this.miniFibonacciGroup.append('rect')
                .attr('class', 'mini-last-zone-rect mini-last-green-band')
                .attr('x', this.miniMargin.left)
                .attr('y', bandTopG)
                .attr('width', this.miniWidth - this.miniMargin.left - this.miniMargin.right)
                .attr('height', bandHG)
                .attr('fill', 'rgba(0,128,0,0.12)')
                .attr('pointer-events', 'none');
        }

        this.miniSvg.append("path")
            .datum(visibleMiniData)
            .attr("fill", "none")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .attr("opacity", 0.7)
            .attr("d", d3.line()
                .x((d, i) => this.miniXScale(miniStartIndex + i))
                .y(d => this.miniYScale(d.accumulatedValue))
                .curve(d3.curveLinear));

        if (visibleMiniData.length > 0) {
            const lastValue = visibleMiniData[visibleMiniData.length - 1].accumulatedValue;
            this.miniSvg.append("line")
                .attr("x1", this.miniMargin.left)
                .attr("x2", this.miniWidth - this.miniMargin.right)
                .attr("y1", this.miniYScale(lastValue))
                .attr("y2", this.miniYScale(lastValue))
                .attr("stroke", "white")
                .attr("stroke-width", 1)
                .attr("opacity", 0.5)
                .attr("stroke-dasharray", "3,3");
        }

        this.miniSvg.selectAll("circle.mini-point")
            .data(visibleMiniData)
            .enter().append("circle")
            .attr("class", "mini-point")
            .attr("cx", (d, i) => this.miniXScale(miniStartIndex + i))
            .attr("cy", d => this.miniYScale(d.accumulatedValue))
            .attr("r", 3.5)
            .attr("fill", d => this.getMiniPointColor(d.category))
            .style("filter", d => `drop-shadow(0 0 5px ${this.getMiniPointColor(d.category)})`);

        const miniSupportLine = this.miniSvg.selectAll(".mini-support-line")
            .data(this.miniSupports)
            .enter().append("line")
            .attr("class", "mini-support-line")
            .attr("x1", this.miniMargin.left)
            .attr("y1", d => this.miniYScale(d.value))
            .attr("x2", this.miniWidth - this.miniMargin.right)
            .attr("y2", d => this.miniYScale(d.value));

        const miniResistanceLine = this.miniSvg.selectAll(".mini-resistance-line")
            .data(this.miniResistances)
            .enter().append("line")
            .attr("class", "mini-resistance-line")
            .attr("x1", this.miniMargin.left)
            .attr("y1", d => this.miniYScale(d.value))
            .attr("x2", this.miniWidth - this.miniMargin.right)
            .attr("y2", d => this.miniYScale(d.value));

        if (visibleMiniData.length > 0) {
            const currentMiniValue = visibleMiniData[visibleMiniData.length - 1].accumulatedValue;
            const highlightTolerance = 0.05;

            if (this.miniSupports.length > 0) {
                const supportValue = this.miniSupports[0].value;
                if (Math.abs(currentMiniValue - supportValue) < highlightTolerance) {
                    miniSupportLine.attr("class", "mini-support-line mini-neon-green-sr");
                } else {
                    miniSupportLine.attr("class", "mini-support-line");
                }
            }

            if (this.miniResistances.length > 0) {
                const resistanceValue = this.miniResistances[0].value;
                if (Math.abs(currentMiniValue - resistanceValue) < highlightTolerance) {
                    miniResistanceLine.attr("class", "mini-resistance-line mini-neon-red-sr");
                } else {
                    miniResistanceLine.attr("class", "mini-resistance-line");
                }
            }
        }

        const miniLineGenerator = d3.line()
            .x(d => this.miniXScale(d.index))
            .y(d => this.miniYScale(d.value))
            .defined(d => d.value !== null)
            .curve(d3.curveMonotoneX);

        if (visibleEmaFastValues.length > 0) {
            this.miniSvg.append("path")
                .datum(visibleEmaFastValues)
                .attr("fill", "none")
                .attr("stroke", "#0ff")
                .attr("stroke-width", 1)
                .attr("opacity", 0.4)
                .attr("d", miniLineGenerator);
        }

        if (visibleEmaSlowValues.length > 0) {
            this.miniSvg.append("path")
                .datum(visibleEmaSlowValues)
                .attr("fill", "none")
                .attr("stroke", "#ffd700")
                .attr("stroke-width", 1)
                .attr("opacity", 0.4)
                .attr("d", miniLineGenerator);
        }

        if (this.miniFibonacciState === 'active' && this.miniFibonacciAnchorY.y1_100_value !== null && this.miniFibonacciAnchorY.y2_0_value !== null) {
            this.drawMiniFibonacciLevels(this.miniFibonacciAnchorY.y1_100_value, this.miniFibonacciAnchorY.y2_0_value);
        }
    }
    // --- End Core Mini Chart Logic ---

    // --- Public API for Interaction ---
    addMiniChartData(pointData) {
        this.miniAccumulatedValue += pointData.value;
        this.miniData.push({ accumulatedValue: this.miniAccumulatedValue, category: pointData.category });
        this.miniEmaFast = this.calculateMiniEMA(this.miniData.map(d => d.accumulatedValue), this.miniEmaFastPeriod);
        this.miniEmaSlow = this.calculateMiniEMA(this.miniData.map(d => d.accumulatedValue), this.miniEmaSlowPeriod);
        this.updateMiniChart();
    }

    removeMiniChartData() {
        if (this.miniData.length > 0) {
            this.miniData.pop();
            this.miniAccumulatedValue = this.miniData.length > 0 ? this.miniData[this.miniData.length - 1].accumulatedValue : 0;
            this.miniEmaFast = this.calculateMiniEMA(this.miniData.map(d => d.accumulatedValue), this.miniEmaFastPeriod);
            this.miniEmaSlow = this.calculateMiniEMA(this.miniData.map(d => d.accumulatedValue), this.miniEmaSlowPeriod);
            this.updateMiniChart();
        }
    }

    resetMiniChart() {
        this.miniData = [];
        this.miniAccumulatedValue = 0;
        this.miniSupports = [];
        this.miniResistances = [];
        this.miniEmaFast = [];
        this.miniEmaSlow = [];
        this.currentMiniZoomLevel = 0;
        this.clearMiniFibonacci();
        this.updateMiniChart();
    }

    setMiniChartZoom(zoomLevel) {
        this.currentMiniZoomLevel = zoomLevel;
        this.updateMiniChart();
    }

    resizeMiniChart() {
        if (!this.miniChartContainer) return; // Ensure container is available

        this.miniWidth = this.miniChartContainer.offsetWidth;
        this.miniHeight = this.miniChartContainer.offsetHeight;
        this.miniInnerWidth = this.miniWidth - this.miniMargin.left - this.miniMargin.right;
        this.miniInnerHeight = this.miniHeight - this.miniMargin.top - this.miniMargin.bottom;

        this.miniXScale.range([this.miniMargin.left, this.miniWidth - this.miniMargin.right]);
        this.miniYScale.range([this.miniHeight - this.miniMargin.bottom, this.miniMargin.top]);

        this.updateMiniChart();
    }

    getMiniChartLastDataPoint() {
        return this.miniData.length > 0 ? this.miniData[this.miniData.length - 1].accumulatedValue : undefined;
    }
    getMiniChartSupports() { return this.miniSupports; }
    getMiniChartResistances() { return this.miniResistances; }
}

// Instantiate the MiniChartManager and expose it globally
window.miniChartManager = new MiniChartManager();

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    window.miniChartManager.init();
});