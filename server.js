const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3456;
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const JWT_EXPIRES = '24h';

function readData() {
  try { var raw = fs.readFileSync(DATA_FILE, 'utf-8'); var obj = JSON.parse(raw); return { users: obj.users || [], loginLogs: obj.loginLogs || [], posts: obj.posts || [] }; }
  catch (_) { return { users: [], loginLogs: [], posts: [] }; }
}
function writeData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8'); }

(function seedAdmin() {
  var data = readData();
  if (!data.users.some(function (u) { return u.role === 'admin'; })) {
    data.users.push({
      id: crypto.randomUUID(), student_id: 'admin', name: '系统管理员',
      password: bcrypt.hashSync('admin123', 10), gender: '', phone: '', email: '',
      avatar: '', address: '', occupation: '', graduate_year: '', role: 'admin', status: 1,
      create_time: new Date().toISOString(), update_time: new Date().toISOString(), last_login_time: null
    });
    writeData(data);
  }
})();

var uploadsDir = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

var storage = multer.diskStorage({
  destination: uploadsDir,
  filename: function (req, file, cb) {
    var ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomBytes(12).toString('hex') + ext);
  }
});
var upload = multer({
  storage: storage, limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    var allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    cb(null, allowed.indexOf(path.extname(file.originalname).toLowerCase()) !== -1);
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads')));

function authMiddleware(req, res, next) {
  var header = req.headers.authorization;
  if (!header || header.indexOf('Bearer ') !== 0) return res.status(401).json({ error: '未登录，请先登录' });
  try { req.user = jwt.verify(header.split(' ')[1], JWT_SECRET); next(); }
  catch (_) { return res.status(401).json({ error: '登录已过期，请重新登录' }); }
}
function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '权限不足，仅管理员可操作' });
  next();
}
function sanitizeUser(user) {
  var obj = {};
  Object.keys(user).forEach(function (k) { if (k !== 'password') obj[k] = user[k]; });
  return obj;
}

