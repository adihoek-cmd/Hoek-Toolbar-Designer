import {normalizeIncomingReport} from './repair-normalize.js';
import {applyReport,planReport} from './repair-reports.js';
export async function prepareClaudeUpdate(payload,input){
 const report=await normalizeIncomingReport(input),plan=planReport(payload.state,report);
 const invalid=plan.entries.filter(e=>e.reason&&!e.reason.startsWith('כבר יובא'));
 if(invalid.length)throw Error('Unmatched or outdated report: '+invalid.map(e=>e.nodeId+' '+e.reason).join('; '));
 const result=applyReport(payload.state,report);
 if(!result.count)return {payload,count:0,report};
 return {payload:{...payload,state:result.state,history:[{label:'Claude Code: '+report.packageVersion+' · '+result.count+' דיווחים',time:new Date().toISOString()},...(payload.history||[])].slice(0,120)},count:result.count,report};
}
