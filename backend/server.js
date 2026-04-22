import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();

/* ================= MIDDLEWARE ================= */

app.use(cors({ origin: "*" }));
app.use(express.json());

/* ================= SUPABASE ================= */

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error("❌ Supabase env variables missing");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/* ================= JDoodle ================= */

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ JDoodle credentials missing");
}

const getVersionIndex = (language) => {
  switch (language) {
    case "python3": return "3";
    case "nodejs": return "4";
    case "cpp17": return "0";
    case "java": return "4";
    default: return "0";
  }
};

/* ================= HEALTH CHECK ================= */

app.get("/", (req, res) => {
  res.send("✅ Backend running");
});

/* ================= RUN CODE ================= */

app.post("/run", async (req, res) => {
  try {
    const { code, language, input, userId } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: "Missing code or language" });
    }

    if (!userId) {
      return res.status(400).json({ error: "User not authenticated" });
    }

    const response = await axios.post(
      "https://api.jdoodle.com/v1/execute",
      {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        script: code,
        language,
        versionIndex: getVersionIndex(language),
        stdin: input || ""
      }
    );

    const result =
      response.data.output ||
      response.data.error ||
      "No output";

    /* ===== SAVE TO SUPABASE ===== */
    const { error: dbError } = await supabase
      .from("runs")
      .insert([
        {
          code,
          language,
          input,
          output: result,
          user_id: userId
        }
      ]);

    if (dbError) {
      console.error("❌ Supabase insert error:", dbError);
    }

    res.json({ output: result });

  } catch (error) {
    console.error("❌ ERROR:", error.response?.data || error.message);

    res.status(500).json({
      error: "Execution failed"
    });
  }
});

/* ================= USER HISTORY ================= */

app.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from("runs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("❌ History fetch error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);

  } catch (err) {
    console.error("❌ History error:", err.message);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});