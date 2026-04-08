import express from "express";
import { createServer as createViteServer } from "vite";
import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API route for PDF generation
  app.post("/api/generate-pdf", async (req, res) => {
    const { html, fileName } = req.body;

    if (!html) {
      return res.status(400).json({ error: "HTML content is required" });
    }

    let browser;
    try {
      browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: true,
      });
      const page = await browser.newPage();
      
      // Set content and wait for it to be loaded
      await page.setContent(html, { waitUntil: "networkidle0" });
      
      // Generate PDF
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "0mm",
          right: "0mm",
          bottom: "0mm",
          left: "0mm",
        },
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${fileName || "resume.pdf"}`);
      res.send(pdf);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
