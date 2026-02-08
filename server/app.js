const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const questionRoutes = require('./routes/questions');
require('dotenv').config();
const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/questions', questionRoutes);

const PORT = process.env.PORT || 1000;
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Error connecting to MongoDB:', err);
});

app.get('/health', (req, res) => {
    res.send('Vamsi anna server connection lone vundhi');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});