-- Migration: Reclassify CSV-imported reflection entries as journal type
-- Imported rows use title prefix "Reflection –" and stored morning-briefing Q&A in responses.

UPDATE reflection_entries
SET
  type = 'journal',
  responses = jsonb_build_object(
    'body',
    trim(
      concat_ws(
        E'\n\n',
        CASE WHEN nullif(trim(responses->>'memorableMoment'), '') IS NOT NULL
          THEN 'What is one memorable moment from yesterday?' || E'\n' || (responses->>'memorableMoment')
          ELSE NULL END,
        CASE WHEN nullif(trim(responses->>'gratefulFor'), '') IS NOT NULL
          THEN 'What is something you are grateful for?' || E'\n' || (responses->>'gratefulFor')
          ELSE NULL END,
        CASE WHEN nullif(trim(responses->>'didEverything'), '') IS NOT NULL
          THEN 'Did you do everything you were supposed to yesterday? If not, why?' || E'\n' || (responses->>'didEverything')
          ELSE NULL END,
        CASE WHEN nullif(trim(responses->>'whatWouldMakeEasier'), '') IS NOT NULL
          THEN 'What would make today easier?' || E'\n' || (responses->>'whatWouldMakeEasier')
          ELSE NULL END
      )
    )
  )
WHERE type = 'morning_briefing'
  AND title LIKE 'Reflection –%'
  AND NOT (responses ? 'body');
