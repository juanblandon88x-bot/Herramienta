// Clock functions and initialization
function updateSpacemanClock() {
    const now = new Date();
    const delayedTime = new Date(now.getTime() - 15000); // Subtract 15 seconds

    let hours = delayedTime.getHours();
    let minutes = delayedTime.getMinutes();
    let seconds = delayedTime.getSeconds();

    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    const timeString = `${hours}:${minutes}:${seconds}`;
    const clockEl = document.getElementById('spaceman-clock');
    if (clockEl) {
        clockEl.textContent = timeString;
    }
}

function updateSpacemanResultsDisplay(results) {
    const container = document.getElementById('spaceman-results');
    if (!container) return;
    
    container.innerHTML = '';

    results.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `result ${item.category}`;
        if (index === 0) {
            div.className += ' latest';
            if (parseFloat(item.value) >= 2.0) {
                div.classList.add('positive');
            } else {
                div.classList.add('negative');
            }
        }
        div.textContent = Number(item.value).toFixed(2);
        container.appendChild(div);
    });
}

export { updateSpacemanClock, updateSpacemanResultsDisplay };
