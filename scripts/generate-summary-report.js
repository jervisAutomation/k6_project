// scripts/generate-summary-report.js
import fs from 'fs';
import path from 'path';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

const summariesDir = './results';
const reportFile = './results/summary-report.html';

// Read all JSON files
const jsonFiles = fs.readdirSync(summariesDir).filter(f => f.endsWith('.json'));
const results = [];

for (const file of jsonFiles) {
  const content = fs.readFileSync(path.join(summariesDir, file), 'utf-8');
  const lines = content.trim().split('\n');
  const lastLine = lines[lines.length - 1];
  let json;
  try {
    json = JSON.parse(lastLine);
    results.push({ name: file.replace('.json', ''), data: json });
  } catch (err) {
    console.warn(`⚠️ Skipping ${file}: could not parse JSON`);
  }
}

// Generate pie chart
let pass = 0, fail = 0;
for (const r of results) {
  const metrics = r.data?.metrics;
  const checks = metrics?.checks;

  if (!metrics) {
    console.warn(`⚠️ Skipping ${r.name} — no metrics found (possibly failed or incomplete)`);
    fail++;
    continue;
  }

  if (checks?.passes === checks?.count) pass++;
  else fail++;
}

// Generate pie chart image
const width = 400;
const height = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });
const pieImage = await chartJSNodeCanvas.renderToDataURL({
  type: 'pie',
  data: {
    labels: ['Passed', 'Failed'],
    datasets: [{
      data: [pass, fail],
      backgroundColor: ['#4CAF50', '#F44336'],
    }]
  }
});

// Generate HTML
let html = `
<!DOCTYPE html>
<html>
<head>
  <title>K6 Consolidated Report</title>
  <style>
    body { font-family: sans-serif; margin: 2rem; }
    table { border-collapse: collapse; width: 100%; margin-top: 2rem; }
    th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
    th { background-color: #eee; }
  </style>
</head>
<body>
  <h1>K6 Test Summary Report</h1>
  <p><strong>Total Scripts:</strong> ${results.length}</p>
  <p><strong>Passed:</strong> ${pass} | <strong>Failed:</strong> ${fail}</p>
  <img src="${pieImage}" width="${width}" height="${height}" alt="Pass/Fail Pie Chart"/>

  <table>
    <thead>
      <tr>
        <th>Test Name</th>
        <th>Checks</th>
        <th>Avg Duration</th>
        <th>p(95)</th>
        <th>Failed?</th>
      </tr>
    </thead>
    <tbody>
`;

for (const r of results) {
  const metrics = r.data?.metrics;
  if (!metrics) continue;

  const checks = metrics.checks || {};
  const duration = metrics["http_req_duration"]?.values?.["avg"]?.toFixed(2) ?? "N/A";
  const p95 = metrics["http_req_duration"]?.values?.["p(95)"]?.toFixed(2) ?? "N/A";
  const failed = checks.passes !== checks.count;

  html += `
      <tr>
        <td>${r.name}</td>
        <td>${checks.passes ?? 0} / ${checks.count ?? 0}</td>
        <td>${duration} ms</td>
        <td>${p95} ms</td>
        <td style="color:${failed ? 'red' : 'green'}">${failed ? 'Yes' : 'No'}</td>
      </tr>
  `;
}

html += `
    </tbody>
  </table>
</body>
</html>
`;

fs.writeFileSync(reportFile, html);
console.log(`✅ Consolidated report generated at: ${reportFile}`);
