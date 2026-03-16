const { query } = require('../../config/db');
const { errorGenerator } = require('../../utils/errorGenarator');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

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
  const levelMap = {
    'minor': 'Only Water & Silt',
    'major': 'Minor Damage',
    'fully_destroyed': 'Fully Destroyed'
  };
  return levelMap[level] || level.replace('_', ' ');
}

const getBrowser = async () => {
  // If we have an instance and it's connected, return it
  if (browserInstance && browserInstance.isConnected()) {
    requestCount++;

    // Refresh browser after 100 requests
    if (requestCount > 100) {
      console.log("Refreshing browser instance...");
      const oldBrowser = browserInstance;
      browserInstance = null;
      requestCount = 0;
      try {
        await oldBrowser.close();
      } catch (e) {
        console.error("Error closing old browser:", e);
      }
    } else {
      return browserInstance;
    }
  }

  // Create new browser instance if needed
  if (!browserPromise) {
    browserPromise = (async () => {
      try {
        const executablePath = await chromium.executablePath();

        console.log("Launching browser with path:", executablePath);

        const browser = await puppeteer.launch({
          executablePath,
          headless: true, // Use true instead of chromium.headless
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--font-render-hinting=none',
            '--single-process', // Add this for serverless
            '--no-zygote'
          ],
          defaultViewport: {
            width: 1200,
            height: 800
          }
        });

        browserInstance = browser;
        browserPromise = null;
        return browser;
      } catch (error) {
        browserPromise = null;
        console.error('Browser launch error:', error);
        throw error;
      }
    })();
  }

  return browserPromise;
};

