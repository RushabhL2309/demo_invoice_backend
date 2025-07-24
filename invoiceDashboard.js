const express = require('express');
const mongoose = require('mongoose');

// Invoice model (reuse or define if not present)
const invoiceSchema = new mongoose.Schema({
  invoiceId: { type: String, unique: true, required: true },
  data: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now },
  excelFilePath: { type: String },
});
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

const router = express.Router();

// GET /api/invoices - List all invoices
router.get('/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/:id - Get a single invoice by Mongo _id
router.get('/invoices/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/invoices/:id - Edit/update an invoice
router.put('/invoices/:id', async (req, res) => {
  try {
    const updated = await Invoice.findByIdAndUpdate(
      req.params.id,
      { data: req.body.data },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Invoice not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/invoices/:id - Delete an invoice
router.delete('/invoices/:id', async (req, res) => {
  try {
    const deleted = await Invoice.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 