// Register
app.post('/api/auth/register', function (req, res) {
  var b = req.body;
  var sid = (b.student_id || '').trim(), name = (b.name || '').trim(), pw = b.password || '', cpw = b.confirm_password || '', gy = (b.graduate_year || '').trim();
  if (!sid || !name || !pw || !gy) return res.status(400).json({ error: '请填写所有必填项' });
  if (pw.length < 6) return res.status(400).json({ error: '密码长度不能少于6位' });
  if (pw !== cpw) return res.status(400).json({ error: '两次密码输入不一致' });
  var data = readData();
  if (data.users.some(function (u) { return u.student_id === sid; })) return res.status(409).json({ error: '该学号已被注册' });
  var user = {
    id: crypto.randomUUID(), student_id: sid, name: name, password: bcrypt.hashSync(pw, 10),
    gender: b.gender || '', phone: b.phone || '', email: b.email || '', avatar: '', address: b.address || '', occupation: b.occupation || '',
    graduate_year: gy, role: 'user', status: 1,
    create_time: new Date().toISOString(), update_time: new Date().toISOString(), last_login_time: null
  };
  data.users.push(user); writeData(data);
  var token = jwt.sign({ id: user.id, student_id: user.student_id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.status(201).json({ token: token, user: sanitizeUser(user) });
});

// Login
app.post('/api/auth/login', function (req, res) {
  var sid = (req.body.student_id || '').trim(), pw = req.body.password || '';
  if (!sid || !pw) return res.status(400).json({ error: '请输入学号和密码' });
  var data = readData();
  var user = data.users.find(function (u) { return u.student_id === sid; });
  if (!user) return res.status(401).json({ error: '学号或密码错误' });
  if (user.status !== 1) return res.status(403).json({ error: '账号已被禁用，请联系管理员' });
  if (!bcrypt.compareSync(pw, user.password)) return res.status(401).json({ error: '学号或密码错误' });
  user.last_login_time = new Date().toISOString();
  data.loginLogs.push({ id: crypto.randomUUID(), user_id: user.id, login_time: user.last_login_time, login_ip: req.ip || req.connection.remoteAddress });
  writeData(data);
  var token = jwt.sign({ id: user.id, student_id: user.student_id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.json({ token: token, user: sanitizeUser(user) });
});

// Current user
app.get('/api/auth/me', authMiddleware, function (req, res) {
  var data = readData(); var user = data.users.find(function (u) { return u.id === req.user.id; });
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(sanitizeUser(user));
});

// Update profile
app.put('/api/auth/me', authMiddleware, function (req, res) {
  var data = readData(); var user = data.users.find(function (u) { return u.id === req.user.id; });
  if (!user) return res.status(404).json({ error: '用户不存在' });
  var b = req.body;
  if (b.name !== undefined) user.name = b.name;
  if (b.phone !== undefined) user.phone = b.phone;
  if (b.email !== undefined) user.email = b.email;
  if (b.graduate_year !== undefined) user.graduate_year = b.graduate_year;
  if (b.gender !== undefined) user.gender = b.gender;
  if (b.address !== undefined) user.address = b.address;
  if (b.occupation !== undefined) user.occupation = b.occupation;
  user.update_time = new Date().toISOString(); writeData(data);
  res.json(sanitizeUser(user));
});

// Change password
app.put('/api/auth/me/password', authMiddleware, function (req, res) {
  var b = req.body;
  if (!b.old_password || !b.new_password) return res.status(400).json({ error: '请输入原密码和新密码' });
  if (b.new_password.length < 6) return res.status(400).json({ error: '新密码长度不能少于6位' });
  var data = readData(); var user = data.users.find(function (u) { return u.id === req.user.id; });
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (!bcrypt.compareSync(b.old_password, user.password)) return res.status(400).json({ error: '原密码错误' });
  user.password = bcrypt.hashSync(b.new_password, 10); user.update_time = new Date().toISOString();
  writeData(data); res.json({ success: true, message: '密码修改成功' });
});

// Upload avatar
app.post('/api/auth/me/avatar', authMiddleware, upload.single('avatar'), function (req, res) {
  var data = readData(); var user = data.users.find(function (u) { return u.id === req.user.id; });
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (!req.file) return res.status(400).json({ error: '请选择图片' });
  if (user.avatar) { try { fs.unlinkSync(path.join(__dirname, 'public', user.avatar)); } catch (_) {} }
  user.avatar = '/uploads/' + req.file.filename; user.update_time = new Date().toISOString();
  writeData(data); res.json(sanitizeUser(user));
});

// List users
app.get('/api/users', authMiddleware, function (req, res) {
  var data = readData(); var users = data.users.slice();
  var search = (req.query.search || '').toLowerCase();
  var gy = req.query.graduate_year || '';
  if (search) {
    users = users.filter(function (u) {
      return (u.name && u.name.toLowerCase().indexOf(search) !== -1) || (u.student_id && u.student_id.toLowerCase().indexOf(search) !== -1);
    });
  }
  if (gy) users = users.filter(function (u) { return u.graduate_year === gy; });
  users.sort(function (a, b) { return new Date(b.create_time) - new Date(a.create_time); });
  var page = parseInt(req.query.page) || 1, ps = parseInt(req.query.pageSize) || 50;
  var total = users.length, start = (page - 1) * ps;
  res.json({ list: users.slice(start, start + ps).map(sanitizeUser), total: total, page: page, pageSize: ps });
});

// User detail
app.get('/api/users/:id', authMiddleware, function (req, res) {
  var data = readData(); var user = data.users.find(function (u) { return u.id === req.params.id; });
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(sanitizeUser(user));
});

// Admin: update user
app.put('/api/users/:id', authMiddleware, adminMiddleware, function (req, res) {
  var data = readData(); var user = data.users.find(function (u) { return u.id === req.params.id; });
  if (!user) return res.status(404).json({ error: '用户不存在' });
  var b = req.body;
  if (b.name !== undefined) user.name = b.name;
  if (b.student_id !== undefined) user.student_id = b.student_id;
  if (b.phone !== undefined) user.phone = b.phone;
  if (b.email !== undefined) user.email = b.email;
  if (b.graduate_year !== undefined) user.graduate_year = b.graduate_year;
  if (b.gender !== undefined) user.gender = b.gender;
  if (b.address !== undefined) user.address = b.address;
  if (b.occupation !== undefined) user.occupation = b.occupation;
  if (b.role !== undefined) user.role = b.role;
  user.update_time = new Date().toISOString(); writeData(data);
  res.json(sanitizeUser(user));
});

// Admin: delete user
app.delete('/api/users/:id', authMiddleware, adminMiddleware, function (req, res) {
  var data = readData(); var idx = -1;
  for (var i = 0; i < data.users.length; i++) { if (data.users[i].id === req.params.id) { idx = i; break; } }
  if (idx === -1) return res.status(404).json({ error: '用户不存在' });
  var user = data.users[idx];
  if (user.role === 'admin') return res.status(403).json({ error: '不能删除管理员账号' });
  if (user.avatar) { try { fs.unlinkSync(path.join(__dirname, 'public', user.avatar)); } catch (_) {} }
  data.users.splice(idx, 1); writeData(data);
  res.json({ success: true });
});

// Admin: toggle status
app.put('/api/users/:id/status', authMiddleware, adminMiddleware, function (req, res) {
  var data = readData(); var user = data.users.find(function (u) { return u.id === req.params.id; });
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (user.role === 'admin') return res.status(403).json({ error: '不能禁用管理员账号' });
  user.status = user.status === 1 ? 0 : 1; user.update_time = new Date().toISOString();
  writeData(data); res.json(sanitizeUser(user));
});

// Admin: reset password
app.post('/api/users/:id/reset-password', authMiddleware, adminMiddleware, function (req, res) {
  var data = readData(); var user = data.users.find(function (u) { return u.id === req.params.id; });
  if (!user) return res.status(404).json({ error: '用户不存在' });
  user.password = bcrypt.hashSync('123456', 10); user.update_time = new Date().toISOString();
  writeData(data); res.json({ success: true, message: '密码已重置为 123456' });
});

// Admin stats
app.get('/api/admin/stats', authMiddleware, adminMiddleware, function (req, res) {
  var data = readData(); var users = data.users;
  var byYear = {};
  users.forEach(function (u) { if (u.graduate_year) byYear[u.graduate_year] = (byYear[u.graduate_year] || 0) + 1; });
  var d30 = new Date(Date.now() - 30*24*60*60*1000);
  var recent = users.filter(function (u) { return new Date(u.create_time) > d30; }).length;
  var today = new Date(); today.setHours(0,0,0,0);
  var activeToday = users.filter(function (u) { return u.last_login_time && new Date(u.last_login_time) > today; }).length;
  var byRole = {};
  users.forEach(function (u) { byRole[u.role] = (byRole[u.role] || 0) + 1; });
  var rl = data.loginLogs.slice().sort(function (a,b) { return new Date(b.login_time)-new Date(a.login_time); }).slice(0,10).map(function (log) {
    var u = users.find(function (u2) { return u2.id === log.user_id; });
    return { id: log.id, user_name: u?u.name:'未知', user_student_id: u?u.student_id:'', login_time: log.login_time, login_ip: log.login_ip };
  });
  res.json({ total: users.length, byYear: byYear, recent: recent, activeToday: activeToday, byRole: byRole, recentLogins: rl });
});

// Graduate years
app.get('/api/years', authMiddleware, function (req, res) {
  var data = readData(); var years = [];
  data.users.forEach(function (u) { if (u.graduate_year && years.indexOf(u.graduate_year)===-1) years.push(u.graduate_year); });
  years.sort(); res.json(years);
});


// ================================================================
//  FORUM ROUTES
// ================================================================

// List posts
app.get('/api/posts', authMiddleware, function (req, res) {
  var data = readData();
  var posts = data.posts.slice().sort(function (a, b) { return new Date(b.create_time) - new Date(a.create_time); });
  var result = posts.map(function (p) {
    var author = data.users.find(function (u) { return u.id === p.user_id; });
    return {
      id: p.id, title: p.title, content: p.content,
      author_name: author ? author.name : '未知',
      author_avatar: author ? author.avatar : '',
      comment_count: (p.comments || []).length,
      create_time: p.create_time
    };
  });
  res.json(result);
});

// Create post
app.post('/api/posts', authMiddleware, function (req, res) {
  var title = (req.body.title || '').trim();
  var content = (req.body.content || '').trim();
  if (!title || !content) return res.status(400).json({ error: '标题和内容不能为空' });
  var data = readData();
  var post = {
    id: crypto.randomUUID(), user_id: req.user.id,
    title: title, content: content,
    comments: [], create_time: new Date().toISOString()
  };
  data.posts.push(post); writeData(data);
  res.status(201).json(post);
});

// Get post detail (with comments)
app.get('/api/posts/:id', authMiddleware, function (req, res) {
  var data = readData();
  var post = data.posts.find(function (p) { return p.id === req.params.id; });
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  var author = data.users.find(function (u) { return u.id === post.user_id; });
  var comments = (post.comments || []).map(function (c) {
    var cu = data.users.find(function (u) { return u.id === c.user_id; });
    return { id: c.id, content: c.content, create_time: c.create_time, user_id: c.user_id, author_name: cu ? cu.name : '未知', author_avatar: cu ? cu.avatar : '' };
  });
  res.json({
    id: post.id, title: post.title, content: post.content, user_id: post.user_id,
    author_name: author ? author.name : '未知', author_avatar: author ? author.avatar : '',
    comments: comments, create_time: post.create_time
  });
});

// Add comment
app.post('/api/posts/:id/comments', authMiddleware, function (req, res) {
  var content = (req.body.content || '').trim();
  if (!content) return res.status(400).json({ error: '评论内容不能为空' });
  var data = readData();
  var post = data.posts.find(function (p) { return p.id === req.params.id; });
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  if (!post.comments) post.comments = [];
  var comment = { id: crypto.randomUUID(), user_id: req.user.id, content: content, create_time: new Date().toISOString() };
  post.comments.push(comment); writeData(data);
  var cu = data.users.find(function (u) { return u.id === req.user.id; });
  res.status(201).json({ id: comment.id, content: comment.content, create_time: comment.create_time, user_id: comment.user_id, author_name: cu ? cu.name : '未知', author_avatar: cu ? cu.avatar : '' });
});

// Delete post (admin or author)
app.delete('/api/posts/:id', authMiddleware, function (req, res) {
  var data = readData();
  var idx = -1;
  for (var i = 0; i < data.posts.length; i++) { if (data.posts[i].id === req.params.id) { idx = i; break; } }
  if (idx === -1) return res.status(404).json({ error: '帖子不存在' });
  if (req.user.role !== 'admin' && data.posts[idx].user_id !== req.user.id) return res.status(403).json({ error: '无权删除' });
  data.posts.splice(idx, 1); writeData(data);
  res.json({ success: true });
});

// Delete comment (admin or author)
app.delete('/api/posts/:id/comments/:cid', authMiddleware, function (req, res) {
  var data = readData();
  var post = data.posts.find(function (p) { return p.id === req.params.id; });
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  var cidx = -1;
  for (var i = 0; i < post.comments.length; i++) { if (post.comments[i].id === req.params.cid) { cidx = i; break; } }
  if (cidx === -1) return res.status(404).json({ error: '评论不存在' });
  if (req.user.role !== 'admin' && post.comments[cidx].user_id !== req.user.id) return res.status(403).json({ error: '无权删除' });
  post.comments.splice(cidx, 1); writeData(data);
  res.json({ success: true });
});

// SPA fallback
app.get('*', function (req, res) {
  if (req.path.indexOf('/api/') === 0) return res.status(404).json({ error: '接口不存在' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.VERCEL) {
  module.exports = app;
} else {
  var server = app.listen(PORT, function () {
    console.log('CRMS running: http://localhost:' + PORT);
    console.log('Admin: admin / admin123');
  });
  server.on('error', function (err) { console.error('FAIL:', err.message); process.exit(1); });
}
