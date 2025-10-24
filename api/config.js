+module.exports = (req, res) => {
+  if (req.method && req.method !== 'GET') {
+    res.status(405).json({ error: 'Method Not Allowed' });
+    return;
+  }
+
+  const supabaseUrl = process.env.SUPABASE_URL || '';
+  const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
+
+  res.setHeader('Cache-Control', 'no-store');
+  res.status(200).json({ supabaseUrl, supabaseKey });
+};
