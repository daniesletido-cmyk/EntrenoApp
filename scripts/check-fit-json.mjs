import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('data/entrenoapp.db');

const rows = db.prepare('SELECT id, date, discipline, planned_code, fit_data FROM sessions WHERE fit_data IS NOT NULL').all();
console.log(`Found ${rows.length} sessions with fit_data:`);
rows.forEach(r => {
  console.log(`Session ${r.id} (${r.date} - ${r.discipline}):`);
  try {
    const parsed = JSON.parse(r.fit_data);
    console.log('Keys in parsed:', Object.keys(parsed));
    if (parsed.structuredFeedback) {
      console.log('structuredFeedback:', {
        verdict: parsed.structuredFeedback.complianceVerdict,
        tone: parsed.structuredFeedback.complianceTone,
        bullets: parsed.structuredFeedback.technicalBullets?.length,
        suunto: parsed.structuredFeedback.suuntoReport
      });
    }
    if (parsed.deepAnalysis) {
      console.log('deepAnalysis keys:', Object.keys(parsed.deepAnalysis));
      if (parsed.deepAnalysis.suuntoMetrics) {
        console.log('suuntoMetrics:', parsed.deepAnalysis.suuntoMetrics);
      }
    }
  } catch(e) {
    console.error('Error parsing JSON:', e.message);
  }
});
