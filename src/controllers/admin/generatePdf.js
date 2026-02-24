const { query } = require('../../config/db')
const { errorGenerator } = require('../../utils/errorGenarator')
const puppeteer = require('puppeteer');

let browserInstance = null;
let browserPromise = null;
let requestCount = 0;

// Helper for date formatting
const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-PK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return 'N/A';
  }
};
// Helper function to format damage level nicely
function formatDamageLevel(level) {
  if (!level) return 'N/A';

  // Convert database values to display format
  const levelMap = {
    'minor': 'Only Water & Silt',
    'major': 'Minor Damage',
    'fully_destroyed': 'Fully Destroyed'
  };

  return levelMap[level] || level.replace('_', ' ');
}

const getBrowser = async () => {
  requestCount++;

  if (browserInstance && requestCount > 100) {
    console.log("Refreshing browser instance...");
    const oldBrowser = browserInstance;
    browserInstance = null;
    requestCount = 0;
    oldBrowser.close().catch(e => console.error("Error closing old browser:", e));
  }

  if (browserInstance) return browserInstance;

  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none'
      ]
    }).then(browser => {
      browserInstance = browser;
      browserPromise = null;
      return browser;
    }).catch(err => {
      browserPromise = null;
      throw err;
    });
  }
  return browserPromise;
};

