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
        returnDocument: 'after',
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


function requireAdmin(req, res, next) {
  const adminKey = req.header('x-admin-key');
  if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
}

router.post('/', requireAdmin, async (req, res) => {
  const { isTestActive } = req.body;
  if (typeof isTestActive !== 'boolean') {
    return res.status(400).json({ message: 'isTestActive must be a boolean' });
  }

  try {
    const status = await TestStatus.findOneAndUpdate(
      {},
      { $set: { isTestActive } },
      {
        returnDocument: 'after',
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
