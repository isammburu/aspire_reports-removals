/**
 * ASPIRE — REMOVALS WORKSPACE API
 * Reads and writes the existing Removals Tracker tab.
 * Deploy as a Web App, execute as the spreadsheet owner.
 * IMPORTANT: Anyone-with-link access is protected by TOKEN, but this is a shared-secret
 * model, not per-user authorization. Keep the token private and rotate it if exposed.
 */
const TOKEN = 'REPLACE_WITH_A_NEW_LONG_RANDOM_TOKEN';
const REMOVALS_SHEET_ID = '1RpUXx4amfVzmf4JmReY61NfSw6emS5LB70uE4hvdfCQ';
const TRACKER_TAB = 'Removals Tracker';
const ARCHIVE_TAB = 'Archive - Master Log';
const FIRST_ROW = 3;
const LAST_COL = 22;

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.token !== TOKEN) return out_({ok:false,error:'Unauthorized'});
    const action = p.action || 'list';
    if (action !== 'list') return out_({ok:false,error:'Unsupported GET action'});
    const sh = tracker_();
    const last = sh.getLastRow();
    if (last < FIRST_ROW) return out_({ok:true,rows:[],archive:archiveCount_(),at:new Date().toISOString()});
    const count = last - FIRST_ROW + 1;
    const values = sh.getRange(FIRST_ROW,1,count,LAST_COL).getValues();
    const rich = sh.getRange(FIRST_ROW,11,count,1).getRichTextValues();
    const formulas = sh.getRange(FIRST_ROW,11,count,1).getFormulas();
    const evidenceFormulas = sh.getRange(FIRST_ROW,19,count,1).getFormulas();
    const evidenceRich = sh.getRange(FIRST_ROW,19,count,1).getRichTextValues();
    const tz = Session.getScriptTimeZone();
    const rows = [];
    values.forEach((r,i) => {
      if (!String(r[2] || '').trim()) return;
      const status = str_(r[5]);
      if (status.toLowerCase() === 'archived') return;
      rows.push({
        rowNumber:FIRST_ROW+i, reg:str_(r[2]), logged:date_(r[1],tz), contact:str_(r[3]), location:str_(r[4]), status:status,
        scheduled:date_(r[6],tz), tech:str_(r[7]), techPhone:str_(r[8]), removed:date_(r[9],tz),
        jobcard:rich[i][0].getLinkUrl() || hyperlink_(formulas[i][0]) || str_(r[10]),
        email:str_(r[12]), remarks:str_(r[13]), devices:str_(r[16]), note:str_(r[17]),
        evidence:str_(r[18]), evidenceUrl:(evidenceRich[i][0] && evidenceRich[i][0].getLinkUrl()) || hyperlink_(evidenceFormulas[i][0]) || str_(r[18]),
        jobcardStatus:str_(r[19]), erp:str_(r[20]), platform:str_(r[21])
      });
    });
    return out_({ok:true,rows:rows,archive:archiveCount_(),at:Utilities.formatDate(new Date(),tz,"yyyy-MM-dd'T'HH:mm:ss")});
  } catch(err) { return out_({ok:false,error:safeError_(err)}); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.token !== TOKEN) return out_({ok:false,error:'Unauthorized'});
    lock.waitLock(20000);
    const action = String(body.action || '');
    let result;
    if (action === 'create') result = create_(body.record || {});
    else if (action === 'update') result = update_(body.rowNumber, body.expectedReg, body.record || {});
    else if (action === 'archive') result = archive_(body.rowNumber, body.expectedReg);
    else return out_({ok:false,error:'Unsupported action'});
    return out_(Object.assign({ok:true},result));
  } catch(err) { return out_({ok:false,error:safeError_(err)}); }
  finally { try { lock.releaseLock(); } catch(ignore) {} }
}