const generatePdf = async (req, res, next) => {
  let context;
  let page;
  try {
    const browser = await getBrowser();
    context = await browser.createBrowserContext();
    page = await context.newPage();

    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (['font', 'stylesheet'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Get report_id from request
    const reportId = req.body?.report_id || req.query?.report_id;

    if (!reportId) {
      return next(errorGenerator('Report ID is required', 400));
    }

    // Execute SQL query
    const { rows } = await query(`
     SELECT
    dr.report_id,
    NOW() AS report_date,
    initcap(dr.disaster_type::text) as disaster_type,
    dr.created_at AS incident_date,
    dr.big_animals_death_count,
    dr.small_animals_death_count,
    dr.small_animals_injured_count,
    -- Home Damage Level (single value)
    CASE
        WHEN dr.is_home_impacted THEN dr.home_damage_level
        ELSE NULL
    END AS home_damage_level,
    -- Shop Damage Level (single value)
    CASE
        WHEN dr.is_shop_impacted THEN dr.shop_damage_level
        ELSE NULL
    END AS shop_damage_level,
    initcap(u.name) as name,
    initcap(u.father_name) as father_name,
    u.cnic,
    u.phone_number,
    initcap(u.muhalla) as muhalla,
    initcap(u.district) as district,
    initcap(u.village) as village,
    initcap(u.tehsil) as tehsil,
    dr.total_residents_count,
    dr.deaths_count,
    dr.injured_count,
    dr.disabled_persons_count,
    dr.big_animals_injured_count,
    CASE
        WHEN dr.is_home_impacted THEN true
        ELSE false
    END AS has_home_damage,
    CASE
        WHEN dr.is_shop_impacted THEN true
        ELSE false
    END AS has_shop_damage
FROM users u
    JOIN disaster_report dr ON dr.reporter_id = u.user_id
where
    dr.report_id = $1
`, [reportId]);

    if (rows.length === 0) {
      return next(errorGenerator('Report Not Found', 404));
    }

    const data = rows[0];

    // Map database fields to template placeholders - USING EXACT TEMPLATE KEYS
    const templateData = {
      // Report Metadata
      report_id: data.report_id,
      report_date: formatDate(data.report_date),
      disaster_type: data.disaster_type || 'N/A',
      incident_date: formatDate(data.incident_date),

      // Personal Details
      full_name: data.name || 'N/A', // Note: template uses {{full_name}}
      father_name: data.father_name || 'N/A',
      cnic: data.cnic || 'N/A',
      mobile: data.phone_number || 'N/A', // Note: template uses {{mobile}}
      district: data.district || 'N/A',
      tehsil: data.tehsil || 'N/A',
      village: data.village || 'N/A',
      muhalla: data.muhalla || 'N/A', // Not used in template (uses village field)

      // Home Damage - SINGLE LEVEL
      home_damage_level: data.home_damage_level
        ? formatDamageLevel(data.home_damage_level)
        : 'N/A',

      // Shop Damage - SINGLE LEVEL
      shop_damage_level: data.shop_damage_level
        ? formatDamageLevel(data.shop_damage_level)
        : 'N/A',

      // Human Casualty
      total_residents: data.total_residents_count || '0', // Note: template uses {{total_residents}}
      deaths_count: data.deaths_count || '0',
      injured_count: data.injured_count || '0',
      disabled_count: data.disabled_persons_count || '0', // Note: template uses {{disabled_count}}

      // Livestock
      big_deaths: data.big_animals_death_count || '0', // Note: template uses {{big_deaths}}
      big_injured: data.big_animals_injured_count || '0', // Note: template uses {{big_injured}}
      small_deaths: data.small_animals_death_count || '0', // Note: template uses {{small_deaths}}
      small_injured: data.small_animals_injured_count || '0', // Note: template uses {{small_injured}}

      // Boolean flags for conditional rendering
      has_home_damage: data.has_home_damage || false,
      has_shop_damage: data.has_shop_damage || false,

      // Signature data (you may need to add these)
      signature_date: formatDate(new Date()),
      verifying_officer: '___________________',
      verifying_designation: '___________________',
      generation_timestamp: formatDate(new Date())
    };

    // Your HTML template (the one you shared) - I'll include it briefly
    const template = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Individual Relief Compensation Report</title>
    <style>
      /* YOUR ORIGINAL HEADER STYLES (untouched) */
      header {
        padding: 10px 20px; /* Reduced from 20px */
        font-family: "Times New Roman", serif;
      }
      #top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        text-align: center;
      }
      .img-container {
        width: 90px; /* Reduced from 120px */
        flex-shrink: 0;
      }
      .img-container img {
        width: 100%;
        height: auto;
        display: block;
      }
      .centerItems {
        flex-grow: 1;
      }
      .centerItems h1 {
        margin: 0;
        font-size: 18px; /* Reduced from 22px */
        text-transform: uppercase;
        color: #333;
      }
      .centerItems h2 {
        margin: 3px 0; /* Reduced from 5px */
        font-size: 15px; /* Reduced from 18px */
        font-weight: normal;
      }
      .centerItems h3 {
        margin: 2px 0;
        font-size: 14px; /* Reduced from 16px */
        color: #004d26;
      }
      .centerItems p {
        margin: 1px 0; /* Reduced from 2px */
        font-size: 11px; /* Reduced from 13px */
        line-height: 1.2; /* Reduced from 1.4 */
      }
      .contact-info {
        margin-top: 4px; /* Reduced from 8px */
        font-weight: bold;
      }
      .main div {
        text-align: center;
      }
      .main div h3 {
        font-size: 12px; /* Reduced from 14px */
        text-decoration: underline;
        letter-spacing: 0.6px;
        margin: 5px 0; /* Added margin control */
      }
      .proformaHeading {
        margin-top: 10px; /* Reduced from 30px */
        text-align: center;
      }
      .proformaHeading h3 {
        font-size: 16px; /* Added */
        margin: 5px 0; /* Added */
      }

      /* INDIVIDUAL REPORT STYLES */
      .report-body {
        padding: 0 20px; /* Reduced from 40px */
        font-family: "Times New Roman", serif;
        margin-top: 5px; /* Reduced from 20px */
      }

      /* Personal Info Section */
      .info-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px; /* Reduced from 20px */
        border: 1px solid #222;
        font-size: 12px; /* Added */
      }

      .info-table td {
        padding: 4px 8px; /* Reduced from 10px 12px */
        border: 1px solid #b8c6bc;
        vertical-align: middle;
      }

      .info-table .label-cell {
        background-color: #edf2eb;
        font-weight: 600;
        width: 25%;
      }

      .info-table .data-cell {
        font-weight: 500;
        background-color: #ffffff;
        width: 25%;
      }

      .cat-header {
        background-color: #004d26;
        color: white;
        text-align: left;
        padding: 4px 10px; /* Reduced from 8px 16px */
        font-weight: 700;
        font-size: 13px; /* Reduced from 1.1rem */
        border: 1px solid #004d26;
      }

      /* Damage Tables */
      .damage-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px; /* Reduced from 20px */
        border: 1px solid #222;
        font-size: 12px; /* Added */
      }

      .damage-table th {
        background-color: #e7ede4;
        font-weight: 700;
        padding: 4px 6px; /* Reduced from 10px */
        border: 1px solid #8fa093;
        color: #00331f;
        font-size: 12px; /* Added */
      }

      .damage-table td {
        padding: 4px 6px; /* Reduced from 10px */
        border: 1px solid #b8c6bc;
        text-align: center;
      }

      .damage-table .category {
        background-color: #edf2eb;
        font-weight: 600;
        text-align: left;
        padding-left: 10px; /* Reduced from 16px */
      }

      .damage-table .no-data {
        background-color: #f5f5f5;
        color: #999;
        font-style: italic;
      }

      .data-cell {
        font-weight: 700;
        background-color: #fafaf5;
      }

      /* Signature Section - COMPRESSED */
      .signature-section {
        display: flex;
        justify-content: space-between;
        margin-top: 20px; /* Reduced from 50px */
        padding: 0 10px; /* Reduced from 20px */
        font-size: 11px; /* Added */
      }

      .signature-box {
        text-align: center;
        width: 150px; /* Reduced from 200px */
      }

      .signature-line {
        margin: 10px 0 3px 0; /* Reduced from 30px 0 5px 0 */
        border-top: 1px solid #333;
        width: 100%;
      }

      .stamp {
        width: 70px; /* Reduced from 100px */
        height: 70px; /* Reduced from 100px */
        border: 2px dashed #004d26;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #004d26;
        font-size: 9px; /* Reduced from 12px */
        text-align: center;
        transform: rotate(-15deg);
      }

      /* Footer - COMPRESSED */
      .footer {
        text-align: center;
        margin-top: 10px; /* Reduced from 30px */
        font-size: 9px; /* Reduced from 12px */
        color: #666;
      }

      /* Rowspan fix for livestock table */
      .damage-table th[rowspan] {
        vertical-align: middle;
      }

      @media print {
        body {
          margin: 0.2in; /* Reduced from 0.3in */
        }
        .signature-line {
          border-top: 1px solid #000;
        }
        /* Ensure everything stays on one page */
        .report-body {
          page-break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    <!-- ORIGINAL HEADER (untouched structure, only sizes reduced in CSS) -->
    <header>
      <section id="top">
        <div class="img-container">
          <img
            src="https://kp.gov.pk/uploads/2025/08/kp_logo.png"
            alt="KP Government Logo"
          />
        </div>
        <div class="centerItems">
          <h1>Provincial Disaster Management Authority (PDMA)</h1>
          <h2>Relief, Rehabilitation & Settlement Department</h2>
          <h3>Government of Khyber Pakhtunkhwa</h3>
          <p>Civil Secretariat, Peshawar.</p>
          <p class="contact-info">
            Phone: (091) 9210975 | Fax: (091) 9214025<br />
            <span style="color: #0000ee">www.pdma.gov.pk</span>
          </p>
        </div>
        <div class="img-container">
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9KSwxiA1NBEHIAPqq-8aIXY8litlhyv6nkA&s"
            alt="PDMA Logo"
          />
        </div>
      </section>
    </header>

    <main class="main">
      <div>
        <h3>
          Notified in Khyber Pakhtunkhwa Govt: Gazette, Dated {{report_date}}
        </h3>
      </div>
      <div class="proformaHeading">
        <h3>INDIVIDUAL RELIEF COMPENSATION PROFORMA</h3>
      </div>

      <section class="report-body">
        <!-- Report Metadata -->
        <table class="info-table">
          <tr>
            <td class="label-cell">Report ID:</td>
            <td class="data-cell">#{{report_id}}</td>
            <td class="label-cell">Date:</td>
            <td class="data-cell">{{report_date}}</td>
          </tr>
          <tr>
            <td class="label-cell">Disaster Type:</td>
            <td class="data-cell">{{disaster_type}}</td>
            <td class="label-cell">Incident Date:</td>
            <td class="data-cell">{{incident_date}}</td>
          </tr>
        </table>

        <!-- Personal Details -->
        <table class="info-table">
          <tr>
            <td colspan="4" class="cat-header">PERSONAL DETAILS</td>
          </tr>
          <tr>
            <td class="label-cell">Full Name:</td>
            <td class="data-cell">{{full_name}}</td>
            <td class="label-cell">Father's Name:</td>
            <td class="data-cell">{{father_name}}</td>
          </tr>
          <tr>
            <td class="label-cell">CNIC No.:</td>
            <td class="data-cell">{{cnic}}</td>
            <td class="label-cell">Mobile No.:</td>
            <td class="data-cell">{{mobile}}</td>
          </tr>
          <tr>
            <td class="label-cell">District:</td>
            <td class="data-cell">{{district}}</td>
            <td class="label-cell">Tehsil:</td>
            <td class="data-cell">{{tehsil}}</td>
          </tr>
          <tr>
            <td class="label-cell">Village:</td>
            <td class="data-cell">{{village}}</td>
            <td class="label-cell">Mohalla:</td>
            <td class="data-cell">{{muhalla}}</td>
          </tr>
        </table>

        <!-- Home & Shop Damage - Modified with single Damage Level column -->
        <table class="damage-table">
          <tr>
            <th colspan="2">HOME & SHOP DAMAGE</th>
          </tr>
          <tr>
            <th>Category</th>
            <th>Damage Level</th>
          </tr>
          <!-- Home Damage Row -->
          <tr>
            <td class="category">Home</td>
            {{#if has_home_damage}}
            <td class="data-cell">{{home_damage_level}}</td>
            {{else}}
            <td class="no-data">No Home Damage Reported</td>
            {{/if}}
          </tr>
          <!-- Shop/Business Damage Row -->
          <tr>
            <td class="category">Shop/Business</td>
            {{#if has_shop_damage}}
            <td class="data-cell">{{shop_damage_level}}</td>
            {{else}}
            <td class="no-data">No Shop/Business Damage Reported</td>
            {{/if}}
          </tr>
          <!-- Optional: Add a row to indicate if both are not reported -->
          {{#unless has_home_damage}} {{#unless has_shop_damage}}
          <tr>
            <td
              colspan="2"
              class="no-data"
              style="text-align: center; padding: 8px"
            >
              ⚠️ No Home or Shop Damage Recorded for this Report
            </td>
          </tr>
          {{/unless}} {{/unless}}
        </table>

        <!-- Human Casualty -->
        <table class="damage-table">
          <tr>
            <th colspan="4">HUMAN CASUALTY</th>
          </tr>
          <tr>
            <th>Residents</th>
            <th>Deaths</th>
            <th>Injured</th>
            <th>Disabled</th>
          </tr>
          <tr>
            <td class="data-cell">{{total_residents}}</td>
            <td class="data-cell">{{deaths_count}}</td>
            <td class="data-cell">{{injured_count}}</td>
            <td class="data-cell">{{disabled_count}}</td>
          </tr>
        </table>

        <!-- Livestock Impact -->
        <table class="damage-table">
          <tr>
            <th colspan="5">LIVESTOCK IMPACT</th>
          </tr>
          <tr>
            <th rowspan="2">Category</th>
            <th colspan="2">Big Animals</th>
            <th colspan="2">Small Animals</th>
          </tr>
          <tr>
            <th>Dead</th>
            <th>Injured</th>
            <th>Dead</th>
            <th>Injured</th>
          </tr>
          <tr>
            <td class="category">Count</td>
            <td class="data-cell">{{big_deaths}}</td>
            <td class="data-cell">{{big_injured}}</td>
            <td class="data-cell">{{small_deaths}}</td>
            <td class="data-cell">{{small_injured}}</td>
          </tr>
        </table>

        <!-- Signature Section -->
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <p><strong>Applicant's Signature</strong></p>
            <p>{{full_name}}</p>
            <p style="font-size: 9px; margin: 2px 0">
              Date: {{signature_date}}
            </p>
          </div>

          <div class="signature-box">
            <div class="signature-line"></div>
            <p><strong>Verifying Officer</strong></p>
            <p>{{verifying_officer}}</p>
            <p style="font-size: 9px; margin: 2px 0">
              {{verifying_designation}}
            </p>
          </div>

          <div class="stamp">OFFICIAL STAMP</div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>
            Generated on: {{generation_timestamp}} | Computer generated document
          </p>
        </div>
      </section>
    </main>
  </body>
</html>
`;

    // Replace all placeholders - simple string replacement
    let html = template;
    Object.keys(templateData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      const value = templateData[key] !== undefined ? templateData[key] : '';
      html = html.replace(regex, value);
    });

    // Handle conditional blocks (simple approach - remove them if condition is false)
    // For {{#if has_home_damage}} blocks
    html = html.replace(/\{\{#if has_home_damage\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, ifContent, elseContent) => {
      return templateData.has_home_damage ? ifContent : elseContent;
    });

    html = html.replace(/\{\{#if has_shop_damage\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, ifContent, elseContent) => {
      return templateData.has_shop_damage ? ifContent : elseContent;
    });

    // Handle {{#unless has_home_damage}} blocks (combined)
    html = html.replace(/\{\{#unless has_home_damage\}\}\s*\{\{#unless has_shop_damage\}\}([\s\S]*?)\{\{\/unless\}\}\s*\{\{\/unless\}\}/g, (match, content) => {
      return (!templateData.has_home_damage && !templateData.has_shop_damage) ? content : '';
    });

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relief-report-${reportId}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF Generation Error:', error);
    next(errorGenerator('Failed to generate report: ' + error.message, 500));
  } finally {
    if (context) await context.close().catch(() => { });
  }
};

module.exports = { generatePdf };