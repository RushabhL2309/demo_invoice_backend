// backend/invoiceUpload.js
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');


// --- Mongoose Invoice Schema (define if not present) ---
const invoiceSchema = new mongoose.Schema({
  // REMOVE invoiceNo field completely - only store Excel data
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now }
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
        // Extract invoice number from Excel - ONLY use "In_no" column
        let excelInvoiceNo = "";
        
        // ONLY look for "In_no" field, nothing else
        if (data["In_no"]) {
          excelInvoiceNo = data["In_no"];
          console.log('Backend: Found Excel "In_no":', excelInvoiceNo);
        } else if (data["In_no "]) {
          excelInvoiceNo = data["In_no "];
          console.log('Backend: Found Excel "In_no " (with space):', excelInvoiceNo);
        } else if (data["In_no  "]) {
          excelInvoiceNo = data["In_no  "];
          console.log('Backend: Found Excel "In_no  " (with double space):', excelInvoiceNo);
        } else {
          console.warn('Backend: Excel "In_no" field NOT FOUND in data. Available columns:', Object.keys(data));
          console.log('Backend: Row data:', data);
        }
        
        if (!excelInvoiceNo) {
          console.error('Backend: No Excel "In_no" found - cannot create invoice');
          return; // Skip this invoice if no "In_no" found
        }
        
        // Create new invoice with ONLY Excel "In_no" data
        const newInvoice = new Invoice({
          data: { 
            ...data, 
            "In_no": excelInvoiceNo, // Store Excel "In_no" as the primary field
            invoiceNo: excelInvoiceNo // Also store in invoiceNo for compatibility
          },
          createdAt: new Date()
        });
        
        await newInvoice.save();
        savedInvoices.push(newInvoice);
      } catch (err) {
        console.error(`Invoice save error at index ${idx}:`, err.message);
        failedInvoices.push({ index: idx, error: err.message, data });
      }
    }
    
    // Send response with Excel invoice numbers only
    const responseInvoiceNumbers = savedInvoices.map(inv => inv.data?.invoiceNo || ""); // Send Excel numbers from data field
    
    res.json({
      success: true,
      message: `Successfully processed ${savedInvoices.length} invoices`,
      invoiceNumbers: responseInvoiceNumbers, // Excel numbers only
      totalInvoices: savedInvoices.length
    });
  } catch (err) {
    console.error('Invoice upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;