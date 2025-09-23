import fs from 'fs';
import path from 'path';

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

// Count pass/fail
let pass = 0, fail = 0;
const tableRows = [];

for (const r of results) {
  const metrics = r.data?.metrics;
  const checks = metrics?.checks;

  if (!metrics) {
    console.warn(`⚠️ Skipping ${r.name} — no metrics found (possibly failed or incomplete)`);
    fail++;
    tableRows.push({
      name: r.name,
      passes: 0,
      total: 0,
      avg: 'N/A',
      p95: 'N/A',
      failed: true
    });
    continue;
  }

  const passes = checks?.passes ?? 0;
  const total = checks?.count ?? 0;
  const avg = metrics["http_req_duration"]?.values?.["avg"];
  const p95 = metrics["http_req_duration"]?.values?.["p(95)"];

  const failed = passes !== total;
  if (!failed) pass++;
  else fail++;

  tableRows.push({
    name: r.name,
    passes,
    total,
    avg: avg != null ? avg.toFixed(2) : 'N/A',
    p95: p95 != null ? p95.toFixed(2) : 'N/A',
    failed
  });
}

// Generate HTML with embedded Chart.js
const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>K6 Consolidated Report</title>
  <style>
    body { font-family: sans-serif; margin: 2rem; }
    table { border-collapse: collapse; width: 100%; margin-top: 2rem; }
    th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
    th { background-color: #eee; }
    .failed { color: red; }
    .passed { color: green; }
  </style>
</head>
<body>
  <h1>K6 Test Summary Report</h1>
  <p><strong>Total Scripts:</strong> ${results.length}</p>
  <p><strong>Passed:</strong> ${pass} | <strong>Failed:</strong> ${fail}</p>

  <canvas id="pieChart" width="400" height="400"></canvas>

  <table>
    <thead>
      <tr>
        <th>Test Name</th>
        <th>Checks (passed / total)</th>
        <th>Avg Duration (ms)</th>
        <th>p(95) (ms)</th>
        <th>Failed?</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows.map(r => `
        <tr>
          <td>${r.name}</td>
          <td>${r.passes} / ${r.total}</td>
          <td>${r.avg}</td>
          <td>${r.p95}</td>
          <td class="${r.failed ? 'failed' : 'passed'}">${r.failed ? 'Yes' : 'No'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
    const ctx = document.getElementById('pieChart').getContext('2d');
    const pieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Passed', 'Failed'],
        datasets: [{
          data: [${pass}, ${fail}],
          backgroundColor: ['#4CAF50', '#F44336']
        }]
      },
      options: {
        responsive: false
      }
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(reportFile, html);
console.log(`✅ Consolidated report generated at: ${reportFile}`);
