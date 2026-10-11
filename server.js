const express = require('express');
const cors = require('cors');
const { Client } = require('discord.js-selfbot-v13');

const app = express();


app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const activeClients = {};

app.get('/', (req, res) => {
  res.send('SADEEM Selfbot Backend Online 🚀');
});


app.post('/api/login', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'يرجى إدخال التوكن!' });

  if (activeClients[token]) {
    const c = activeClients[token];
    return res.json({
      success: true,
      user: {
        username: c.user.tag,
        id: c.user.id,
        avatar: c.user.displayAvatarURL({ dynamic: true }),
        nitro: c.user.premiumType ? 'Nitro' : 'Normal',
        mfa: c.user.mfaEnabled ? 'مفعلة' : 'غير مفعلة',
        email: c.user.email || 'مخفي'
      }
    });
  }

  try {
    const client = new Client({ checkUpdate: false });
    await client.login(token);
    activeClients[token] = client;

    setTimeout(() => {
      if (!client.user) return res.status(401).json({ error: 'فشل جلب الحساب' });
      res.json({
        success: true,
        user: {
          username: client.user.tag,
          id: client.user.id,
          avatar: client.user.displayAvatarURL({ dynamic: true }),
          nitro: client.user.premiumType ? 'Nitro' : 'Normal',
          mfa: client.user.mfaEnabled ? 'مفعلة' : 'غير مفعلة',
          email: client.user.email || 'مخفي'
        }
      });
    }, 1000);
  } catch (err) {
    res.status(401).json({ error: 'التوكن غير صالح أو منتهي!' });
  }
});


app.post('/api/status', (req, res) => {
  const { token, title, type, url, imageBase64 } = req.body;
  const client = activeClients[token];
  if (!client) return res.status(401).json({ error: 'الجلسة غير مسجلة' });

  try {
    client.user.setPresence({
      activities: [{
        name: title,
        type: type || 'STREAMING',
        url: url || 'https://www.twitch.tv/iinvkq',
        assets: { largeImage: imageBase64 || undefined }
      }],
      status: 'online'
    });
    res.json({ success: true, message: 'تم تحديث حالة البث بنجاح!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/api/autoreact', (req, res) => {
  const { token, mode, targetChannelId } = req.body;
  const client = activeClients[token];
  if (!client) return res.status(401).json({ error: 'الجلسة غير مسجلة' });

  client.on('messageReactionAdd', async (reaction, user) => {
    if (user.id === client.user.id) return;

    let shouldMirror = false;
    if (mode === 'GLOBAL') shouldMirror = true;
    if (mode === 'CHANNEL' && reaction.message.channel.id === targetChannelId) shouldMirror = true;

    if (shouldMirror) {
      try { await reaction.message.react(reaction.emoji); } catch (e) {}
    }
  });

  res.json({ success: true, message: 'تم تفعيل التفاعل التلقائي المنسوخ!' });
});


app.post('/api/voice/join', async (req, res) => {
  const { token, channelId, mute, deaf, video } = req.body;
  const client = activeClients[token];
  if (!client) return res.status(401).json({ error: 'الجلسة غير مسجلة' });

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isVoice()) return res.status(400).json({ error: 'الروم الصوتي غير موجود' });

    await client.voice.joinChannel(channel, { selfMute: !!mute, selfDeaf: !!deaf, selfVideo: !!video });
    res.json({ success: true, message: 'تم الانضمام للروم الصوتي 24/7!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/api/afk', (req, res) => {
  const { token, messageText } = req.body;
  const client = activeClients[token];
  if (!client) return res.status(401).json({ error: 'الجلسة غير مسجلة' });

  client.on('messageCreate', async (message) => {
    if (message.author.id === client.user.id) return;
    if (message.mentions.has(client.user.id) || message.channel.type === 'DM') {
      try { await message.reply(messageText || 'أنا في وضع AFK.'); } catch (e) {}
    }
  });

  res.json({ success: true, message: 'تم تفعيل وضع AFK بنجاح!' });
});


app.post('/api/spam', async (req, res) => {
  const { token, channelId, messageText, count, delay } = req.body;
  const client = activeClients[token];
  if (!client) return res.status(401).json({ error: 'الجلسة غير مسجلة' });

  try {
    const channel = await client.channels.fetch(channelId);
    let sent = 0;
    const interval = setInterval(async () => {
      if (sent >= count) return clearInterval(interval);
      try { await channel.send(messageText); sent++; } catch (e) {}
    }, (delay || 3) * 1000);

    res.json({ success: true, message: 'تم بدء النشر والتكرار التلقائي!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/api/purge', async (req, res) => {
  const { token, amount } = req.body;
  const client = activeClients[token];
  if (!client) return res.status(401).json({ error: 'الجلسة غير مسجلة' });
  res.json({ success: true, message: `جاري مسح آخر ${amount} رسالة...` });
});

app.post('/api/logout', (req, res) => {
  const { token } = req.body;
  if (activeClients[token]) {
    activeClients[token].destroy();
    delete activeClients[token];
  }
  res.json({ success: true, message: 'تم إيقاف الجلسة' });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));