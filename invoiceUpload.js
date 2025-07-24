// backend/invoiceUpload.js
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const Counter = require('./invoiceCounter');

// --- Mongoose Invoice Schema (define if not present) ---
const invoiceSchema = new mongoose.Schema({
  invoiceId: { type: String, unique: true, required: true },
  data: { type: Object, required: true }, // All invoice fields
  createdAt: { type: Date, default: Date.now },
  excelFilePath: { type: String }, // Path to saved Excel file
});
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

// --- Multer setup for Excel file uploads ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// --- Express Router ---
const router = express.Router();

// POST /api/invoice-upload
// Expects: multipart/form-data with 'excel' (file) and 'invoiceData' (JSON string or array)
router.post('/invoice-upload', upload.single('excel'), async (req, res) => {
  try {
    let invoiceData = JSON.parse(req.body.invoiceData);
    if (!Array.isArray(invoiceData)) invoiceData = [invoiceData];
    const savedInvoices = [];
    const failedInvoices = [];
    for (const [idx, data] of invoiceData.entries()) {
      try {
        // Increment the counter for each invoice
        const counter = await Counter.findByIdAndUpdate(
          { _id: 'invoiceId' },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        const invoiceId = `INV${String(counter.seq).padStart(3, '0')}`;
        const invoice = new Invoice({
          invoiceId,
          invoiceNo: invoiceId, // add invoiceNo as top-level field
          data: { ...data, invoiceNo: invoiceId },
          excelFilePath: req.file ? req.file.path : undefined,
        });
        await invoice.save();
        savedInvoices.push(invoice);
      } catch (err) {
        console.error(`Invoice save error at index ${idx}:`, err.message);
        failedInvoices.push({ index: idx, error: err.message, data });
      }
    }
    res.status(201).json({
      success: true,
      invoiceIds: savedInvoices.map(inv => inv.invoiceId),
      failedInvoices
    });
  } catch (err) {
    console.error('Invoice upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router; 