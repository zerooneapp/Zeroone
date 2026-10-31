const express = require('express');
const { developerLogin, developerMe } = require('../controllers/developerAuthController');
const {
  listCollections, getStats, getDocuments, getDocument, updateDocument, deleteDocument
} = require('../controllers/developerPanelController');
const { developerProtect } = require('../middleware/developerMiddleware');

const router = express.Router();

// Login is the only unauthenticated endpoint; it returns a generic 404 on any failure.
router.post('/auth/login', developerLogin);

// Everything below requires a valid developer token (otherwise 404).
router.use(developerProtect);

router.get('/auth/me', developerMe);
router.get('/stats', getStats);
router.get('/collections', listCollections);
router.get('/collections/:name', getDocuments);
router.get('/collections/:name/:id', getDocument);
router.put('/collections/:name/:id', updateDocument);
router.delete('/collections/:name/:id', deleteDocument);

module.exports = router;
