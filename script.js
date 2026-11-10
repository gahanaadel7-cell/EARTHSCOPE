
let trendChart = null;

// Representative coordinates for each selected region.
// These are sample points, not regional averages.
const regionCoordinates = {
    "Global": { latitude: 0, longitude: 0 },
    "Africa": { latitude: 0, longitude: 20 },
    "Asia": { latitude: 30, longitude: 100 },
    "Europe": { latitude: 50, longitude: 10 },
    "North America": { latitude: 40, longitude: -100 },
    "South America": { latitude: -15, longitude: -60 }
};

async function analyzeData() {

    const variable = document.getElementById("variable").value;
    const region = document.getElementById("region").value;

    const startYear = Number(document.getElementById("startYear").value);
    const endYear = Number(document.getElementById("endYear").value);

    if (
        !Number.isInteger(startYear) ||
        !Number.isInteger(endYear) ||
        startYear < 1981 ||
        endYear > 2025 ||
        startYear >= endYear
    ) {
        alert("Choose valid years between 1981 and 2025. End year must be greater than start year.");
        return;
    }

    // Currently connected live variable: Temperature.
    if (variable !== "temperature") {
        alert("Live NASA data is currently connected for Temperature only. Other variables will be connected later.");
        return;
    }

    const location = regionCoordinates[region];

    const button = document.querySelector(".analyze-button");

    button.disabled = true;
    button.textContent = "Fetching NASA Data...";

    try {

        const start = `${startYear}0101`;
        const end = `${endYear}1231`;

        const apiURL =
            "https://power.larc.nasa.gov/api/temporal/daily/point" +
            `?parameters=T2M` +
            `&community=RE` +
            `&longitude=${location.longitude}` +
            `&latitude=${location.latitude}` +
            `&start=${start}` +
            `&end=${end}` +
            `&format=JSON` +
            `&time-standard=UTC`;

        const response = await fetch(apiURL);

        if (!response.ok) {
            throw new Error("NASA API request failed: " + response.status);
        }

        const result = await response.json();

        const dailyValues = result.properties.parameter.T2M;

        if (!dailyValues || Object.keys(dailyValues).length === 0) {
            throw new Error("NASA returned no temperature data.");
        }

        // Calculate annual averages from daily observations.
        const yearlyData = {};

        for (const [date, value] of Object.entries(dailyValues)) {

            if (value === -999 || !Number.isFinite(value)) {
                continue;
            }

            const year = Number(date.substring(0, 4));

            if (!yearlyData[year]) {
                yearlyData[year] = {
                    total: 0,
                    count: 0
                };
            }

            yearlyData[year].total += value;
            yearlyData[year].count++;
        }

        const years = Object.keys(yearlyData)
            .map(Number)
            .sort((a, b) => a - b);

        const labels = [];
        const values = [];

        for (const year of years) {

            const item = yearlyData[year];

            if (item.count > 0) {
                labels.push(year);
                values.push(item.total / item.count);
            }
        }

        if (values.length < 2) {
            throw new Error("Not enough valid observations for this period.");
        }

        displayResults(
            labels,
            values,
            region,
            startYear,
            endYear
        );

    } catch (error) {

        console.error(error);

        alert(
            "Could not retrieve NASA data.\n\n" +
            error.message +
            "\n\nCheck your internet connection and try again."
        );

    } finally {

        button.disabled = false;
        button.textContent = "Analyze Earth Data →";

    }
}

function displayResults(labels, values, region, startYear, endYear) {

    const firstValue = values[0];
    const lastValue = values[values.length - 1];

    const difference = lastValue - firstValue;

    const percentage =
        firstValue !== 0
            ? (difference / Math.abs(firstValue)) * 100
            : 0;

    let direction = "Stable";

    if (difference > 0.05) {
        direction = "Increasing ↗";
    } else if (difference < -0.05) {
        direction = "Decreasing ↘";
    }

    document.getElementById("trend").textContent = direction;

    document.getElementById("change").textContent =
        percentage.toFixed(2) + "%";

    document.getElementById("confidence").textContent =
        "Not tested";

    document.getElementById("resultRegion").textContent =
        region + " • " + startYear + "–" + endYear;

    document.getElementById("resultStatus").textContent =
        "NASA LIVE DATA";

    document.getElementById("dataSourceTag").textContent =
        "NASA POWER";

    document.getElementById("chartTitle").textContent =
        "Annual Average Temperature — " + region;

    document.getElementById("insight").textContent =
        `NASA POWER observations for the selected representative point in ${region} ` +
        `show an annual average temperature change from ${firstValue.toFixed(2)}°C ` +
        `to ${lastValue.toFixed(2)}°C between ${labels[0]} and ${labels[labels.length - 1]}. ` +
        `The net change is ${difference.toFixed(2)}°C. ` +
        `This is a descriptive trend, not yet a statistical significance test.`;

    if (trendChart) {
        trendChart.destroy();
    }

    const canvas = document.getElementById("trendChart");

    if (!window.Chart) {
        throw new Error("Chart.js could not load. Check your internet connection.");
    }

    trendChart = new Chart(canvas, {

        type: "line",

        data: {
            labels: labels,

            datasets: [{
                label: "Annual Average Temperature (°C)",
                data: values,

                borderColor: "#a8edc1",
                backgroundColor: "rgba(168, 237, 193, 0.12)",

                borderWidth: 3,
                fill: true,
                tension: 0.3,

                pointRadius: 3,
                pointBackgroundColor: "#a8edc1"
            }]
        },

        options: {

            responsive: true,
            maintainAspectRatio: false,

            plugins: {

                legend: {
                    labels: {
                        color: "#effaf2"
                    }
                },

                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(2) + " °C";
                        }
                    }
                }
            },

            scales: {

                x: {
                    ticks: {
                        color: "#9aafa4"
                    },

                    grid: {
                        color: "rgba(255,255,255,0.06)"
                    },

                    title: {
                        display: true,
                        text: "Year",
                        color: "#9aafa4"
                    }
                },

                y: {
                    ticks: {
                        color: "#9aafa4"
                    },

                    grid: {
                        color: "rgba(255,255,255,0.06)"
                    },

                    title: {
                        display: true,
                        text: "Temperature (°C)",
                        color: "#9aafa4"
                    }
                }
            }
        }
    });

    document.getElementById("results").scrollIntoView({
        behavior: "smooth"
    });
}
