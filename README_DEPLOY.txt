ASPIRE REPORTS + REMOVALS — NETLIFY DEPLOY PACKAGE

CONTENTS
- index.html: Aspire application (existing dashboard, Follow-ups and Run sheet retained; Removals Workspace uses the Netlify proxy).
- netlify/functions/removals.js: server-side proxy for the Removals Apps Script endpoint.
- netlify.toml: publishes this folder and deploys the Netlify Function.
- Removals_Workspace.gs: Apps Script API source for the separate Removals Tracker spreadsheet.
- manifest.webmanifest, icons and sw.js: PWA assets.

DEPLOYMENT
1. Back up the current GitHub repository and Google Sheets before replacing files.
2. Upload the CONTENTS of this folder to the repository root (not inside another nested folder). Keep the netlify/functions directory structure intact.
3. In Netlify, set the site's Base directory to blank/repository root and Publish directory to . (dot). The netlify.toml file declares the functions directory.
4. In Google Apps Script, deploy Removals_Workspace.gs as a Web App:
   - Execute as: Me
   - Who has access: Anyone
   - Use a NEW long random token in the TOKEN constant before deploying.
   - Copy the deployed /exec URL.
5. In Netlify Site configuration > Environment variables, add:
   REMOVALS_SCRIPT_URL = the deployed Apps Script /exec URL
   REMOVALS_TOKEN = the exact same token used in Removals_Workspace.gs
   Then trigger a fresh deploy so the function receives the variables.
6. In Aspire > Removals Workspace > Connection settings, use Save and test. The URL/token fields are retained for UI compatibility; the deployed Netlify Function obtains the actual URL and token from Netlify environment variables.
7. Test reading, creating, editing and archiving a test record. Verify the correct row in the Removals Tracker sheet, then edit a value directly in Google Sheets and refresh Aspire to verify the change appears.

MAIN ASPIRE SHEET
The existing Follow-ups/main-sheet integration in index.html is preserved and continues to use its existing Apps Script URL/token configuration in the app. Its Apps Script deployment and sheet permissions must remain valid. This package does not merge the main sheet and Removals Tracker; they remain separate sources of truth.

IMPORTANT
- Never commit the private Apps Script token to GitHub.
- Do not upload only index.html: the netlify/functions/removals.js file and netlify.toml are required for the Removals proxy.
- This is a shared-secret integration, not individual user authentication. Restrict access to the site and rotate the token if exposed.
- The Apps Script URL must be the deployed /exec URL, not /dev.
