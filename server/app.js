require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const questionRoutes = require('./routes/questions');
const submissionRoutes = require('./routes/submissions');
const app = express();


const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, '') : '*';

app.use(cors({
    origin: clientUrl,
    credentials: true
}));
app.use(express.json());
app.use('/api/questions', questionRoutes);
app.use('/api', submissionRoutes);
app.use('/api/test-status', require('./routes/testStatus'));

app.post('/api/admin/verify', (req, res) => {
    const adminKey = req.header('x-admin-key');
    if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ message: 'Invalid admin key' });
    }
    return res.json({ message: 'Admin verified' });
});

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