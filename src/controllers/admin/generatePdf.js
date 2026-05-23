// controllers/pdfController.js
require('dotenv').config();
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const db = require('../../config/db');
const { errorGenerator } = require('../../utils/errorGenarator');

// ==================== UTILITY FUNCTIONS ====================

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

const formatDateTime = (date) => {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleString('en-PK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return 'N/A';
  }
};

const formatDamageLevel = (level) => {
  if (!level) return 'N/A';
  const levelMap = {
    'minor': 'Minor Damage',
    'moderate': 'Moderate Damage',
    'major': 'Major Damage',
    'complete': 'Complete Damage',
    'fully_destroyed': 'Fully Destroyed'
  };
  return levelMap[level] || level.replace(/_/g, ' ');
};

const getImpactBadgeClass = (level) => {
  const classMap = {
    'minor': 'impact-minor',
    'moderate': 'impact-moderate',
    'major': 'impact-major',
    'complete': 'impact-complete',
    'fully_destroyed': 'impact-fully_destroyed'
  };
  return classMap[level] || 'impact-minor';
};

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Build property damage table rows from ARRAY of objects
const buildPropertyDamageRows = (propertyDamagesArray) => {
  if (!propertyDamagesArray || !Array.isArray(propertyDamagesArray) || propertyDamagesArray.length === 0) {
    return `<tr>
            <td colspan="2" class="no-data" style="text-align: center; padding: 8px">
                ⚠️ No Property Damage Reported
            </td>
        </tr>`;
  }

  let rows = '';
  for (const item of propertyDamagesArray) {
    const propertyType = item.property_type || 'Unknown';
    const impactLevel = item.impact_level || 'unknown';
    const displayLevel = formatDamageLevel(impactLevel);
    const badgeClass = getImpactBadgeClass(impactLevel);

    rows += `<tr>
            <td class="category">${escapeHtml(propertyType)}</td>
            <td class="data-cell">
                <span class="impact-badge ${badgeClass}">
                    ${escapeHtml(displayLevel)}
                </span>
            </td>
        </tr>`;
  }
  return rows;
};

// Build livestock warning row if no data
const buildLivestockWarningRow = (bigDeaths, bigInjured, smallDeaths, smallInjured) => {
  if (bigDeaths === 0 && bigInjured === 0 && smallDeaths === 0 && smallInjured === 0) {
    return `<tr>
            <td colspan="5" class="no-data" style="text-align: center; padding: 8px">
                ⚠️ No Livestock Impact Reported
            </td>
        </tr>`;
  }
  return '';
};

// Build human impact warning row if no data
const buildHumanImpactWarningRow = (totalResidents, deaths, injured, pregnant, disabled, children, couples) => {
  if (totalResidents === 0 && deaths === 0 && injured === 0 && pregnant === 0 && disabled === 0 && children === 0 && couples === 0) {
    return `<tr>
            <td colspan="4" class="no-data" style="text-align: center; padding: 8px">
                ⚠️ No Human Impact Reported
            </td>
        </tr>`;
  }
  return '';
};

const getBrowserConfig = async () => {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    return {
      executablePath: process.env.CHROMIUM_LOCAL_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
  } else {
    return {
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    };
  }
};

// ==================== MAIN CONTROLLER ====================

