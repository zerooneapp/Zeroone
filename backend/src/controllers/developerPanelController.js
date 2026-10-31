const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Load every model file so mongoose knows about all collections
const MODELS_DIR = path.join(__dirname, '..', 'models');
fs.readdirSync(MODELS_DIR)
  .filter((f) => f.endsWith('.js'))
  .forEach((f) => require(path.join(MODELS_DIR, f)));

const getModel = (name) => {
  if (!mongoose.modelNames().includes(name)) return null;
  return mongoose.model(name);
};

// @desc  List every collection with its document count
// @route GET /api/<KEY>/collections
const listCollections = async (req, res) => {
  try {
    const names = mongoose.modelNames().sort();
    const collections = await Promise.all(
      names.map(async (name) => {
        const Model = mongoose.model(name);
        return {
          name,
          collection: Model.collection.collectionName,
          count: await Model.estimatedDocumentCount()
        };
      })
    );
    res.status(200).json({ collections });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc  Platform-wide stats snapshot
// @route GET /api/<KEY>/stats
const getStats = async (req, res) => {
  try {
    const User = mongoose.model('User');
    const Vendor = mongoose.model('Vendor');
    const Booking = mongoose.model('Booking');
    const WalletTransaction = mongoose.model('WalletTransaction');

    const [usersByRole, vendors, bookings, revenue] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Vendor.countDocuments(),
      Booking.countDocuments(),
      WalletTransaction.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    res.status(200).json({
      usersByRole: Object.fromEntries(usersByRole.map((r) => [r._id || 'unknown', r.count])),
      vendors,
      bookings,
      walletRevenue: revenue[0]?.total || 0,
      collections: mongoose.modelNames().length
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// Build a loose search filter across the model's string fields
const buildSearchFilter = (Model, q) => {
  if (!q) return {};
  const trimmed = String(q).trim();
  const or = [];
  if (mongoose.Types.ObjectId.isValid(trimmed)) or.push({ _id: trimmed });

  const rx = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  Model.schema.eachPath((pathName, schemaType) => {
    if (schemaType.instance === 'String') or.push({ [pathName]: rx });
  });
  return or.length ? { $or: or } : {};
};

// @desc  Paginated documents of one collection, with optional search
// @route GET /api/<KEY>/collections/:name
const getDocuments = async (req, res) => {
  try {
    const Model = getModel(req.params.name);
    if (!Model) return res.status(404).json({ message: 'Unknown collection' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 25));
    const filter = buildSearchFilter(Model, req.query.q);

    const [total, documents] = await Promise.all([
      Model.countDocuments(filter),
      Model.find(filter).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit).lean()
    ]);

    res.status(200).json({
      name: req.params.name,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      fields: Object.keys(Model.schema.paths),
      documents
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc  One document by id
// @route GET /api/<KEY>/collections/:name/:id
const getDocument = async (req, res) => {
  try {
    const Model = getModel(req.params.name);
    if (!Model) return res.status(404).json({ message: 'Unknown collection' });
    const doc = await Model.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.status(200).json({ document: doc });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc  Replace a document's fields with the supplied JSON
// @route PUT /api/<KEY>/collections/:name/:id
const updateDocument = async (req, res) => {
  try {
    const Model = getModel(req.params.name);
    if (!Model) return res.status(404).json({ message: 'Unknown collection' });

    const update = { ...req.body };
    delete update._id;
    delete update.__v;

    const doc = await Model.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: false, strict: false }
    ).lean();
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    console.warn(`[DEV-PANEL] ${req.developer.phone} edited ${req.params.name}/${req.params.id}`);
    res.status(200).json({ document: doc });
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// @desc  Delete a single document
// @route DELETE /api/<KEY>/collections/:name/:id
const deleteDocument = async (req, res) => {
  try {
    const Model = getModel(req.params.name);
    if (!Model) return res.status(404).json({ message: 'Unknown collection' });
    const doc = await Model.findByIdAndDelete(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    console.warn(`[DEV-PANEL] ${req.developer.phone} deleted ${req.params.name}/${req.params.id}`);
    res.status(200).json({ message: 'Document deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = {
  listCollections, getStats, getDocuments, getDocument, updateDocument, deleteDocument
};
