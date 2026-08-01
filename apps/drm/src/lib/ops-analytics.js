import { q } from './db.js';
import { CAPABILITY } from './session.js';

/** Everything the insights page needs, in one round trip. */
export const ANALYTICS_OPS = {
  'analytics.overview': {
    cap: CAPABILITY.read,
    async run({ months = 12 } = {}) {
      const n = Math.min(Math.max(parseInt(months, 10) || 12, 3), 60);

      const [
        headline, donationsByMonth, donationsBySeva, topDonors, gatewaySplit,
        growth, byArea, byAge, byLanguage, segments, quality, lapsed,
      ] = await Promise.all([
        q(`SELECT
             (SELECT count(*) FROM person WHERE is_active)                         AS people,
             (SELECT count(*) FROM donation)                                       AS donations,
             (SELECT COALESCE(sum(amount),0) FROM donation)                        AS total_raised,
             (SELECT COALESCE(sum(amount),0) FROM donation
               WHERE donated_on >= date_trunc('month', CURRENT_DATE))              AS this_month,
             (SELECT count(DISTINCT person_id) FROM donation)                      AS donors,
             (SELECT COALESCE(avg(amount),0) FROM donation)                        AS avg_gift`),

        q(`SELECT to_char(date_trunc('month', donated_on), 'YYYY-MM') AS month,
                  sum(amount) AS total, count(*) AS gifts
             FROM donation
            WHERE donated_on >= date_trunc('month', CURRENT_DATE) - ($1||' months')::interval
            GROUP BY 1 ORDER BY 1`, [n]),

        q(`SELECT COALESCE(s.name, 'Unspecified') AS seva,
                  sum(d.amount) AS total, count(*) AS gifts
             FROM donation d LEFT JOIN seva_category s ON s.id = d.seva_category_id
            GROUP BY 1 ORDER BY total DESC LIMIT 12`),

        q(`SELECT p.person_no, p.display_name, sum(d.amount) AS total, count(*) AS gifts
             FROM donation d JOIN person p ON p.id = d.person_id
            GROUP BY 1,2 ORDER BY total DESC LIMIT 10`),

        q(`SELECT COALESCE(gateway,'unrecorded') AS gateway, count(*) AS gifts, sum(amount) AS total
             FROM donation GROUP BY 1 ORDER BY total DESC`),

        q(`SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, count(*) AS added
             FROM person
            WHERE created_at >= date_trunc('month', CURRENT_DATE) - ($1||' months')::interval
            GROUP BY 1 ORDER BY 1`, [n]),

        q(`SELECT COALESCE(NULLIF(btrim(area),''),'Not recorded') AS area, count(*) AS n
             FROM person WHERE is_active GROUP BY 1 ORDER BY n DESC LIMIT 12`),

        q(`SELECT CASE
                    WHEN dob IS NULL THEN 'Unknown'
                    WHEN date_part('year', age(dob)) < 18 THEN 'Under 18'
                    WHEN date_part('year', age(dob)) < 30 THEN '18-29'
                    WHEN date_part('year', age(dob)) < 45 THEN '30-44'
                    WHEN date_part('year', age(dob)) < 60 THEN '45-59'
                    ELSE '60+' END AS band,
                  count(*) AS n
             FROM person WHERE is_active GROUP BY 1
            ORDER BY CASE band WHEN 'Under 18' THEN 1 WHEN '18-29' THEN 2 WHEN '30-44' THEN 3
                               WHEN '45-59' THEN 4 WHEN '60+' THEN 5 ELSE 6 END`),

        q(`SELECT COALESCE(NULLIF(btrim(preferred_language),''),'Not recorded') AS lang, count(*) AS n
             FROM person WHERE is_active GROUP BY 1 ORDER BY n DESC LIMIT 8`),

        q(`SELECT t.name, COALESCE(t.category,'Other') AS cat,
                  count(pt.person_id) FILTER (WHERE p.is_active) AS n
             FROM tag t
             LEFT JOIN person_tag pt ON pt.tag_id = t.id
             LEFT JOIN person p ON p.id = pt.person_id
            WHERE t.is_active GROUP BY 1,2 ORDER BY n DESC`),

        q(`SELECT
             count(*) FILTER (WHERE mobile_number IS NULL)                       AS no_mobile,
             count(*) FILTER (WHERE email IS NULL)                               AS no_email,
             count(*) FILTER (WHERE dob IS NULL)                                 AS no_dob,
             count(*) FILTER (WHERE area IS NULL OR btrim(area)='')              AS no_area,
             count(*) FILTER (WHERE whatsapp_optin)                              AS whatsapp_ok,
             count(*)                                                            AS total,
             (SELECT count(*) FROM v_person_duplicate_candidates)                AS shared_mobiles,
             (SELECT count(*) FROM person p2
               WHERE NOT EXISTS (SELECT 1 FROM person_tag pt WHERE pt.person_id = p2.id)) AS untagged
           FROM person WHERE is_active`),

        q(`SELECT count(*) AS n FROM (
             SELECT person_id, max(donated_on) AS last_gift FROM donation GROUP BY 1
           ) s WHERE s.last_gift < CURRENT_DATE - interval '12 months'`),
      ]);

      return {
        headline: headline.rows[0],
        donationsByMonth: donationsByMonth.rows,
        donationsBySeva: donationsBySeva.rows,
        topDonors: topDonors.rows,
        gatewaySplit: gatewaySplit.rows,
        growth: growth.rows,
        byArea: byArea.rows,
        byAge: byAge.rows,
        byLanguage: byLanguage.rows,
        segments: segments.rows,
        quality: quality.rows[0],
        lapsedDonors: Number(lapsed.rows[0].n),
      };
    },
  },
};