const generatePdf = async (req, res, next) => {
  const reportId = req.query.report_id || req.body?.report_id;
  let browser = null;

  if (!reportId) {
    return next(errorGenerator('report_id is required', 400));
  }

  try {
    // 1. Database query with ARRAY aggregation + human impacts
    const { rows } = await db.query(`
            SELECT
                dr.report_id,
                NOW() AS report_date,
                initcap(d.disaster_type) AS disaster_type,
                dr.submission_date AS incident_date,
                dr.status,
                dr.latitude,
                dr.longitude,
                COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'property_type', pi.property_type, 
                            'impact_level', pi.impact_level
                        )
                    ) FILTER (WHERE pi.property_type IS NOT NULL), 
                    '[]'::jsonb
                ) AS property_damages,
                COALESCE(MAX(ai.big_animals_death_count), 0) AS big_animals_death_count,
                COALESCE(MAX(ai.big_animals_injured_count), 0) AS big_animals_injured_count,
                COALESCE(MAX(ai.small_animals_death_count), 0) AS small_animals_death_count,
                COALESCE(MAX(ai.small_animals_injured_count), 0) AS small_animals_injured_count,
                COALESCE(MAX(hi.total_residents_count), 0) AS total_residents_count,
                COALESCE(MAX(hi.deaths_count), 0) AS deaths_count,
                COALESCE(MAX(hi.injured_count), 0) AS injured_count,
                COALESCE(MAX(hi.pregnant_women_count), 0) AS pregnant_women_count,
                COALESCE(MAX(hi.disabled_persons_count), 0) AS disabled_persons_count,
                COALESCE(MAX(hi.school_going_children_count), 0) AS school_going_children_count,
                COALESCE(MAX(hi.married_couples_count), 0) AS married_couples_count,
                initcap(u.name) AS reporter_name,
                initcap(u.father_name) AS father_name,
                u.cnic,
                u.phone_number,
                initcap(u.muhalla) AS muhalla,
                initcap(u.district) AS district,
                initcap(u.village) AS village,
                initcap(u.tehsil) AS tehsil
            FROM reports dr
            JOIN users u ON dr.u_id = u.user_id
            JOIN disasters d ON d.d_id = dr.d_id
            LEFT JOIN animal_impacts ai ON ai.report_id = dr.report_id
            LEFT JOIN property_impacts pi ON pi.report_id = dr.report_id
            LEFT JOIN human_impacts hi ON hi.report_id = dr.report_id
            WHERE dr.report_id = $1
            GROUP BY 
                dr.report_id, 
                d.disaster_type, 
                dr.submission_date, 
                dr.status, 
                dr.latitude, 
                dr.longitude,
                u.user_id
        `, [reportId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const data = rows[0];

    // Parse property_damages
    let propertyDamagesArray = [];
    if (data.property_damages) {
      propertyDamagesArray = typeof data.property_damages === 'string'
        ? JSON.parse(data.property_damages)
        : data.property_damages;
    }

    // Build table rows
    const propertyDamageRows = buildPropertyDamageRows(propertyDamagesArray);

    const livestockWarningRow = buildLivestockWarningRow(
      data.big_animals_death_count || 0,
      data.big_animals_injured_count || 0,
      data.small_animals_death_count || 0,
      data.small_animals_injured_count || 0
    );

    const humanImpactWarningRow = buildHumanImpactWarningRow(
      data.total_residents_count || 0,
      data.deaths_count || 0,
      data.injured_count || 0,
      data.pregnant_women_count || 0,
      data.disabled_persons_count || 0,
      data.school_going_children_count || 0,
      data.married_couples_count || 0
    );

    // 2. Launch browser
    const browserConfig = await getBrowserConfig();
    browser = await puppeteer.launch(browserConfig);
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });

    // 3. Generate HTML
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
        .data-cell {
            font-weight: 700;
            background-color: #fafaf5;
        }
        .impact-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
        }
        .impact-minor { background-color: #fff3cd; color: #856404; }
        .impact-moderate { background-color: #ffe5b4; color: #cc7a00; }
        .impact-major { background-color: #ffcc80; color: #b45f06; }
        .impact-complete { background-color: #f8d7da; color: #721c24; }
        .impact-fully_destroyed { background-color: #f8d7da; color: #721c24; }
        .casualty-red { color: #d32f2f; font-weight: 900; }
        .casualty-orange { color: #e65100; font-weight: 700; }
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
                <img src="https://res.cloudinary.com/dvy5bmpem/image/upload/v1779351964/kp_logo_sslk3j.png" alt="KP Government Logo" />
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
                <img src="https://res.cloudinary.com/dvy5bmpem/image/upload/v1779351955/pdma_img_zdenry.jpg" alt="PDMA Logo" />
            </div>
        </section>
    </header>

    <main class="main">
        <div>
            <h3>Notified in Khyber Pakhtunkhwa Govt: Gazette, Dated ${formatDate(data.report_date)}</h3>
        </div>
        <div class="proformaHeading">
            <h3>INDIVIDUAL RELIEF COMPENSATION PROFORMA</h3>
        </div>

        <section class="report-body">
            <!-- Report Metadata -->
            <table class="info-table">
                <tr>
                    <td class="label-cell">Report ID:</td>
                    <td class="data-cell">#${escapeHtml(data.report_id)}</td>
                    <td class="label-cell">Date:</td>
                    <td class="data-cell">${formatDate(data.report_date)}</td>
                </tr>
                <tr>
                    <td class="label-cell">Disaster Type:</td>
                    <td class="data-cell">${escapeHtml(data.disaster_type)}</td>
                    <td class="label-cell">Incident Date:</td>
                    <td class="data-cell">${formatDate(data.incident_date)}</td>
                </tr>
                <tr>
                    <td class="label-cell">Status:</td>
                    <td class="data-cell">${escapeHtml(data.status || 'N/A')}</td>
                    <td class="label-cell">Location:</td>
                    <td class="data-cell">${escapeHtml(data.latitude || 'N/A')}, ${escapeHtml(data.longitude || 'N/A')}</td>
                </tr>
            </table>

            <!-- Personal Details -->
            <table class="info-table">
                <tr>
                    <td colspan="4" class="cat-header">PERSONAL DETAILS</td>
                </tr>
                <tr>
                    <td class="label-cell">Full Name:</td>
                    <td class="data-cell">${escapeHtml(data.reporter_name)}</td>
                    <td class="label-cell">Father's Name:</td>
                    <td class="data-cell">${escapeHtml(data.father_name)}</td>
                </tr>
                <tr>
                    <td class="label-cell">CNIC No.:</td>
                    <td class="data-cell">${escapeHtml(data.cnic)}</td>
                    <td class="label-cell">Mobile No.:</td>
                    <td class="data-cell">${escapeHtml(data.phone_number)}</td>
                </tr>
                <tr>
                    <td class="label-cell">District:</td>
                    <td class="data-cell">${escapeHtml(data.district)}</td>
                    <td class="label-cell">Tehsil:</td>
                    <td class="data-cell">${escapeHtml(data.tehsil)}</td>
                </tr>
                <tr>
                    <td class="label-cell">Village:</td>
                    <td class="data-cell">${escapeHtml(data.village)}</td>
                    <td class="label-cell">Mohalla:</td>
                    <td class="data-cell">${escapeHtml(data.muhalla)}</td>
                </tr>
            </table>

            <!-- HUMAN IMPACT ASSESSMENT -->
            <table class="damage-table">
                <thead>
                    <tr>
                        <th colspan="4">HUMAN IMPACT ASSESSMENT</th>
                    </tr>
                    <tr>
                        <th>Category</th>
                        <th>Count</th>
                        <th>Category</th>
                        <th>Count</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="category">Total Residents</td>
                        <td class="data-cell">${data.total_residents_count || 0}</td>
                        <td class="category">Deaths</td>
                        <td class="data-cell casualty-red">${data.deaths_count || 0}</td>
                    </tr>
                    <tr>
                        <td class="category">Injured</td>
                        <td class="data-cell casualty-orange">${data.injured_count || 0}</td>
                        <td class="category">Pregnant Women</td>
                        <td class="data-cell">${data.pregnant_women_count || 0}</td>
                    </tr>
                    <tr>
                        <td class="category">Disabled Persons</td>
                        <td class="data-cell">${data.disabled_persons_count || 0}</td>
                        <td class="category">School Going Children</td>
                        <td class="data-cell">${data.school_going_children_count || 0}</td>
                    </tr>
                    <tr>
                        <td class="category">Married Couples</td>
                        <td class="data-cell">${data.married_couples_count || 0}</td>
                        <td class="category"></td>
                        <td class="data-cell"></td>
                    </tr>
                    ${humanImpactWarningRow}
                </tbody>
            </table>

            <!-- PROPERTY DAMAGE ASSESSMENT -->
            <table class="damage-table">
                <thead>
                    <tr>
                        <th colspan="2">PROPERTY DAMAGE ASSESSMENT</th>
                    </tr>
                    <tr>
                        <th>Property Type</th>
                        <th>Impact Level</th>
                    </tr>
                </thead>
                <tbody>
                    ${propertyDamageRows}
                </tbody>
            </table>

            <!-- LIVESTOCK IMPACT -->
            <table class="damage-table">
                <thead>
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
                </thead>
                <tbody>
                    <tr>
                        <td class="category">Count</td>
                        <td class="data-cell">${data.big_animals_death_count || 0}</td>
                        <td class="data-cell">${data.big_animals_injured_count || 0}</td>
                        <td class="data-cell">${data.small_animals_death_count || 0}</td>
                        <td class="data-cell">${data.small_animals_injured_count || 0}</td>
                    </tr>
                    ${livestockWarningRow}
                </tbody>
            </table>

            <!-- Signature Section -->
            <div class="signature-section">
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <p><strong>Applicant's Signature</strong></p>
                    <p>${escapeHtml(data.reporter_name)}</p>
                    <p style="font-size: 9px; margin: 2px 0">
                        Date: ${formatDate(new Date())}
                    </p>
                </div>

                <div class="signature-box">
                    <div class="signature-line"></div>
                    <p><strong>Verifying Officer</strong></p>
                    <p>___________________</p>
                    <p style="font-size: 9px; margin: 2px 0">
                        PDMA Relief Officer
                    </p>
                </div>

                <div class="stamp">OFFICIAL STAMP</div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p>
                    Generated on: ${formatDateTime(new Date())} | Computer generated document
                </p>
            </div>
        </section>
    </main>
</body>
</html>`;

    // 4. Generate PDF
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '15px',
        right: '15px'
      }
    });

    // 5. Cleanup
    if (browser) {
      await browser.close();
      browser = null;
    }

    // 6. Send response
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relief-report-${reportId}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF Generation Error:', error);

    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }

    if (!res.headersSent) {
      next(errorGenerator('Failed to generate PDF: ' + error.message, 500));
    }
  }
};

module.exports = { generatePdf };