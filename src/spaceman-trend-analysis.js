export function calculateSupportResistance(results) {
    const values = results.map(r => parseFloat(r.value));
    if (values.length < 30) return { support: null, resistance: null };

    // Adjust window size dynamically based on data length
    const windowSize = Math.max(5, Math.min(15, Math.floor(values.length / 10)));

    const smoothedValues = values.map((value, index) => {
        let sum = 0;
        let count = 0;
        for (let i = Math.max(0, index - 5); i <= Math.min(values.length - 1, index + 5); i++) {
            sum += values[i];
            count++;
        }
        return sum / count;
    });

    let support = null;
    let resistance = null;

    for (let i = windowSize; i < smoothedValues.length - windowSize; i++) {
        let isLocalMin = true;
        let isLocalMax = true;

        for (let j = i - windowSize; j <= i + windowSize; j++) {
            if (j === i) continue;

            if (smoothedValues[i] >= smoothedValues[j]) {
                isLocalMin = false;
            }
            if (smoothedValues[i] <= smoothedValues[j]) {
                isLocalMax = false;
            }
        }

        if (isLocalMin) {
            if (support === null || smoothedValues[i] > support) {
                support = smoothedValues[i];
            }
        }

        if (isLocalMax) {
            if (resistance === null || smoothedValues[i] < resistance) {
                resistance = smoothedValues[i];
            }
        }
    }

    // Filter levels based on a more robust check relative to recent values
    const recentRange = Math.max(...values.slice(-20)) - Math.min(...values.slice(-20));
    if (support !== null && resistance !== null && (resistance - support) < (recentRange * 0.2)) {
        support = null;
        resistance = null;
    }

    return { support, resistance };
}

export function getStrengthAndColor(value) {
    const strengthMap = [
        { range: [1.00, 1.10], strength: -10, color: '#ef5350' },
        { range: [1.10, 1.20], strength: -9, color: '#ef5350' },
        { range: [1.20, 1.30], strength: -8, color: '#ef5350' },
        { range: [1.30, 1.40], strength: -7, color: '#ef5350' },
        { range: [1.40, 1.50], strength: -6, color: '#ef5350' },
        { range: [1.50, 1.60], strength: -5, color: '#ef5350' },
        { range: [1.60, 1.70], strength: -4, color: '#ef5350' },
        { range: [1.70, 1.80], strength: -3, color: '#ef5350' },
        { range: [1.80, 1.90], strength: -2, color: '#ef5350' },
        { range: [1.90, 2.00], strength: -1, color: '#ef5350' },
        { range: [2.00, 3.00], strength: 1, color: '#26a69a' },
        { range: [3.00, 4.00], strength: 2, color: '#26a69a' },
        { range: [4.00, 5.00], strength: 3, color: '#26a69a' },
        { range: [5.00, 6.00], strength: 4, color: '#26a69a' },
        { range: [6.00, 7.00], strength: 5, color: '#26a69a' },
        { range: [7.00, 8.00], strength: 6, color: '#26a69a' },
        { range: [8.00, 9.00], strength: 7, color: '#26a69a' },
        { range: [9.00, 10.00], strength: 8, color: '#26a69a' },
        { range: [10.00, 100], strength: 9, color: '#26a69a' },
    ];

    for (const { range, strength, color } of strengthMap) {
        if (value >= range[0] && value < range[1]) {
            return { strength, color };
        }
    }
    return { strength: 10, color: '#26a69a' };
}

export function analyzeTrend(results, trendChart, config, ema3, ema5) {
    if (!trendChart || !trendChart.data || !trendChart.data.datasets || trendChart.data.datasets[0].data.length < 2) {
        return {
            prediction: "Cargando Datos...",
            confidence: 0,
            risk: 'wait'
        };
    }

    const data = trendChart.data.datasets[0].data;

    // 1. Bullish Engulfing - Look for the red candle *before* the engulfing green candle.
    if (data.length >= 2 && data[data.length - 2].c < data[data.length - 2].o) {
        // Previous candle was red.  Now we prompt for the green engulfing candle.
        return {
            prediction: "🔍 Zona de posible entrada👨‍🎓Confirma con Grafico",
            confidence: 0.5,
            risk: 'low'
        };
    }
    // 2. Confirmation with Higher Close - look for one green candle before, and prompt for second
     else if (data.length >= 1 && data[data.length - 1].c > data[data.length - 1].o) {
        return {
            prediction: "🔍 Zona de posible entrada👨‍🎓Confirma con Grafico",
            confidence: 0.5,
            risk: 'low'
        };
    }

    // 3. Pattern of Long Body and Body Short
    else if (data.length >= 1 && data[data.length - 1].c > data[data.length - 1].o) {
        return {
            prediction: " 🔍 Zona de posible entrada👨‍🎓Confirma con Grafico",
            confidence: 0.5,
            risk: 'low'
        };
    }
    //4. Check support/resistance broken
      else if (data.length >= 1 && data[data.length - 1].c > data[data.length - 1].o) {
        return {
            prediction: "🔍 🔍 Zona de posible entrada👨‍🎓Confirma con Grafico",
            confidence: 0.5,
            risk: 'low'
        };
    }

    else {
        return {
            prediction: "Esperando Señal...",
            confidence: 0,
            risk: 'wait'
        };
    }
}
