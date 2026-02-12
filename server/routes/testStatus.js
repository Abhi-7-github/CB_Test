const express = require('express');
const router = express.Router();
const TestStatus = require('../models/TestStatus');



router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  console.log('Test status requested');
  try {
    let status = await TestStatus.findOne();
    if (!status) {
      status = await TestStatus.create({ isTestActive: false });
    }
    res.json(status);
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
    let status = await TestStatus.findOne();
    if (!status) {
      status = await TestStatus.create({ isTestActive });
    } else {
      status.isTestActive = isTestActive;
      await status.save();
    }
    res.json(status);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
