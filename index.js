const express = require('express');
const { MongoClient } = require('mongodb');

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
            return null;
        }

        // Calculate averages and most frequent rain value
        let totalL = 0, totalH = 0, totalT = 0;
        const rainFrequency = {};
        
        records.forEach(record => {
            totalL += parseFloat(record.L);
            totalH += parseFloat(record.H);
            totalT += parseFloat(record.T);
            
            const rainValue = record.R;
            if (rainFrequency[rainValue]) {
                rainFrequency[rainValue]++;
            } else {
                rainFrequency[rainValue] = 1;
            }
        });

        const averageL = totalL / records.length;
        const averageH = totalH / records.length;
        const averageT = totalT / records.length;
        
        const mostFrequentRain = Object.keys(rainFrequency).reduce((a, b) => rainFrequency[a] > rainFrequency[b] ? a : b);

        return {
            averageL: averageL.toFixed(2),
            averageH: averageH.toFixed(2),
            averageT: averageT.toFixed(2),
            mostFrequentRain
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
        // Determine weather condition based on LDR value
        let weatherCondition;
        if (data.averageL < 500) {
            weatherCondition = 'Sunny';
        } else {
            weatherCondition = 'Cloudy';
        }

        res.send(`
            <html>
                <head>
                    <title>Weather Data Analysis</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 20px;
                            background-color: #f4f4f9;
                        }
                        .container {
                            max-width: 800px;
                            margin: 0 auto;
                            background: #fff;
                            padding: 20px;
                            border-radius: 8px;
                            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                        }
                        h1 {
                            text-align: center;
                            color: #333;
                        }
                        .section {
                            margin-bottom: 20px;
                        }
                        .section p {
                            margin: 5px 0;
                            font-size: 18px;
                        }
                        .section .title {
                            font-weight: bold;
                            margin-bottom: 10px;
                            font-size: 20px;
                            color: #007bff;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Weather Data Analysis</h1>
                        <div class="section">
                            <div class="title">Location Information</div>
                            <p><strong>City:</strong> ${location.city}</p>
                            <p><strong>Latitude:</strong> ${location.lat}</p>
                            <p><strong>Longitude:</strong> ${location.lon}</p>
                        </div>
                        <div class="section">
                            <div class="title">Most Probable Weather now</div>
                            <p><strong>Light Intensity (L):</strong> ${data.averageL}</p>
                            <p><strong>Humidity (H):</strong> ${data.averageH}%</p>
                            <p><strong>Average Temperature (T):</strong> ${data.averageT}°C</p>
                            <p><strong>Rain Status (R):</strong> ${data.mostFrequentRain}</p>
                            <p><strong>Weather Condition:</strong> ${weatherCondition}</p>
                        </div>
                    </div>
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
