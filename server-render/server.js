const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '100mb' }));

// Folder penyimpanan sementara dan output
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const OUTPUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

app.use('/output', express.static(OUTPUT_DIR));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Kreatif Multimedia Render Service', timestamp: new Date().toISOString() });
});

// Endpoint untuk menjalankan FFmpeg render command dari client/worker
app.post('/api/render/ffmpeg', (req, res) => {
  const { args, outputFilename } = req.body;

  if (!args || !Array.isArray(args) || !outputFilename) {
    return res.status(400).json({ error: 'Parameter "args" (array) and "outputFilename" are required.' });
  }

  const outputPath = path.join(OUTPUT_DIR, outputFilename);
  const fullArgs = [...args, outputPath];

  console.log(`[FFmpeg] Menjalankan: ffmpeg ${fullArgs.join(' ')}`);

  const ffmpegProcess = spawn('ffmpeg', fullArgs);

  let stderrLog = '';
  ffmpegProcess.stderr.on('data', (data) => {
    stderrLog += data.toString();
  });

  ffmpegProcess.on('close', (code) => {
    if (code === 0) {
      return res.json({
        success: true,
        message: 'Render berhasil selesai!',
        downloadUrl: `/output/${outputFilename}`,
        filename: outputFilename
      });
    } else {
      console.error('[FFmpeg Error]', stderrLog);
      return res.status(500).json({
        success: false,
        error: 'FFmpeg process failed',
        code,
        details: stderrLog.slice(-1000)
      });
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Kreatif Multimedia Render Service berjalan di http://localhost:${PORT}`);
});
