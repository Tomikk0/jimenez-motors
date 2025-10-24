export default async function handler(req, res) {
  const dbUrl = process.env.DATABASE_URL; // ez Vercel environmentből jön
  res.status(200).json({ ok: true, message: "Hello Vercel API!" });
}
