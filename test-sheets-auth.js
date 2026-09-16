import "dotenv/config";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

const auth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

try {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
  await doc.loadInfo();
  console.log("✅ Authentication successful!");
  console.log("📄 Spreadsheet title:", doc.title);
  console.log("📊 Sheets:", doc.sheetsByTitle);
} catch (error) {
  console.error("❌ Error:", error.message);
}
