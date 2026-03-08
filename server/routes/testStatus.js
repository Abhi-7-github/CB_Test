const express = require('express');
const router = express.Router();
const TestStatus = require('../models/TestStatus');



router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  console.log('Test status requested');
  try {
    const status = await TestStatus.findOneAndUpdate(
      {},
      { $setOnInsert: { isTestActive: false } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        sort: { createdAt: 1 },
      }
    ).lean();

    res.json({ isTestActive: Boolean(status?.isTestActive) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post('/', async (req, res) => {
  const { isTestActive } = req.body;
  if (typeof isTestActive !== 'boolean') {
    return res.status(400).json({ message: 'isTestActive must be a boolean' });
  }

  try {
    const status = await TestStatus.findOneAndUpdate(
      {},
      { $set: { isTestActive } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        sort: { createdAt: 1 },
      }
    ).lean();

    res.json({ isTestActive: Boolean(status?.isTestActive) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
