const express = require('express');
const mongoose = require('mongoose');

// Invoice model (reuse or define if not present)
const invoiceSchema = new mongoose.Schema({
  // REMOVE invoiceNo field completely - only store Excel data
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

const router = express.Router();

// GET /api/invoices - List all invoices
router.get('/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    
    // DEBUG: Log what's in the database
    console.log('DEBUG: Raw invoices from database:', invoices.map(inv => ({
      _id: inv._id,
      data: inv.data,
      hasInvoiceNo: !!inv.invoiceNo,
      invoiceNoValue: inv.invoiceNo
    })));
    
    // ONLY send Excel data, NEVER send backend invoice numbers
    const cleanInvoices = invoices.map(invoice => {
      // Remove any backend-generated invoice numbers completely
      const cleanData = { ...invoice.data };
      
      // Ensure we only use Excel "In_no" and remove any backend invoice numbers
      if (cleanData.invoiceNo && cleanData.invoiceNo.toString().startsWith('INV')) {
        console.warn('REMOVING BACKEND INVOICE NUMBER:', cleanData.invoiceNo);
        delete cleanData.invoiceNo;
      }
      
      // Also check and remove any other fields that might contain backend invoice numbers
      for (const [key, value] of Object.entries(cleanData)) {
        if (value && typeof value === 'string' && value.toString().startsWith('INV')) {
          console.warn('REMOVING BACKEND INVOICE NUMBER FROM FIELD:', key, 'VALUE:', value);
          delete cleanData[key];
        }
      }
      
      return {
        _id: invoice._id, // Keep _id only for frontend operations (edit/delete)
        data: cleanData, // Only Excel data with "In_no" as invoiceNo
        // REMOVE invoiceNo field completely - only use Excel data.invoiceNo
        createdAt: invoice.createdAt
      };
    });
    
    // DEBUG: Log what's being sent to frontend
    console.log('DEBUG: Clean invoices being sent:', cleanInvoices.map(inv => ({
      _id: inv._id,
      dataInvoiceNo: inv.data?.invoiceNo, // This should be Excel "In_no"
      hasData: !!inv.data,
      excelInNo: inv.data?.["In_no"] // Check if Excel "In_no" exists
    })));
    
    res.json(cleanInvoices);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/:id - Get a single invoice by Mongo _id
router.get('/invoices/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    // DEBUG: Log what's in the database
    console.log('DEBUG: Single invoice from database:', {
      _id: invoice._id,
      data: invoice.data,
      hasInvoiceNo: !!invoice.invoiceNo,
      invoiceNoValue: invoice.invoiceNo
    });
    
    // ONLY send Excel data, NEVER send backend invoice numbers
    const cleanInvoice = {
      _id: invoice._id, // Keep _id only for frontend operations
      data: (() => {
        // Remove any backend-generated invoice numbers completely
        const cleanData = { ...invoice.data };
        
        // Ensure we only use Excel "In_no" and remove any backend invoice numbers
        if (cleanData.invoiceNo && cleanData.invoiceNo.toString().startsWith('INV')) {
          console.warn('REMOVING BACKEND INVOICE NUMBER:', cleanData.invoiceNo);
          delete cleanData.invoiceNo;
        }
        
        // Also check and remove any other fields that might contain backend invoice numbers
        for (const [key, value] of Object.entries(cleanData)) {
          if (value && typeof value === 'string' && value.toString().startsWith('INV')) {
            console.warn('REMOVING BACKEND INVOICE NUMBER FROM FIELD:', key, 'VALUE:', value);
            delete cleanData[key];
          }
        }
        
        return cleanData;
      })(),
      // REMOVE invoiceNo field completely - only use Excel data.invoiceNo
      createdAt: invoice.createdAt
    };
    
    // DEBUG: Log what's being sent to frontend
    console.log('DEBUG: Clean invoice being sent:', {
      _id: cleanInvoice._id,
      dataInvoiceNo: cleanInvoice.data?.invoiceNo, // This should be Excel "In_no"
      hasData: !!cleanInvoice.data,
      excelInNo: cleanInvoice.data?.["In_no"] // Check if Excel "In_no" exists
    });
    
    res.json(cleanInvoice);
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
    
    // ONLY send Excel data, NEVER send backend invoice numbers
    const cleanInvoice = {
      _id: updated._id, // Keep _id only for frontend operations
      data: (() => {
        // Remove any backend-generated invoice numbers completely
        const cleanData = { ...updated.data };
        
        // Ensure we only use Excel "In_no" and remove any backend invoice numbers
        if (cleanData.invoiceNo && cleanData.invoiceNo.toString().startsWith('INV')) {
          console.warn('REMOVING BACKEND INVOICE NUMBER:', cleanData.invoiceNo);
          delete cleanData.invoiceNo;
        }
        
        // Also check and remove any other fields that might contain backend invoice numbers
        for (const [key, value] of Object.entries(cleanData)) {
          if (value && typeof value === 'string' && value.toString().startsWith('INV')) {
            console.warn('REMOVING BACKEND INVOICE NUMBER FROM FIELD:', key, 'VALUE:', value);
            delete cleanData[key];
          }
        }
        
        return cleanData;
      })(),
      // REMOVE invoiceNo field completely - only use Excel data.invoiceNo
      createdAt: updated.createdAt
    };
    
    res.json(cleanInvoice);
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

// GET /api/invoices/test - Simple test endpoint
router.get('/invoices/test', async (req, res) => {
  try {
    res.json({ 
      success: true, 
      message: 'Backend is working!',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/invoices - Clear all invoices (for testing)
router.delete('/invoices', async (req, res) => {
  try {
    // Clear all invoices to remove old data with wrong invoice numbers
    const result = await Invoice.deleteMany({});
    
    // Also clear any counters or other related data
    console.log('DEBUG: Cleared all invoices:', result.deletedCount);
    
    res.json({ 
      success: true, 
      message: `All ${result.deletedCount} invoices cleared. Old data with wrong invoice numbers has been removed.`,
      clearedCount: result.deletedCount
    });
  } catch (err) {
    console.error('Error clearing invoices:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices/clear-and-reset - Clear all data and reset database
router.post('/invoices/clear-and-reset', async (req, res) => {
  try {
    // Clear all invoices
    const deleteResult = await Invoice.deleteMany({});
    
    // Clear any other collections that might have invoice data
    console.log('DEBUG: Database reset completed. Cleared invoices:', deleteResult.deletedCount);
    
    res.json({ 
      success: true, 
      message: 'Database completely cleared and reset. All old data with wrong invoice numbers has been removed.',
      clearedInvoices: deleteResult.deletedCount
    });
  } catch (err) {
    console.error('Error resetting database:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/debug - Debug endpoint to see what's in the database
router.get('/invoices/debug', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    
    // Log detailed information about each invoice
    const debugInfo = invoices.map(invoice => ({
      _id: invoice._id,
      hasData: !!invoice.data,
      dataInvoiceNo: invoice.data?.invoiceNo,
      hasInvoiceNo: !!invoice.invoiceNo,
      invoiceNoValue: invoice.invoiceNo,
      createdAt: invoice.createdAt,
      dataKeys: invoice.data ? Object.keys(invoice.data) : []
    }));
    
    console.log('DEBUG: Database contents:', debugInfo);
    
    res.json({ 
      success: true, 
      debugInfo,
      totalInvoices: invoices.length,
      message: 'Debug information logged to console'
    });
  } catch (err) {
    console.error('Error getting debug info:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 