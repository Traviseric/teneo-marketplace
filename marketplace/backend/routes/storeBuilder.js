const router = require('express').Router();
const { buildStoreFromBrief } = require('../services/aiStoreBuilderService');

// POST /api/store-builder/generate
// Body: { "brief": "I sell soy candles online, earthy aesthetic" }
// Returns: { success: true, config: <StoreConfig> }
router.post('/generate', async (req, res) => {
  const { brief } = req.body;
  if (!brief || brief.length < 20) {
    return res.status(400).json({ error: 'Brief too short. Describe your business in at least 20 characters.' });
  }
  try {
    const config = await buildStoreFromBrief(brief);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
