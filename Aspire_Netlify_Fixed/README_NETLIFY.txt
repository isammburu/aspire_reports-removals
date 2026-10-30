ASPIRE — NETLIFY DROP PACKAGE

DEPLOYMENT
1. Extract this ZIP.
2. In Netlify, use Add new site / Deploy manually (Netlify Drop).
3. Drag the extracted folder (the folder containing index.html) into Netlify Drop.
   Do NOT upload the ZIP itself if your Netlify interface expects a folder.
4. Netlify must show index.html at the top level of the deployed files.

WHY THIS PACKAGE IS DIFFERENT
The original archive placed index.html inside an aspire-app/ subfolder. Netlify was publishing the archive root, where no index.html existed, causing Page Not Found. This package places index.html, manifest.webmanifest, sw.js and icons together at the deployment root. The original HTML file has not been rewritten.

GOOGLE SHEETS / APPS SCRIPT
Removals_Workspace.gs is a Google Apps Script source file. It is NOT a Netlify function and is not executed by Netlify. Deploy it separately from script.google.com as a Web App, then configure its /exec URL and token in Aspire's Removals Workspace connection settings as described in the original setup instructions.

IMPORTANT LIMITATION
This fixes the Netlify static-site 404 caused by the nested index.html. It does not convert the browser-to-Apps-Script connection into a Netlify serverless proxy, nor does it resolve any possible Google Apps Script CORS/authentication issues. Those are separate integration issues to test after the site loads.
