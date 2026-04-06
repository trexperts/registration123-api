// src/routes/committeeRoutes.js

import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { pool } from '../db.js'

const router = express.Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTier(score) {
  if (score >= 90) return 'Ideal Match';
  if (score >= 75) return 'Quality Match';
  if (score >= 60) return 'Adequate Match';
  return 'No Match';
}

// ─── 1. Verify access code ────────────────────────────────────────────────────
// POST /api/committee/verify-code
// Body: { code: "MEMBER2026" }
// Returns: { valid: true, role: "individual" }

router.post('/verify-code', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required.' });

  try {
    const result = await pool.query(
      `SELECT role FROM committee_access_codes
       WHERE UPPER(code) = UPPER($1) AND is_active = TRUE`,
      [code.trim()]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ valid: false, error: 'Invalid or inactive code.' });
    }
    res.json({ valid: true, role: result.rows[0].role });
  } catch (err) {
    console.error('verify-code error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});


// ─── 2. Submit individual profile ─────────────────────────────────────────────
// POST /api/committee/individual
// Body: { code, first_name, last_name, email, member_type, years_as_member,
//         strengths_finder, myers_briggs, disc, enneagram,
//         tasks_liked[], tasks_disliked[], monthly_hours, service_length,
//         prior_committees[] }

router.post('/individual', async (req, res) => {
  const { code } = req.body;

  // Verify code is individual role
  try {
    const codeCheck = await pool.query(
      `SELECT role FROM committee_access_codes
       WHERE UPPER(code) = UPPER($1) AND is_active = TRUE`,
      [code?.trim()]
    );
    if (!codeCheck.rows.length || codeCheck.rows[0].role !== 'individual') {
      return res.status(401).json({ error: 'Invalid access code.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }

  const {
    first_name, last_name, email, member_type, years_as_member,
    strengths_finder, myers_briggs, disc, enneagram,
    tasks_liked = [], tasks_disliked = [],
    monthly_hours, service_length,
    prior_committees = []
  } = req.body;

  if (!first_name || !last_name || !email || !monthly_hours || !service_length) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO committee_individuals
         (first_name, last_name, email, member_type, years_as_member,
          strengths_finder, myers_briggs, disc, enneagram,
          tasks_liked, tasks_disliked, monthly_hours, service_length,
          prior_committees, has_prior_experience)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (email) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         member_type = EXCLUDED.member_type,
         years_as_member = EXCLUDED.years_as_member,
         strengths_finder = EXCLUDED.strengths_finder,
         myers_briggs = EXCLUDED.myers_briggs,
         disc = EXCLUDED.disc,
         enneagram = EXCLUDED.enneagram,
         tasks_liked = EXCLUDED.tasks_liked,
         tasks_disliked = EXCLUDED.tasks_disliked,
         monthly_hours = EXCLUDED.monthly_hours,
         service_length = EXCLUDED.service_length,
         prior_committees = EXCLUDED.prior_committees,
         has_prior_experience = EXCLUDED.has_prior_experience,
         updated_at = NOW()
       RETURNING id`,
      [
        first_name, last_name, email,
        member_type || null,
        years_as_member ? parseInt(years_as_member) : null,
        strengths_finder || null, myers_briggs || null,
        disc || null, enneagram || null,
        tasks_liked, tasks_disliked,
        monthly_hours, service_length,
        prior_committees,
        prior_committees.length > 0
      ]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error('individual submit error:', err);
    res.status(500).json({ error: 'Failed to save profile.' });
  }
});


// ─── 3. Get all individuals (admin) ──────────────────────────────────────────
// GET /api/committee/individuals
// Header: x-committee-code: ADMIN2026

router.get('/individuals', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, member_type,
              years_as_member, monthly_hours, service_length,
              tasks_liked, tasks_disliked, prior_committees,
              myers_briggs, disc, enneagram, strengths_finder,
              created_at
       FROM committee_individuals ORDER BY last_name, first_name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('get individuals error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});


// ─── 4. Create / update a committee (admin) ───────────────────────────────────
// POST /api/committee/committees
// Header: x-committee-code: ADMIN2026

router.post('/committees', requireAdmin, async (req, res) => {
  const {
    id,                         // if provided, update existing
    name, description, seats_available,
    required_traits = [], required_tasks = [],
    required_member_type, min_years_as_member,
    requires_prior_committee, deal_breakers = [],
    open_to_nonmembers,
    monthly_hours_needed, service_length_needed,
    is_active
  } = req.body;

  if (!name || !monthly_hours_needed || !service_length_needed) {
    return res.status(400).json({ error: 'name, monthly_hours_needed, and service_length_needed are required.' });
  }

  try {
    let result;
    if (id) {
      result = await pool.query(
        `UPDATE committees SET
           name=$1, description=$2, seats_available=$3,
           required_traits=$4, required_tasks=$5,
           required_member_type=$6, min_years_as_member=$7,
           requires_prior_committee=$8, deal_breakers=$9,
           open_to_nonmembers=$10, monthly_hours_needed=$11,
           service_length_needed=$12, is_active=$13,
           updated_at=NOW()
         WHERE id=$14 RETURNING id`,
        [
          name, description || null, seats_available || 1,
          required_traits, required_tasks,
          required_member_type || null, min_years_as_member || 0,
          requires_prior_committee || null, deal_breakers,
          open_to_nonmembers || false,
          monthly_hours_needed, service_length_needed,
          is_active !== undefined ? is_active : true,
          id
        ]
      );
    } else {
      result = await pool.query(
        `INSERT INTO committees
           (name, description, seats_available,
            required_traits, required_tasks,
            required_member_type, min_years_as_member,
            requires_prior_committee, deal_breakers,
            open_to_nonmembers, monthly_hours_needed, service_length_needed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id`,
        [
          name, description || null, seats_available || 1,
          required_traits, required_tasks,
          required_member_type || null, min_years_as_member || 0,
          requires_prior_committee || null, deal_breakers,
          open_to_nonmembers || false,
          monthly_hours_needed, service_length_needed
        ]
      );
    }
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error('committee save error:', err);
    res.status(500).json({ error: 'Failed to save committee.' });
  }
});


// ─── 5. Get all committees ────────────────────────────────────────────────────
// GET /api/committee/committees
// Header: x-committee-code: ADMIN2026

router.get('/committees', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM committees WHERE is_active = TRUE ORDER BY name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});


// ─── 6. Run matching (Claude API) ─────────────────────────────────────────────
// POST /api/committee/run-match
// Header: x-committee-code: ADMIN2026
// Body: { committee_ids: [1,2,3] }  — optional; omit to match all

router.post('/run-match', requireAdmin, async (req, res) => {
  const { committee_ids } = req.body;

  try {
    // Fetch individuals and committees
    const individualsRes = await pool.query(`SELECT * FROM committee_individuals`);
    const committeesRes = committee_ids?.length
      ? await pool.query(`SELECT * FROM committees WHERE id = ANY($1) AND is_active=TRUE`, [committee_ids])
      : await pool.query(`SELECT * FROM committees WHERE is_active=TRUE`);

    const individuals = individualsRes.rows;
    const committees = committeesRes.rows;

    if (!individuals.length) return res.status(400).json({ error: 'No individuals in the system yet.' });
    if (!committees.length)  return res.status(400).json({ error: 'No active committees found.' });

    const results = [];

    // Score each individual against each committee via Claude
    for (const committee of committees) {
      for (const individual of individuals) {

        const prompt = buildMatchPrompt(individual, committee);

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        });

        let matchData;
        try {
          const text = response.content[0].text;
          // Strip markdown fences if present
          const clean = text.replace(/```json|```/g, '').trim();
          matchData = JSON.parse(clean);
        } catch (parseErr) {
          console.error('Failed to parse Claude response for', individual.email, committee.name);
          continue;
        }

        const overall = parseFloat(matchData.overall_score) || 0;
        const tier = parseTier(overall);

        // Upsert into committee_matches
        await pool.query(
          `INSERT INTO committee_matches
             (individual_id, committee_id, overall_score, trait_score,
              task_score, time_score, length_score, tier, summary, flags, matched_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
           ON CONFLICT (individual_id, committee_id) DO UPDATE SET
             overall_score=$3, trait_score=$4, task_score=$5,
             time_score=$6, length_score=$7, tier=$8,
             summary=$9, flags=$10, matched_at=NOW()`,
          [
            individual.id, committee.id,
            overall,
            matchData.trait_score || null,
            matchData.task_score  || null,
            matchData.time_score  || null,
            matchData.length_score || null,
            tier,
            matchData.summary || null,
            matchData.flags || []
          ]
        );

        results.push({
          individual: `${individual.first_name} ${individual.last_name}`,
          committee: committee.name,
          overall_score: overall,
          tier
        });
      }
    }

    res.json({ success: true, matched: results.length, results });
  } catch (err) {
    console.error('run-match error:', err);
    res.status(500).json({ error: 'Matching failed: ' + err.message });
  }
});


// ─── 7. Get match results ─────────────────────────────────────────────────────
// GET /api/committee/matches?committee_id=1&tier=Ideal Match&min_score=75
// Header: x-committee-code: ADMIN2026

router.get('/matches', requireAdmin, async (req, res) => {
  const { committee_id, tier, min_score } = req.query;

  let query = `
    SELECT
      cm.id, cm.overall_score, cm.trait_score, cm.task_score,
      cm.time_score, cm.length_score, cm.tier, cm.summary, cm.flags,
      cm.matched_at,
      ci.first_name, ci.last_name, ci.email, ci.member_type,
      ci.years_as_member, ci.monthly_hours, ci.service_length,
      c.name AS committee_name, c.id AS committee_id, c.seats_available
    FROM committee_matches cm
    JOIN committee_individuals ci ON ci.id = cm.individual_id
    JOIN committees c ON c.id = cm.committee_id
    WHERE 1=1
  `;
  const params = [];

  if (committee_id) {
    params.push(committee_id);
    query += ` AND c.id = $${params.length}`;
  }
  if (tier) {
    params.push(tier);
    query += ` AND cm.tier = $${params.length}`;
  }
  if (min_score) {
    params.push(parseFloat(min_score));
    query += ` AND cm.overall_score >= $${params.length}`;
  }

  query += ` ORDER BY c.name, cm.overall_score DESC`;

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('get matches error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});


// ─── 8. Export matches as CSV ─────────────────────────────────────────────────
// GET /api/committee/export?committee_id=1
// Header: x-committee-code: ADMIN2026

// ─── 8. Export matches as CSV ─────────────────────────────────────────────────
router.get('/export', async (req, res) => {
  const { committee_id, admin_code } = req.query;

  // Verify admin code via query param
  try {
    const codeCheck = await pool.query(
      `SELECT role FROM committee_access_codes
       WHERE UPPER(code) = UPPER($1) AND is_active = TRUE`,
      [admin_code?.trim()]
    );
    if (!codeCheck.rows.length || codeCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Invalid admin code.' });
    }
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }

  let query = `
    SELECT
      c.name AS "Committee",
      cm.tier AS "Tier",
      cm.overall_score AS "Overall %",
      ci.first_name AS "First Name",
      ci.last_name AS "Last Name",
      ci.email AS "Email",
      ci.member_type AS "Member Type",
      ci.years_as_member AS "Years as Member",
      ci.monthly_hours AS "Monthly Hours Available",
      ci.service_length AS "Service Length",
      cm.trait_score AS "Trait Score",
      cm.task_score AS "Task Score",
      cm.time_score AS "Time Score",
      cm.length_score AS "Length Score",
      cm.summary AS "Summary",
      array_to_string(cm.flags, '; ') AS "Flags"
    FROM committee_matches cm
    JOIN committee_individuals ci ON ci.id = cm.individual_id
    JOIN committees c ON c.id = cm.committee_id
  `;
  const params = [];
  if (committee_id) {
    params.push(committee_id);
    query += ` WHERE c.id = $1`;
  }
  query += ` ORDER BY c.name, cm.overall_score DESC`;

  try {
    const result = await pool.query(query, params);
    const rows = result.rows;
    if (!rows.length) return res.status(404).json({ error: 'No matches found.' });

    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const val = row[h] ?? '';
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="committee-matches.csv"');
    res.send(csvLines.join('\n'));
  } catch (err) {
    console.error('export error:', err);
    res.status(500).json({ error: 'Export failed.' });
  }
});

// ─── Middleware: require admin code ──────────────────────────────────────────

async function requireAdmin(req, res, next) {
  const code = req.headers['x-committee-code'];
  if (!code) return res.status(401).json({ error: 'Admin code required.' });

  try {
    const result = await pool.query(
      `SELECT role FROM committee_access_codes
       WHERE UPPER(code) = UPPER($1) AND is_active = TRUE`,
      [code.trim()]
    );
    if (!result.rows.length || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Invalid or insufficient access code.' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
}


// ─── Claude prompt builder ────────────────────────────────────────────────────

function buildMatchPrompt(individual, committee) {
  return `
You are a committee-matching engine. Score how well this individual matches this committee.

INDIVIDUAL PROFILE:
- Name: ${individual.first_name} ${individual.last_name}
- Member type: ${individual.member_type || 'Unknown'}
- Years as member: ${individual.years_as_member ?? 'Unknown'}
- Personality tests: Myers-Briggs=${individual.myers_briggs || 'N/A'}, DiSC=${individual.disc || 'N/A'}, Enneagram=${individual.enneagram || 'N/A'}, StrengthsFinder=${individual.strengths_finder || 'N/A'}
- Tasks they LIKE: ${individual.tasks_liked?.join(', ') || 'None specified'}
- Tasks they DISLIKE: ${individual.tasks_disliked?.join(', ') || 'None specified'}
- Monthly hours available: ${individual.monthly_hours}
- Willing to serve: ${individual.service_length}
- Prior committees: ${individual.prior_committees?.join(', ') || 'None'}

COMMITTEE REQUIREMENTS:
- Committee name: ${committee.name}
- Description: ${committee.description || 'N/A'}
- Seats available: ${committee.seats_available}
- Required traits: ${committee.required_traits?.join(', ') || 'None'}
- Required tasks: ${committee.required_tasks?.join(', ') || 'None'}
- Deal-breaker requirements (must-haves): ${committee.deal_breakers?.join(', ') || 'None'}
- Required member type: ${committee.required_member_type || 'Any'}
- Min years as member: ${committee.min_years_as_member || 0}
- Prior committee required: ${committee.requires_prior_committee || 'None'}
- Open to non-members: ${committee.open_to_nonmembers}
- Monthly hours needed: ${committee.monthly_hours_needed}
- Service length needed: ${committee.service_length_needed}

SCORING INSTRUCTIONS:
Score each dimension from 0 to 100:
1. trait_score: How well do the individual's personality traits match what the committee needs?
2. task_score: How well do the individual's liked tasks align with what the committee requires? Penalize heavily if they dislike required tasks.
3. time_score: How well does their monthly availability match the committee's needs?
4. length_score: How well does their willingness to serve match the committee's required service length?

Calculate overall_score as a weighted average: trait=30%, task=40%, time=15%, length=15%.

HARD RULES (if any are violated, set overall_score to 0 and note in flags):
- If the committee is NOT open to non-members and the individual has no member type, score = 0.
- If the committee requires a specific member type and individual doesn't match, score = 0.
- If there are deal-breakers and the individual doesn't meet them, score = 0.

Respond ONLY with a valid JSON object, no markdown, no preamble:
{
  "overall_score": 0-100,
  "trait_score": 0-100,
  "task_score": 0-100,
  "time_score": 0-100,
  "length_score": 0-100,
  "summary": "2-3 sentence explanation of why this is a good or poor match",
  "flags": ["array of strings noting any concerns or deal-breaker violations"]
}
`.trim();
}


export default router
