const express = require('express');
const path = require('path');

module.exports = function(app) {
  // Serve PMTiles files directly without React routing interference
  app.use('/tiles', express.static(path.join(__dirname, '../public/tiles'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.pmtiles')) {
        res.set('Content-Type', 'application/octet-stream');
        res.set('Accept-Ranges', 'bytes');
        res.set('Cache-Control', 'public, max-age=31536000');
      }
    }
  }));
  
  console.log('✅ Static file proxy configured for /tiles');
};
