import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// 🎯 Language version mapping
const getVersionIndex = (language) => {
  switch (language) {
    case "python3": return "3";
    case "nodejs": return "4";
    case "cpp17": return "0";
    case "java": return "4";
    default: return "0";
  }
};

app.post("/run", async (req, res) => {
  try {
    const { code, language, input } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: "Missing code or language" });
    }

    const response = await axios.post(
      "https://api.jdoodle.com/v1/execute",
      {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        script: code,
        language: language,
        versionIndex: getVersionIndex(language),
        stdin: input || ""
      }
    );

    res.json({
      output:
        response.data.output ||
        response.data.error ||
        "No output"
    });

  } catch (error) {
    console.error("ERROR:", error.response?.data || error.message);

    res.status(500).json({
      error: "Execution failed"
    });
  }
});

app.listen(5000, () => {
  console.log("JDoodle backend running on http://localhost:5000");
});