function tracker_() {
  const sh = SpreadsheetApp.openById(REMOVALS_SHEET_ID).getSheetByName(TRACKER_TAB);
  if (!sh) throw new Error('Tracker tab not found');
  return sh;
}
function create_(x) {
  const sh = tracker_();
  const reg = required_(x.reg,'Registration');
  if (findRows_(sh,reg).length) throw new Error('A record with this registration already exists');
  const target = Math.max(FIRST_ROW,sh.getLastRow()+1);
  // Write only the mapped tracker cells. Do not overwrite unrelated A:V columns,
  // formulas, formatting, or helper columns when appending a new record.
  const fields = {logged:2,reg:3,contact:4,location:5,status:6,scheduled:7,tech:8,techPhone:9,removed:10,jobcard:11,email:13,remarks:14,devices:17,note:18,evidenceUrl:19,jobcardStatus:20,erp:21,platform:22};
  Object.keys(fields).forEach(k => {
    let value = Object.prototype.hasOwnProperty.call(x,k) ? x[k] : '';
    if (k === 'logged' && !value) value = new Date();
    sh.getRange(target,fields[k]).setValue(sheetValue_(k,value));
  });
  return {rowNumber:target,reg:reg};
}
function update_(rowNumber, expectedReg, x) {
  const sh = tracker_(), rn = Number(rowNumber);
  if (!Number.isInteger(rn) || rn < FIRST_ROW || rn > sh.getLastRow()) throw new Error('Record position is no longer valid. Refresh and try again.');
  const current = String(sh.getRange(rn,3).getDisplayValue()||'').trim();
  if (norm_(current) !== norm_(expectedReg)) throw new Error('The row changed since it was loaded. Refresh before editing.');
  const fields = {logged:2,reg:3,contact:4,location:5,status:6,scheduled:7,tech:8,techPhone:9,removed:10,jobcard:11,email:13,remarks:14,devices:17,note:18,evidenceUrl:19,jobcardStatus:20,erp:21,platform:22};
  Object.keys(fields).forEach(k => { if (Object.prototype.hasOwnProperty.call(x,k)) sh.getRange(rn,fields[k]).setValue(sheetValue_(k,x[k])); });
  return {rowNumber:rn,reg:String(sh.getRange(rn,3).getDisplayValue())};
}
function archive_(rowNumber, expectedReg) {
  const sh=tracker_(), rn=Number(rowNumber);
  if (!Number.isInteger(rn) || rn<FIRST_ROW || rn>sh.getLastRow()) throw new Error('Record position is no longer valid. Refresh and try again.');
  const current=String(sh.getRange(rn,3).getDisplayValue()||'').trim();
  if (norm_(current)!==norm_(expectedReg)) throw new Error('The row changed since it was loaded. Refresh before archiving.');
  sh.getRange(rn,6).setValue('Archived');
  return {rowNumber:rn,reg:current};
}
function findRows_(sh,reg) {
  const last=sh.getLastRow(); if(last<FIRST_ROW)return [];
  return sh.getRange(FIRST_ROW,3,last-FIRST_ROW+1,1).getDisplayValues().map((r,i)=>norm_(r[0])===norm_(reg)?FIRST_ROW+i:0).filter(Boolean);
}
function archiveCount_(){const sh=SpreadsheetApp.openById(REMOVALS_SHEET_ID).getSheetByName(ARCHIVE_TAB);return sh?Math.max(0,sh.getLastRow()-1):0;}
function norm_(v){return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');}
function sheetValue_(field,value){
  if(value==null || value==='') return '';
  if(['logged','scheduled','removed'].indexOf(field)>=0 && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const p=String(value).split('-').map(Number); return new Date(p[0],p[1]-1,p[2],12,0,0);
  }
  return String(value).trim();
}
function str_(v){return v==null?'':String(v).trim();}
function date_(v,tz){return v instanceof Date?Utilities.formatDate(v,tz,'yyyy-MM-dd'):str_(v);}
function required_(v,label){const s=String(v||'').trim();if(!s)throw new Error(label+' is required');return s.toUpperCase();}
function hyperlink_(f){const m=/HYPERLINK\(["']([^"']+)["']/i.exec(f||'');return m?m[1]:'';}
function safeError_(e){return String(e&&e.message?e.message:e).slice(0,240);}
function out_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
