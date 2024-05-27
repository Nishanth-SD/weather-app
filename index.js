const express = require('express');
const { MongoClient } = require('mongodb');
const regression = require('regression'); // Linear regression library

const app = express();
const port = 3000;

// MongoDB connection URI
const uri = 'mongodb+srv://nishanth:Nishanth1917@cluster0.yxrvdc4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Location information
const location = {
    city: 'Chennai',
    lat: 13.0827,
    lon: 80.2707
};

async function fetchAndAnalyzeData() {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        await client.connect();
        const database = client.db('weather_data');
        const collection = database.collection('data');

        // Fetch the last 200 records
        const records = await collection.find().sort({ timestamp: -1 }).limit(200).toArray();

        if (records.length === 0) {
            console.log('No records found');
            return null;
        }

        // Prepare data for regression
        const dataL = [];
        const dataH = [];
        const dataT = [];
        const timestamps = [];
        let currentTime = 0;

        records.forEach(record => {
            const timestamp = new Date(record.timestamp).getTime();
            timestamps.push(timestamp);
            dataL.push([timestamp, parseFloat(record.L)]);
            dataH.push([timestamp, parseFloat(record.H)]);
            dataT.push([timestamp, parseFloat(record.T)]);
            currentTime = timestamp;
        });

        // Perform linear regression
        const resultL = regression.linear(dataL);
        const resultH = regression.linear(dataH);
        const resultT = regression.linear(dataT);

        // Predict for the next 3 hours (in milliseconds)
        const oneHour = 3600000;
        const predictions = [];
        for (let i = 1; i <= 3; i++) {
            const futureTime = currentTime + i * oneHour;
            predictions.push({
                time: futureTime,
                predictedL: resultL.predict(futureTime)[1],
                predictedH: resultH.predict(futureTime)[1],
                predictedT: resultT.predict(futureTime)[1]
            });
        }

        return {
            predictions,
            currentData: {
                timestamps,
                L: dataL.map(d => d[1]),
                H: dataH.map(d => d[1]),
                T: dataT.map(d => d[1])
            }
        };

    } catch (error) {
        console.error('Error connecting to MongoDB or fetching data:', error);
        return null;
    } finally {
        await client.close();
    }
}