const generatePdf = async (req, res, next) => {
  let page = null;
  let context = null;

  try {
    const browser = await getBrowser();

    // Create a new context and page
    context = await browser.createBrowserContext();
    page = await context.newPage();

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
        CASE
            WHEN dr.is_home_impacted THEN dr.home_damage_level
            ELSE NULL
        END AS home_damage_level,
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
      WHERE dr.report_id = $1
    `, [reportId]);

    if (rows.length === 0) {
      return next(errorGenerator('Report Not Found', 404));
    }

    const data = rows[0];

    // Template data mapping
    const templateData = {
      report_id: data.report_id,
      report_date: formatDate(data.report_date),
      disaster_type: data.disaster_type || 'N/A',
      incident_date: formatDate(data.incident_date),
      full_name: data.name || 'N/A',
      father_name: data.father_name || 'N/A',
      cnic: data.cnic || 'N/A',
      mobile: data.phone_number || 'N/A',
      district: data.district || 'N/A',
      tehsil: data.tehsil || 'N/A',
      village: data.village || 'N/A',
      muhalla: data.muhalla || 'N/A',
      home_damage_level: data.home_damage_level
        ? formatDamageLevel(data.home_damage_level)
        : 'N/A',
      shop_damage_level: data.shop_damage_level
        ? formatDamageLevel(data.shop_damage_level)
        : 'N/A',
      total_residents: data.total_residents_count || '0',
      deaths_count: data.deaths_count || '0',
      injured_count: data.injured_count || '0',
      disabled_count: data.disabled_persons_count || '0',
      big_deaths: data.big_animals_death_count || '0',
      big_injured: data.big_animals_injured_count || '0',
      small_deaths: data.small_animals_death_count || '0',
      small_injured: data.small_animals_injured_count || '0',
      has_home_damage: data.has_home_damage || false,
      has_shop_damage: data.has_shop_damage || false,
      signature_date: formatDate(new Date()),
      verifying_officer: '___________________',
      verifying_designation: '___________________',
      generation_timestamp: formatDate(new Date())
    };

    // Build HTML with template literals instead of complex replacements
    const getDamageCell = (hasDamage, level) => {
      if (hasDamage) {
        return `<td class="data-cell">${level}</td>`;
      }
      return `<td class="no-data">No Damage Reported</td>`;
    };

    const getWarningRow = () => {
      if (!templateData.has_home_damage && !templateData.has_shop_damage) {
        return `<tr>
          <td colspan="2" class="no-data" style="text-align: center; padding: 8px">
            ⚠️ No Home or Shop Damage Recorded for this Report
          </td>
        </tr>`;
      }
      return '';
    };

    const html = `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Individual Relief Compensation Report</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: "Times New Roman", serif;
            padding: 20px;
          }
          header {
            padding: 10px 20px;
          }
          #top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            text-align: center;
          }
          .img-container {
            width: 90px;
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
            font-size: 18px;
            text-transform: uppercase;
            color: #333;
          }
          .centerItems h2 {
            margin: 3px 0;
            font-size: 15px;
            font-weight: normal;
          }
          .centerItems h3 {
            margin: 2px 0;
            font-size: 14px;
            color: #004d26;
          }
          .centerItems p {
            margin: 1px 0;
            font-size: 11px;
            line-height: 1.2;
          }
          .contact-info {
            margin-top: 4px;
            font-weight: bold;
          }
          .main div {
            text-align: center;
          }
          .main div h3 {
            font-size: 12px;
            text-decoration: underline;
            letter-spacing: 0.6px;
            margin: 5px 0;
          }
          .proformaHeading {
            margin-top: 10px;
            text-align: center;
          }
          .proformaHeading h3 {
            font-size: 16px;
            margin: 5px 0;
          }
          .report-body {
            padding: 0 20px;
            margin-top: 5px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            border: 1px solid #222;
            font-size: 12px;
          }
          .info-table td {
            padding: 4px 8px;
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
            padding: 4px 10px;
            font-weight: 700;
            font-size: 13px;
            border: 1px solid #004d26;
          }
          .damage-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            border: 1px solid #222;
            font-size: 12px;
          }
          .damage-table th {
            background-color: #e7ede4;
            font-weight: 700;
            padding: 4px 6px;
            border: 1px solid #8fa093;
            color: #00331f;
          }
          .damage-table td {
            padding: 4px 6px;
            border: 1px solid #b8c6bc;
            text-align: center;
          }
          .damage-table .category {
            background-color: #edf2eb;
            font-weight: 600;
            text-align: left;
            padding-left: 10px;
          }
          .damage-table .no-data {
            background-color: #f5f5f5;
            color: #999;
            font-style: italic;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            padding: 0 10px;
            font-size: 11px;
          }
          .signature-box {
            text-align: center;
            width: 150px;
          }
          .signature-line {
            margin: 10px 0 3px 0;
            border-top: 1px solid #333;
            width: 100%;
          }
          .stamp {
            width: 70px;
            height: 70px;
            border: 2px dashed #004d26;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #004d26;
            font-size: 9px;
            text-align: center;
            transform: rotate(-15deg);
          }
          .footer {
            text-align: center;
            margin-top: 10px;
            font-size: 9px;
            color: #666;
          }
          @media print {
            body {
              margin: 0.2in;
            }
          }
        </style>
      </head>
      <body>
        <header>
          <section id="top">
            <div class="img-container">
              <img src="https://kp.gov.pk/uploads/2025/08/kp_logo.png" alt="KP Government Logo" />
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
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9KSwxiA1NBEHIAPqq-8aIXY8litlhyv6nkA&s" alt="PDMA Logo" />
            </div>
          </section>
        </header>
    
        <main class="main">
          <div>
            <h3>Notified in Khyber Pakhtunkhwa Govt: Gazette, Dated ${templateData.report_date}</h3>
          </div>
          <div class="proformaHeading">
            <h3>INDIVIDUAL RELIEF COMPENSATION PROFORMA</h3>
          </div>
    
          <section class="report-body">
            <table class="info-table">
              <tr>
                <td class="label-cell">Report ID:</td>
                <td class="data-cell">#${templateData.report_id}</td>
                <td class="label-cell">Date:</td>
                <td class="data-cell">${templateData.report_date}</td>
              </tr>
              <tr>
                <td class="label-cell">Disaster Type:</td>
                <td class="data-cell">${templateData.disaster_type}</td>
                <td class="label-cell">Incident Date:</td>
                <td class="data-cell">${templateData.incident_date}</td>
              </tr>
            </table>
    
            <table class="info-table">
              <tr>
                <td colspan="4" class="cat-header">PERSONAL DETAILS</td>
              </tr>
              <tr>
                <td class="label-cell">Full Name:</td>
                <td class="data-cell">${templateData.full_name}</td>
                <td class="label-cell">Father's Name:</td>
                <td class="data-cell">${templateData.father_name}</td>
              </tr>
              <tr>
                <td class="label-cell">CNIC No.:</td>
                <td class="data-cell">${templateData.cnic}</td>
                <td class="label-cell">Mobile No.:</td>
                <td class="data-cell">${templateData.mobile}</td>
              </tr>
              <tr>
                <td class="label-cell">District:</td>
                <td class="data-cell">${templateData.district}</td>
                <td class="label-cell">Tehsil:</td>
                <td class="data-cell">${templateData.tehsil}</td>
              </tr>
              <tr>
                <td class="label-cell">Village:</td>
                <td class="data-cell">${templateData.village}</td>
                <td class="label-cell">Mohalla:</td>
                <td class="data-cell">${templateData.muhalla}</td>
              </tr>
            </table>
    
            <table class="damage-table">
              <tr>
                <th colspan="2">HOME & SHOP DAMAGE</th>
              </tr>
              <tr>
                <th>Category</th>
                <th>Damage Level</th>
              </tr>
              <tr>
                <td class="category">Home</td>
                ${getDamageCell(templateData.has_home_damage, templateData.home_damage_level)}
              </tr>
              <tr>
                <td class="category">Shop/Business</td>
                ${getDamageCell(templateData.has_shop_damage, templateData.shop_damage_level)}
              </tr>
              ${getWarningRow()}
            </table>
    
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
                <td class="data-cell">${templateData.total_residents}</td>
                <td class="data-cell">${templateData.deaths_count}</td>
                <td class="data-cell">${templateData.injured_count}</td>
                <td class="data-cell">${templateData.disabled_count}</td>
              </tr>
            </table>
    
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
                <td class="data-cell">${templateData.big_deaths}</td>
                <td class="data-cell">${templateData.big_injured}</td>
                <td class="data-cell">${templateData.small_deaths}</td>
                <td class="data-cell">${templateData.small_injured}</td>
              </tr>
            </table>
    
            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-line"></div>
                <p><strong>Applicant's Signature</strong></p>
                <p>${templateData.full_name}</p>
                <p style="font-size: 9px; margin: 2px 0">Date: ${templateData.signature_date}</p>
              </div>
    
              <div class="signature-box">
                <div class="signature-line"></div>
                <p><strong>Verifying Officer</strong></p>
                <p>${templateData.verifying_officer}</p>
                <p style="font-size: 9px; margin: 2px 0">${templateData.verifying_designation}</p>
              </div>
    
              <div class="stamp">OFFICIAL STAMP</div>
            </div>
    
            <div class="footer">
              <p>Generated on: ${templateData.generation_timestamp} | Computer generated document</p>
            </div>
          </section>
        </main>
      </body>
    </html>`;

    // Set content directly without any navigation or request interception
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      preferCSSPageSize: true
    });

    // Send response
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relief-report-${reportId}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF Generation Error:', error);
    console.error('Error stack:', error.stack);
    next(errorGenerator('Failed to generate report: ' + error.message, 500));
  } finally {
    // Clean up
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.error('Error closing page:', e);
      }
    }
    if (context) {
      try {
        await context.close();
      } catch (e) {
        console.error('Error closing context:', e);
      }
    }
  }
};

module.exports = { generatePdf };