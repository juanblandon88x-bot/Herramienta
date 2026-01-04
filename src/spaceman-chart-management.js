// chart_management.js

export function calculateEMA(data, period) {
    let ema = [];
    let k = 2 / (period + 1);
    
    for (let i = 0; i < data.length; i++) {
        if (i === 0) {
            ema[i] = data[i].c; 
        } else {
            ema[i] = (data[i].c - ema[i - 1]) * k + ema[i - 1];
        }
    }
    return ema;
}

export function updateEMA(chart) {
    const data = chart.data.datasets[0].data;
    if (data.length === 0) return;

    const closes = data.map(item => item.c);
    const ema3 = calculateEMA(data, 3);
    const ema5 = calculateEMA(data, 5);

    chart.data.datasets[1].data = [];
    chart.data.datasets[2].data = [];

    chart.data.datasets[1].data = ema3.map((value, index) => ({
        x: data[index].x,
        y: value,
    }));
    chart.data.datasets[2].data = ema5.map((value, index) => ({
        x: data[index].x,
        y: value,
    }));

    chart.update();
}

function getPointColor(value) {
    value = parseFloat(value);
    if (value >= 10.00) return 'rgba(255, 192, 203, 0.8)'; // Pink
    if (value >= 5.00) return 'rgba(255, 215, 0, 0.8)'; // Gold
    if (value >= 3.00) return 'rgba(144, 238, 144, 0.8)'; // Light green
    if (value >= 2.00) return 'rgba(135, 206, 235, 0.8)'; // Light blue
    if (value >= 1.50) return 'rgba(255, 99, 71, 0.8)'; // Light red
    return 'rgba(255, 255, 255, 0.6)'; // Semi-transparent white
}

function getPointSize(value) {
    value = parseFloat(value);
    if (value >= 10.00) return 8;
    if (value >= 5.00) return 7;
    if (value >= 3.00) return 6;
    if (value >= 2.00) return 5;
    return 4;
}

export function initTrendLineChart() {
    const canvas = document.getElementById('spaceTrendLineChart');
    if (!canvas) {
        throw new Error('spaceTrendLineChart canvas not found');
    }
    const ctx = canvas.getContext('2d');
    
    const horizontalLinePlugin = {
        id: 'horizontalLine',
        beforeDraw: (chart) => {
            if (chart.config._config.type !== 'line') return;
            
            const {ctx, chartArea, scales} = chart;
            const currentLevel = chart.cumulativeSum;

            ctx.save();
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            const y = scales.y.getPixelForValue(currentLevel);
            ctx.moveTo(chartArea.left, y);
            ctx.lineTo(chartArea.right, y);
            ctx.stroke();
            ctx.restore();
        }
    };

    const supportResistanceLinesPlugin = {
        id: 'supportResistanceLines',
        afterDraw: (chart) => {
            const { ctx, chartArea, scales } = chart;

            if (chart.supportLevel) {
                ctx.save();
                ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)'; // Green for support
                ctx.lineWidth = 2;
                ctx.beginPath();
                const y = scales.y.getPixelForValue(chart.supportLevel);
                ctx.moveTo(chartArea.left, y);
                ctx.lineTo(chartArea.right, y);
                ctx.stroke();
                ctx.restore();
            }

            if (chart.resistanceLevel) {
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; // Red for resistance
                ctx.lineWidth = 2;
                ctx.beginPath();
                const y = scales.y.getPixelForValue(chart.resistanceLevel);
                ctx.moveTo(chartArea.left, y);
                ctx.lineTo(chartArea.right, y);
                ctx.stroke();
                ctx.restore();
            }
        }
    };

    if (typeof Chart !== 'undefined') {
        Chart.register({
            id: 'supportResistanceSetter',
            beforeUpdate: (chart) => {
                const supportResistanceData = chart.config._config.supportResistanceData || { support: null, resistance: null };
                chart.supportLevel = supportResistanceData.support;
                chart.resistanceLevel = supportResistanceData.resistance;
            }
        });
    }

    return new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Trend',
                data: [],
                borderColor: 'rgba(255, 255, 255, 0.5)',
                borderWidth: 1,
                fill: false,
                pointRadius: (context) => {
                    if (!context.raw) return 0;
                    return getPointSize(context.raw.originalValue) - 2;
                },
                pointBackgroundColor: (context) => {
                    if (!context.raw) return 'white';
                    return getPointColor(context.raw.originalValue);
                },
                pointBorderColor: 'rgba(255, 255, 255, 0.3)',
                pointBorderWidth: 1,
                pointStyle: 'circle',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    grid: {
                        color: 'rgba(255,255,255,0.05)'
                    },
                    ticks: {
                        color: '#888',
                        maxRotation: 0,
                        display: false
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255,255,255,0.05)'
                    },
                    ticks: {
                        color: '#888',
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            },
            animation: false
        },
        plugins: [horizontalLinePlugin, supportResistanceLinesPlugin, 'supportResistanceSetter']
    });
}

export function initTrendChart(config) {
    const canvas = document.getElementById('spaceTrendChart');
    if (!canvas) {
        throw new Error('spaceTrendChart canvas not found');
    }
    const ctx = canvas.getContext('2d');

    const lastCloseLinePlugin = {
        id: 'lastCloseLine',
        beforeDraw: (chart) => {
            const {ctx, chartArea, scales} = chart;
            const dataset = chart.data.datasets[0];
            if (dataset.data.length > 0) {
                const lastClose = dataset.data[dataset.data.length - 1].c;

                ctx.save();
                ctx.setLineDash([5, 5]);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                const y = scales.y.getPixelForValue(lastClose);
                ctx.moveTo(chartArea.left, y);
                ctx.lineTo(chartArea.right, y);
                ctx.stroke();

                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.textAlign = 'left';
                ctx.font = '10px Roboto';
                ctx.fillText(`${lastClose.toFixed(2)}`, chartArea.right + 5, y);

                ctx.restore();
            }
        }
    };

    return new Chart(ctx, {
        type: 'candlestick',
        data: {
            datasets: [{
                label: 'Spaceman Trend',
                data: [],
                borderWidth: 2,
                borderSkipped: false,
                color: {
                    up: config.positiveColor,
                    down: config.negativeColor,
                },
                borderColor: {
                    up: config.positiveColor,
                    down: config.negativeColor,
                },
                order: 2 
            },
            {
                label: 'EMA3',
                data: [],
                type: 'line',
                borderColor: 'gold',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.1,
                order: 1 
            },
            {
                label: 'EMA5',
                data: [],
                type: 'line',
                borderColor: 'white',
                borderWidth: 1,
                pointRadius: 0,
                tension: 0.1,
                order: 0 
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    grid: {
                        color: 'rgba(255,255,255,0.05)'
                    },
                    ticks: {
                        color: '#888',
                        maxRotation: 0,
                        callback: function(value) {
                            return '';  
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255,255,255,0.05)'
                    },
                    ticks: {
                        color: '#888',
                        callback: function(value) {
                            return '';  
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const data = context.raw;
                            return [
                                `Valor: ${data.value}x`
                            ];
                        }
                    }
                }
            },
            animation: false
        },
        plugins: [lastCloseLinePlugin]
    });
}
