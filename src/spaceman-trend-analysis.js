// Spaceman Trend Analysis Module
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

// ========== ESTADO PARA NUEVAS ESTRATEGIAS POR RONDAS ==========
let spacemanStrategyState = {
    consecutiveSignals: 0,        // Para Bloque de 2 Señales
    lastSignalRounds: [],         // Rondas entre señales
    cycleActive: false,           // Para Señal Única por Ciclo
    waitingForConfirmation: false, // Para Entrada Tardía
    pendingEntryRound: null,      // Para Entrada Tardía
    lastSignalIndex: -1           // Índice de la última señal generada
};

// Reset del estado de estrategias
export function resetSpacemanStrategyState() {
    spacemanStrategyState = {
        consecutiveSignals: 0,
        lastSignalRounds: [],
        cycleActive: false,
        waitingForConfirmation: false,
        pendingEntryRound: null,
        lastSignalIndex: -1
    };
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

// Helper functions for strategies (same as Aviator)
function calculateRSI(candles, period = 14) {
    if (candles.length < period + 1) return null;
    
    const closes = candles.map(c => c.c);
    const changes = [];
    for (let i = 1; i < closes.length; i++) {
        changes.push(closes[i] - closes[i - 1]);
    }
    
    let gains = 0;
    let losses = 0;
    
    // Calculate initial average gain and loss
    for (let i = 0; i < period; i++) {
        if (changes[i] > 0) {
            gains += changes[i];
        } else {
            losses += Math.abs(changes[i]);
        }
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // Calculate RSI using Wilder's smoothing method
    for (let i = period; i < changes.length; i++) {
        const change = changes[i];
        if (change > 0) {
            avgGain = (avgGain * (period - 1) + change) / period;
            avgLoss = (avgLoss * (period - 1)) / period;
        } else {
            avgGain = (avgGain * (period - 1)) / period;
            avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
        }
    }
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
}

function getTrend(candles, emaFast, emaSlow) {
    if (candles.length < 5 || !emaFast || !emaSlow || emaFast.length < 1 || emaSlow.length < 1) {
        return 'neutral';
    }
    
    const lastEmaFast = emaFast[emaFast.length - 1];
    const lastEmaSlow = emaSlow[emaSlow.length - 1];
    
    if (lastEmaFast === null || lastEmaSlow === null) {
        return 'neutral';
    }
    
    const trendTolerance = 0.005;
    
    if (lastEmaFast > lastEmaSlow + trendTolerance) {
        return 'alcista';
    } else if (lastEmaFast < lastEmaSlow - trendTolerance) {
        return 'bajista';
    } else {
        return 'lateral';
    }
}

function isNearSupport(price, candles, tolerance = 0.03) {
    const values = candles.map(c => c.c);
    if (values.length < 5) return false;
    
    const { support } = calculateSupportResistanceFromValues(values);
    if (!support) return false;
    
    const distance = Math.abs(price - support) / support;
    return distance <= tolerance;
}

function isNearResistance(price, candles, tolerance = 0.02) {
    const values = candles.map(c => c.c);
    if (values.length < 5) return false;
    
    const { resistance } = calculateSupportResistanceFromValues(values);
    if (!resistance) return false;
    
    const distance = Math.abs(price - resistance) / resistance;
    return distance <= tolerance;
}

function calculateSupportResistanceFromValues(values) {
    if (values.length < 5) return { supports: [], resistances: [] };
    const lookbackPeriod = Math.min(values.length, 20);
    
    const swingLows = [];
    const swingHighs = [];
    
    for (let i = 1; i < values.length - 1; i++) {
        if (values[i] < values[i - 1] && values[i] < values[i + 1]) {
            swingLows.push({ index: i, value: values[i] });
        }
        if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
            swingHighs.push({ index: i, value: values[i] });
        }
    }
    
    swingLows.sort((a, b) => b.index - a.index);
    swingHighs.sort((a, b) => b.index - a.index);
    
    const support = swingLows.length > 0 ? swingLows[0].value : null;
    const resistance = swingHighs.length > 0 ? swingHighs[0].value : null;
    
    return { support, resistance };
}

function hasBullishMomentum(candles, periods = 3) {
    if (candles.length < periods + 1) return false;
    
    const recentCandles = candles.slice(-periods - 1);
    const closes = recentCandles.map(c => c.c);
    
    for (let i = 1; i < closes.length; i++) {
        if (closes[i] <= closes[i - 1]) {
            return false;
        }
    }
    return true;
}

function hasBullishEngulfing(candles) {
    if (candles.length < 2) return false;
    
    const prevCandle = candles[candles.length - 2];
    const currentCandle = candles[candles.length - 1];
    
    const prevIsBearish = prevCandle.c < prevCandle.o;
    const currentIsBullish = currentCandle.c > currentCandle.o;
    const engulfs = currentCandle.o < prevCandle.c && currentCandle.c > prevCandle.o;
    
    const currentBody = Math.abs(currentCandle.c - currentCandle.o);
    const prevBody = Math.abs(prevCandle.c - prevCandle.o);
    const bodyLarger = currentBody > prevBody;
    
    return prevIsBearish && currentIsBullish && engulfs && bodyLarger;
}

function getTrendStrength(emaFast, emaSlow) {
    if (!emaFast || !emaSlow || emaFast.length < 1 || emaSlow.length < 1) return 0;
    
    const lastEmaFast = emaFast[emaFast.length - 1];
    const lastEmaSlow = emaSlow[emaSlow.length - 1];
    
    if (lastEmaFast === null || lastEmaSlow === null || lastEmaSlow === 0) return 0;
    
    return ((lastEmaFast - lastEmaSlow) / lastEmaSlow) * 100;
}

function getCandleBodySize(candle) {
    if (!candle) return 0;
    const range = candle.h - candle.l;
    if (range === 0) return 0;
    const body = Math.abs(candle.c - candle.o);
    return (body / range) * 100;
}

// ========== NUEVAS ESTRATEGIAS POR RONDAS ==========
// TODAS verifican tendencia NO bajista para mejorar efectividad

// 1. Confirmación Doble por Señal (72%–80%)
// Condición: Ronda anterior >= 1.50x Y no hay 2 rojas (<1.30x) seguidas
function checkConfirmacionDobleStrategy(multipliers, trend) {
    // NO operar en tendencia bajista
    if (trend === 'bajista') return false;
    
    if (multipliers.length < 2) return false;
    
    const lastRound = multipliers[multipliers.length - 1];
    
    // Verificar que la ronda anterior sea >= 1.50x
    if (lastRound < 1.50) return false;
    
    // Verificar que no haya 2 rojas (<1.30x) seguidas en las últimas 5 rondas
    const recentRounds = multipliers.slice(-5);
    for (let i = 1; i < recentRounds.length; i++) {
        if (recentRounds[i] < 1.30 && recentRounds[i - 1] < 1.30) {
            return false; // Hay 2 rojas seguidas
        }
    }
    
    return true;
}

// 2. Señal + Ronda Verde Previa (70%–77%)
// Condición: Ronda anterior >= 1.70x
function checkRondaVerdeStrategy(multipliers, trend) {
    // NO operar en tendencia bajista
    if (trend === 'bajista') return false;
    
    if (multipliers.length < 1) return false;
    
    const lastRound = multipliers[multipliers.length - 1];
    return lastRound >= 1.70;
}

// 3. Bloque de 2 Señales (68%–74%)
// Condición: 2 señales consecutivas Y Min(rondas intermedias) >= 1.20x
function checkBloque2SenalesStrategy(multipliers, trend) {
    // NO operar en tendencia bajista
    if (trend === 'bajista') return false;
    
    const state = spacemanStrategyState;
    
    // Si ya tenemos una señal pendiente, verificar si podemos generar la segunda
    if (state.consecutiveSignals >= 1) {
        // Verificar que no haya habido <1.20x desde la última señal
        const roundsSinceLastSignal = multipliers.slice(state.lastSignalIndex + 1);
        const hasLowRound = roundsSinceLastSignal.some(m => m < 1.20);
        
        if (hasLowRound) {
            // Resetear el contador si hubo una ronda baja
            state.consecutiveSignals = 0;
            state.lastSignalIndex = -1;
            return false;
        }
        
        // Segunda señal confirmada
        if (state.consecutiveSignals >= 1 && roundsSinceLastSignal.length >= 1) {
            state.consecutiveSignals = 0; // Reset para próximo ciclo
            state.lastSignalIndex = -1;
            return true;
        }
    }
    
    // Primera señal: verificar condiciones básicas
    if (multipliers.length >= 2) {
        const lastRound = multipliers[multipliers.length - 1];
        if (lastRound >= 1.50) {
            state.consecutiveSignals = 1;
            state.lastSignalIndex = multipliers.length - 1;
        }
    }
    
    return false;
}

// 4. Ventana Limpia (67%–73%)
// Condición: Max 1 roja (<1.30x) en últimas 5 Y ningún >20x
function checkVentanaLimpiaStrategy(multipliers, trend) {
    // NO operar en tendencia bajista
    if (trend === 'bajista') return false;
    
    if (multipliers.length < 5) return false;
    
    const last5 = multipliers.slice(-5);
    
    // Contar rojas (<1.30x)
    const redCount = last5.filter(m => m < 1.30).length;
    if (redCount > 1) return false;
    
    // Verificar que no haya >20x
    const hasSpike = last5.some(m => m > 20);
    if (hasSpike) return false;
    
    return true;
}

// 5. Filtro Anti-Pico (66%–72%)
// Condición: Max(últimas 3) < 10x
function checkFiltroAntiPicoStrategy(multipliers, trend) {
    // NO operar en tendencia bajista
    if (trend === 'bajista') return false;
    
    if (multipliers.length < 3) return false;
    
    const last3 = multipliers.slice(-3);
    const maxValue = Math.max(...last3);
    
    return maxValue < 10;
}



// ========== FIN NUEVAS ESTRATEGIAS POR RONDAS ==========

// Strategy functions (same as Aviator)
function checkOriginalStrategy(candles, trend, emaFast, emaSlow) {
    const lastCandle = candles.length > 0 ? candles[candles.length - 1] : null;
    const isBullishCandle = lastCandle && lastCandle.c >= lastCandle.o;
    
    return trend === 'alcista' && candles.length >= 5 && isBullishCandle;
}

function checkMomentumHybridStrategy(candles, trend, emaFast, emaSlow) {
    if (candles.length < 10) return false;
    if (trend !== 'alcista') return false;
    
    const lastCandle = candles.length > 0 ? candles[candles.length - 1] : null;
    if (!lastCandle) return false;
    
    const currentPrice = lastCandle.c;
    const rsi = calculateRSI(candles, 14);
    if (rsi === null) return false;
    
    const hasMomentum = hasBullishMomentum(candles, 3);
    const rsiInRange = rsi >= 40 && rsi <= 60;
    const nearSupport = isNearSupport(currentPrice, candles, 0.03);
    const trendStrength = getTrendStrength(emaFast, emaSlow);
    const strongTrend = trendStrength > 1.0;
    const isBullishCandle = lastCandle.c >= lastCandle.o;
    const bodySize = getCandleBodySize(lastCandle);
    const strongCandle = bodySize > 50;
    const notNearResistance = !isNearResistance(currentPrice, candles, 0.02);
    
    return hasMomentum && rsiInRange && nearSupport && strongTrend && isBullishCandle && strongCandle && notNearResistance;
}

function checkMeanReversionRSIStrategy(candles, trend, emaFast, emaSlow) {
    if (candles.length < 14) return false;
    if (trend !== 'alcista') return false;
    
    const lastCandle = candles.length > 0 ? candles[candles.length - 1] : null;
    if (!lastCandle) return false;
    
    const currentPrice = lastCandle.c;
    const rsi = calculateRSI(candles, 14);
    if (rsi === null) return false;
    
    const oversold = rsi < 30;
    const nearSupport = isNearSupport(currentPrice, candles, 0.03);
    const bullishTrend = trend === 'alcista';
    const isBullishCandle = lastCandle.c >= lastCandle.o;
    
    return oversold && nearSupport && bullishTrend && isBullishCandle;
}

function checkEngulfingPatternStrategy(candles, trend, emaFast, emaSlow) {
    if (candles.length < 2) return false;
    if (trend !== 'alcista') return false;
    
    const lastCandle = candles.length > 0 ? candles[candles.length - 1] : null;
    if (!lastCandle) return false;
    
    const currentPrice = lastCandle.c;
    const hasEngulfing = hasBullishEngulfing(candles);
    const nearSupport = isNearSupport(currentPrice, candles, 0.03);
    const bullishTrend = trend === 'alcista';
    
    return hasEngulfing && nearSupport && bullishTrend;
}

export function analyzeTrend(results, trendChart, config, ema3, ema5) {
    if (!trendChart || !trendChart.data || !trendChart.data.datasets || trendChart.data.datasets[0].data.length < 2) {
        return {
            prediction: "Cargando Datos...",
            confidence: 0,
            risk: 'wait',
            shouldGenerateSignal: false
        };
    }

    const candles = trendChart.data.datasets[0].data;
    if (candles.length < 2) {
        return {
            prediction: "Esperando Señal...",
            confidence: 0,
            risk: 'wait',
            shouldGenerateSignal: false
        };
    }
    
    // Extraer multiplicadores originales de los resultados
    const multipliers = results && results.length > 0 
        ? results.map(r => parseFloat(r.value)).filter(v => !isNaN(v))
        : [];
    
    // Calculate EMAs for trend detection
    const closes = candles.map(c => c.c);
    const emaFastArray = [];
    const emaSlowArray = [];
    const emaFastPeriod = 5;
    const emaSlowPeriod = 10;
    
    // Calculate EMA Fast (5)
    if (closes.length >= emaFastPeriod) {
        let multiplier = 2 / (emaFastPeriod + 1);
        let sma = closes.slice(0, emaFastPeriod).reduce((a, b) => a + b, 0) / emaFastPeriod;
        emaFastArray.push(sma);
        for (let i = emaFastPeriod; i < closes.length; i++) {
            emaFastArray.push((closes[i] - emaFastArray[emaFastArray.length - 1]) * multiplier + emaFastArray[emaFastArray.length - 1]);
        }
        // Pad with nulls
        for (let i = 0; i < emaFastPeriod - 1; i++) {
            emaFastArray.unshift(null);
        }
    }
    
    // Calculate EMA Slow (10)
    if (closes.length >= emaSlowPeriod) {
        let multiplier = 2 / (emaSlowPeriod + 1);
        let sma = closes.slice(0, emaSlowPeriod).reduce((a, b) => a + b, 0) / emaSlowPeriod;
        emaSlowArray.push(sma);
        for (let i = emaSlowPeriod; i < closes.length; i++) {
            emaSlowArray.push((closes[i] - emaSlowArray[emaSlowArray.length - 1]) * multiplier + emaSlowArray[emaSlowArray.length - 1]);
        }
        // Pad with nulls
        for (let i = 0; i < emaSlowPeriod - 1; i++) {
            emaSlowArray.unshift(null);
        }
    }
    
    // Get trend (don't operate in bearish trend)
    const trend = getTrend(candles, emaFastArray, emaSlowArray);
    
    // Don't operate in bearish trend
    if (trend === 'bajista') {
        return {
            prediction: "Esperando Señal...",
            confidence: 0,
            risk: 'wait',
            shouldGenerateSignal: false
        };
    }
    
    // Check all strategies (automatic mode - check all 12 strategies)
    // Todas las estrategias verifican tendencia NO bajista internamente
    let shouldGenerateSignal = false;
    let strategyName = '';
    
    // Primero las estrategias por rondas (mayor efectividad)
    // Todas reciben el parámetro de tendencia para filtrar
    if (multipliers.length >= 2 && checkConfirmacionDobleStrategy(multipliers, trend)) {
        shouldGenerateSignal = true;
        strategyName = 'Confirmación Doble (72-80%)';
    } else if (multipliers.length >= 1 && checkRondaVerdeStrategy(multipliers, trend)) {
        shouldGenerateSignal = true;
        strategyName = 'Ronda Verde Previa (70-77%)';
    } else if (multipliers.length >= 2 && checkBloque2SenalesStrategy(multipliers, trend)) {
        shouldGenerateSignal = true;
        strategyName = 'Bloque 2 Señales (68-74%)';
    } else if (multipliers.length >= 5 && checkVentanaLimpiaStrategy(multipliers, trend)) {
        shouldGenerateSignal = true;
        strategyName = 'Ventana Limpia (67-73%)';
    } else if (multipliers.length >= 3 && checkFiltroAntiPicoStrategy(multipliers, trend)) {
        shouldGenerateSignal = true;
        strategyName = 'Filtro Anti-Pico (66-72%)';
    }

    // Luego las estrategias técnicas originales
    else if (checkMomentumHybridStrategy(candles, trend, emaFastArray, emaSlowArray)) {
        shouldGenerateSignal = true;
        strategyName = 'Momentum Híbrido';
    } else if (checkMeanReversionRSIStrategy(candles, trend, emaFastArray, emaSlowArray)) {
        shouldGenerateSignal = true;
        strategyName = 'Mean Reversion + RSI';
    } else if (checkEngulfingPatternStrategy(candles, trend, emaFastArray, emaSlowArray)) {
        shouldGenerateSignal = true;
        strategyName = 'Engulfing Pattern';
    } else if (checkOriginalStrategy(candles, trend, emaFastArray, emaSlowArray)) {
        shouldGenerateSignal = true;
        strategyName = 'Original';
    }
    
    if (shouldGenerateSignal) {
        return {
            prediction: "ENTRADA CONFIRMADA",
            confidence: 0.8,
            risk: 'low',
            shouldGenerateSignal: true,
            strategyName: strategyName
        };
    }
    
    return {
        prediction: "Esperando Señal...",
        confidence: 0,
        risk: 'wait',
        shouldGenerateSignal: false
    };
}
