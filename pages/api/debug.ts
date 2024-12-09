export default function handler(req, res) {
  const apiKey = process.env.COVALENT_API_KEY;
  console.log("COVALENT_API_KEY:", apiKey);  // Log the environment variable
  
  if (!apiKey) {
    return res.status(500).json({ success: false, error: "COVALENT_API_KEY is not set properly!" });
  }
  
  res.status(200).json({ success: true, apiKey });
}