app.get('/', async (req, res) => {
    const data = await fetchAndAnalyzeData();
    
    if (data) {
        console.log('Data retrieved successfully');
        res.send(`
            <html>
                <head>
                    <title>Weather Data Analysis</title>
                    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns"></script>
                    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
                    <style>
                        body {
                            font-family: 'Roboto', sans-serif;
                            margin: 0;
                            padding: 0;
                            background-color: #f0f2f5;
                        }
                        .container {
                            max-width: 900px;
                            margin: 50px auto;
                            background: #ffffff;
                            padding: 30px;
                            border-radius: 10px;
                            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                        }
                        h1 {
                            text-align: center;
                            color: #333;
                            margin-bottom: 30px;
                        }
                        .card {
                            background: #ffffff;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                            padding: 20px;
                            margin-bottom: 20px;
                        }
                        .card .title {
                            font-weight: 500;
                            margin-bottom: 10px;
                            font-size: 18px;
                            color: #007bff;
                        }
                        .card p {
                            margin: 5px 0;
                            font-size: 16px;
                            color: #555;
                        }
                        canvas {
                            display: block;
                            margin: 20px auto;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Weather Data Analysis</h1>
                        <div class="card">
                            <div class="title">Location Information</div>
                            <p><strong>City:</strong> ${location.city}</p>
                            <p><strong>Latitude:</strong> ${location.lat}</p>
                            <p><strong>Longitude:</strong> ${location.lon}</p>
                        </div>
                        <div class="card">
                            <div class="title">Current and Predicted Weather Data</div>
                            <p><strong>Current Data:</strong></p>
                            <p><strong>Light Intensity (L):</strong> ${data.currentData.L[data.currentData.L.length - 1]}</p>
                            <p><strong>Humidity (H):</strong> ${data.currentData.H[data.currentData.H.length - 1]}%</p>
                            <p><strong>Temperature (T):</strong> ${data.currentData.T[data.currentData.T.length - 1]}°C</p>
                            <p><strong>Predictions for the next 3 hours:</strong></p>
                            ${data.predictions.map(prediction => `
                                <p>
                                    <strong>Time:</strong> ${new Date(prediction.time).toLocaleTimeString()} <br>
                                    <strong>Predicted Light Intensity (L):</strong> ${prediction.predictedL.toFixed(2)} <br>
                                    <strong>Predicted Humidity (H):</strong> ${prediction.predictedH.toFixed(2)}% <br>
                                    <strong>Predicted Temperature (T):</strong> ${prediction.predictedT.toFixed(2)}°C
                                </p>
                            `).join('')}
                        </div>
                        <div class="card">
                            <canvas id="chartL" width="400" height="200"></canvas>
                        </div>
                        <div class="card">
                            <canvas id="chartH" width="400" height="200"></canvas>
                        </div>
                        <div class="card">
                            <canvas id="chartT" width="400" height="200"></canvas>
                        </div>
                    </div>
                    <script>
                        const ctxL = document.getElementById('chartL').getContext('2d');
                        const ctxH = document.getElementById('chartH').getContext('2d');
                        const ctxT = document.getElementById('chartT').getContext('2d');

                        const timestamps = ${JSON.stringify(data.currentData.timestamps)};
                        const labels = timestamps.map(ts => new Date(ts));

                        const dataL = ${JSON.stringify(data.currentData.L)};
                        const dataH = ${JSON.stringify(data.currentData.H)};
                        const dataT = ${JSON.stringify(data.currentData.T)};

                        const predictions = ${JSON.stringify(data.predictions)};
                        const futureLabels = predictions.map(p => new Date(p.time));
                        const futureDataL = predictions.map(p => p.predictedL);
                        const futureDataH = predictions.map(p => p.predictedH);
                        const futureDataT = predictions.map(p => p.predictedT);

                        new Chart(ctxL, {
                            type: 'line',
                            data: {
                                labels: [...labels, ...futureLabels],
                                datasets: [{
                                    label: 'Light Intensity (L)',
                                    data: [...dataL, ...futureDataL],
                                    borderColor: 'rgba(255, 99, 132, 1)',
                                    borderWidth: 2,
                                    fill: false,
                                    tension: 0.1
                                }]
                            },
                            options: {
                                scales: {
                                    x: {
                                        type: 'time',
                                        time: {
                                            unit: 'hour',
                                            tooltipFormat: 'MMM dd, hh:mm a'
                                        },
                                        title: {
                                            display: true,
                                            text: 'Time'
                                        }
                                    }
                                }
                            }
                        });

                        new Chart(ctxH, {
                            type: 'line',
                            data: {
                                labels: [...labels, ...futureLabels],
                                datasets: [{
                                    label: 'Humidity (H)',
                                    data: [...dataH, ...futureDataH],
                                    borderColor: 'rgba(54, 162, 235, 1)',
                                    borderWidth: 2,
                                    fill: false,
                                    tension: 0.1
                                }]
                            },
                            options: {
                                scales: {
                                    x: {
                                        type: 'time',
                                        time: {
                                            unit: 'hour',
                                            tooltipFormat: 'MMM dd, hh:mm a'
                                        },
                                        title: {
                                            display: true,
                                            text: 'Time'
                                        }
                                    }
                                }
                            }
                        });

                        new Chart(ctxT, {
                            type: 'line',
                            data: {
                                labels: [...labels, ...futureLabels],
                                datasets: [{
                                    label: 'Temperature (T)',
                                    data: [...dataT, ...futureDataT],
                                    borderColor: 'rgba(75, 192, 192, 1)',
                                    borderWidth: 2,
                                    fill: false,
                                    tension: 0.1
                                }]
                            },
                            options: {
                                scales: {
                                    x: {
                                        type: 'time',
                                        time: {
                                            unit: 'hour',
                                            tooltipFormat: 'MMM dd, hh:mm a'
                                        },
                                        title: {
                                            display: true,
                                            text: 'Time'
                                        }
                                    }
                                }
                            }
                        });
                    </script>
                </body>
            </html>
        `);
    } else {
        res.send('<html><body><h1>No data found or error occurred</h1></body></html>');
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
