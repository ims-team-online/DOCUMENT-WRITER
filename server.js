const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/doc_writer_db';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ Connection error:', err));

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true }
});

const docSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  title: { type: String, default: 'Untitled Document' },
  content: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Doc = mongoose.model('Doc', docSchema);

app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'User already exists.' });
    const user = new User({ fullName, email, password });
    await user.save();
    res.status(201).json({ message: 'Success', user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ message: 'Success', user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/docs/:userEmail', async (req, res) => {
  const docs = await Doc.find({ userEmail: req.params.userEmail }).sort({ updatedAt: -1 });
  res.json(docs);
});

app.post('/api/docs/save', async (req, res) => {
  const { docId, userEmail, title, content } = req.body;
  let doc;
  if (docId) {
    doc = await Doc.findByIdAndUpdate(docId, { title, content, updatedAt: Date.now() }, { new: true });
  } else {
    doc = new Doc({ userEmail, title, content });
    await doc.save();
  }
  res.json(doc);
});

app.delete('/api/docs/:docId', async (req, res) => {
  await Doc.findByIdAndDelete(req.params.docId);
  res.json({ message: 'Deleted' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 App running on port ${PORT}`));
